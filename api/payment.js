// Payment flow, ready for Razorpay but switched off until the keys exist.
//
// GET  /api/payment            → is online payment switched on, and what do things cost?
// POST /api/payment            → create a Razorpay order for the chosen product.
//
// To switch it on, add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Vercel.
// Nothing else in the site needs to change: the booking page reads this endpoint
// and shows the pay step only when it reports enabled: true.
import { readJsonBody } from './_lib.js';

const PRODUCTS = {
  consultation: { label: '1-on-1 consultation (45 minutes)', amount: 199900 }, // paise
  course: { label: 'Full ground school course', amount: 499900 },
};

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;
const enabled = Boolean(keyId && keySecret);

export default async function handler(req, res) {
  if (req.method === 'GET') {
    res.status(200).json({
      enabled,
      keyId: enabled ? keyId : null,
      products: Object.fromEntries(
        Object.entries(PRODUCTS).map(([id, p]) => [id, { label: p.label, amount: p.amount }]),
      ),
    });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use GET or POST.' });
    return;
  }

  if (!enabled) {
    res.status(503).json({ error: 'Online payment is not switched on yet.', enabled: false });
    return;
  }

  const { product } = readJsonBody(req);
  const chosen = PRODUCTS[product];
  if (!chosen) {
    res.status(400).json({ error: 'Unknown product.' });
    return;
  }

  try {
    const order = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: chosen.amount,
        currency: 'INR',
        notes: { product, label: chosen.label },
      }),
    });

    if (!order.ok) {
      res.status(502).json({ error: 'Could not start the payment. Please try again.' });
      return;
    }

    const data = await order.json();
    res.status(200).json({ orderId: data.id, amount: chosen.amount, currency: 'INR', keyId });
  } catch {
    res.status(502).json({ error: 'Could not reach the payment provider.' });
  }
}
