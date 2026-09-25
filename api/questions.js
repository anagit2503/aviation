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
// Answers never reach a student's browser before they have answered, so the
// correct option cannot be read out of the page.
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
  const options = (Array.isArray(input.options) ? input.options : [])
    .map((o) => clip(o, 500)).filter(Boolean).slice(0, MAX_OPTIONS);
  // Number(null) is 0, which would quietly make option (a) correct.
  const answer = input.answer === null || input.answer === undefined || input.answer === '' ? NaN : Number(input.answer);
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
  if (!Number.isInteger(answer) || answer < 0 || answer >= q.options.length) {
    return { error: `"${q.text.slice(0, 40)}…" has no correct answer picked.` };
  }
  return { question: q };
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
    const allowed = (q) => q && access.subjects.includes(q.subject);

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
