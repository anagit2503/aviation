import React, { useState } from 'react';
import { Plane, Sun, Moon } from 'lucide-react';

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

export function Logo({ light = false, compact = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-on-brand">
        <Plane className="h-5 w-5 -rotate-45" />
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
