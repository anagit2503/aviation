import React, { useEffect, useState } from 'react';
import { Check, Copy, LoaderCircle, Smartphone } from 'lucide-react';
import { btnPrimary } from './ui.jsx';
import { UPI, upiLink } from '../api/_pricing.js';

const money = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

// Pay by UPI: a QR with the exact amount filled in (so nobody pays the wrong
// sum), an "open UPI app" button on phones (you cannot scan your own screen),
// the UPI ID with a copy button, and the original Paytm QR as a fallback.
export default function UpiPay({ amount, note, lastStep = 'Come back here and tap I’ve paid.' }) {
  const [qr, setQr] = useState('');
  const [showPaytmQr, setShowPaytmQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const link = upiLink(amount, note);

  useEffect(() => {
    import('qrcode')
      .then((QR) => QR.toDataURL(link, { width: 520, margin: 1 }))
      .then(setQr)
      .catch(() => setShowPaytmQr(true));
  }, [link]);

  const copyUpi = async () => {
    try { await navigator.clipboard.writeText(UPI.id); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* select by hand */ }
  };

  return (
    <div className="flex flex-col items-center text-center">
      <p className="text-sm font-semibold text-muted">Amount to pay</p>
      <p className="mt-1 text-4xl font-extrabold tracking-tight text-ink">{money(amount)}</p>
      {showPaytmQr ? (
        <img src="/payment-qr.png" alt={`Paytm UPI QR code for ${UPI.name}`}
          className="mt-6 w-64 max-w-full rounded-2xl bg-white ring-1 ring-line" />
      ) : qr ? (
        <img src={qr} alt={`UPI QR code to pay ${money(amount)}`}
          className="mt-6 w-64 max-w-full rounded-2xl bg-white p-3 ring-1 ring-line" />
      ) : (
        <div className="mt-6 flex h-64 w-64 items-center justify-center"><LoaderCircle className="h-8 w-8 animate-spin text-muted" /></div>
      )}
      <p className="mt-3 text-sm font-semibold text-ink">{UPI.name}</p>

      <a href={link} className={`${btnPrimary} mt-5 w-full max-w-xs md:hidden`}>
        <Smartphone className="h-4 w-4" /> Pay {money(amount)} in a UPI app
      </a>

      <div className="mt-5 flex items-center gap-2 rounded-full border border-line py-1.5 pl-4 pr-1.5 text-sm">
        <span className="text-muted">UPI ID</span>
        <span className="font-semibold text-ink">{UPI.id}</span>
        <button type="button" onClick={copyUpi} className="inline-flex items-center gap-1 rounded-full bg-mist px-3 py-1 font-semibold text-ink transition hover:bg-sky">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <ol className="mt-6 space-y-1.5 text-left text-sm text-muted">
        <li>1. Scan with GPay, PhonePe, Paytm or any UPI app{' '}<span className="md:hidden">(or tap the button above)</span>.</li>
        <li>2. Check the amount is <b className="text-ink">{money(amount)}</b> and pay.</li>
        <li>3. {lastStep}</li>
      </ol>
      <button type="button" onClick={() => setShowPaytmQr(!showPaytmQr)} className="mt-4 text-sm font-semibold text-brand">
        {showPaytmQr ? 'Show the QR with the amount filled in' : 'QR not working? Use the Paytm QR instead'}
      </button>
    </div>
  );
}
