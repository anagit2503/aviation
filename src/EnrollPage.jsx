import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, Lock, Pause, LoaderCircle, BookOpen, Copy, Smartphone } from 'lucide-react';
import { Logo, ThemeToggle, btnPrimary, btnGhost, card, input } from './ui.jsx';

// One price table for the website and the payment server.
import { SUBJECT_PRICES, BUNDLE, quote } from '../api/_pricing.js';
const money = (n) => `₹${n.toLocaleString('en-IN')}`;
const PICK_STORE = 'flywithsam-enroll-pick';

// Where payments go (from the Paytm QR). The QR shown to students is made
// from this with the exact amount filled in, so nobody pays the wrong sum.
const UPI_ID = '9354833681@ptyes';
const UPI_NAME = 'SAMARTHYA SINGH';
const upiLink = (amount, note) => `upi://pay?${new URLSearchParams({
  pa: UPI_ID, pn: UPI_NAME, am: String(amount), cu: 'INR', tn: note.slice(0, 50),
}).toString().replace(/\+/g, '%20').replace('%40', '@')}`; // plain "@", like the Paytm QR

// Remembers a subject chosen on the landing page ("Start this subject") so it
// is already ticked after signing in.
export function rememberSubjectPick(name) {
  try { sessionStorage.setItem(PICK_STORE, name); } catch { /* not important */ }
}

// Pick subjects → subtotal → Pay now shows the UPI QR → "I've paid" sends the
// request to the instructor, who switches the subjects on after checking.
export default function EnrollPage({ user, subjects, api, goBack, onPaid }) {
  const access = user.access || {};
  const active = (access.subjects || []).filter((s) => !(access.paused || []).includes(s));
  const paused = (access.subjects || []).filter((s) => (access.paused || []).includes(s));

  const [picked, setPicked] = useState(() => {
    let first = null;
    try { first = sessionStorage.getItem(PICK_STORE); sessionStorage.removeItem(PICK_STORE); } catch { /* ignore */ }
    const start = new Set(paused); // paused subjects are the usual reason to come here
    if (first && !active.includes(first)) start.add(first);
    return start;
  });
  const [step, setStep] = useState('pick'); // pick → pay → sent
  const [request, setRequest] = useState(null);
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState([]);
  const [qr, setQr] = useState('');
  const [showPaytmQr, setShowPaytmQr] = useState(false);
  const [copied, setCopied] = useState(false);

  // Draw the QR for this exact amount once they choose to pay.
  const link = request ? upiLink(request.amount, `Avero Aviation ${request.subjects.length} subject${request.subjects.length === 1 ? '' : 's'}`) : '';
  useEffect(() => {
    if (!link) return;
    import('qrcode')
      .then((QR) => QR.toDataURL(link, { width: 520, margin: 1 }))
      .then(setQr)
      .catch(() => setShowPaytmQr(true));
  }, [link]);

  const copyUpi = async () => {
    try { await navigator.clipboard.writeText(UPI_ID); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* select by hand */ }
  };

  useEffect(() => {
    api('/api/payment', { action: 'mine' })
      .then((data) => setPending((data.requests || []).filter((r) => r.status === 'awaiting' || r.status === 'claimed')))
      .catch(() => {});
  }, []);

  const [bundle, setBundle] = useState(false);
  const chosen = subjects.filter((s) => picked.has(s.name));
  const priced = quote(chosen.map((s) => s.name), bundle);
  const total = priced.total;
  const toggle = (name) => {
    // Unticking a bundle subject ends the bundle; the others stay ticked.
    if (bundle && BUNDLE.subjects.includes(name) && picked.has(name)) setBundle(false);
    setPicked((set) => {
      const next = new Set(set);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };
  const toggleBundle = () => {
    if (bundle) { setBundle(false); return; }
    setBundle(true);
    setPicked((set) => new Set([...set, ...BUNDLE.subjects.filter((s) => !active.includes(s))]));
  };

  const payNow = async () => {
    setBusy(true);
    setError('');
    try {
      const data = await api('/api/payment', { action: 'create', subjects: chosen.map((s) => s.name), bundle });
      setRequest(data.request);
      setStep('pay');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const confirmPaid = async () => {
    setBusy(true);
    setError('');
    try {
      await api('/api/payment', { action: 'claim', id: request.id, reference });
      setStep('sent');
      onPaid?.();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-mist">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <button onClick={goBack}><Logo /></button>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <button onClick={goBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition hover:text-ink">
              <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">My dashboard</span><span className="sm:hidden">Back</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {step === 'sent' ? (
          <div className={`${card} mx-auto max-w-xl p-8 text-center sm:p-10`}>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-go/10 text-go">
              <Check className="h-7 w-7" strokeWidth={3} />
            </div>
            <h1 className="mt-6 text-2xl font-extrabold text-ink">Thank you! We’re checking your payment</h1>
            <p className="mt-3 text-muted">
              {request.subjects.join(', ')} will switch on as soon as your instructor confirms the {money(request.amount)} payment.
              This is usually within a few hours. You don’t need to do anything else.
            </p>
            <button onClick={goBack} className={`${btnPrimary} mt-8`}>Go to my dashboard</button>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-extrabold tracking-tight text-ink">
                {step === 'pay' ? 'Scan to pay' : 'Choose your subjects'}
              </h1>
              <p className="mt-2 text-muted">
                {step === 'pay'
                  ? 'Pay with any UPI app, get started on your journey.'
                  : 'Each subject is priced per month. Pick only the ones you need; you can add more any time.'}
              </p>
            </div>

            {pending.length > 0 && step === 'pick' && (
              <div className="mb-6 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                We are still checking your earlier payment for <b>{[...new Set(pending.flatMap((r) => r.subjects))].join(', ')}</b>.
                No need to pay again for those.
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
              {/* Left: subjects, or the QR once they choose to pay */}
              {step === 'pick' ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <button type="button" onClick={toggleBundle}
                    className={`${card} relative flex flex-col p-5 text-left transition sm:col-span-2 ${bundle ? 'border-brand ring-2 ring-brand' : 'hover:border-brand'}`}>
                    <span className="absolute -top-3 left-5 rounded-full bg-go px-3 py-1 text-xs font-bold text-white">
                      Best value · save {money(BUNDLE.was - BUNDLE.price)}
                    </span>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="mt-1 font-bold text-ink">{BUNDLE.name}</p>
                        <p className="mt-1 text-sm text-muted">{BUNDLE.subjects.join(' + ')} for {BUNDLE.months} months</p>
                      </div>
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${bundle ? 'border-brand bg-brand text-on-brand' : 'border-line'}`}>
                        {bundle && <Check className="h-4 w-4" strokeWidth={3} />}
                      </span>
                    </div>
                    <p className="mt-3 text-sm">
                      <span className="text-lg font-extrabold text-ink">{money(BUNDLE.price)}</span>{' '}
                      <s className="text-muted">{money(BUNDLE.was)}</s>
                      <span className="text-muted"> for {BUNDLE.months} months</span>
                    </p>
                  </button>
                  {subjects.map((s) => {
                    const isActive = active.includes(s.name);
                    const isPaused = paused.includes(s.name);
                    const on = picked.has(s.name);
                    return (
                      <button key={s.name} type="button" disabled={isActive} onClick={() => toggle(s.name)}
                        className={`${card} flex h-full flex-col p-5 text-left transition ${
                          isActive ? 'cursor-default opacity-70'
                            : on ? 'border-brand ring-2 ring-brand' : 'hover:border-brand'
                        }`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky text-brand">
                            <BookOpen className="h-5 w-5" />
                          </div>
                          {isActive ? (
                            <span className="rounded-full bg-go/10 px-2.5 py-1 text-xs font-bold text-go">Active</span>
                          ) : (
                            <span className={`flex h-6 w-6 items-center justify-center rounded-md border-2 ${on ? 'border-brand bg-brand text-on-brand' : 'border-line'}`}>
                              {on && <Check className="h-4 w-4" strokeWidth={3} />}
                            </span>
                          )}
                        </div>
                        <p className="mt-4 font-bold text-ink">{s.name}</p>
                        <p className="mt-1 flex-1 text-sm text-muted">{s.blurb}</p>
                        {isActive ? (
                          <p className="mt-4 text-sm font-semibold text-ink">You already have this</p>
                        ) : (
                          <div className="mt-4">
                            {isPaused && <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold text-muted"><Pause className="h-3.5 w-3.5" /> Paused · renew below</p>}
                            <PriceTag subject={s.name} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className={`${card} flex flex-col items-center p-6 text-center sm:p-10`}>
                  <p className="text-sm font-semibold text-muted">Amount to pay</p>
                  <p className="mt-1 text-4xl font-extrabold tracking-tight text-ink">{money(request.amount)}</p>
                  {showPaytmQr ? (
                    <img src="/payment-qr.png" alt="Paytm UPI QR code for SAMARTHYA SINGH"
                      className="mt-6 w-64 max-w-full rounded-2xl bg-white ring-1 ring-line" />
                  ) : qr ? (
                    <img src={qr} alt={`UPI QR code to pay ${money(request.amount)}`}
                      className="mt-6 w-64 max-w-full rounded-2xl bg-white p-3 ring-1 ring-line" />
                  ) : (
                    <div className="mt-6 flex h-64 w-64 items-center justify-center"><LoaderCircle className="h-8 w-8 animate-spin text-muted" /></div>
                  )}
                  <p className="mt-3 text-sm font-semibold text-ink">{UPI_NAME}</p>

                  {/* On a phone they cannot scan their own screen: open the UPI app directly. */}
                  <a href={link} className={`${btnPrimary} mt-5 w-full max-w-xs md:hidden`}>
                    <Smartphone className="h-4 w-4" /> Pay {money(request.amount)} in a UPI app
                  </a>

                  <div className="mt-5 flex items-center gap-2 rounded-full border border-line py-1.5 pl-4 pr-1.5 text-sm">
                    <span className="text-muted">UPI ID</span>
                    <span className="font-semibold text-ink">{UPI_ID}</span>
                    <button onClick={copyUpi} className="inline-flex items-center gap-1 rounded-full bg-mist px-3 py-1 font-semibold text-ink transition hover:bg-sky">
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>

                  <ol className="mt-6 space-y-1.5 text-left text-sm text-muted">
                    <li>1. Scan with GPay, PhonePe, Paytm or any UPI app{' '}<span className="md:hidden">(or tap the button above)</span>.</li>
                    <li>2. Check the amount is <b className="text-ink">{money(request.amount)}</b> and pay.</li>
                    <li>3. Come back here and tap <b className="text-ink">I’ve paid</b>.</li>
                  </ol>
                  <button onClick={() => setShowPaytmQr(!showPaytmQr)} className="mt-4 text-sm font-semibold text-brand">
                    {showPaytmQr ? 'Show the QR with the amount filled in' : 'QR not working? Use the Paytm QR instead'}
                  </button>
                </div>
              )}

              {/* Right: running summary */}
              <aside className={`${card} h-fit p-6 lg:sticky lg:top-6`}>
                <p className="font-bold text-ink">Your subjects</p>
                {priced.lines.length === 0 ? (
                  <p className="mt-3 text-sm text-muted">Tick the subjects you want. The total adds up here.</p>
                ) : (
                  <ul className="mt-3 space-y-2 text-sm">
                    {priced.lines.map((l) => (
                      <li key={l.label} className="flex justify-between gap-3">
                        <span className="text-ink">{l.label}</span>
                        <span className="whitespace-nowrap text-right">
                          {l.was && <s className="mr-1.5 text-xs text-muted">{money(l.was)}</s>}
                          <span className="font-semibold text-ink">{money(l.price)}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
                  <span className="font-bold text-ink">Subtotal</span>
                  <span className="text-2xl font-extrabold text-ink">{money(total)}</span>
                </div>
                {priced.saving > 0 && <p className="mt-1 text-sm font-semibold text-go">You save {money(priced.saving)}</p>}
                <p className="mt-1 text-xs text-muted">
                  {bundle ? `Bundle covers ${BUNDLE.months} months` : 'per month'} · {priced.subjects.length} subject{priced.subjects.length === 1 ? '' : 's'}
                </p>

                {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}

                {step === 'pick' ? (
                  <button onClick={payNow} disabled={busy || priced.lines.length === 0} className={`${btnPrimary} mt-6 w-full py-3.5`}>
                    {busy ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Lock className="h-4 w-4" />}
                    {priced.lines.length === 0 ? 'Pick a subject' : `Pay now · ${money(total)}`}
                  </button>
                ) : (
                  <div className="mt-6 space-y-3">
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-ink">UPI transaction ID <span className="font-normal text-muted">(optional)</span></label>
                      <input className={input} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. 4271 8899 1234" />
                      <p className="mt-1 text-xs text-muted">Helps us find your payment faster.</p>
                    </div>
                    <button onClick={confirmPaid} disabled={busy} className={`${btnPrimary} w-full py-3.5`}>
                      {busy ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />} I’ve paid
                    </button>
                    <button onClick={() => { setStep('pick'); setError(''); }} className={`${btnGhost} w-full py-2.5 text-sm`}>
                      Change subjects
                    </button>
                  </div>
                )}
              </aside>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// "₹3,999 ~~₹5,999~~ /month  Save ₹2,000" for one subject.
export function PriceTag({ subject, className = '' }) {
  const p = SUBJECT_PRICES[subject];
  if (!p) return null;
  return (
    <p className={`flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm ${className}`}>
      <span className="text-lg font-extrabold text-ink">{money(p.price)}</span>
      {p.was && <s className="text-muted">{money(p.was)}</s>}
      <span className="text-muted">/ month</span>
      {p.was && <span className="rounded-full bg-go/10 px-2 py-0.5 text-xs font-bold text-go">Save {money(p.was - p.price)}</span>}
    </p>
  );
}
