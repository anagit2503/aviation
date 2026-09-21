import React from 'react';
import { Plane } from 'lucide-react';

export const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-full bg-brand px-6 py-3 font-semibold text-white shadow-[0_6px_20px_-6px_rgba(47,91,224,0.55)] transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60';
export const btnGhost =
  'inline-flex items-center justify-center gap-2 rounded-full border border-line bg-white px-6 py-3 font-semibold text-ink transition hover:border-brand hover:text-brand';
export const input =
  'w-full rounded-xl border border-line bg-white px-4 py-3 text-ink placeholder-slate-400 transition focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10';
export const card = 'rounded-2xl border border-line bg-white';

// Session times in IST. Keep in sync with SLOT_TIMES in api/_lib.js.
export const SLOT_TIMES = [
  '09:30', '10:45', '12:00', '13:15', '14:30', '15:45',
  '17:00', '18:15', '19:30', '20:45', '22:00',
];

export function Logo({ light = false, compact = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white">
        <Plane className="h-5 w-5 -rotate-45" />
      </div>
      {!compact && (
        <span className={`text-lg font-extrabold tracking-tight ${light ? 'text-white' : 'text-ink'}`}>
          flywithsam
        </span>
      )}
    </div>
  );
}
