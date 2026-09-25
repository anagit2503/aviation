// POST /api/messages → the doubts chat between each student and the instructors.
//
// Students (course students with at least one active, un-paused subject):
//   { action: 'thread', markRead }     → their own conversation
//   { action: 'send', text }           → ask a question
// Instructors:
//   { action: 'inbox' }                → every conversation, newest first
//   { action: 'thread', email }        → one student's conversation (marks it read)
//   { action: 'reply', email, text }   → answer a student
//
// Storage: one Redis list per student holds the messages; `inbox:threads` keeps a
// short summary per student for the inbox; two counters per student track what
// each side has not read yet.
import {
  redis, verifyIdToken, isInstructorEmail, getProfile, getAccess, storageReady, readJsonBody,
  bumpCounter, sendDoubtNotification,
} from './_lib.js';

const MAX_LENGTH = 2000;
const KEEP_MESSAGES = 500;
const MAX_PER_HOUR = 30;

const threadKey = (email) => `thread:${email}`;

async function readThread(email) {
  const raw = await redis(['LRANGE', threadKey(email), 0, -1]);
  return (raw || []).map((m) => { try { return JSON.parse(m); } catch { return null; } }).filter(Boolean);
}

async function addMessage(email, message, summary) {
  await redis(['RPUSH', threadKey(email), JSON.stringify(message)]);
  await redis(['LTRIM', threadKey(email), -KEEP_MESSAGES, -1]);
  await redis(['HSET', 'inbox:threads', email, JSON.stringify(summary)]);
}

function cleanText(text) {
  return String(text || '').trim().slice(0, MAX_LENGTH);
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
    res.status(503).json({ error: 'Messages are not switched on yet.' });
    return;
  }

  const instructor = isInstructorEmail(person.email);
  const now = new Date().toISOString();

  try {
    // ---------- Instructor side ----------
    if (instructor) {
      if (body.action === 'inbox') {
        const [summariesFlat, unreadFlat] = await Promise.all([
          redis(['HGETALL', 'inbox:threads']),
          redis(['HGETALL', 'inbox:unread']),
        ]);
        const unread = {};
        for (let i = 0; i < (unreadFlat || []).length; i += 2) unread[unreadFlat[i]] = Number(unreadFlat[i + 1]) || 0;
        const threads = [];
        for (let i = 0; i < (summariesFlat || []).length; i += 2) {
          try {
            threads.push({ email: summariesFlat[i], ...JSON.parse(summariesFlat[i + 1]), unread: unread[summariesFlat[i]] || 0 });
          } catch { /* skip unreadable rows */ }
        }
        threads.sort((a, b) => (b.lastAt || '').localeCompare(a.lastAt || ''));
        res.status(200).json({ threads });
        return;
      }

      const target = String(body.email || '').trim().toLowerCase();
      if (!target) {
        res.status(400).json({ error: 'Which student?' });
        return;
      }

      if (body.action === 'thread') {
        const [messages] = await Promise.all([
          readThread(target),
          redis(['HDEL', 'inbox:unread', target]),
        ]);
        res.status(200).json({ messages });
        return;
      }

      if (body.action === 'reply') {
        const text = cleanText(body.text);
        if (!text) {
          res.status(400).json({ error: 'Write a reply first.' });
          return;
        }
        const raw = await redis(['HGET', 'inbox:threads', target]);
        if (!raw) {
          res.status(404).json({ error: 'That student has not asked anything yet.' });
          return;
        }
        let previous = {};
        try { previous = JSON.parse(raw); } catch { /* keep going with an empty summary */ }
        const message = { from: 'instructor', by: person.name || person.email, text, at: now };
        await addMessage(target, message, {
          ...previous, lastAt: now, lastText: text.slice(0, 140), lastFrom: 'instructor',
        });
        await Promise.all([
          redis(['HINCRBY', 'inbox:studentUnread', target, 1]),
          redis(['HDEL', 'inbox:unread', target]),
        ]);
        res.status(200).json({ ok: true, message });
        return;
      }

      res.status(400).json({ error: 'Unknown action.' });
      return;
    }

    // ---------- Student side ----------
    // The doubts chat is part of the course: only students with a subject that
    // is switched on and not paused can use it.
    const access = await getAccess(person.email);
    const active = access.plan === 'course'
      && (access.subjects || []).some((s) => !(access.paused || []).includes(s));
    if (!active) {
      res.status(403).json({ error: 'The doubts chat opens once your course access is switched on.' });
      return;
    }

    if (body.action === 'thread') {
      const messages = await readThread(person.email);
      let unread = 0;
      if (body.markRead) {
        await redis(['HDEL', 'inbox:studentUnread', person.email]);
      } else {
        unread = Number(await redis(['HGET', 'inbox:studentUnread', person.email])) || 0;
      }
      res.status(200).json({ messages, unread });
      return;
    }

    if (body.action === 'send') {
      const text = cleanText(body.text);
      if (!text) {
        res.status(400).json({ error: 'Write your question first.' });
        return;
      }
      const sentThisHour = await bumpCounter(`ratelimit:doubts:${person.email}`, 60 * 60);
      if (sentThisHour > MAX_PER_HOUR) {
        res.status(429).json({ error: 'That is a lot of messages in one hour. Please wait a little and try again.' });
        return;
      }
      const profile = await getProfile(person.email);
      const name = profile?.name || person.name || '';
      const message = { from: 'student', text, at: now };
      await addMessage(person.email, message, {
        name, lastAt: now, lastText: text.slice(0, 140), lastFrom: 'student',
      });
      const unread = await redis(['HINCRBY', 'inbox:unread', person.email, 1]);
      // One email per batch of unanswered questions, not one per message.
      // Awaited, because a serverless function can stop as soon as it responds.
      if (Number(unread) === 1) {
        await sendDoubtNotification({ name, email: person.email, text });
      }
      res.status(200).json({ ok: true, message });
      return;
    }

    res.status(400).json({ error: 'Unknown action.' });
  } catch {
    res.status(503).json({ error: 'Could not reach messages. Try again in a moment.' });
  }
}
