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

// A short confirmation for the student. Resend only delivers to the account
// owner's address until a domain is verified, so this quietly does nothing until
// then; the booking itself is never affected.
export async function sendStudentConfirmation(booking) {
  if (!emailReady) return { sent: false };
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.BOOKING_FROM || 'flywithsam <onboarding@resend.dev>',
        to: [booking.email],
        reply_to: BOOKING_EMAIL,
        subject: `Your consultation is booked: ${booking.dayLabel} at ${booking.time} IST`,
        text: [
          `Hi ${booking.name.split(' ')[0]},`,
          '',
          `Your 45-minute consultation is booked for ${booking.dayLabel} at ${booking.time} IST.`,
          '',
          ...(booking.amount === 0
            ? ['This session is free as part of your course.', 'We will reply with the Google Meet link.']
            : [
              `Amount to pay: Rs ${booking.amount}${booking.recording ? ' (includes the session recording)' : ''}.`,
              'We will reply with the Google Meet link and payment details.',
            ]),
          '',
          'If you need to change the time, just reply to this email.',
          '',
          'flywithsam',
        ].join('\n'),
      }),
    });
    return { sent: res.ok };
  } catch {
    return { sent: false };
  }
}

// Tells the instructors a student has asked something in the doubts chat.
// Never throws: the question is already saved either way.
export async function sendDoubtNotification({ name, email, text }) {
  if (!emailReady) return { sent: false };
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.BOOKING_FROM || 'flywithsam <onboarding@resend.dev>',
        to: [BOOKING_EMAIL],
        subject: `New doubt from ${name || email}`,
        text: [
          `${name || email} (${email}) asked:`,
          '',
          text,
          '',
          'Reply from the Inbox tab in the instructor portal so it reaches their chat.',
        ].join('\n'),
      }),
    });
    return { sent: res.ok };
  } catch {
    return { sent: false };
  }
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

// ---------- Accounts and access ----------

// Instructors are set here, on the server, so the browser cannot claim the role.
export const INSTRUCTOR_EMAILS = (process.env.INSTRUCTOR_EMAILS ||
  'samarthya.s02@gmail.com,khanooja.anandita@gmail.com')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const isInstructorEmail = (email) =>
  INSTRUCTOR_EMAILS.includes(String(email || '').trim().toLowerCase());

const FIREBASE_API_KEY =
  process.env.VITE_FIREBASE_API_KEY || 'AIzaSyCoajtzxGIQdvx1zWPZY-cPtQ7LVhFjYT0';

// Checks a Google sign-in token with Google itself. An invalid or expired token
// returns null, so nobody can pretend to be someone else by editing the request.
export async function verifyIdToken(idToken) {
  if (!idToken || typeof idToken !== 'string') return null;
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const account = data.users?.[0];
    if (!account?.email) return null;
    // Only real, verified Google sign-ins count. Without this, enabling another
    // sign-in method in Firebase would let someone register an instructor's
    // address with their own password and take over the portal.
    const providers = (account.providerUserInfo || []).map((p) => p.providerId);
    if (!providers.includes('google.com')) return null;
    if (account.emailVerified === false) return null;
    return {
      email: String(account.email).toLowerCase(),
      name: account.displayName || '',
      photo: account.photoUrl || '',
      uid: account.localId,
    };
  } catch {
    return null;
  }
}

// What a brand new account can see: nothing from the course.
export const emptyAccess = () => ({
  plan: 'none', // none | consultation | course
  subjects: [],
  questions: false,
  tests: false,
});

// Profiles (who signed in, when) and access (what they may open) live in two
// separate places. Sign-ins only ever touch the profile, and the instructor only
// ever touches the access, so a sign-in can never undo a grant made at the same
// moment.
const parseHash = (flat) => {
  const out = {};
  for (let i = 0; i < (flat || []).length; i += 2) {
    try { out[flat[i]] = JSON.parse(flat[i + 1]); } catch { /* skip unreadable rows */ }
  }
  return out;
};

export async function getAccess(email) {
  const raw = await redis(['HGET', 'access', email]);
  if (!raw) return emptyAccess();
  try { return { ...emptyAccess(), ...JSON.parse(raw) }; } catch { return emptyAccess(); }
}

export async function saveAccess(email, access) {
  await redis(['HSET', 'access', email, JSON.stringify(access)]);
  return access;
}

export async function getProfile(email) {
  const raw = await redis(['HGET', 'accounts', email]);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export async function saveProfile(profile) {
  await redis(['HSET', 'accounts', profile.email, JSON.stringify(profile)]);
  return profile;
}

export async function listAccounts() {
  const [profilesFlat, accessFlat] = await Promise.all([
    redis(['HGETALL', 'accounts']),
    redis(['HGETALL', 'access']),
  ]);
  const profiles = parseHash(profilesFlat);
  const access = parseHash(accessFlat);
  return Object.values(profiles)
    .map((p) => ({ ...p, access: { ...emptyAccess(), ...(access[p.email] || {}) } }))
    .sort((a, b) => (b.lastSeen || '').localeCompare(a.lastSeen || ''));
}

// Simple counter used to stop one person flooding the booking calendar.
export async function bumpCounter(key, windowSeconds) {
  const count = await redis(['INCR', key]);
  if (count === 1) await redis(['EXPIRE', key, windowSeconds]);
  return count;
}
