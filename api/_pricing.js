// Course prices, used by both the website (src/) and the payment server
// (api/payment.js), so the two can never disagree. The server always works
// the amount out itself from this table; the browser's total is only shown.
//
// `was` is the old price shown struck through. Prices are per month.

export const SUBJECT_PRICES = {
  'Air Navigation': { price: 7999, was: 11999 },
  'Aviation Meteorology': { price: 3999, was: 5999 },
  'Air Regulations': { price: 4999, was: 6999 },
  'Technical General': { price: 2999 },
  'Technical Specific': { price: 2999 },
  'Radio Telephony (RTR)': { price: 8999 },
};

// Navigation + Meteorology + Regulations for two months.
export const BUNDLE = {
  id: 'nav-met-reg-2m',
  name: 'Navigation, Meteorology & Regulations bundle',
  subjects: ['Air Navigation', 'Aviation Meteorology', 'Air Regulations'],
  months: 2,
  price: 21999,
  was: 33994,
};

// 1-on-1 consultation (one session). The amount charged lives in api/book.js.
export const CONSULTATION = { price: 1999, was: 3999 };

export const priceOf = (subject) => SUBJECT_PRICES[subject]?.price ?? null;
export const lowestPrice = Math.min(...Object.values(SUBJECT_PRICES).map((p) => p.price));
export const rupees = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

// What a selection costs. With the bundle, its three subjects are covered by
// the bundle price and any other subjects are added at their own price.
export function quote(subjects, withBundle = false) {
  const known = [...new Set(subjects)].filter((s) => SUBJECT_PRICES[s]);
  const lines = [];
  if (withBundle) {
    lines.push({ label: `${BUNDLE.name} (${BUNDLE.months} months)`, price: BUNDLE.price, was: BUNDLE.was, bundle: true });
  }
  for (const s of known) {
    if (withBundle && BUNDLE.subjects.includes(s)) continue;
    lines.push({ label: s, price: SUBJECT_PRICES[s].price, was: SUBJECT_PRICES[s].was });
  }
  const subjectsCovered = withBundle ? [...new Set([...BUNDLE.subjects, ...known])] : known;
  const total = lines.reduce((n, l) => n + l.price, 0);
  const wasTotal = lines.reduce((n, l) => n + (l.was || l.price), 0);
  return { lines, subjects: subjectsCovered, total, saving: wasTotal - total };
}
