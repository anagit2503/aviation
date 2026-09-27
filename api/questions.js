// POST /api/questions → the practice question bank.
//
// Instructors:
//   { action: 'list' }                    → every question, with answers
//   { action: 'save', questions: [...] }  → add new questions or update existing ones
//   { action: 'delete', ids: [...] }      → remove questions
// Students (course plan with the question bank switched on):
//   { action: 'list' }                    → questions in their subjects, WITHOUT answers, plus their progress
//   { action: 'answer', id, choice }      → records the attempt and reveals the correct option
//   { action: 'bookmark', id, on }        → bookmark or un-bookmark a question
//
// Timed tests (topic tests and mock exams), actions starting with "test":
//   Instructors: testList · testSave { test } · testUpdate { id, title, durationMinutes } · testDelete { id }
//   Students:    testList (their subjects, no answers) · testStart { id } → questions without answers
//                testSubmit { id, answers, minutes, timeTakenSec } → marked here, attempt saved · testAttempts
//
// Answers never reach a student's browser before they have answered (or, for
// a test, submitted), so the correct option cannot be read out of the page.
import {
  redis, verifyIdToken, isInstructorEmail, getAccess, storageReady, readJsonBody,
} from './_lib.js';

// Keep in sync with SUBJECTS in src/App.jsx.
const SUBJECT_NAMES = [
  'Air Navigation', 'Aviation Meteorology', 'Air Regulations',
  'Technical General', 'Technical Specific', 'Radio Telephony (RTR)',
];
const MAX_OPTIONS = 8;
const SAVE_CHUNK = 100;

const progressKey = (email) => `progress:${email}`;

function parseHash(flat) {
  const out = {};
  for (let i = 0; i < (flat || []).length; i += 2) {
    try { out[flat[i]] = JSON.parse(flat[i + 1]); } catch { /* skip unreadable rows */ }
  }
  return out;
}

async function allQuestions() {
  return Object.values(parseHash(await redis(['HGETALL', 'questions'])));
}

const clip = (value, max) => String(value || '').trim().slice(0, max);

// Returns a clean question, or a reason it cannot be saved.
function cleanQuestion(input, by) {
  if (!input || typeof input !== 'object') return { error: 'Unreadable question.' };
  // Blank options are dropped, and the answer index is moved with them, so
  // "a, (blank), c ✓, d" still saves c as correct and not d.
  const raw = (Array.isArray(input.options) ? input.options : []).map((o) => clip(o, 500));
  // Number(null) is 0, which would quietly make option (a) correct.
  const picked = input.answer === null || input.answer === undefined || input.answer === '' ? NaN : Number(input.answer);
  const kept = raw.map((text, i) => ({ text, i })).filter((o) => o.text).slice(0, MAX_OPTIONS);
  const options = kept.map((o) => o.text);
  const answer = kept.findIndex((o) => o.i === picked);
  const q = {
    id: typeof input.id === 'string' && /^[a-z0-9-]{8,40}$/i.test(input.id) ? input.id : crypto.randomUUID(),
    subject: input.subject,
    topic: clip(input.topic, 80),
    subtopic: clip(input.subtopic, 80),
    text: clip(input.text, 2000),
    options,
    answer,
    source: clip(input.source, 120),
    number: Number(input.number) || null,
    updatedAt: new Date().toISOString(),
    updatedBy: by,
  };
  if (!SUBJECT_NAMES.includes(q.subject)) return { error: 'Pick a subject.' };
  if (!q.text) return { error: 'A question is empty.' };
  if (q.options.length < 2) return { error: `"${q.text.slice(0, 40)}…" needs at least two options.` };
  if (answer < 0) {
    return { error: `"${q.text.slice(0, 40)}…" has no correct answer picked.` };
  }
  return { question: q };
}

// ---------- Timed tests ----------
const TEST_TYPES = ['test', 'mock'];
const attemptsKey = (email) => `attempts:${email}`;

async function getTest(id) {
  const raw = await redis(['HGET', 'tests', String(id || '')]);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

// Chapter-by-chapter marks for a result.
function byChapter(questions, answers) {
  const out = {};
  for (const q of questions) {
    const key = q.topic || 'Other';
    out[key] ??= { chapter: key, total: 0, correct: 0 };
    out[key].total += 1;
    if (answers[q.id] === q.answer) out[key].correct += 1;
  }
  return Object.values(out).sort((a, b) => a.chapter.localeCompare(b.chapter));
}

async function handleTests(body, person, instructor, res) {
  if (instructor) {
    if (body.action === 'testList') {
      const tests = Object.values(parseHash(await redis(['HGETALL', 'tests'])))
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      res.status(200).json({ tests });
      return;
    }
    if (body.action === 'testSave') {
      const t = body.test || {};
      if (!SUBJECT_NAMES.includes(t.subject)) { res.status(400).json({ error: 'Pick a subject.' }); return; }
      const minutes = Math.round(Number(t.durationMinutes));
      if (!(minutes >= 1 && minutes <= 600)) { res.status(400).json({ error: 'Enter the test time in minutes (1 to 600).' }); return; }
      const incoming = Array.isArray(t.questions) ? t.questions : [];
      if (incoming.length === 0 || incoming.length > 500) { res.status(400).json({ error: 'A test needs between 1 and 500 questions.' }); return; }
      const questions = [];
      for (const item of incoming) {
        const { question, error } = cleanQuestion({ ...item, subject: t.subject }, person.email);
        if (error) { res.status(400).json({ error }); return; }
        questions.push(question);
      }
      const now = new Date().toISOString();
      const existing = t.id ? await getTest(t.id) : null;
      const test = {
        id: existing?.id || crypto.randomUUID(),
        title: clip(t.title, 120) || 'Untitled test',
        subject: t.subject,
        type: TEST_TYPES.includes(t.type) ? t.type : 'test',
        durationMinutes: minutes,
        questions,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
        updatedBy: person.email,
      };
      await redis(['HSET', 'tests', test.id, JSON.stringify(test)]);
      res.status(200).json({ ok: true, test });
      return;
    }
    if (body.action === 'testUpdate') {
      const test = await getTest(body.id);
      if (!test) { res.status(404).json({ error: 'That test no longer exists.' }); return; }
      if (body.title !== undefined) test.title = clip(body.title, 120) || test.title;
      if (body.durationMinutes !== undefined) {
        const minutes = Math.round(Number(body.durationMinutes));
        if (!(minutes >= 1 && minutes <= 600)) { res.status(400).json({ error: 'Enter the test time in minutes (1 to 600).' }); return; }
        test.durationMinutes = minutes;
      }
      test.updatedAt = new Date().toISOString();
      await redis(['HSET', 'tests', test.id, JSON.stringify(test)]);
      res.status(200).json({ ok: true, test });
      return;
    }
    if (body.action === 'testDelete') {
      await redis(['HDEL', 'tests', String(body.id || '')]);
      res.status(200).json({ ok: true });
      return;
    }
    res.status(400).json({ error: 'Unknown action.' });
    return;
  }

  // Students: tests need course access with tests switched on, for an active subject.
  const access = await getAccess(person.email);
  if (access.plan !== 'course' || !access.tests) {
    res.status(403).json({ error: 'Tests are not part of your access yet.' });
    return;
  }
  const allowed = (t) => t && access.subjects.includes(t.subject) && !(access.paused || []).includes(t.subject);

  if (body.action === 'testList') {
    const [tests, attempts] = await Promise.all([
      redis(['HGETALL', 'tests']).then(parseHash),
      redis(['HGETALL', attemptsKey(person.email)]).then(parseHash),
    ]);
    const list = Object.values(tests).filter(allowed)
      .map(({ questions, updatedBy, ...meta }) => ({ ...meta, count: questions.length }))
      .sort((a, b) => a.subject.localeCompare(b.subject) || (b.createdAt || '').localeCompare(a.createdAt || ''));
    const history = Object.values(attempts).sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));
    res.status(200).json({ tests: list, attempts: history });
    return;
  }

  const test = await getTest(body.id);
  if (!allowed(test)) { res.status(404).json({ error: 'That test is not available.' }); return; }

  if (body.action === 'testStart') {
    res.status(200).json({
      test: {
        id: test.id, title: test.title, subject: test.subject, type: test.type, durationMinutes: test.durationMinutes,
        questions: test.questions.map(({ answer, updatedBy, updatedAt, createdAt, ...q }) => q),
      },
    });
    return;
  }

  if (body.action === 'testSubmit') {
    const given = body.answers && typeof body.answers === 'object' ? body.answers : {};
    const answers = {};
    for (const q of test.questions) {
      const a = Number(given[q.id]);
      if (Number.isInteger(a) && a >= 0 && a < q.options.length) answers[q.id] = a;
    }
    const correct = test.questions.filter((q) => answers[q.id] === q.answer).length;
    const attempted = Object.keys(answers).length;
    const attempt = {
      id: crypto.randomUUID(),
      testId: test.id,
      title: test.title,
      subject: test.subject,
      total: test.questions.length,
      correct,
      wrong: attempted - correct,
      skipped: test.questions.length - attempted,
      percent: Math.round((correct / test.questions.length) * 100),
      minutes: Math.max(1, Math.round(Number(body.minutes) || test.durationMinutes)),
      timeTakenSec: Math.max(0, Math.round(Number(body.timeTakenSec) || 0)),
      submittedAt: new Date().toISOString(),
    };
    await redis(['HSET', attemptsKey(person.email), attempt.id, JSON.stringify(attempt)]);
    res.status(200).json({
      attempt,
      chapters: byChapter(test.questions, answers),
      review: test.questions.map((q) => ({ id: q.id, text: q.text, options: q.options, answer: q.answer, given: answers[q.id] ?? null, topic: q.topic })),
    });
    return;
  }

  res.status(400).json({ error: 'Unknown action.' });
}

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
    res.status(503).json({ error: 'Storage is not switched on yet.' });
    return;
  }
  const instructor = isInstructorEmail(person.email);

  try {
    if (String(body.action || '').startsWith('test')) {
      await handleTests(body, person, instructor, res);
      return;
    }

    // ---------- Instructor side ----------
    if (instructor) {
      if (body.action === 'list') {
        const questions = await allQuestions();
        questions.sort((a, b) => (a.source || '').localeCompare(b.source || '') || (a.number || 0) - (b.number || 0));
        res.status(200).json({ questions });
        return;
      }

      if (body.action === 'save') {
        const incoming = Array.isArray(body.questions) ? body.questions : [];
        if (incoming.length === 0 || incoming.length > 1000) {
          res.status(400).json({ error: 'Send between 1 and 1000 questions at a time.' });
          return;
        }
        const clean = [];
        for (const item of incoming) {
          const { question, error } = cleanQuestion(item, person.email);
          if (error) {
            res.status(400).json({ error });
            return;
          }
          clean.push(question);
        }
        // Keep the original creation time when a question is edited.
        const stored = await redis(['HMGET', 'questions', ...clean.map((q) => q.id)]);
        clean.forEach((q, i) => {
          let createdAt = null;
          try { createdAt = stored?.[i] ? JSON.parse(stored[i]).createdAt : null; } catch { /* treat as new */ }
          q.createdAt = createdAt || q.updatedAt;
        });
        for (let i = 0; i < clean.length; i += SAVE_CHUNK) {
          const chunk = clean.slice(i, i + SAVE_CHUNK);
          await redis(['HSET', 'questions', ...chunk.flatMap((q) => [q.id, JSON.stringify(q)])]);
        }
        res.status(200).json({ ok: true, questions: clean });
        return;
      }

      if (body.action === 'delete') {
        const ids = (Array.isArray(body.ids) ? body.ids : []).filter((id) => typeof id === 'string').slice(0, 1000);
        if (ids.length) await redis(['HDEL', 'questions', ...ids]);
        res.status(200).json({ ok: true });
        return;
      }

      res.status(400).json({ error: 'Unknown action.' });
      return;
    }

    // ---------- Student side ----------
    if (!['list', 'answer', 'bookmark'].includes(body.action)) {
      res.status(403).json({ error: 'Only instructors can change questions.' });
      return;
    }
    const access = await getAccess(person.email);
    if (access.plan !== 'course' || !access.questions) {
      res.status(403).json({ error: 'The question bank is not part of your access yet.' });
      return;
    }
    const allowed = (q) => q && access.subjects.includes(q.subject) && !(access.paused || []).includes(q.subject);

    if (body.action === 'list') {
      const [questions, progress] = await Promise.all([
        allQuestions(),
        redis(['HGETALL', progressKey(person.email)]).then(parseHash),
      ]);
      const visible = questions
        .filter(allowed)
        .sort((a, b) => a.subject.localeCompare(b.subject)
          || (a.source || '').localeCompare(b.source || '') || (a.number || 0) - (b.number || 0))
        .map(({ answer, updatedBy, ...rest }) => rest);
      res.status(200).json({ questions: visible, progress });
      return;
    }

    const id = String(body.id || '');
    const raw = await redis(['HGET', 'questions', id]);
    let question = null;
    try { question = raw ? JSON.parse(raw) : null; } catch { question = null; }
    if (!allowed(question)) {
      res.status(404).json({ error: 'That question is not available.' });
      return;
    }
    const before = parseHash([id, await redis(['HGET', progressKey(person.email), id])])[id] || {};

    if (body.action === 'answer') {
      const choice = Number(body.choice);
      if (!Number.isInteger(choice) || choice < 0 || choice >= question.options.length) {
        res.status(400).json({ error: 'Pick one of the options.' });
        return;
      }
      const correct = choice === question.answer;
      const next = {
        ...before,
        attempts: (before.attempts || 0) + 1,
        lastChoice: choice,
        lastCorrect: correct,
        everCorrect: Boolean(before.everCorrect || correct),
        at: new Date().toISOString(),
      };
      await redis(['HSET', progressKey(person.email), id, JSON.stringify(next)]);
      res.status(200).json({ correct, answer: question.answer, progress: next });
      return;
    }

    if (body.action === 'bookmark') {
      const next = { ...before, bookmarked: Boolean(body.on) };
      await redis(['HSET', progressKey(person.email), id, JSON.stringify(next)]);
      res.status(200).json({ progress: next });
      return;
    }

    res.status(400).json({ error: 'Unknown action.' });
  } catch (err) {
    console.error('questions failed:', err?.message);
    res.status(503).json({ error: 'Could not reach the question bank. Try again in a moment.' });
  }
}
