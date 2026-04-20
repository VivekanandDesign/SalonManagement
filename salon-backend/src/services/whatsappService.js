const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  Browsers,
} = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const pino = require('pino');
const path = require('path');
const fs = require('fs');

const AUTH_DIR = path.join(__dirname, '..', '..', 'whatsapp-auth');
const MAX_RECONNECT = 5;

// ── Rate limiting: 1 message per 3 seconds ──
const RATE_LIMIT_MS = 3000;
let lastSendTime = 0;
const sendQueue = [];    // { phone, text, resolve }
let queueProcessing = false;

// ── Retry queue: failed messages get retried ──
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 60_000; // 1 minute between retries
const retryQueue = [];  // { phone, text, retries, nextRetryAt }
let retryTimer = null;

// ── Health check ──
const HEALTH_CHECK_INTERVAL = 5 * 60_000; // every 5 minutes
let healthTimer = null;
let lastHealthy = null;

// ── Disconnect alert callbacks ──
const disconnectAlertCallbacks = [];

let sock = null;
let qrCode = null;
let connectionStatus = 'disconnected'; // disconnected | connecting | connected
let connectedPhone = null;
let reconnectTimer = null;
let reconnectCount = 0;
let isConnecting = false; // mutex to prevent concurrent connect() calls

const listeners = [];

function getStatus() {
  return {
    status: connectionStatus,
    phone: connectedPhone,
    hasSession: fs.existsSync(path.join(AUTH_DIR, 'creds.json')),
    queueLength: sendQueue.length,
    retryQueueLength: retryQueue.length,
    lastHealthy,
  };
}

function getQR() {
  return qrCode;
}

function onStatusChange(fn) {
  listeners.push(fn);
}

function onDisconnectAlert(fn) {
  disconnectAlertCallbacks.push(fn);
}

function notifyListeners() {
  const status = getStatus();
  for (const fn of listeners) {
    try { fn(status); } catch (e) { /* ignore */ }
  }
}

function notifyDisconnectAlert(reason) {
  console.error(`🚨 WHATSAPP DISCONNECT ALERT: ${reason}`);
  for (const fn of disconnectAlertCallbacks) {
    try { fn({ reason, timestamp: new Date().toISOString(), phone: connectedPhone }); } catch (e) { /* ignore */ }
  }
}

// ── Health check: periodically verify socket is alive ──
function startHealthCheck() {
  stopHealthCheck();
  healthTimer = setInterval(async () => {
    if (connectionStatus !== 'connected' || !sock) {
      console.warn('🩺 Health check: WhatsApp not connected');
      return;
    }
    try {
      // Light ping — check if we can query our own number
      const selfJid = `${connectedPhone}@s.whatsapp.net`;
      await sock.onWhatsApp(selfJid);
      lastHealthy = new Date().toISOString();
    } catch (err) {
      console.error('🩺 Health check FAILED:', err.message);
      notifyDisconnectAlert(`Health check failed: ${err.message}`);
    }
  }, HEALTH_CHECK_INTERVAL);
}

function stopHealthCheck() {
  if (healthTimer) { clearInterval(healthTimer); healthTimer = null; }
}

// ── Rate-limited send queue processor ──
async function processSendQueue() {
  if (queueProcessing || sendQueue.length === 0) return;
  queueProcessing = true;

  while (sendQueue.length > 0) {
    const now = Date.now();
    const elapsed = now - lastSendTime;
    if (elapsed < RATE_LIMIT_MS) {
      await new Promise(r => setTimeout(r, RATE_LIMIT_MS - elapsed));
    }

    const item = sendQueue.shift();
    if (!item) break;

    const result = await _rawSend(item.phone, item.text);
    lastSendTime = Date.now();
    item.resolve(result);
  }

  queueProcessing = false;
}

// ── Raw send (no rate limiting) ──
async function _rawSend(phone, text) {
  if (connectionStatus !== 'connected' || !sock) {
    console.warn('⚠️ WhatsApp not connected — message queued for retry to', phone);
    return false;
  }

  try {
    const cleaned = phone.replace(/[\s\-\+\(\)]/g, '');
    // Ensure country code for Indian numbers
    const withCC = cleaned.length === 10 ? `91${cleaned}` : cleaned;
    const jid = `${withCC}@s.whatsapp.net`;

    const [result] = await sock.onWhatsApp(jid);
    if (!result?.exists) {
      console.warn(`⚠️ ${phone} not on WhatsApp`);
      return false;
    }

    await sock.sendMessage(result.jid, { text });
    console.log(`📨 WhatsApp sent to ${phone}`);
    return true;
  } catch (err) {
    console.error(`❌ WhatsApp send failed to ${phone}:`, err.message);
    return false;
  }
}

// ── Public sendMessage: rate-limited + auto-retry on failure ──
async function sendMessage(phone, text) {
  return new Promise((resolve) => {
    sendQueue.push({
      phone,
      text,
      resolve: (result) => {
        if (!result) {
          // Add to retry queue
          addToRetryQueue(phone, text);
        }
        resolve(result);
      },
    });
    processSendQueue();
  });
}

// ── Retry queue management ──
function addToRetryQueue(phone, text) {
  // Don't add duplicates
  const exists = retryQueue.some(r => r.phone === phone && r.text === text);
  if (exists) return;

  retryQueue.push({
    phone,
    text,
    retries: 0,
    nextRetryAt: Date.now() + RETRY_DELAY_MS,
  });
  console.log(`🔁 Added to retry queue: ${phone} (queue size: ${retryQueue.length})`);
  scheduleRetryProcessing();
}

function scheduleRetryProcessing() {
  if (retryTimer) return; // already scheduled
  retryTimer = setTimeout(processRetryQueue, RETRY_DELAY_MS);
}

async function processRetryQueue() {
  retryTimer = null;
  if (retryQueue.length === 0) return;
  if (connectionStatus !== 'connected') {
    // Reschedule — can't process while disconnected
    if (retryQueue.length > 0) scheduleRetryProcessing();
    return;
  }

  const now = Date.now();
  const ready = [];
  const remaining = [];

  for (const item of retryQueue) {
    if (item.nextRetryAt <= now) {
      ready.push(item);
    } else {
      remaining.push(item);
    }
  }

  retryQueue.length = 0;
  retryQueue.push(...remaining);

  for (const item of ready) {
    // Rate limit retries too
    const elapsed = Date.now() - lastSendTime;
    if (elapsed < RATE_LIMIT_MS) {
      await new Promise(r => setTimeout(r, RATE_LIMIT_MS - elapsed));
    }

    const sent = await _rawSend(item.phone, item.text);
    lastSendTime = Date.now();

    if (sent) {
      console.log(`✅ Retry succeeded: ${item.phone} (attempt ${item.retries + 1})`);
    } else {
      item.retries++;
      if (item.retries < MAX_RETRIES) {
        item.nextRetryAt = Date.now() + RETRY_DELAY_MS * (item.retries + 1); // exponential backoff
        retryQueue.push(item);
        console.log(`🔁 Retry ${item.retries}/${MAX_RETRIES} failed for ${item.phone} — will retry again`);
      } else {
        console.error(`⛔ Max retries reached for ${item.phone} — message dropped`);
      }
    }
  }

  if (retryQueue.length > 0) scheduleRetryProcessing();
}

// ── Get retry queue stats ──
function getRetryQueueStats() {
  return {
    pending: retryQueue.length,
    items: retryQueue.map(r => ({
      phone: r.phone,
      retries: r.retries,
      nextRetryAt: new Date(r.nextRetryAt).toISOString(),
    })),
  };
}

async function connect() {
  // Mutex: prevent concurrent connect attempts
  if (isConnecting || connectionStatus === 'connected') {
    return;
  }
  isConnecting = true;
  connectionStatus = 'connecting';
  qrCode = null;
  notifyListeners();

  try {
    // Clean up any previous socket
    if (sock) {
      try { sock.end(); } catch {}
      sock = null;
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();
    console.log(`📱 Connecting to WhatsApp with Baileys v${version.join('.')}...`);

    sock = makeWASocket({
      auth: state,
      version,
      browser: Browsers.macOS('Chrome'),
      markOnlineOnConnect: false,
      logger: pino({ level: 'silent' }),
      connectTimeoutMs: 30_000,
      defaultQueryTimeoutMs: 30_000,
      retryRequestDelayMs: 3000,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        qrCode = await QRCode.toDataURL(qr, { width: 300 });
        connectionStatus = 'connecting';
        notifyListeners();
        console.log('📱 WhatsApp QR code generated — waiting for scan...');
      }

      if (connection === 'open') {
        connectionStatus = 'connected';
        qrCode = null;
        reconnectCount = 0;
        const user = sock.user;
        connectedPhone = user?.id?.split(':')[0] || user?.id?.split('@')[0] || null;
        lastHealthy = new Date().toISOString();
        console.log(`✅ WhatsApp connected as ${connectedPhone}`);
        startHealthCheck();
        notifyListeners();
        // Process any pending retries now that we're connected
        if (retryQueue.length > 0) {
          console.log(`📋 Processing ${retryQueue.length} pending retry messages...`);
          processRetryQueue();
        }
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const wasConnected = connectionStatus === 'connected';
        connectionStatus = 'disconnected';
        connectedPhone = null;
        qrCode = null;
        isConnecting = false;
        stopHealthCheck();

        if (statusCode === DisconnectReason.loggedOut) {
          console.log('⚠️ WhatsApp logged out — clearing session');
          notifyDisconnectAlert('WhatsApp session logged out. QR re-scan required.');
          clearSession();
          notifyListeners();
          return;
        }

        // Alert on disconnect if we were previously connected
        if (wasConnected) {
          const reason = lastDisconnect?.error?.message || `status code ${statusCode}`;
          notifyDisconnectAlert(`Connection lost: ${reason}`);
        }

        notifyListeners();

        // Auto-reconnect only if we were previously paired (have creds)
        const hasCreds = fs.existsSync(path.join(AUTH_DIR, 'creds.json'));
        if (hasCreds && reconnectCount < MAX_RECONNECT) {
          reconnectCount++;
          const delay = Math.min(5000 * reconnectCount, 30000);
          console.log(`🔄 WhatsApp reconnecting (${reconnectCount}/${MAX_RECONNECT}) in ${delay / 1000}s...`);
          clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(() => {
            sock = null;
            connect();
          }, delay);
        } else if (!hasCreds) {
          console.log('ℹ️ WhatsApp not paired — waiting for user to initiate connect');
        } else {
          console.log('⛔ WhatsApp max reconnects reached — use Connect button to retry');
          notifyDisconnectAlert('Max reconnect attempts reached. Manual reconnect required from Settings.');
          reconnectCount = 0;
        }
      }
    });
  } catch (err) {
    console.error('❌ WhatsApp connection error:', err.message);
    connectionStatus = 'disconnected';
    notifyListeners();
  } finally {
    isConnecting = false;
  }
}

function disconnect() {
  clearTimeout(reconnectTimer);
  stopHealthCheck();
  reconnectCount = MAX_RECONNECT; // prevent auto-reconnect
  isConnecting = false;
  if (sock) {
    try { sock.end(); } catch {}
    sock = null;
  }
  connectionStatus = 'disconnected';
  connectedPhone = null;
  qrCode = null;
  notifyListeners();
}

function clearSession() {
  disconnect();
  if (fs.existsSync(AUTH_DIR)) {
    fs.rmSync(AUTH_DIR, { recursive: true, force: true });
  }
  reconnectCount = 0;
}

// Auto-connect on startup if session exists
function autoConnect() {
  const hasCreds = fs.existsSync(path.join(AUTH_DIR, 'creds.json'));
  if (hasCreds) {
    console.log('📱 Found existing WhatsApp session — auto-connecting...');
    connect();
  } else {
    console.log('ℹ️ No WhatsApp session found — go to Settings > WhatsApp to connect');
  }
}

module.exports = {
  connect,
  disconnect,
  clearSession,
  getStatus,
  getQR,
  sendMessage,
  onStatusChange,
  onDisconnectAlert,
  autoConnect,
  processRetryQueue,
  getRetryQueueStats,
};
