import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, Check, ChevronLeft, ChevronRight, Video, MessageSquare, Map, Circle, Clock,
} from 'lucide-react';
import { Logo, btnPrimary, card, input, SLOT_TIMES } from './ui.jsx';

const SESSION_PRICE = 1999;
const RECORDING_PRICE = 400;

const INCLUDED = [
  { icon: Video, text: '45 minutes 1-on-1 on Google Meet' },
  { icon: MessageSquare, text: 'Open Q&A for all your doubts' },
  { icon: Map, text: 'A study and career plan made for you' },
  { icon: Clock, text: 'Notes and next steps after the call' },
];

// Dates are handled in IST, since that is where sessions are held.
const IST = 'Asia/Kolkata';
const istToday = () => new Date(new Date().toLocaleString('en-US', { timeZone: IST }));

function toKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildDays(count = 21) {
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

export default function BookingPage({ goHome }) {
  const days = useMemo(() => buildDays(), []);
  const [dayIndex, setDayIndex] = useState(0);
  const [pageStart, setPageStart] = useState(0);
  const [time, setTime] = useState('');
  const [booked, setBooked] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', phone: '', goal: '' });
  const [recording, setRecording] = useState(false);
  const [payment, setPayment] = useState({ enabled: false });
  const [status, setStatus] = useState('idle'); // idle, saving, done
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [confirmed, setConfirmed] = useState(null);

  const day = days[dayIndex];
  const total = SESSION_PRICE + (recording ? RECORDING_PRICE : 0);

  useEffect(() => {
    fetch('/api/payment')
      .then((r) => (r.ok ? r.json() : { enabled: false }))
      .then(setPayment)
      .catch(() => setPayment({ enabled: false }));
  }, []);

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
    if (form.name.trim().length < 2) errors.name = 'Please enter your name.';
    if (!form.email.trim()) {
      errors.email = 'We need an email to send you the meeting link.';
    } else if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(form.email.trim())) {
      errors.email = 'That email address is missing something. Example: you@gmail.com';
    }
    const digits = form.phone.replace(/\D/g, '');
    if (form.phone.trim() && (digits.length < 10 || digits.length > 13)) {
      errors.phone = 'Enter a 10-digit mobile number, or leave this empty.';
    }
    return errors;
  };

  const field = (name, placeholder, type = 'text') => (
    <div>
      <input
        className={`${input} ${fieldErrors[name] ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : ''}`}
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
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError('Please fix the highlighted fields.');
      return;
    }

    setStatus('saving');
    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, date: day.key, time, recording, amount: total }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not book that slot. Please try again.');
        setStatus('idle');
        if (res.status === 409) setBooked((b) => [...b, time]);
        return;
      }
      setConfirmed({ ...data, total });
      setStatus('done');
      window.scrollTo(0, 0);
    } catch {
      setError('Something went wrong. Please check your connection and try again.');
      setStatus('idle');
    }
  };

  if (status === 'done' && confirmed) {
    return (
      <div className="min-h-screen bg-mist">
        <TopBar goHome={goHome} />
        <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
          <div className={`${card} p-8 text-center sm:p-10`}>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-go/10 text-go">
              <Check className="h-7 w-7" strokeWidth={3} />
            </div>
            <h1 className="mt-6 text-2xl font-extrabold text-ink">Your session is booked</h1>
            <p className="mt-3 text-muted">
              {confirmed.dayLabel} at {confirmed.time} IST, for 45 minutes.
            </p>
            <div className="mt-6 rounded-2xl bg-mist p-5 text-left text-sm">
              <Row label="Session" value={`₹${SESSION_PRICE.toLocaleString('en-IN')}`} />
              {recording && <Row label="Add on: recording" value={`₹${RECORDING_PRICE}`} />}
              <Row label="Total" value={`₹${confirmed.total.toLocaleString('en-IN')}`} strong />
            </div>
            <p className="mt-6 text-sm text-muted">
              You will get the Google Meet link and payment details by email at {form.email}.
            </p>
            <button onClick={goHome} className={`${btnPrimary} mt-8`}>Back to home</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mist">
      <TopBar goHome={goHome} />
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_1.25fr]">
        {/* What you get */}
        <div className="h-fit rounded-3xl bg-night p-7 text-white sm:p-8">
          <p className="text-sm font-semibold text-blue-200/80">1-on-1 consultation</p>
          <h1 className="mt-2 text-2xl font-extrabold leading-tight sm:text-3xl">
            Get your flight training questions answered
          </h1>
          <p className="mt-4 leading-relaxed text-blue-100/75">
            Bring your doubts about DGCA exams, choosing a flight school, costs and timelines. You leave with a plan
            written for your situation.
          </p>
          <ul className="mt-7 space-y-4 border-t border-white/10 pt-7">
            {INCLUDED.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <Icon className="h-5 w-5 shrink-0 text-blue-300" />
                <span className="text-blue-50">{text}</span>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-3xl font-extrabold">₹{SESSION_PRICE.toLocaleString('en-IN')}</p>
        </div>

        {/* Booking form */}
        <form onSubmit={submit} className={`${card} p-6 sm:p-8`}>
          <h2 className="font-bold text-ink">When should we meet?</h2>
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPageStart(Math.max(0, pageStart - 5))}
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
              onClick={() => setPageStart(Math.min(days.length - 5, pageStart + 5))}
              disabled={pageStart >= days.length - 5}
              className="rounded-full border border-line p-2 text-muted transition hover:text-ink disabled:opacity-40"
              aria-label="Later dates"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <h2 className="mt-7 font-bold text-ink">Pick a time</h2>
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
                        ? 'border-brand bg-brand text-white'
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

          <h2 className="mt-7 font-bold text-ink">Your details</h2>
          <div className="mt-3 grid items-start gap-3 sm:grid-cols-2">
            {field('name', 'Full name')}
            {field('email', 'Email', 'email')}
            {field('phone', 'Phone (optional)', 'tel')}
            {field('goal', 'Where are you in your training?')}
          </div>

          <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-line p-4 transition hover:border-brand/60">
            <input type="checkbox" checked={recording} onChange={(e) => setRecording(e.target.checked)}
              className="mt-0.5 h-5 w-5 rounded accent-[#2f5be0]" />
            <span>
              <span className="flex items-center gap-2 font-semibold text-ink">
                <Circle className="h-4 w-4 text-red-500" /> Add the session recording
              </span>
              <span className="mt-0.5 block text-sm text-muted">
                ₹{RECORDING_PRICE} · rewatch the call whenever you need it
              </span>
            </span>
          </label>

          <div className="mt-6 rounded-2xl bg-mist p-5 text-sm">
            <p className="mb-3 font-bold text-ink">Order summary</p>
            <Row label="1-on-1 consultation (45 min)" value={`₹${SESSION_PRICE.toLocaleString('en-IN')}`} />
            {recording && <Row label="Add on: session recording" value={`₹${RECORDING_PRICE}`} />}
            <Row label="Total" value={`₹${total.toLocaleString('en-IN')}`} strong />
          </div>

          {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}

          <button type="submit" disabled={status === 'saving'} className={`${btnPrimary} mt-6 w-full py-3.5`}>
            {status === 'saving'
              ? 'Booking your slot…'
              : payment.enabled
                ? `Confirm and pay ₹${total.toLocaleString('en-IN')}`
                : 'Confirm booking'}
          </button>
          <p className="mt-3 text-center text-sm text-muted">
            {payment.enabled
              ? 'You will be taken to a secure payment page.'
              : 'We will email you the meeting link and payment details.'}
          </p>
        </form>
      </div>
    </div>
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
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
        <button onClick={goHome}><Logo /></button>
        <button onClick={goHome} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </button>
      </div>
    </header>
  );
}
