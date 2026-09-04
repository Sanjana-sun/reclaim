// Email sender. RESEND_API_KEY set -> real email via Resend; else logs to console (dev).
async function sendEmail({ to, subject, text, html }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'Reclaim <onboarding@resend.dev>';
  if (!key) {
    console.log(`[email:dev] to=${to} | ${subject}\n${text || ''}\n`);
    return { dev: true };
  }
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + key, 'content-type': 'application/json' },
      body: JSON.stringify({ from, to, subject, text, html }),
    });
    return { ok: r.ok };
  } catch (e) { console.error('email error', e); return { ok: false }; }
}

function enabled() { return !!process.env.RESEND_API_KEY; }

module.exports = { sendEmail, enabled };
