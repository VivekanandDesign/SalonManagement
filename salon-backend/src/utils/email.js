const nodemailer = require('nodemailer');

/**
 * Create reusable transporter.
 * Configure via env vars:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 *
 * For development/testing without SMTP, uses Nodemailer's Ethereal test account.
 */
let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Ethereal test account for development
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    console.log('📧 Using Ethereal test email. Preview sent emails at https://ethereal.email');
    console.log(`   Ethereal user: ${testAccount.user}`);
  }

  return transporter;
}

/**
 * Generate a 6-digit OTP
 */
function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Send OTP verification email
 */
async function sendVerificationEmail(toEmail, otp, userName) {
  // Always log OTP in development for easy testing
  if (process.env.NODE_ENV !== 'production') {
    console.log(`\n🔑 OTP for ${toEmail}: ${otp}\n`);
  }

  const transport = await getTransporter();
  const fromAddress = process.env.SMTP_FROM || '"Salon" <noreply@salon.com>';

  const info = await transport.sendMail({
    from: fromAddress,
    to: toEmail,
    subject: 'Verify your account',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="width: 56px; height: 56px; background: #3b82f6; border-radius: 14px; display: inline-flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 24px; font-weight: bold;">O</span>
          </div>
          <h2 style="color: #1e293b; margin: 16px 0 4px;">Verify your email</h2>
          <p style="color: #64748b; font-size: 14px; margin: 0;">Hi ${userName}, use the code below to verify your account</p>
        </div>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #3b82f6; font-family: monospace;">${otp}</div>
          <p style="color: #94a3b8; font-size: 13px; margin: 12px 0 0;">This code expires in 10 minutes</p>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">If you didn't create an account, you can safely ignore this email.</p>
      </div>
    `,
  });

  // Log Ethereal preview URL in development
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`📧 OTP Email preview: ${previewUrl}`);
  }

  return info;
}

module.exports = { generateOTP, sendVerificationEmail };
