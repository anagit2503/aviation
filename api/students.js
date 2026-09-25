// POST /api/students → instructor-only. Two actions:
//   { action: 'list' }                       → everyone who has signed in
//   { action: 'update', email, access }      → change one person's access
//   { action: 'delete', email }              → remove an account, its access and its doubts chat
//
// Every call carries the instructor's Google token, and the server checks both
// that the token is real and that the email belongs to an instructor.
import {
  redis, verifyIdToken, isInstructorEmail, listAccounts, getProfile, saveAccess,
  emptyAccess, storageReady, readJsonBody,
} from './_lib.js';

const PLANS = ['none', 'consultation', 'course'];

function cleanAccess(input) {
  const access = emptyAccess();
  if (!input || typeof input !== 'object') return access;
  if (PLANS.includes(input.plan)) access.plan = input.plan;
  if (Array.isArray(input.subjects)) {
    access.subjects = input.subjects
      .filter((s) => typeof s === 'string')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 20);
  }
  access.questions = Boolean(input.questions);
  access.tests = Boolean(input.tests);
  return access;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST.' });
    return;
  }

  const { idToken, action, email, access } = readJsonBody(req);

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
    res.status(503).json({ error: 'Student storage is not switched on yet.' });
    return;
  }

  try {
    if (action === 'list') {
      const accounts = await listAccounts();
      // Instructor accounts are not students and never need access granted.
      const students = accounts.filter((a) => !isInstructorEmail(a.email));
      const instructors = accounts.filter((a) => isInstructorEmail(a.email)).map((a) => a.email);
      res.status(200).json({ students, instructors });
      return;
    }

    if (action === 'update') {
      const target = String(email || '').trim().toLowerCase();
      if (!target) {
        res.status(400).json({ error: 'Which student should change?' });
        return;
      }
      const profile = await getProfile(target);
      if (!profile) {
        res.status(404).json({ error: 'No account with that email has signed in yet.' });
        return;
      }
      const next = {
        ...cleanAccess(access),
        updatedAt: new Date().toISOString(),
        updatedBy: person.email,
      };
      await saveAccess(target, next);
      res.status(200).json({ ok: true, student: { ...profile, access: next } });
      return;
    }

    if (action === 'delete') {
      const target = String(email || '').trim().toLowerCase();
      if (!target || isInstructorEmail(target)) {
        res.status(400).json({ error: 'That account cannot be removed here.' });
        return;
      }
      // If they sign in again they come back as a new account with no access.
      await Promise.all([
        redis(['HDEL', 'accounts', target]),
        redis(['HDEL', 'access', target]),
        redis(['DEL', `thread:${target}`]),
        redis(['HDEL', 'inbox:threads', target]),
        redis(['HDEL', 'inbox:unread', target]),
        redis(['HDEL', 'inbox:studentUnread', target]),
      ]);
      res.status(200).json({ ok: true });
      return;
    }

    res.status(400).json({ error: 'Unknown action.' });
  } catch {
    res.status(503).json({ error: 'Could not reach the student list. Try again in a moment.' });
  }
}
