/* ============================================
   Kibi — Account emails (welcome on sign-up, alert on sign-in)
   Sent through Brevo's HTTPS API when BREVO_API_KEY is set (works on hosts
   that block SMTP, like Render's free plan), otherwise over SMTP with
   Nodemailer. Sending is awaited (with a timeout) so it also completes on
   serverless hosts like Vercel, and a mail problem never blocks anyone from
   signing in. With neither configured, emails are skipped.
   ============================================ */

const nodemailer = require('nodemailer');
const config = require('./config');

const SEND_TIMEOUT_MS = 8000;
const brevoEnabled = !!config.brevoApiKey;
const smtpEnabled = !!(config.smtp.host && config.smtp.user && config.smtp.pass);
const mailEnabled = brevoEnabled || smtpEnabled;
let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465, // 465 = TLS from the start; 587 upgrades with STARTTLS
      auth: { user: config.smtp.user, pass: config.smtp.pass }
    });
  }
  return transporter;
}

const escapeHtml = str => String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function siteUrl(req) {
  return config.siteUrl || (req ? `${req.protocol}://${req.get('host')}` : '');
}

// "Chrome on macOS" from a user-agent string (good enough for a sign-in alert).
function describeDevice(userAgent = '') {
  const browser = /Edg\//.test(userAgent) ? 'Edge' : /OPR\//.test(userAgent) ? 'Opera' : /Chrome\//.test(userAgent) ? 'Chrome'
    : /Firefox\//.test(userAgent) ? 'Firefox' : /Safari\//.test(userAgent) ? 'Safari' : 'a browser';
  const os = /iPhone|iPad/.test(userAgent) ? 'iOS' : /Android/.test(userAgent) ? 'Android' : /Mac OS X/.test(userAgent) ? 'macOS'
    : /Windows/.test(userAgent) ? 'Windows' : /Linux/.test(userAgent) ? 'Linux' : 'an unknown device';
  return `${browser} on ${os}`;
}

function layout({ heading, intro, rows = [], buttonText, buttonUrl, footer }) {
  const rowHtml = rows.map(([label, value]) => `
    <tr>
      <td style="padding:8px 0;color:#64748b;font-size:14px;width:120px;">${escapeHtml(label)}</td>
      <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;">${escapeHtml(value)}</td>
    </tr>`).join('');
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#005da7,#2976c7);padding:24px 32px;">
          <span style="color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">Kibi</span>
          <span style="color:#cfe3f7;font-size:13px;margin-left:8px;">Your journey. Smarter planned.</span>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 12px;font-size:22px;color:#0f172a;">${escapeHtml(heading)}</h1>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155;">${intro}</p>
          ${rowHtml ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;margin-bottom:24px;">${rowHtml}</table>` : ''}
          ${buttonUrl ? `<a href="${escapeHtml(buttonUrl)}" style="display:inline-block;background:#005da7;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:999px;">${escapeHtml(buttonText)}</a>` : ''}
          ${footer ? `<p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#64748b;">${footer}</p>` : ''}
        </td></tr>
        <tr><td style="padding:16px 32px;background:#f8fafc;color:#94a3b8;font-size:12px;">You're receiving this because of activity on your Kibi account.</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// "Kibi <hello@example.com>" → { name: 'Kibi', email: 'hello@example.com' }
function parseFrom(from) {
  const match = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(from || '');
  return match ? { name: match[1] || 'Kibi', email: match[2] } : { name: 'Kibi', email: (from || '').trim() };
}

async function sendWithBrevo({ to, subject, html, text }) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': config.brevoApiKey, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ sender: parseFrom(config.smtp.from || config.smtp.user), to: [{ email: to }], subject, htmlContent: html, textContent: text }),
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS)
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Brevo ${res.status}: ${body.message || res.statusText}`);
  }
}

async function sendWithSmtp({ to, subject, html, text }) {
  let timeout;
  try {
    await Promise.race([
      getTransporter().sendMail({ from: config.smtp.from || `Kibi <${config.smtp.user}>`, to, subject, html, text }),
      new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('timed out')), SEND_TIMEOUT_MS); })
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

async function send(message) {
  if (!mailEnabled || !message.to) return false;
  try {
    await (brevoEnabled ? sendWithBrevo(message) : sendWithSmtp(message));
    return true;
  } catch (err) {
    console.error(`Email "${message.subject}" to ${message.to} failed:`, err.message);
    return false;
  }
}

function sendWelcomeEmail(user, req, method = 'email') {
  const url = siteUrl(req);
  const name = user.name.split(' ')[0];
  return send({
    to: user.email,
    subject: 'Welcome to Kibi 🎉',
    text: `Hi ${name}, your Kibi account is ready${method === 'google' ? ' (signed up with Google)' : ''}. Set up your travel profile and plan your first trip: ${url}/onboarding.html`,
    html: layout({
      heading: `Welcome to Kibi, ${name}!`,
      intro: `Your account is ready${method === 'google' ? ' and linked to your Google account' : ''}. Tell us how you like to travel and we'll suggest destinations, day-by-day plans and fellow travellers that fit you.`,
      rows: [['Account', user.email], ['Signed up with', method === 'google' ? 'Google' : 'Email and password']],
      buttonText: 'Set up my travel profile',
      buttonUrl: url && `${url}/onboarding.html`,
      footer: "If you didn't create this account, you can ignore this email."
    })
  });
}

function sendLoginAlert(user, req, method = 'email') {
  const url = siteUrl(req);
  const when = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }) + ' IST';
  const device = describeDevice(req && req.get('user-agent'));
  const name = user.name.split(' ')[0];
  return send({
    to: user.email,
    subject: 'New sign-in to your Kibi account',
    text: `Hi ${name}, your Kibi account was signed in to on ${when} using ${device} (${method === 'google' ? 'Google' : 'email and password'}). If this wasn't you, change your password at ${url}/login.html`,
    html: layout({
      heading: 'New sign-in to your account',
      intro: `Hi ${escapeHtml(name)}, we noticed a sign-in to your Kibi account. If this was you, there's nothing to do.`,
      rows: [['When', when], ['Device', device], ['Method', method === 'google' ? 'Continue with Google' : 'Email and password']],
      buttonText: 'Open Kibi',
      buttonUrl: url && `${url}/dashboard.html`,
      footer: "Wasn't you? Change your password right away and contact us."
    })
  });
}

module.exports = { mailEnabled, sendWelcomeEmail, sendLoginAlert };
