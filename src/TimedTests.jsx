import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, Check, X, Clock, Flag, LoaderCircle, Minus, Plus, ClipboardCheck, RotateCcw, Trophy,
} from 'lucide-react';
import { btnPrimary, btnGhost, card } from './ui.jsx';
import { currentIdToken } from './auth.js';

// Timed topic tests and mock exams for students.
// List → set the time (− / +) → Proceed → one question at a time with a
// countdown and a per-question time guide → submit (or time runs out) →
// score, chapter-by-chapter marks and a full review. Answers stay on the
// server until the test is submitted.

const letter = (i) => String.fromCharCode(97 + i);
const clock = (sec) => {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const r = s % 60;
  return `${h ? `${h}:` : ''}${String(m).padStart(h ? 2 : 1, '0')}:${String(r).padStart(2, '0')}`;
};
const pace = (sec) => {
  const m = Math.floor(sec / 60); const s = Math.round(sec % 60);
  return m ? `${m} min${s ? ` ${s} s` : ''}` : `${s} s`;
};
const saveKey = (id) => `avero-test-${id}`;

async function call(body, fallbackToken) {
  const idToken = (await currentIdToken()) || fallbackToken;
  const res = await fetch('/api/questions', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken, ...body }),
  });
  let data = {};
  try { data = await res.json(); } catch { /* empty reply */ }
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

export default function TimedTests({ user, files = [], renderFile }) {
  const [tests, setTests] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stage, setStage] = useState({ name: 'list' }); // list | setup | run | result

  const load = () => {
    setLoading(true);
    call({ action: 'testList' }, user.idToken)
      .then((d) => { setTests(d.tests || []); setAttempts(d.attempts || []); setError(''); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  // Resume a test that was in progress when the page was closed or refreshed.
  useEffect(() => {
    if (stage.name !== 'list' || tests.length === 0) return;
    for (const t of tests) {
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem(saveKey(t.id)) || 'null'); } catch { /* ignore */ }
      if (saved && saved.deadline > Date.now()) {
        call({ action: 'testStart', id: t.id }, user.idToken)
          .then((d) => setStage({ name: 'run', test: d.test, minutes: saved.minutes, resume: saved }))
          .catch(() => {});
        return;
      }
    }
  }, [tests]);

  const best = (testId) => attempts.filter((a) => a.testId === testId).reduce((b, a) => Math.max(b, a.percent), -1);

  if (stage.name === 'setup') {
    return <TestSetup test={stage.test} onBack={() => setStage({ name: 'list' })}
      onProceed={async (minutes) => {
        const d = await call({ action: 'testStart', id: stage.test.id }, user.idToken);
        setStage({ name: 'run', test: d.test, minutes });
      }} />;
  }
  if (stage.name === 'run') {
    return <TestRunner test={stage.test} minutes={stage.minutes} resume={stage.resume}
      onSubmit={async (answers, timeTakenSec) => {
        const d = await call({ action: 'testSubmit', id: stage.test.id, answers, minutes: stage.minutes, timeTakenSec }, user.idToken);
        try { localStorage.removeItem(saveKey(stage.test.id)); } catch { /* ignore */ }
        setStage({ name: 'result', test: stage.test, result: d });
        load();
      }} />;
  }
  if (stage.name === 'result') {
    return <TestResult result={stage.result} onBack={() => setStage({ name: 'list' })}
      onRetake={() => setStage({ name: 'setup', test: tests.find((t) => t.id === stage.test.id) || { ...stage.test, count: stage.test.questions.length } })} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-ink">Tests</h2>
        <p className="text-sm text-muted">Timed topic tests and mock exams. You can set your own time before you start.</p>
      </div>
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
      {loading && <div className={`${card} p-10 text-center text-muted`}>Loading tests…</div>}
      {!loading && tests.length === 0 && !error && (
        <div className={`${card} p-10 text-center`}>
          <ClipboardCheck className="mx-auto h-10 w-10 text-brand" />
          <p className="mt-4 font-bold text-ink">No tests yet</p>
          <p className="mt-1 text-muted">Timed tests appear here as soon as your instructor adds them.</p>
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {tests.map((t) => {
          const b = best(t.id);
          return (
            <div key={t.id} className={`${card} flex flex-col p-5`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-ink">{t.title}</p>
                  <p className="mt-0.5 text-sm text-muted">{t.subject} · {t.type === 'mock' ? 'Mock exam' : 'Topic test'}</p>
                </div>
                {b >= 0 && <span className="whitespace-nowrap rounded-full bg-go/10 px-2.5 py-1 text-xs font-bold text-go">Best {b}%</span>}
              </div>
              <p className="mt-3 flex-1 text-sm text-muted">
                {t.count} questions · {t.durationMinutes} min · about {pace((t.durationMinutes * 60) / t.count)} per question
              </p>
              <button onClick={() => setStage({ name: 'setup', test: t })} className={`${btnPrimary} mt-4 w-full py-2.5 text-sm`}>
                {b >= 0 ? 'Take again' : 'Start test'}
              </button>
            </div>
          );
        })}
      </div>

      {attempts.length > 0 && (
        <div>
          <h3 className="mb-3 font-bold text-ink">Your results</h3>
          <div className={`${card} divide-y divide-line`}>
            {attempts.slice(0, 20).map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold text-ink">{a.title}</p>
                  <p className="text-muted">
                    {new Date(a.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {a.correct}/{a.total} correct · {clock(a.timeTakenSec)} of {a.minutes} min
                  </p>
                </div>
                <span className={`text-lg font-extrabold ${a.percent >= 70 ? 'text-go' : 'text-ink'}`}>{a.percent}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-ink">Test papers</h3>
          {files.map(renderFile)}
        </div>
      )}
    </div>
  );
}

function TestSetup({ test, onBack, onProceed }) {
  const [minutes, setMinutes] = useState(test.durationMinutes);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const step = test.durationMinutes >= 30 ? 5 : 1;
  const clamp = (m) => Math.max(1, Math.min(600, Math.round(m)));
  const proceed = async () => {
    setBusy(true);
    setError('');
    try { await onProceed(minutes); } catch (err) { setError(err.message); setBusy(false); }
  };
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> All tests
      </button>
      <div className={`${card} p-6 sm:p-8`}>
        <p className="text-sm text-muted">{test.subject} · {test.type === 'mock' ? 'Mock exam' : 'Topic test'}</p>
        <h2 className="mt-1 text-2xl font-extrabold text-ink">{test.title}</h2>
        <p className="mt-2 text-muted">{test.count} questions · suggested time {test.durationMinutes} min</p>

        <div className="mt-6 rounded-2xl bg-mist p-5">
          <p className="text-sm font-semibold text-ink">Your time for this test</p>
          <div className="mt-3 flex items-center justify-center gap-4">
            <button type="button" onClick={() => setMinutes((m) => clamp(m - step))} disabled={minutes <= 1}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-ink transition hover:border-brand disabled:opacity-40" aria-label="Less time">
              <Minus className="h-5 w-5" />
            </button>
            <div className="text-center">
              <p className="text-4xl font-extrabold tracking-tight text-ink">{minutes}<span className="text-lg font-semibold text-muted"> min</span></p>
              <p className="text-sm text-muted">about {pace((minutes * 60) / test.count)} per question</p>
            </div>
            <button type="button" onClick={() => setMinutes((m) => clamp(m + step))}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-ink transition hover:border-brand" aria-label="More time">
              <Plus className="h-5 w-5" />
            </button>
          </div>
          {minutes !== test.durationMinutes && (
            <button onClick={() => setMinutes(test.durationMinutes)} className="mx-auto mt-3 block text-sm font-semibold text-brand">
              Back to the suggested {test.durationMinutes} min
            </button>
          )}
        </div>

        <ul className="mt-6 space-y-1.5 text-sm text-muted">
          <li>• One question at a time; you can go back and change answers.</li>
          <li>• The clock keeps running if you leave the page, and the test submits itself when time is up.</li>
          <li>• One mark per correct answer; nothing is taken off for wrong answers.</li>
        </ul>
        {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}
        <button onClick={proceed} disabled={busy} className={`${btnPrimary} mt-6 w-full py-3.5`}>
          {busy ? <LoaderCircle className="h-5 w-5 animate-spin" /> : null} Proceed
        </button>
      </div>
    </div>
  );
}

function TestRunner({ test, minutes, resume, onSubmit }) {
  const total = test.questions.length;
  const perQuestion = (minutes * 60) / total;
  const [deadline] = useState(() => resume?.deadline || Date.now() + minutes * 60 * 1000);
  const [startedAt] = useState(() => resume?.startedAt || Date.now());
  const [answers, setAnswers] = useState(() => resume?.answers || {});
  const [flagged, setFlagged] = useState(() => new Set(resume?.flagged || []));
  const [index, setIndex] = useState(() => resume?.index || 0);
  const [spent, setSpent] = useState(() => resume?.spent || {}); // seconds on each question
  const [now, setNow] = useState(Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const submitted = useRef(false);
  const q = test.questions[index];
  const left = (deadline - now) / 1000;

  // Tick every second; count time on the current question.
  useEffect(() => {
    const t = setInterval(() => {
      setNow(Date.now());
      setSpent((s) => ({ ...s, [q.id]: (s[q.id] || 0) + 1 }));
    }, 1000);
    return () => clearInterval(t);
  }, [q.id]);

  // Keep progress on this device, so a refresh does not lose the attempt.
  useEffect(() => {
    try {
      localStorage.setItem(saveKey(test.id), JSON.stringify({ deadline, startedAt, minutes, answers, flagged: [...flagged], index, spent }));
    } catch { /* not important */ }
  }, [answers, flagged, index, spent]);

  useEffect(() => {
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  const submit = async () => {
    if (submitted.current) return;
    submitted.current = true;
    setSubmitting(true);
    setError('');
    try {
      await onSubmit(answers, Math.min(minutes * 60, (Date.now() - startedAt) / 1000));
    } catch (err) {
      submitted.current = false;
      setSubmitting(false);
      setError(`${err.message} Your answers are kept; press Submit again.`);
    }
  };

  // Time is up: submit automatically.
  useEffect(() => { if (left <= 0) submit(); }, [left <= 0]);

  const answered = Object.keys(answers).length;
  const askSubmit = () => {
    const blank = total - answered;
    if (window.confirm(blank ? `You have ${blank} unanswered question${blank === 1 ? '' : 's'}. Submit anyway?` : 'Submit your test?')) submit();
  };
  const onQ = spent[q.id] || 0;
  const over = onQ > perQuestion;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Timer bar */}
      <div className={`${card} sticky top-[110px] z-30 flex flex-wrap items-center justify-between gap-3 p-4`}>
        <div className="min-w-0">
          <p className="truncate font-bold text-ink">{test.title}</p>
          <p className="text-sm text-muted">{answered} of {total} answered</p>
        </div>
        <div className={`flex items-center gap-2 rounded-full px-4 py-2 text-lg font-extrabold tabular-nums ${left <= 300 ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300' : 'bg-mist text-ink'}`}>
          <Clock className="h-5 w-5" /> {clock(left)}
        </div>
        <button onClick={askSubmit} disabled={submitting} className={`${btnPrimary} px-5 py-2 text-sm`}>
          {submitting ? 'Submitting…' : 'Submit'}
        </button>
      </div>

      {/* Question */}
      <div className={`${card} p-6 sm:p-8`}>
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="rounded-full bg-sky px-3 py-1 font-semibold text-ink">Question {index + 1} of {total}</span>
          <span className={`tabular-nums ${over ? 'font-semibold text-amber-700 dark:text-amber-300' : 'text-muted'}`}>
            This question: {clock(onQ)} / {pace(perQuestion)} suggested
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
          <div className={`h-full rounded-full transition-all ${over ? 'bg-amber-500' : 'bg-go'}`} style={{ width: `${Math.min(100, (onQ / perQuestion) * 100)}%` }} />
        </div>
        <p className="mt-5 whitespace-pre-wrap text-lg font-semibold leading-relaxed text-ink">{q.text}</p>
        <div className="mt-6 space-y-2.5">
          {q.options.map((option, i) => {
            const on = answers[q.id] === i;
            return (
              <button key={i} onClick={() => setAnswers((a) => ({ ...a, [q.id]: i }))}
                className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition ${on ? 'border-brand bg-sky ring-2 ring-brand' : 'border-line hover:border-brand hover:bg-sky'}`}>
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${on ? 'border-brand bg-brand text-on-brand' : 'border-line text-muted'}`}>{letter(i)}</span>
                <span className="text-ink">{option}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0} className={`${btnGhost} px-5 py-2.5 text-sm disabled:opacity-50`}>Previous</button>
          <div className="flex gap-2">
            {answers[q.id] !== undefined && (
              <button onClick={() => setAnswers((a) => { const n = { ...a }; delete n[q.id]; return n; })} className="px-3 py-2 text-sm font-semibold text-muted hover:text-ink">Clear answer</button>
            )}
            <button onClick={() => setFlagged((f) => { const n = new Set(f); if (n.has(q.id)) n.delete(q.id); else n.add(q.id); return n; })}
              className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition ${flagged.has(q.id) ? 'border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200' : 'border-line text-ink hover:border-brand'}`}>
              <Flag className="h-4 w-4" /> {flagged.has(q.id) ? 'Marked' : 'Mark for review'}
            </button>
          </div>
          {index < total - 1
            ? <button onClick={() => setIndex((i) => i + 1)} className={`${btnPrimary} px-6 py-2.5 text-sm`}>Next</button>
            : <button onClick={askSubmit} disabled={submitting} className={`${btnPrimary} px-6 py-2.5 text-sm`}>Submit test</button>}
        </div>
        {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}
      </div>

      {/* Question grid */}
      <div className={`${card} p-5`}>
        <p className="mb-3 text-sm font-semibold text-ink">Jump to a question</p>
        <div className="flex flex-wrap gap-2">
          {test.questions.map((x, i) => (
            <button key={x.id} onClick={() => setIndex(i)}
              className={`h-9 w-9 rounded-lg text-sm font-bold transition ${
                i === index ? 'ring-2 ring-brand ring-offset-1 ring-offset-surface' : ''} ${
                flagged.has(x.id) ? 'bg-amber-400 text-black' : answers[x.id] !== undefined ? 'bg-brand text-on-brand' : 'bg-mist text-muted hover:text-ink'}`}>
              {i + 1}
            </button>
          ))}
        </div>
        <p className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-brand" /> Answered</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-amber-400" /> Marked for review</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-mist ring-1 ring-line" /> Not answered</span>
        </p>
      </div>
    </div>
  );
}

function TestResult({ result, onBack, onRetake }) {
  const { attempt, chapters, review } = result;
  const [show, setShow] = useState('all'); // all | wrong
  const shown = review.filter((r) => show === 'all' || r.given !== r.answer);
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className={`${card} p-6 text-center sm:p-10`}>
        <Trophy className={`mx-auto h-10 w-10 ${attempt.percent >= 70 ? 'text-go' : 'text-brand'}`} />
        <p className="mt-3 text-sm text-muted">{attempt.title}</p>
        <p className="mt-1 text-5xl font-extrabold tracking-tight text-ink">{attempt.correct}<span className="text-2xl text-muted">/{attempt.total}</span></p>
        <p className={`mt-1 text-xl font-bold ${attempt.percent >= 70 ? 'text-go' : 'text-ink'}`}>{attempt.percent}%</p>
        <div className="mx-auto mt-6 grid max-w-md grid-cols-3 gap-3 text-sm">
          <div className="rounded-xl bg-go/10 p-3"><p className="text-lg font-extrabold text-go">{attempt.correct}</p><p className="text-muted">Correct</p></div>
          <div className="rounded-xl bg-red-50 p-3 dark:bg-red-950/40"><p className="text-lg font-extrabold text-red-600">{attempt.wrong}</p><p className="text-muted">Wrong</p></div>
          <div className="rounded-xl bg-mist p-3"><p className="text-lg font-extrabold text-ink">{attempt.skipped}</p><p className="text-muted">Skipped</p></div>
        </div>
        <p className="mt-4 text-sm text-muted">Time taken {clock(attempt.timeTakenSec)} of {attempt.minutes} min</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button onClick={onRetake} className={btnPrimary}><RotateCcw className="h-4 w-4" /> Retake</button>
          <button onClick={onBack} className={btnGhost}>All tests</button>
        </div>
      </div>

      {chapters.length > 1 && (
        <div className={`${card} p-5`}>
          <p className="mb-3 font-bold text-ink">By chapter</p>
          <div className="space-y-2.5">
            {chapters.map((c) => {
              const pct = Math.round((c.correct / c.total) * 100);
              return (
                <div key={c.chapter}>
                  <div className="flex justify-between text-sm"><span className="text-ink">{c.chapter}</span><span className="text-muted">{c.correct}/{c.total} · {pct}%</span></div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-line"><div className={`h-full rounded-full ${pct >= 70 ? 'bg-go' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} /></div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="font-bold text-ink">Review</p>
        <div className="flex gap-2">
          {[['all', 'All'], ['wrong', 'Wrong or skipped']].map(([id, label]) => (
            <button key={id} onClick={() => setShow(id)}
              className={`rounded-full border px-3 py-1 text-sm font-semibold ${show === id ? 'border-brand bg-brand text-on-brand' : 'border-line text-ink'}`}>{label}</button>
          ))}
        </div>
      </div>
      {shown.map((r) => {
        const n = review.indexOf(r) + 1;
        return (
          <div key={r.id} className={`${card} p-5`}>
            <p className="text-sm text-muted">Question {n}{r.given === null ? ' · skipped' : ''}</p>
            <p className="mt-1 font-semibold text-ink">{r.text}</p>
            <div className="mt-3 space-y-1.5 text-sm">
              {r.options.map((o, i) => {
                const right = i === r.answer; const mine = i === r.given;
                return (
                  <div key={i} className={`flex items-center gap-2 rounded-lg px-3 py-2 ${right ? 'bg-go/10' : mine ? 'bg-red-50 dark:bg-red-950/40' : ''}`}>
                    {right ? <Check className="h-4 w-4 text-go" strokeWidth={3} /> : mine ? <X className="h-4 w-4 text-red-600" strokeWidth={3} /> : <span className="w-4 text-center text-muted">{letter(i)}</span>}
                    <span className="text-ink">{o}</span>
                    {mine && <span className="ml-auto text-xs text-muted">your answer</span>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
