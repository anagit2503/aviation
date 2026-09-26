import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, Check, ChevronLeft, ChevronRight, Video, MessageSquare, Map as MapIcon, Circle, Clock, CalendarDays, CalendarCheck, Wallet,
} from 'lucide-react';
import { Logo, ThemeToggle, btnPrimary, card, input, SLOT_TIMES, MEET_LINK } from './ui.jsx';

import { CONSULTATION, RECORDING_PRICE } from '../api/_pricing.js';
import UpiPay from './UpiPay.jsx';

// What is actually charged is decided in api/book.js from the same table.

// Examples only: the point is that nothing is off the table.
const TALK_ABOUT = [
  'DGCA exams',
  'Choosing a flight school',
  'US visa',
  'What to carry with you',
  'What every student pilot should have',
  'Costs and timelines',
  'Licence conversion',
  'Life abroad during training',
];

const DOUBT_INCLUDED = [
  { icon: Video, text: '1 hour 1-on-1 on Google Meet' },
  { icon: MessageSquare, text: 'Bring the exact questions you are stuck on' },
  { icon: MapIcon, text: 'We go through it step by step until it clicks' },
  { icon: Clock, text: 'Free with your course' },
];

const INCLUDED = [
  { icon: Video, text: '1 hour 1-on-1 on Google Meet' },
  { icon: MessageSquare, text: 'Open Q&A for all your doubts' },
  { icon: MapIcon, text: 'A study and career plan made for you' },
  { icon: Clock, text: 'Notes and next steps after the call' },
  { icon: Wallet, text: 'Honest talk about pricing and timelines' },
];

// Dates are handled in IST, since that is where sessions are held.
const IST = 'Asia/Kolkata';
const istToday = () => new Date(new Date().toLocaleString('en-US', { timeZone: IST }));

function toKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Bookable up to a year ahead.
const DAYS_AHEAD = 366;
const HELPER = 'This helps us understand your need and cater to it better.';
const LOCAL_BOOKINGS = 'avero-bookings';

// Bookings made on this device without signing in, so the page can remind
// the visitor what they already booked.
function readLocalBookings() {
  try {
    const today = toKey(istToday());
    return JSON.parse(localStorage.getItem(LOCAL_BOOKINGS) || '[]').filter((b) => b.date >= today);
  } catch { return []; }
}
function saveLocalBooking(b) {
  try { localStorage.setItem(LOCAL_BOOKINGS, JSON.stringify([...readLocalBookings(), b].slice(-10))); } catch { /* not important */ }
}

function buildDays(count = DAYS_AHEAD) {
  const start = istToday();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return {
      key: toKey(d),
      weekday: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      dayMonth: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      long: d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }),
    };
  });
}

const money = (n) => (n === 0 ? 'Free' : `₹${n.toLocaleString('en-IN')}`);

// `free` is the course-student version shown inside the portal: no price, the
// name and email come from their Google account, and the server double-checks
// their access before waiving the fee.
// `kind="doubt"`: a doubt class on one of the student's subjects (course students, free).
// `freeLeft`: free consultations this course student still has (one per course bought).
export default function BookingPage({ goHome, free = false, embedded = false, account = null, getIdToken = null, kind = 'consultation', subjects = [], freeLeft = 0, onBooked = null }) {
  const doubt = kind === 'doubt';
  const [subject, setSubject] = useState(subjects.length === 1 ? subjects[0] : '');
  const days = useMemo(() => buildDays(), []);
  const [dayIndex, setDayIndex] = useState(0);
  const [pageStart, setPageStart] = useState(0);
  const [showMonth, setShowMonth] = useState(false);
  const [mine, setMine] = useState(() => (getIdToken ? [] : readLocalBookings()));

  // What this person has already booked, shown at the top of the page.
  const loadMine = async () => {
    if (!getIdToken) { setMine(readLocalBookings()); return; }
    try {
      const res = await fetch('/api/book', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mine', idToken: await getIdToken() }),
      });
      if (res.ok) setMine((await res.json()).bookings || []);
    } catch { /* the reminder is optional */ }
  };
  useEffect(() => { loadMine(); }, []);

  const pickDay = (index) => {
    setDayIndex(index);
    setPageStart(Math.max(0, Math.min(days.length - 5, index - (index % 5))));
    setShowMonth(false);
  };
  const [time, setTime] = useState('');
  const [booked, setBooked] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [form, setForm] = useState({ name: account?.name || '', email: account?.email || '', phone: '', goal: '' });
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, saving, done
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [confirmed, setConfirmed] = useState(null);

  const day = days[dayIndex];
  // `free` = signed-in course student: consultations at the course price,
  // doubt classes free. Everyone else pays the normal consultation price.
  const usesFreeCall = !doubt && free && freeLeft > 0;
  const sessionPrice = doubt || usesFreeCall ? 0 : (free ? CONSULTATION.coursePrice : CONSULTATION.price);
  const wasPrice = doubt ? null : (free ? CONSULTATION.price : CONSULTATION.was);
  const recordingPrice = RECORDING_PRICE;
  const priceWithWas = (value) => (wasPrice
    ? <><s className="mr-1.5 font-normal text-muted">{money(wasPrice)}</s>{money(value)}</>
    : money(value));
  const total = sessionPrice + (recording ? recordingPrice : 0);

  useEffect(() => {
    let live = true;
    setLoadingSlots(true);
    setTime('');
    fetch(`/api/slots?date=${day.key}`)
      .then((r) => (r.ok ? r.json() : { booked: [] }))
      .then((data) => { if (live) setBooked(data.booked || []); })
      .catch(() => { if (live) setBooked([]); })
      .finally(() => { if (live) setLoadingSlots(false); });
    return () => { live = false; };
  }, [day.key]);

  const validate = () => {
    const errors = {};
    if (account?.email) return errors; // signed in: name and email come from their account
    if (form.name.trim().length < 2) errors.name = 'Please enter your name.';
    if (!form.email.trim()) {
      errors.email = 'We need an email so we can reach you about your session.';
    } else if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(form.email.trim())) {
      errors.email = 'That email address is missing something. Example: you@gmail.com';
    }
    const digits = form.phone.replace(/\D/g, '');
    if (form.phone.trim() && (digits.length < 10 || digits.length > 13)) {
      errors.phone = 'Enter a 10-digit mobile number, or leave this empty.';
    }
    return errors;
  };

  const field = (name, placeholder, type = 'text', locked = false) => (
    <div>
      <input
        disabled={locked}
        className={`${input} ${locked ? 'bg-mist text-muted' : ''} ${fieldErrors[name] ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : ''}`}
        type={type}
        placeholder={placeholder}
        value={form[name]}
        onChange={(e) => {
          setForm({ ...form, [name]: e.target.value });
          if (fieldErrors[name]) setFieldErrors({ ...fieldErrors, [name]: undefined });
        }}
        onBlur={() => {
          const errors = validate();
          setFieldErrors((prev) => ({ ...prev, [name]: errors[name] }));
        }}
        aria-invalid={Boolean(fieldErrors[name])}
      />
      {fieldErrors[name] && <p className="mt-1.5 text-sm font-medium text-red-600">{fieldErrors[name]}</p>}
    </div>
  );

  const isPast = (slot) => new Date(`${day.key}T${slot}:00+05:30`).getTime() < Date.now();

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!time) { setError('Pick a time for your session.'); return; }
    if (doubt && !subject) { setError('Pick the subject for your doubt class.'); return; }
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError('Please fix the highlighted fields.');
      return;
    }

    setStatus('saving');
    try {
      const idToken = free && getIdToken ? await getIdToken() : undefined;
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, name: form.name || account?.name || account?.email?.split('@')[0] || '', date: day.key, time, recording: doubt ? false : recording, amount: total, idToken, kind, subject }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not book that slot. Please try again.');
        setStatus('idle');
        if (res.status === 409) setBooked((b) => [...b, time]);
        return;
      }
      setConfirmed({ ...data, total });
      if (!getIdToken) saveLocalBooking({ date: day.key, time, dayLabel: data.dayLabel, kind, subject });
      loadMine();
      onBooked?.();
      setStatus('done');
      window.scrollTo(0, 0);
    } catch {
      setError('Something went wrong. Please check your connection and try again.');
      setStatus('idle');
    }
  };

  // Inside the portal the page sits in the dashboard frame, without its own header.
  // Called as a function, not rendered as <Frame>, so the form is not rebuilt
  // (and inputs do not lose focus) on every keystroke.
  const frame = (children) => (embedded ? children : (
    <div className="min-h-screen bg-mist">
      <TopBar goHome={goHome} />
      {children}
    </div>
  ));

  if (status === 'done' && confirmed) {
    return frame(
        <div className={`mx-auto max-w-xl ${embedded ? '' : 'px-4 py-16 sm:px-6'}`}>
          <div className={`${card} p-8 text-center sm:p-10`}>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-go/10 text-go">
              <Check className="h-7 w-7" strokeWidth={3} />
            </div>
            <h1 className="mt-6 text-2xl font-extrabold text-ink">{doubt ? `Your ${subject} doubt class is booked` : 'Your session is booked'}</h1>
            <p className="mt-3 text-muted">
              {confirmed.dayLabel} at {confirmed.time} IST, for about an hour. No need to watch the clock.
            </p>
            <div className="mt-6 rounded-2xl bg-mist p-5 text-left text-sm">
              <Row label="Session" value={priceWithWas(sessionPrice)} />
              {recording && !doubt && <Row label="Add on: recording" value={money(recordingPrice)} />}
              <Row label="Total" value={(confirmed.amount ?? confirmed.total) === 0 ? '₹0 · included in your course' : money(confirmed.amount ?? confirmed.total)} strong />
            </div>
            {(confirmed.amount ?? confirmed.total) > 0 && (
              <div className="mt-6 rounded-2xl border border-line p-5">
                <p className="mb-4 text-sm font-semibold text-ink">Pay for your session</p>
                <UpiPay amount={confirmed.amount ?? confirmed.total} note="Avero Aviation consultation"
                  lastStep="That’s it. We confirm the payment on our side." />
              </div>
            )}
            <div className="mt-6 rounded-2xl border border-line p-5">
              <p className="text-sm font-semibold text-ink">Your meeting link</p>
              <a href={MEET_LINK} target="_blank" rel="noreferrer" className={`${btnPrimary} mt-3 w-full`}>
                <Video className="h-4 w-4" /> Join on Google Meet
              </a>
              <p className="mt-2 break-all text-sm text-muted">{MEET_LINK.replace('https://', '')}</p>
              <p className="mt-2 text-xs text-muted">
                The same link works for every session. Open it at your booked time.
              </p>
            </div>
            <button onClick={goHome} className={`${btnPrimary} mt-8`}>{embedded ? 'Back to overview' : 'Back to home'}</button>
          </div>
        </div>,
    );
  }

  return frame(
      <div className={`mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_1.25fr] ${embedded ? '' : 'px-4 py-10 sm:px-6'}`}>
        {/* What you get */}
        <div className="h-fit rounded-3xl bg-night p-7 text-white sm:p-8">
          <p className="text-sm font-semibold text-neutral-300/80">{doubt ? 'Doubt class' : '1-on-1 consultation'}</p>
          <h1 className="mt-2 text-2xl font-extrabold leading-tight sm:text-3xl">
            {doubt ? 'Get unstuck on a topic' : 'Get your flight training questions answered'}
          </h1>
          {!doubt && <p className="mt-2 text-lg font-semibold text-neutral-200">Talk to Someone Who&apos;s Been There</p>}
          <p className="mt-4 leading-relaxed text-neutral-300/75">
            {doubt
              ? 'Pick the subject, tell me what is confusing you, and we work through it together, question by question.'
              : 'Bring your doubts about DGCA exams, choosing a flight school, costs and timelines. You leave with a plan written for your situation.'}
          </p>
          {!doubt && (
            <p className="mt-3 leading-relaxed text-neutral-300/75">
              <b className="text-white">Starting from absolute zero?</b> That&apos;s completely fine. If you are just exploring
              whether aviation is right for you, we start from the very beginning and walk you through how it all works.
            </p>
          )}
          <ul className="mt-7 space-y-4 border-t border-white/10 pt-7">
            {(doubt ? DOUBT_INCLUDED : INCLUDED).map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <Icon className="h-5 w-5 shrink-0 text-neutral-400" />
                <span className="text-neutral-50">{text}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 rounded-2xl bg-white/5 p-4 text-sm leading-relaxed text-neutral-300 ring-1 ring-white/10">
            <b className="text-white">Don’t worry about the time.</b> The hour is a guide, not a limit. I won’t be
            watching the clock, so we keep going until your questions are answered.
          </p>
          {!doubt && <div className="mt-6">
            <p className="text-sm font-semibold text-white">Talk about anything and everything, for example:</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {TALK_ABOUT.map((topic) => (
                <li key={topic} className="rounded-full bg-white/10 px-3 py-1.5 text-sm text-neutral-100">{topic}</li>
              ))}
            </ul>
          </div>}
          {sessionPrice === 0 ? (
            <div className="mt-8">
              <p className="flex flex-wrap items-baseline gap-x-3">
                <span className="text-3xl font-extrabold">Free</span>
                {usesFreeCall && <s className="text-lg text-neutral-400">{money(CONSULTATION.price)}</s>}
              </p>
              <p className="mt-1 text-sm text-neutral-300/75">
                {usesFreeCall ? 'Your free consultation, included with your course' : 'Included with your course'}
              </p>
            </div>
          ) : (
            <div className="mt-8">
              <p className="flex flex-wrap items-baseline gap-x-3">
                <span className="text-3xl font-extrabold">{money(sessionPrice)}</span>
                <s className="text-lg text-neutral-400">{money(wasPrice)}</s>
                <span className="rounded-full bg-go/20 px-2.5 py-1 text-xs font-bold text-go">Save {money(wasPrice - sessionPrice)}</span>
              </p>
              {free && <p className="mt-1 text-sm text-neutral-300/75">Course student price</p>}
            </div>
          )}
        </div>

        {/* Booking form */}
        <form onSubmit={submit} noValidate className={`${card} p-6 sm:p-8`}>
          {mine.length > 0 && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl bg-go/10 p-4 text-sm text-ink">
              <CalendarCheck className="mt-0.5 h-5 w-5 shrink-0 text-go" />
              <div>
                <p className="font-semibold">You already have {mine.length === 1 ? 'a session' : `${mine.length} sessions`} booked</p>
                <ul className="mt-1 space-y-0.5 text-muted">
                  {mine.slice(0, 5).map((b) => (
                    <li key={`${b.date}-${b.time}`}>
                      {b.kind === 'doubt' ? `Doubt class${b.subject ? ` (${b.subject})` : ''}` : 'Consultation'}: {b.dayLabel || b.date} at {b.time} IST
                    </li>
                  ))}
                </ul>
                <p className="mt-1 text-muted">
                  Join at your booked time:{' '}
                  <a href={MEET_LINK} target="_blank" rel="noreferrer" className="font-semibold text-ink underline">
                    {MEET_LINK.replace('https://', '')}
                  </a>
                  . You can still book another one below.
                </p>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold text-ink">When should we meet?</h2>
            <button type="button" onClick={() => setShowMonth(!showMonth)}
              className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm font-semibold text-ink transition hover:border-brand">
              <CalendarDays className="h-4 w-4" /> {showMonth ? 'Close calendar' : 'Pick a date'}
            </button>
          </div>
          {showMonth && <MonthPicker days={days} selected={days[dayIndex].key} onPick={pickDay} />}
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => { const next = Math.max(0, pageStart - 5); setPageStart(next); setDayIndex(next); }}
              disabled={pageStart === 0}
              className="rounded-full border border-line p-2 text-muted transition hover:text-ink disabled:opacity-40"
              aria-label="Earlier dates"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="grid flex-1 grid-cols-3 gap-2 sm:grid-cols-5">
              {days.slice(pageStart, pageStart + 5).map((d, i) => {
                const index = pageStart + i;
                const active = index === dayIndex;
                return (
                  <button
                    type="button"
                    key={d.key}
                    onClick={() => setDayIndex(index)}
                    className={`rounded-xl border px-2 py-2.5 text-center transition ${
                      active ? 'border-brand bg-sky text-ink' : 'border-line text-muted hover:border-brand/50 hover:text-ink'
                    }`}
                  >
                    <span className="block text-xs">{d.weekday}</span>
                    <span className="block text-sm font-bold">{d.dayMonth}</span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => { const next = Math.min(days.length - 5, pageStart + 5); setPageStart(next); setDayIndex(next); }}
              disabled={pageStart >= days.length - 5}
              className="rounded-full border border-line p-2 text-muted transition hover:text-ink disabled:opacity-40"
              aria-label="Later dates"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <h2 className="mt-7 font-bold text-ink">Pick a time on {day.long}</h2>
          <p className="mb-3 text-sm text-muted">All times are IST (GMT+5:30)</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {SLOT_TIMES.map((slot) => {
              const taken = booked.includes(slot) || isPast(slot);
              const active = time === slot;
              return (
                <button
                  type="button"
                  key={slot}
                  disabled={taken || loadingSlots}
                  onClick={() => setTime(slot)}
                  className={`rounded-xl border px-2 py-2.5 text-sm font-semibold transition ${
                    taken
                      ? 'cursor-not-allowed border-line bg-mist text-slate-400 line-through'
                      : active
                        ? 'border-brand bg-brand text-on-brand'
                        : 'border-line text-ink hover:border-brand hover:bg-sky'
                  }`}
                >
                  {slot}
                </button>
              );
            })}
          </div>
          {!loadingSlots && booked.length > 0 && (
            <p className="mt-3 text-sm text-muted">Crossed-out times are already booked.</p>
          )}

          {/* Signed-in students are already known, so they only see what matters. */}
          {!account?.email && (
            <>
              <h2 className="mt-7 font-bold text-ink">Your details</h2>
              <div className="mt-3 grid items-start gap-3 sm:grid-cols-2">
                {field('name', 'Full name')}
                {field('email', 'Email', 'email')}
                {field('phone', 'Phone (optional)', 'tel')}
              </div>
            </>
          )}

          {doubt && (
            <div className="mt-7">
              <p className="mb-2 font-bold text-ink">Choose the subject</p>
              <div className="flex flex-wrap gap-2">
                {subjects.map((name) => (
                  <button type="button" key={name} onClick={() => setSubject(name)}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      subject === name ? 'border-brand bg-brand text-on-brand' : 'border-line text-ink hover:border-brand'
                    }`}>{name}</button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-7">
            <label htmlFor="goal" className="font-bold text-ink">
              {doubt ? 'Anything you would like to go through? (optional)' : 'What do you want to talk about?'}
            </label>
            <textarea id="goal" rows={4} value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })}
              maxLength={2000} className={`${input} mt-3 resize-y`}
              placeholder={doubt ? 'A topic, a chapter, or a few questions you keep getting wrong…' : 'Schools, countries, exams, visas, costs, anything at all…'} />
            <p className="mt-1.5 text-sm text-muted">{HELPER}</p>
          </div>

          {!doubt && <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-line p-4 transition hover:border-brand/60">
            <input type="checkbox" checked={recording} onChange={(e) => setRecording(e.target.checked)}
              className="mt-0.5 h-5 w-5 rounded accent-brand" />
            <span>
              <span className="flex items-center gap-2 font-semibold text-ink">
                <Circle className="h-4 w-4 text-red-500" /> Add the session recording
              </span>
              <span className="mt-0.5 block text-sm text-muted">
                {money(RECORDING_PRICE)} · rewatch the call whenever you need it
              </span>
            </span>
          </label>}

          <div className="mt-6 rounded-2xl bg-mist p-5 text-sm">
            <p className="mb-1 font-bold text-ink">{sessionPrice === 0 ? 'Your session' : 'Order summary'}</p>
            <p className="mb-3 text-muted">{day.long}{time ? ` at ${time} IST` : ', time not chosen yet'}</p>
            <Row label={doubt ? `Doubt class${subject ? ` · ${subject}` : ''} (1 hour)` : '1-on-1 consultation (1 hour)'}
              value={priceWithWas(sessionPrice)} />
            {recording && <Row label="Add on: session recording" value={money(recordingPrice)} />}
            <Row label="Total" value={money(total)} strong />
          </div>

          {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}

          <button type="submit" disabled={status === 'saving'} className={`${btnPrimary} mt-6 w-full py-3.5`}>
            {status === 'saving' ? 'Booking your slot…' : 'Confirm booking'}
          </button>
          <p className="mt-3 text-center text-sm text-muted">
            You get the Google Meet link as soon as you book{total > 0 ? ', and can pay by UPI straight away.' : '.'}
          </p>
        </form>
      </div>,
  );
}

function Row({ label, value, strong = false }) {
  return (
    <div className={`flex items-center justify-between py-1.5 ${strong ? 'mt-1.5 border-t border-line pt-3' : ''}`}>
      <span className={strong ? 'font-bold text-ink' : 'text-muted'}>{label}</span>
      <span className={strong ? 'font-extrabold text-ink' : 'font-semibold text-ink'}>{value}</span>
    </div>
  );
}

function TopBar({ goHome }) {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
        <button onClick={goHome}><Logo /></button>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <button onClick={goHome} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition hover:text-ink">
            <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Back to home</span><span className="sm:hidden">Home</span>
          </button>
        </div>
      </div>
    </header>
  );
}

// A month-by-month calendar for picking any date up to a year ahead.
function MonthPicker({ days, selected, onPick }) {
  const first = days[0].key;
  const last = days[days.length - 1].key;
  const [month, setMonth] = useState(() => selected.slice(0, 7)); // "YYYY-MM"
  const [y, m] = month.split('-').map(Number);
  const start = new Date(y, m - 1, 1);
  const lead = (start.getDay() + 6) % 7; // Monday first
  const count = new Date(y, m, 0).getDate();
  const shift = (n) => {
    const d = new Date(y, m - 1 + n, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  const index = new Map(days.map((d, i) => [d.key, i]));
  return (
    <div className="mt-4 rounded-2xl border border-line p-4">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={() => shift(-1)} disabled={month <= first.slice(0, 7)}
          className="rounded-full border border-line p-2 text-muted transition hover:text-ink disabled:opacity-40" aria-label="Previous month">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="font-bold text-ink">{start.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
        <button type="button" onClick={() => shift(1)} disabled={month >= last.slice(0, 7)}
          className="rounded-full border border-line p-2 text-muted transition hover:text-ink disabled:opacity-40" aria-label="Next month">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted">
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => <span key={d} className="py-1">{d}</span>)}
        {Array.from({ length: lead }, (_, i) => <span key={`b${i}`} />)}
        {Array.from({ length: count }, (_, i) => {
          const key = `${month}-${String(i + 1).padStart(2, '0')}`;
          const at = index.get(key);
          const on = key === selected;
          return (
            <button type="button" key={key} disabled={at === undefined} onClick={() => onPick(at)}
              className={`rounded-lg py-2 text-sm transition ${
                on ? 'bg-brand font-bold text-on-brand' : at === undefined ? 'text-line' : 'text-ink hover:bg-sky'
              }`}>
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
