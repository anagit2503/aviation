// POST /api/payment → subject payments by UPI QR, checked by hand.
//
// Students:
//   { action: 'create', subjects }     → "I want to pay for these" (price worked out here, never trusted from the browser)
//   { action: 'claim', id, reference } → "I have paid", with an optional UPI transaction ID
//   { action: 'mine' }                 → their own requests
// Instructors:
//   { action: 'list' }                 → every request, newest first
//   { action: 'approve', id }          → switch those subjects on (and un-pause them)
//   { action: 'reject', id, note }     → decline, with a note the student sees
import {
  redis, verifyIdToken, isInstructorEmail, getProfile, getAccess, saveAccess,
  storageReady, readJsonBody, bumpCounter,
} from './_lib.js';

// Keep in sync with SUBJECT_PRICE and SUBJECTS in src/App.jsx.
const SUBJECT_PRICE = 5000;
const SUBJECT_NAMES = [
  'Air Navigation', 'Aviation Meteorology', 'Air Regulations',
  'Technical General', 'Technical Specific', 'Radio Telephony (RTR)',
];
const OPEN = ['awaiting', 'claimed'];

function parseHash(flat) {
  const out = [];
  for (let i = 0; i < (flat || []).length; i += 2) {
    try { out.push(JSON.parse(flat[i + 1])); } catch { /* skip unreadable rows */ }
  }
  return out;
}

async function getRequest(id) {
  const raw = await redis(['HGET', 'payments', String(id || '')]);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

const store = (request) => redis(['HSET', 'payments', request.id, JSON.stringify(request)]);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST.' });
    return;
  }

  const body = readJsonBody(req);
  const person = await verifyIdToken(body.idToken);
  if (!person) {
    res.status(401).json({ error: 'Please sign in again.' });
    return;
  }
  if (!storageReady) {
    res.status(503).json({ error: 'Payments are not switched on yet.' });
    return;
  }
  const instructor = isInstructorEmail(person.email);
  const now = new Date().toISOString();

  try {
    // ---------- Instructor side ----------
    if (instructor) {
      if (body.action === 'list') {
        const requests = parseHash(await redis(['HGETALL', 'payments']))
          .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        res.status(200).json({ requests });
        return;
      }

      const request = await getRequest(body.id);
      if (!request) {
        res.status(404).json({ error: 'That payment request no longer exists.' });
        return;
      }

      if (body.action === 'approve') {
        const access = await getAccess(request.email);
        const next = {
          ...access,
          plan: 'course',
          subjects: [...new Set([...(access.subjects || []), ...request.subjects])],
          paused: (access.paused || []).filter((s) => !request.subjects.includes(s)),
          questions: true,
          tests: true,
          updatedAt: now,
          updatedBy: person.email,
        };
        await saveAccess(request.email, next);
        const done = { ...request, status: 'approved', decidedAt: now, decidedBy: person.email };
        await store(done);
        res.status(200).json({ ok: true, request: done, access: next });
        return;
      }

      if (body.action === 'reject') {
        const done = {
          ...request,
          status: 'rejected',
          note: String(body.note || '').trim().slice(0, 300),
          decidedAt: now,
          decidedBy: person.email,
        };
        await store(done);
        res.status(200).json({ ok: true, request: done });
        return;
      }

      res.status(400).json({ error: 'Unknown action.' });
      return;
    }

    // ---------- Student side ----------
    if (body.action === 'mine') {
      const ids = (await redis(['SMEMBERS', `payments:by:${person.email}`])) || [];
      const rows = ids.length ? await redis(['HMGET', 'payments', ...ids]) : [];
      const requests = rows.map((r) => { try { return JSON.parse(r); } catch { return null; } })
        .filter(Boolean)
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      res.status(200).json({ requests, price: SUBJECT_PRICE });
      return;
    }

    if (body.action === 'create') {
      const subjects = [...new Set((Array.isArray(body.subjects) ? body.subjects : [])
        .filter((s) => SUBJECT_NAMES.includes(s)))];
      if (subjects.length === 0) {
        res.status(400).json({ error: 'Pick at least one subject.' });
        return;
      }
      if (await bumpCounter(`ratelimit:payments:${person.email}`, 60 * 60 * 24) > 10) {
        res.status(429).json({ error: 'Too many payment attempts today. Please message us from the Doubts tab.' });
        return;
      }
      const profile = await getProfile(person.email);
      const request = {
        id: crypto.randomUUID(),
        email: person.email,
        name: profile?.name || person.name || '',
        subjects,
        pricePerSubject: SUBJECT_PRICE,
        amount: SUBJECT_PRICE * subjects.length,
        status: 'awaiting',
        createdAt: now,
      };
      await store(request);
      await redis(['SADD', `payments:by:${person.email}`, request.id]);
      res.status(200).json({ ok: true, request });
      return;
    }

    if (body.action === 'claim') {
      const request = await getRequest(body.id);
      if (!request || request.email !== person.email) {
        res.status(404).json({ error: 'That payment request was not found.' });
        return;
      }
      if (!OPEN.includes(request.status)) {
        res.status(409).json({ error: 'This payment has already been reviewed.' });
        return;
      }
      const claimed = {
        ...request,
        status: 'claimed',
        reference: String(body.reference || '').trim().slice(0, 60),
        claimedAt: now,
      };
      await store(claimed);
      res.status(200).json({ ok: true, request: claimed });
      return;
    }

    res.status(400).json({ error: 'Unknown action.' });
  } catch (err) {
    console.error('payment failed:', err?.message);
    res.status(503).json({ error: 'Could not reach payments. Try again in a moment.' });
  }
}
