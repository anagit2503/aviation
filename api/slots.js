// GET /api/slots?date=YYYY-MM-DD → which times on that day are already taken.
import { redis, storageReady, isValidDate } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Use GET.' });
    return;
  }

  const date = req.query?.date;
  if (!isValidDate(date)) {
    res.status(400).json({ error: 'Pass a date as YYYY-MM-DD.' });
    return;
  }

  // Without storage configured the site still works; nothing shows as booked.
  if (!storageReady) {
    res.status(200).json({ date, booked: [], live: false });
    return;
  }

  try {
    const booked = (await redis(['HKEYS', `bookings:${date}`])) || [];
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ date, booked, live: true });
  } catch {
    res.status(200).json({ date, booked: [], live: false });
  }
}
