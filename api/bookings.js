// POST /api/bookings → instructor-only view of the consultation calendar.
//   { action: 'list' }                  → upcoming bookings
//   { action: 'cancel', date, time }    → free that slot again
//   { action: 'block',  date, time }    → keep a slot for yourself
//
// Cancelling matters: without it a wrong or spam booking would block a slot for good.
import {
  verifyIdToken, isInstructorEmail, redis, storageReady, readJsonBody,
  isValidDate, SLOT_TIMES,
} from './_lib.js';

// Look at every stored booking day, so nothing can hide beyond a fixed window.
async function bookedDates() {
  const keys = (await redis(['KEYS', 'bookings:*'])) || [];
  const today = new Date().toISOString().slice(0, 10);
  return keys
    .map((k) => k.replace('bookings:', ''))
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && d >= today)
    .sort();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST.' });
    return;
  }

  const { idToken, action, date, time } = readJsonBody(req);

  const person = await verifyIdToken(idToken);
  if (!person) {
    res.status(401).json({ error: 'Please sign in again.' });
    return;
  }
  if (!isInstructorEmail(person.email)) {
    res.status(403).json({ error: 'Only instructors can see this.' });
    return;
  }
  if (!storageReady) {
    res.status(503).json({ error: 'Booking storage is not switched on yet.' });
    return;
  }

  try {
    if (action === 'list') {
      const dates = await bookedDates();
      const results = await Promise.all(dates.map((d) => redis(['HGETALL', `bookings:${d}`])));
      const bookings = [];
      results.forEach((flat, i) => {
        for (let k = 0; k < (flat || []).length; k += 2) {
          try {
            const booking = JSON.parse(flat[k + 1]);
            bookings.push({ ...booking, date: dates[i], time: flat[k] });
          } catch {
            bookings.push({ date: dates[i], time: flat[k], name: 'Unreadable booking' });
          }
        }
      });
      bookings.sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
      res.status(200).json({ bookings });
      return;
    }

    if (action === 'cancel') {
      if (!isValidDate(date) || !SLOT_TIMES.includes(time)) {
        res.status(400).json({ error: 'Which slot should be freed?' });
        return;
      }
      await redis(['HDEL', `bookings:${date}`, time]);
      res.status(200).json({ ok: true });
      return;
    }

    if (action === 'block') {
      if (!isValidDate(date) || !SLOT_TIMES.includes(time)) {
        res.status(400).json({ error: 'Which slot should be blocked?' });
        return;
      }
      const held = {
        date,
        time,
        name: 'Blocked by instructor',
        email: person.email,
        goal: 'Not available for booking',
        blocked: true,
        createdAt: new Date().toISOString(),
      };
      const claimed = await redis(['HSETNX', `bookings:${date}`, time, JSON.stringify(held)]);
      if (claimed !== 1) {
        res.status(409).json({ error: 'That slot is already booked. Cancel it first.' });
        return;
      }
      await redis(['SADD', 'booking-dates', date]);
      res.status(200).json({ ok: true });
      return;
    }

    res.status(400).json({ error: 'Unknown action.' });
  } catch {
    res.status(503).json({ error: 'Could not reach the calendar. Try again in a moment.' });
  }
}
