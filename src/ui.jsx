import React, { useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-full bg-brand px-6 py-3 font-semibold text-on-brand shadow-[0_6px_20px_-6px_rgba(0,0,0,0.55)] transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60';
export const btnGhost =
  'inline-flex items-center justify-center gap-2 rounded-full border border-line bg-surface px-6 py-3 font-semibold text-ink transition hover:border-brand hover:text-brand';
export const input =
  'w-full rounded-xl border border-line bg-surface px-4 py-3 text-ink placeholder-slate-400 transition focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10';
export const card = 'rounded-2xl border border-line bg-surface';

// The one Google Meet room used for every consultation and doubt class.
// Keep in sync with MEET_LINK in api/_lib.js.
export const MEET_LINK = 'https://meet.google.com/wfe-ukng-igs';

// Session times in IST. Keep in sync with SLOT_TIMES in api/_lib.js.
export const SLOT_TIMES = [
  '09:30', '10:45', '12:00', '13:15', '14:30', '15:45',
  '17:00', '18:15', '19:30', '20:45', '22:00',
];

// A Cessna from the side: high wing on top of the cabin, strut, tail fin,
// propeller and wheels. Same drawing as public/favicon.svg; takes the text
// colour, so it follows the theme.
export function CessnaIcon({ className = 'h-7 w-7' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <g fill="currentColor">
      <path d="M2.6 11.1 11 10.1h4.2l2.2 1.3 2.9.4c.9.1 1.3.7 1.3 1.1s-.4 1-1.3 1.1l-3.4.6H10.2L3.6 12.6z"/>
      <path d="M2.6 11.1 1.9 6.9c0-.3.2-.5.5-.5h1c.2 0 .4.1.5.3l2.8 4.2z"/>
      <rect x="1.6" y="11.3" width="4.6" height="0.9" rx="0.45"/>
      <rect x="8.4" y="8.7" width="8.2" height="1.4" rx="0.7"/>
      <rect x="21.4" y="9.6" width="0.7" height="6.2" rx="0.35"/>
      <circle cx="12.4" cy="17" r="1.15"/>
      <circle cx="19" cy="17" r="0.95"/>
      </g>
      <g stroke="currentColor" strokeWidth="0.6" strokeLinecap="round">
      <line x1="11.6" y1="10" x2="13.4" y2="14"/>
      <line x1="12.2" y1="14.4" x2="12.4" y2="16.2"/>
      <line x1="18.6" y1="14.3" x2="19" y2="16.3"/>
      </g>
    </svg>
  );
}

export function Logo({ light = false, compact = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-on-brand">
        <CessnaIcon className="h-7 w-7" />
      </div>
      {!compact && (
        <span className={`whitespace-nowrap text-lg font-extrabold tracking-tight ${light ? 'text-white' : 'text-ink'}`}>
          Avero Aviation
        </span>
      )}
    </div>
  );
}

// Light or dark. index.html applies the saved choice before the page draws, so
// there is no white flash; this button flips it and remembers it on this device.
export function ThemeToggle({ className = '' }) {
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === 'dark');
  const flip = () => {
    const next = dark ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch { /* private mode: still works for this visit */ }
    setDark(!dark);
  };
  return (
    <button
      onClick={flip}
      className={`rounded-full border border-line p-2 text-ink transition hover:border-brand ${className}`}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={dark ? 'Light theme' : 'Dark theme'}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
