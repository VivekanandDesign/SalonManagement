const prisma = require('../config/db');

let _cached = null;
let _cachedAt = 0;
const TTL = 60000; // 1 minute cache

async function getSalonName() {
  const now = Date.now();
  if (_cached && now - _cachedAt < TTL) return _cached;
  try {
    const s = await prisma.settings.findFirst({ select: { salonName: true } });
    _cached = s?.salonName || 'My Salon';
    _cachedAt = now;
    return _cached;
  } catch {
    return _cached || 'My Salon';
  }
}

module.exports = { getSalonName };
