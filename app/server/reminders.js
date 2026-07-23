// Deadline reminder scheduler. Emails a patient when an appeal deadline is within 7 days.
const { find, findOne, update } = require('./db');
const { sendEmail } = require('./email');

async function checkDeadlines() {
  const appeals = await find('appeals', (a) => (a.status === 'submitted' || a.status === 'draft') && !a.reminded);
  const now = Date.now();
  let sent = 0;
  for (const a of appeals) {
    const days = (new Date(a.deadline).getTime() - now) / 86400000;
    if (days > 0 && days <= 7) {
      const u = await findOne('users', (x) => x.id === a.user_id);
      if (u && u.email) {
        await sendEmail({
          to: u.email,
          subject: `Appeal deadline in ${Math.ceil(days)} day(s)`,
          text: `Your appeal for ${a.service || 'a denied claim'} to ${a.insurer || 'your insurer'} is due by ${new Date(a.deadline).toLocaleDateString()}.\n\nLog in to review and submit: ${(process.env.APP_URL || '')}/dashboard.html`,
        });
        sent++;
      }
      await update('appeals', a.id, { reminded: true });
    }
  }
  return sent;
}

function startReminders() {
  checkDeadlines().catch((e) => console.error('reminder error', e));
  setInterval(() => checkDeadlines().catch((e) => console.error('reminder error', e)), 24 * 3600 * 1000);
}

module.exports = { checkDeadlines, startReminders };
