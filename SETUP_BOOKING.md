# Switching on bookings, email and Google login

The website is live and works right now. Three things still need accounts in your name
before they do anything real: saving bookings, sending you the booking email, and
Google login. None of them cost money to start.

Do them in any order. After each one, Vercel needs a redeploy for the change to take
effect: **Vercel → your project → Deployments → the top one → ⋯ → Redeploy**.

---

## 1. Where bookings get saved (10 minutes)

Without this, the time slots never show as booked and the booking button says booking
is not switched on.

1. Go to **vercel.com → your `aviation` project → Storage**.
2. Click **Create Database**, choose **Upstash → Redis**, and accept the free plan.
3. Give it any name and click **Create**, then **Connect** it to the `aviation` project.

Vercel adds the keys for you. You do not have to copy anything by hand.

## 2. The booking email (10 minutes)

Without this, bookings still save and block the slot, but no email reaches you.

1. Go to **resend.com** and sign up **with samarthya.s02@gmail.com**. This matters:
   until you verify a domain, Resend only delivers to the address that owns the account.
2. Open **API Keys → Create API Key**, and copy the key it shows once.
3. In **Vercel → Settings → Environment Variables**, add:
   - Name `RESEND_API_KEY`, value: the key you copied
   - Name `BOOKING_EMAIL`, value: `samarthya.s02@gmail.com`
4. Redeploy.

Booking emails arrive with the date, time, name, email, phone, what the student wants to
discuss, whether they added the recording, and the amount to collect.

## 3. Google login (15 minutes)

Until this is done, the "Continue with Google" button explains that it is not connected
and students can still use email and password.

1. Go to **console.firebase.google.com** and click **Create a project**.
2. In the project, open **Build → Authentication → Get started**, pick **Google**,
   switch it on, choose your support email, and save.
3. Open **Project settings (gear icon) → General**, scroll to **Your apps**, click the
   **Web** icon `</>`, register the app with any nickname.
4. Firebase shows a block of code with `apiKey`, `authDomain` and so on. In
   **Vercel → Settings → Environment Variables**, add each value:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
5. Back in Firebase, open **Authentication → Settings → Authorized domains** and add
   your live web address (for example `aviation-psi.vercel.app`), plus your own domain
   if you buy one later.
6. Redeploy.

## 4. Online payment — later

The code for Razorpay is already written and switched off. When your Razorpay account is
approved, add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in Vercel and redeploy. The
booking button then changes from "Confirm booking" to "Confirm and pay".

Until then, the booking page tells students you will send payment details by email.

---

## Everyday questions

**Someone booked a slot. What happens?**
The slot immediately shows as crossed out for everyone else, and you get an email. Two
people clicking the same slot at the same time cannot both get it.

**How do I block time for myself?**
There is no admin screen for this yet. Tell me and I will add one.

**What do the prices say now?**
Consultation ₹1,999, optional session recording ₹400, course ₹4,999 one-time. To change
them, edit `SESSION_PRICE` and `RECORDING_PRICE` in `src/BookingPage.jsx`, the prices in
the pricing section of `src/App.jsx`, and the amounts in `api/payment.js`.
