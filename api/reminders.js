// GET /api/reminders → run once a day by Vercel Cron (see vercel.json).
// Emails students whose subjects renew within 3 days, once per due date.
// It never pauses anything: pausing is always the instructor's decision.
// Students also see the reminder on their dashboard, even without email.
import {
  redis, storageReady, emailReady, BOOKING_EMAIL, isInstructorEmail, todayIST,
} from './_lib.js';
import { SUBJECT_PRICES, UPI } from './_pricing.js';

const DAYS_AHEAD = 3;
const SITE = 'https://www.averoaviation.com';

function parseHash(flat) {
  const out = {};
  for (let i = 0; i < (flat || []).length; i += 2) {
    try { out[flat[i]] = JSON.parse(flat[i + 1]); } catch { /* skip unreadable rows */ }
  }
  return out;
}

const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

export default async function handler(req, res) {
  // Vercel Cron calls with this header when CRON_SECRET is set; the user agent
  // check keeps random visitors from triggering mail when it is not.
  const secret = process.env.CRON_SECRET;
  const fromCron = secret
    ? req.headers.authorization === `Bearer ${secret}`
    : String(req.headers['user-agent'] || '').includes('vercel-cron');
  if (!fromCron) {
    res.status(401).json({ error: 'Only the daily job can run this.' });
    return;
  }
  if (!storageReady || !emailReady) {
    res.status(200).json({ sent: 0, reason: 'storage or email not set up' });
    return;
  }

  const today = todayIST();
  const [access, accounts] = await Promise.all([
    redis(['HGETALL', 'access']).then(parseHash),
    redis(['HGETALL', 'accounts']).then(parseHash),
  ]);

  let sent = 0;
  for (const [email, a] of Object.entries(access)) {
    if (isInstructorEmail(email) || a.plan !== 'course') continue;
    const due = (a.subjects || [])
      .filter((s) => !(a.paused || []).includes(s) && a.renewals?.[s])
      .map((s) => ({ subject: s, date: a.renewals[s], days: daysBetween(today, a.renewals[s]) }))
      .filter((d) => d.days >= 0 && d.days <= DAYS_AHEAD);
    if (due.length === 0) continue;

    // Remember what was already sent, so each due date is emailed once.
    const fresh = [];
    for (const d of due) {
      const first = await redis(['SET', `reminded:${email}:${d.subject}:${d.date}`, '1', 'NX', 'EX', 60 * 60 * 24 * 30]);
      if (first === 'OK') fresh.push(d);
    }
    if (fresh.length === 0) continue;

    const name = (accounts[email]?.name || email).split(' ')[0];
    const total = fresh.reduce((n, d) => n + (SUBJECT_PRICES[d.subject]?.price || 0), 0);
    const lines = fresh.map((d) => `- ${d.subject}: renews on ${d.date} (Rs ${SUBJECT_PRICES[d.subject]?.price?.toLocaleString('en-IN')})`);
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: process.env.BOOKING_FROM || 'Avero Aviation <onboarding@resend.dev>',
          to: [email],
          reply_to: BOOKING_EMAIL,
          subject: `Your Avero Aviation subscription renews soon`,
          text: [
            `Hi ${name},`, '',
            'A quick reminder that your subscription is due soon:', '',
            ...lines, '',
            `To continue without a break, pay Rs ${total.toLocaleString('en-IN')} from your dashboard: ${SITE}`,
            `(or by UPI to ${UPI.id}).`, '',
            'Avero Aviation',
          ].join('\n'),
        }),
      });
      if (r.ok) sent += 1;
    } catch { /* email failed; the dashboard banner still reminds them */ }
  }
  res.status(200).json({ sent, checkedOn: today });
}
