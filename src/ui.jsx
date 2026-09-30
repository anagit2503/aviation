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

// The Avero Aviation badge: a round disc with a head-on plane cut out of it,
// traced from the design the owner chose (same as public/favicon.svg). It takes
// the text colour, and the cut-out lets the page show through.
const BADGE_PATH = 'M3230 6979 c-374 -27 -770 -125 -1125 -280 -1013 -441 -1773 -1359 -2009 -2429 -129 -586 -108 -1212 61 -1770 187 -618 549 -1187 1020 -1602 564 -496 1243 -795 1972 -868 134 -13 557 -13 697 1 1040 101 1990 676 2568 1557 307 466 492 981 551 1532 19 177 19 583 0 760 -86 802 -436 1526 -1015 2100 -719 714 -1695 1072 -2720 999z m305 -2099 c19 -38 35 -72 35 -75 0 -3 -35 -4 -77 -4 -43 1 -70 3 -60 6 12 3 16 11 12 23 -5 17 38 120 50 120 3 0 21 -31 40 -70z m121 -111 c36 -11 63 -37 68 -66 6 -31 25 -305 31 -463 l6 -145 -21 42 c-43 84 -147 146 -245 146 -103 0 -211 -68 -252 -158 -12 -27 -13 -14 -8 110 7 160 25 437 30 467 5 25 22 46 49 60 45 25 272 29 342 7z m-422 -716 c5 -17 27 -18 261 -18 234 0 256 1 261 18 5 16 36 17 472 17 299 0 629 -7 917 -20 248 -10 581 -24 740 -30 160 -7 303 -16 318 -22 53 -20 57 -42 57 -328 l0 -260 -55 0 -54 0 -4 78 -3 77 -2 -82 c-1 -46 -3 -83 -5 -83 -2 0 -86 -11 -188 -25 -101 -14 -202 -28 -224 -31 -22 -3 -83 -11 -135 -19 -52 -8 -180 -25 -285 -39 -104 -14 -289 -39 -410 -56 -220 -30 -222 -30 -698 -30 l-477 0 0 24 c0 13 -7 40 -15 59 -8 20 -15 41 -15 47 0 6 150 11 443 13 l442 2 -446 3 c-395 2 -448 0 -453 -13 -11 -30 -166 -73 -166 -46 0 6 -7 11 -15 11 -8 0 -15 -5 -15 -11 0 -27 -155 16 -166 46 -5 13 -29 15 -158 13 l-151 -2 148 -3 c90 -2 147 -7 147 -14 0 -5 -7 -26 -15 -46 -8 -19 -15 -46 -15 -59 l0 -24 -476 0 -477 0 -261 36 c-955 130 -1201 165 -1203 172 -2 4 -30 5 -63 4 l-60 -4 0 256 c0 284 5 314 56 333 16 6 162 16 324 22 162 7 341 14 398 18 l102 6 0 -33 c0 -29 3 -32 23 -26 12 3 46 6 75 6 51 0 52 1 46 24 -5 22 -2 25 28 30 75 13 454 23 935 24 479 2 512 1 517 -15z m-1494 -35 c0 -19 -2 -20 -10 -8 -5 8 -10 10 -10 3 0 -6 -21 -13 -50 -15 -42 -2 -50 0 -50 14 0 16 20 22 93 26 22 2 27 -2 27 -20z m1770 -874 c0 -86 4 -134 10 -134 40 0 151 83 176 132 31 60 32 70 -51 -612 -20 -157 -42 -343 -50 -415 -9 -71 -17 -142 -20 -156 -5 -31 -33 -24 345 -84 376 -60 361 -57 382 -86 38 -50 27 -257 -18 -340 l-19 -34 -6 70 -5 70 -2 -67 -2 -67 -32 -6 c-105 -18 -574 -73 -580 -67 -4 4 -27 52 -52 107 l-45 100 342 5 342 5 -330 3 c-181 1 -335 6 -342 10 -6 4 -13 25 -15 47 -2 22 -7 -18 -12 -90 -8 -126 -9 -130 -31 -130 -22 0 -23 4 -31 130 -6 94 -10 118 -14 85 l-5 -45 -330 -5 -330 -5 332 -3 333 -2 -9 -23 c-5 -13 -28 -63 -50 -111 -39 -83 -42 -87 -68 -82 -16 3 -71 10 -123 16 -113 13 -382 48 -427 56 l-33 5 -2 67 -2 67 -6 -70 -6 -70 -21 46 c-44 96 -53 278 -15 328 21 29 6 26 382 86 124 19 253 40 288 46 l62 11 -5 32 c-3 17 -14 105 -25 196 -25 214 -52 435 -90 742 -35 290 -35 295 -10 247 29 -55 137 -139 180 -139 6 0 10 48 10 133 0 74 3 137 6 140 18 18 24 -16 24 -139z M3012 3828 c-17 -17 -15 -53 3 -68 22 -19 64 -4 71 25 4 15 1 32 -6 40 -15 18 -51 20 -68 3z M3910 3825 c-17 -20 -5 -62 20 -70 44 -14 80 41 48 73 -17 17 -53 15 -68 -3z';
export function CessnaIcon({ className = 'h-9 w-9' }) {
  return (
    <svg viewBox="0 0 700 700" className={className} aria-hidden="true">
      <path fill="currentColor" fillRule="evenodd" transform="translate(0 700) scale(0.1 -0.1)" d={BADGE_PATH} />
    </svg>
  );
}

export function Logo({ light = false, compact = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <CessnaIcon className={`h-9 w-9 shrink-0 ${light ? 'text-white' : 'text-brand'}`} />
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
