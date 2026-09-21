// POST /api/book → claim a slot (first booking wins) and email the instructor.
import {
  redis, storageReady, emailReady, sendBookingEmail,
  isValidDate, readJsonBody, SLOT_TIMES,
} from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST.' });
    return;
  }

  const { date, time, name, email, phone, goal, recording, amount } = readJsonBody(req);

  if (!isValidDate(date) || !SLOT_TIMES.includes(time)) {
    res.status(400).json({ error: 'Pick a date and time from the list.' });
    return;
  }
  if (!name?.trim() || !email?.trim()) {
    res.status(400).json({ error: 'Name and email are required.' });
    return;
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
    res.status(400).json({ error: 'That email address does not look right.' });
    return;
  }
  if (new Date(`${date}T${time}:00+05:30`).getTime() < Date.now()) {
    res.status(400).json({ error: 'That time has already passed. Pick a later slot.' });
    return;
  }

  if (!storageReady) {
    res.status(503).json({ error: 'Booking is not switched on yet. Please email us instead.' });
    return;
  }

  const booking = {
    date,
    time,
    dayLabel: new Date(`${date}T00:00:00+05:30`).toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata',
    }),
    name: String(name).trim().slice(0, 120),
    email: String(email).trim().slice(0, 160),
    phone: String(phone || '').trim().slice(0, 40),
    goal: String(goal || '').trim().slice(0, 2000),
    recording: Boolean(recording),
    amount: Number(amount) || 1999,
    paymentStatus: 'to be collected — no online payment yet',
    createdAt: new Date().toISOString(),
  };

  try {
    // HSETNX is atomic, so two people clicking the same slot can never both get it.
    const claimed = await redis(['HSETNX', `bookings:${date}`, time, JSON.stringify(booking)]);
    if (claimed !== 1) {
      res.status(409).json({ error: 'Someone just took that slot. Please pick another time.' });
      return;
    }
    // Keep a booking day for 120 days, then let it clear itself out.
    await redis(['EXPIRE', `bookings:${date}`, 60 * 60 * 24 * 120]);
  } catch {
    res.status(503).json({ error: 'Could not save the booking. Please try again in a moment.' });
    return;
  }

  let emailed = { sent: false, reason: 'email-not-configured' };
  try {
    emailed = await sendBookingEmail(booking);
  } catch {
    emailed = { sent: false, reason: 'send-failed' };
  }

  res.status(200).json({
    ok: true,
    date,
    time,
    dayLabel: booking.dayLabel,
    notified: emailed.sent,
    emailConfigured: emailReady,
  });
}
