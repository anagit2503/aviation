// POST /api/book → claim a slot (first booking wins) and email the instructor.
import {
  redis, storageReady, emailReady, sendBookingEmail, sendStudentConfirmation, bumpCounter,
  isValidDate, readJsonBody, SLOT_TIMES, verifyIdToken, isInstructorEmail, getAccess, saveAccess,
  freeConsultationsLeft,
} from './_lib.js';

// Prices live on the server. The browser is never trusted with them.
import { CONSULTATION, RECORDING_PRICE } from './_pricing.js';

// Visitors pay CONSULTATION.price; students with an active course subject pay
// CONSULTATION.coursePrice. Doubt classes are free for course students.

// Nobody has a good reason to make many bookings in one day.
const MAX_PER_IP_PER_DAY = 5;
const MAX_PER_EMAIL_PER_DAY = 3;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST.' });
    return;
  }

  // { action: 'mine', idToken } → this student's upcoming sessions, for the reminder on the booking page.
  if (readJsonBody(req).action === 'mine') {
    const person = await verifyIdToken(readJsonBody(req).idToken);
    if (!person) {
      res.status(401).json({ error: 'Please sign in again.' });
      return;
    }
    try {
      const today = new Date().toISOString().slice(0, 10);
      const keys = ((await redis(['KEYS', 'bookings:*'])) || []).filter((k) => k.slice(9) >= today);
      const days = await Promise.all(keys.map((k) => redis(['HGETALL', k])));
      const bookings = [];
      days.forEach((flat, i) => {
        for (let j = 0; j < (flat || []).length; j += 2) {
          try {
            const b = JSON.parse(flat[j + 1]);
            if (!b.blocked && String(b.email || '').toLowerCase() === person.email) {
              bookings.push({ date: keys[i].slice(9), time: flat[j], dayLabel: b.dayLabel, kind: b.kind || 'consultation', subject: b.subject || '' });
            }
          } catch { /* skip unreadable rows */ }
        }
      });
      bookings.sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
      res.status(200).json({ bookings });
    } catch {
      res.status(503).json({ error: 'Could not load your bookings.' });
    }
    return;
  }

  const { date, time, phone, goal, recording, idToken } = readJsonBody(req);
  let { email, name } = readJsonBody(req);
  // 'doubt' = a doubt class on one subject, for course students only.
  const kind = readJsonBody(req).kind === 'doubt' ? 'doubt' : 'consultation';
  const requestedSubject = String(readJsonBody(req).subject || '');
  let subject = '';

  // Course students book from inside the portal, free of charge. The server
  // checks their sign-in and access itself; the browser only says "I am signed in".
  let courseStudent = false;
  let studentAccess = null;
  let freeLeft = 0; // free consultations this student still has (one per course bought)
  if (idToken) {
    const person = await verifyIdToken(idToken);
    if (!person) {
      res.status(401).json({ error: 'Please sign in again.' });
      return;
    }
    if (storageReady && !isInstructorEmail(person.email)) {
      try {
        const access = await getAccess(person.email);
        // At least one subject has to be active (not paused for non-payment).
        const active = (access.subjects || []).filter((s) => !(access.paused || []).includes(s));
        courseStudent = access.plan === 'course' && active.length > 0;
        if (kind === 'doubt' && active.includes(requestedSubject)) subject = requestedSubject;
        studentAccess = access;
        freeLeft = courseStudent ? freeConsultationsLeft(access) : 0;
      } catch {
        courseStudent = false;
      }
    }
    email = person.email;
    // Signed-in students do not type their name; use the Google account's.
    if (!String(name || '').trim()) name = person.name || person.email.split('@')[0];
  }

  if (kind === 'doubt' && !courseStudent) {
    res.status(403).json({ error: 'Doubt classes are for course students. Sign in to your portal to book one.' });
    return;
  }
  if (kind === 'doubt' && !subject) {
    res.status(400).json({ error: 'Pick one of your subjects for the doubt class.' });
    return;
  }

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

  // Stop one person from claiming the whole calendar or flooding the inbox.
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const today = new Date().toISOString().slice(0, 10);
  try {
    const [byIp, byEmail] = await Promise.all([
      bumpCounter(`ratelimit:ip:${ip}:${today}`, 60 * 60 * 24),
      bumpCounter(`ratelimit:email:${String(email).trim().toLowerCase()}:${today}`, 60 * 60 * 24),
    ]);
    if (byIp > MAX_PER_IP_PER_DAY || byEmail > MAX_PER_EMAIL_PER_DAY) {
      res.status(429).json({
        error: 'You have made several bookings today already. Please email us if you need another slot.',
      });
      return;
    }
  } catch {
    // If the counter cannot be read we still allow the booking through.
  }

  const usesFreeCall = kind === 'consultation' && freeLeft > 0;

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
    recording: kind === 'doubt' ? false : Boolean(recording),
    kind,
    subject,
    amount: kind === 'doubt' ? 0
      : (usesFreeCall ? 0 : courseStudent ? CONSULTATION.coursePrice : CONSULTATION.price) + (recording ? RECORDING_PRICE : 0),
    paymentStatus: kind === 'doubt' ? 'free, course student'
      : usesFreeCall ? 'free consultation included with the course'
        : courseStudent ? 'course student price, pay by UPI' : 'pay by UPI',
    freeConsultation: usesFreeCall,
    courseStudent,
    createdAt: new Date().toISOString(),
  };

  try {
    // HSETNX is atomic, so two people clicking the same slot can never both get it.
    const claimed = await redis(['HSETNX', `bookings:${date}`, time, JSON.stringify(booking)]);
    if (claimed !== 1) {
      res.status(409).json({ error: 'Someone just took that slot. Please pick another time.' });
      return;
    }
    // Remember which days have bookings so the instructor's calendar can list
    // them all, however far ahead they are.
    await redis(['SADD', 'booking-dates', date]);
    // The slot is theirs: use up the free consultation.
    if (usesFreeCall && studentAccess) {
      await saveAccess(email, { ...studentAccess, freeConsultations: freeLeft - 1 });
    }
  } catch {
    res.status(503).json({ error: 'Could not save the booking. Please try again in a moment.' });
    return;
  }

  let emailed = { sent: false, reason: 'email-not-configured' };
  try {
    // The instructor must be told; the student copy is a nice-to-have.
    const [instructorMail] = await Promise.all([
      sendBookingEmail(booking),
      sendStudentConfirmation(booking),
    ]);
    emailed = instructorMail;
  } catch {
    emailed = { sent: false, reason: 'send-failed' };
  }

  res.status(200).json({
    ok: true,
    date,
    time,
    amount: booking.amount,
    dayLabel: booking.dayLabel,
    notified: emailed.sent,
    emailConfigured: emailReady,
  });
}
