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

// A Cessna head-on: high wing with struts, round nose with the propeller
// stopped at an angle (so the shape never reads as a cross), and three wheels.
// Same drawing as public/favicon.svg; takes the text colour, so it follows the theme.
export function CessnaIcon({ className = 'h-7 w-7' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <g fill="currentColor">
      <path d="M2.4 9.9 11 10.4h2l8.6-.5c.4 0 .6.3.6.6s-.2.6-.6.6L13 11.8h-2l-8.6-.7c-.4 0-.6-.3-.6-.6s.2-.6.6-.6z"/>
      <rect x="11.5" y="7.4" width="1" height="3.2" rx="0.5"/>
      <circle cx="12" cy="13.6" r="2.2"/>
      <rect x="11.5" y="9.9" width="1" height="7.4" rx="0.5" transform="rotate(-55 12 13.6)"/>
      <rect x="7.2" y="16.9" width="1.6" height="2.4" rx="0.8"/>
      <rect x="15.2" y="16.9" width="1.6" height="2.4" rx="0.8"/>
      <rect x="11.3" y="18.4" width="1.4" height="1.9" rx="0.7"/>
      </g>
      <g stroke="currentColor" strokeWidth="0.7" strokeLinecap="round" fill="none">
      <line x1="6.8" y1="11.2" x2="10.3" y2="14.6"/>
      <line x1="17.2" y1="11.2" x2="13.7" y2="14.6"/>
      <line x1="10.6" y1="15.2" x2="8" y2="17.2"/>
      <line x1="13.4" y1="15.2" x2="16" y2="17.2"/>
      </g>
    </svg>
  );
}

export function Logo({ light = false, compact = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-on-brand">
        <CessnaIcon className="h-9 w-9" />
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
