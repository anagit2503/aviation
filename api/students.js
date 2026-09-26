// POST /api/students → instructor-only. Two actions:
//   { action: 'list' }                       → everyone who has signed in
//   { action: 'update', email, access }      → change one person's access
//   { action: 'delete', email }              → remove an account, its access and its doubts chat
//   { action: 'renew', email, subject }      → "Paid · continue": paid up one more month
//   { action: 'pauseSubject', email, subject } → "Not paid · pause" (only ever done by an instructor)
//
// Every call carries the instructor's Google token, and the server checks both
// that the token is real and that the email belongs to an instructor.
import {
  redis, verifyIdToken, isInstructorEmail, listAccounts, getProfile, saveAccess, getAccess,
  emptyAccess, storageReady, readJsonBody, ensureRenewals, extendRenewal, addMonths, todayIST,
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
  if (Array.isArray(input.paused)) {
    access.paused = input.paused.filter((s) => access.subjects.includes(s));
  }
  if (input.freeConsultations !== undefined && input.freeConsultations !== null) {
    access.freeConsultations = Math.max(0, Math.min(20, Math.floor(Number(input.freeConsultations) || 0)));
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
      const students = await Promise.all(accounts.filter((a) => !isInstructorEmail(a.email))
        .map(async (a) => ({ ...a, access: await ensureRenewals(a.email, a.access) })));
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
      const before = await getAccess(target);
      const clean = cleanAccess(access);
      // Keep renewal dates; a subject switched on by hand is paid up a month from today.
      const renewals = Object.fromEntries(clean.subjects.map((s) => [s, before.renewals?.[s] || addMonths(todayIST(), 1)]));
      const next = {
        ...clean,
        renewals,
        ...(clean.freeConsultations === undefined && before.freeConsultations !== undefined ? { freeConsultations: before.freeConsultations } : {}),
        updatedAt: new Date().toISOString(),
        updatedBy: person.email,
      };
      await saveAccess(target, next);
      res.status(200).json({ ok: true, student: { ...profile, access: next } });
      return;
    }

    if (action === 'renew' || action === 'pauseSubject') {
      const target = String(email || '').trim().toLowerCase();
      const subject = String(readJsonBody(req).subject || '');
      const current = await ensureRenewals(target, await getAccess(target));
      if (!(current.subjects || []).includes(subject)) {
        res.status(400).json({ error: 'That student does not have this subject.' });
        return;
      }
      const next = action === 'renew'
        ? {
          ...current,
          paused: (current.paused || []).filter((s) => s !== subject),
          renewals: { ...current.renewals, [subject]: extendRenewal(current.renewals?.[subject], 1) },
        }
        : { ...current, paused: [...new Set([...(current.paused || []), subject])] };
      next.updatedAt = new Date().toISOString();
      next.updatedBy = person.email;
      await saveAccess(target, next);
      const profile = await getProfile(target);
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
