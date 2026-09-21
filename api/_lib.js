// Shared helpers for the booking API.
// Storage is an Upstash Redis (Vercel Marketplace) instance reached over its REST API,
// so no SDK is needed. Email goes out through Resend.

// Vercel's Upstash integration sets KV_REST_API_*; a direct Upstash database sets
// UPSTASH_REDIS_REST_*. Accept either so setup works whichever route is taken.
const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export const storageReady = Boolean(KV_URL && KV_TOKEN);
export const emailReady = Boolean(process.env.RESEND_API_KEY);
export const BOOKING_EMAIL = process.env.BOOKING_EMAIL || 'samarthya.s02@gmail.com';

// Session times shown to students, in IST. Keep in sync with SLOT_TIMES in src/App.jsx.
export const SLOT_TIMES = [
  '09:30', '10:45', '12:00', '13:15', '14:30', '15:45',
  '17:00', '18:15', '19:30', '20:45', '22:00',
];

export async function redis(command) {
  if (!storageReady) throw new Error('storage-not-configured');
  const res = await fetch(KV_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  if (!res.ok) throw new Error(`storage-failed-${res.status}`);
  const data = await res.json();
  return data.result;
}

export async function sendBookingEmail(booking) {
  if (!emailReady) return { sent: false, reason: 'email-not-configured' };

  const lines = [
    `Date: ${booking.date} (${booking.dayLabel})`,
    `Time: ${booking.time} IST (45 minutes)`,
    '',
    `Name: ${booking.name}`,
    `Email: ${booking.email}`,
    `Phone: ${booking.phone || 'not given'}`,
    '',
    'What they want to talk about:',
    booking.goal || 'not given',
    '',
    `Session recording add-on: ${booking.recording ? 'yes (+₹400)' : 'no'}`,
    `Amount due: ₹${booking.amount}`,
    `Payment: ${booking.paymentStatus}`,
    `Booked at: ${new Date().toISOString()}`,
  ];

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.BOOKING_FROM || 'SkyMaster Bookings <onboarding@resend.dev>',
      to: [BOOKING_EMAIL],
      reply_to: booking.email,
      subject: `New consultation: ${booking.name}, ${booking.dayLabel} at ${booking.time} IST`,
      text: lines.join('\n'),
    }),
  });

  if (!res.ok) return { sent: false, reason: `resend-${res.status}` };
  return { sent: true };
}

export function isValidDate(date) {
  return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date);
}

export function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return {};
}
