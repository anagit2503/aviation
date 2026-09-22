import React, { useState, useEffect } from 'react';
import {
  Menu, X, LogOut, Upload, Trash2, Eye, BookOpen, Users, FileText, Plane,
  PlayCircle, NotebookPen, ListChecks, ClipboardCheck, Check, ChevronDown, FileQuestion,
  LayoutDashboard, ArrowLeft, Star, Building2, Hourglass, Quote, CalendarClock, BarChart3, GraduationCap, Wallet, Compass, Clock, Infinity as InfinityIcon,
} from 'lucide-react';

// ============= FIREBASE CONFIG =============
// Replace these with your Firebase project details
const FIREBASE_CONFIG = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

import { Logo, btnPrimary, btnGhost, input, card } from './ui.jsx';
import BookingPage from './BookingPage.jsx';
import { googleReady, signInWithGoogle, watchGoogleUser, signOutGoogle, currentIdToken } from './auth.js';

const PATH_TO_MODE = { '/login': 'login', '/signup': 'signup', '/book': 'book' };
const MODE_TO_PATH = { landing: '/', login: '/login', signup: '/signup', book: '/book' };

// ============= MAIN APP =============
export default function AviationGroundSchool() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [restoring, setRestoring] = useState(googleReady);
  const [authMode, setAuthModeState] = useState(() => PATH_TO_MODE[window.location.pathname] || 'landing'); // landing, login, signup

  // Each public page gets its own URL so the browser's back/forward buttons work
  const setAuthMode = (mode) => {
    setAuthModeState(mode);
    const path = MODE_TO_PATH[mode] || '/';
    if (window.location.pathname !== path) window.history.pushState(null, '', path);
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    const onPopState = () => setAuthModeState(PATH_TO_MODE[window.location.pathname] || 'landing');
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Simulated login for demo
  // Bring the session back after a refresh, before anything is drawn.
  useEffect(() => {
    let cancelled = false;
    let unsubscribe = () => {};
    // Never let a slow or blocked Firebase keep the site on a loading screen.
    const giveUp = setTimeout(() => setRestoring(false), 2000);

    watchGoogleUser(async (googleUser) => {
      if (cancelled) return;
      clearTimeout(giveUp);
      if (!googleUser) {
        setRestoring(false);
        return;
      }
      await applyGoogleUser(googleUser, { keepPage: true });
      setRestoring(false);
    }).then((fn) => { unsubscribe = fn || (() => {}); });

    // If Google sign-in is not connected, there is nothing to restore.
    if (!googleReady) setRestoring(false);

    return () => { cancelled = true; clearTimeout(giveUp); unsubscribe(); };
  }, []);

  const applyGoogleUser = async (googleUser, { keepPage = false } = {}) => {
    // The server checks the sign-in, records the account and decides what this
    // person can see. The list in the browser is only a fallback.
    let profile = null;
    try {
      const res = await fetch('/api/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: googleUser.idToken }),
      });
      if (res.ok) profile = await res.json();
    } catch {
      profile = null;
    }

    const instructor = profile ? profile.instructor : isInstructor(googleUser.email);
    setUser({
      email: googleUser.email,
      name: googleUser.name || profile?.name || '',
      idToken: googleUser.idToken,
      access: profile?.access || null,
      role: instructor ? 'admin' : 'student',
    });
    setIsAdmin(instructor);
    // Coming back to /book after a refresh should stay on the booking page.
    const restoredMode = keepPage ? PATH_TO_MODE[window.location.pathname] : null;
    setAuthModeState(restoredMode || (instructor ? 'admin' : 'dashboard'));
    if (!keepPage) window.history.replaceState(null, '', '/');
  };

  const handleGoogleUser = (googleUser) => applyGoogleUser(googleUser);

  // Access can change while someone is signed in, so check again when they come
  // back to the tab. Without this a student who has just been given access would
  // keep seeing the locked screen until they signed out.
  const refreshAccess = async () => {
    const idToken = await currentIdToken();
    if (!idToken) return;
    try {
      const res = await fetch('/api/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) return;
      const profile = await res.json();
      setUser((current) => (current ? { ...current, access: profile.access, idToken } : current));
      setIsAdmin(profile.instructor);
    } catch {
      // keep whatever we already had
    }
  };

  useEffect(() => {
    if (!user) return undefined;
    const onFocus = () => refreshAccess();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user?.email]);

  const handleLogout = () => {
    signOutGoogle();
    setUser(null);
    setIsAdmin(false);
    setAuthMode('landing');
  };

  if (restoring) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex items-center gap-3 text-muted">
          <Plane className="h-5 w-5 -rotate-45 animate-pulse text-brand" />
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white">
      {/* The public pages stay reachable while signed in. */}
      {authMode === 'landing' && user ? (
        <LandingPage setAuthMode={setAuthMode} signedIn />
      ) : authMode === 'book' ? (
        <BookingPage goHome={() => setAuthMode(user ? (isAdmin ? 'admin' : 'dashboard') : 'landing')} />
      ) : !user ? (
        <>
          {authMode === 'landing' && <LandingPage setAuthMode={setAuthMode} />}
          {authMode === 'login' && <AuthPage mode="login" setAuthMode={setAuthMode} onGoogleUser={handleGoogleUser} />}
          {authMode === 'signup' && <AuthPage mode="signup" setAuthMode={setAuthMode} onGoogleUser={handleGoogleUser} />}
        </>
      ) : isAdmin ? (
        <AdminPortal user={user} onLogout={handleLogout} />
      ) : (
        <StudentDashboard user={user} onLogout={handleLogout} onGoPublic={setAuthMode} onRefreshAccess={refreshAccess} />
      )}
    </div>
  );
}

// ============= LANDING PAGE =============
const SUBJECTS = [
  {
    name: 'Air Navigation',
    tab: 'Air Navigation',
    blurb: 'Map reading, flight planning and radio aids, worked out step by step.',
    topics: ['Maps & charts', 'Flight planning', 'Compass & magnetism', 'Radio navigation aids'],
  },
  {
    name: 'Aviation Meteorology',
    tab: 'Meteorology',
    blurb: 'Weather, clouds and pressure, plus lots of practice reading METARs and TAFs.',
    topics: ['Weather systems & fronts', 'Clouds & precipitation', 'Atmospheric pressure', 'METARs & TAFs'],
  },
  {
    name: 'Air Regulations',
    tab: 'Air Regulations',
    blurb: 'Air law, traffic rules and safety, in the exact words the exam uses.',
    topics: ['Rules of the air', 'Airspace & ATC services', 'Licensing & medicals', 'Safety procedures'],
  },
  {
    name: 'Technical General',
    tab: 'Technical General',
    blurb: 'Structures, principles of flight, engines and systems, explained simply.',
    topics: ['Principles of flight', 'Aircraft structures', 'Piston & turbine engines', 'Systems & instruments'],
  },
  {
    name: 'Technical Specific',
    tab: 'Technical Specific',
    blurb: 'Everything about the aircraft you will fly: limits, systems and performance.',
    topics: ['Type limitations', 'Aircraft systems', 'Performance & loading', 'Emergency procedures'],
  },
  {
    name: 'Radio Telephony (RTR)',
    tab: 'RTR',
    blurb: 'How to talk to ATC, with practice for the oral exam.',
    topics: ['Standard phraseology', 'Radio procedures', 'Emergency calls', 'Practice exchanges'],
  },
];

const FEATURES = [
  { icon: FileQuestion, title: '2000+ questions', text: 'Genuine questions across all six papers.' },
  { icon: NotebookPen, title: 'Study notes', text: 'Short notes that follow the syllabus.' },
  { icon: ListChecks, title: 'Topic tests', text: 'Short tests after every topic.' },
  { icon: ClipboardCheck, title: 'Mock exams', text: 'Full papers with timing, marked at once.' },
];

const REASONS = [
  { icon: GraduationCap, title: 'Taught by a CPL holder', text: 'Taught by someone who has sat these papers.' },
  { icon: Compass, title: 'Always know what is next', text: 'Material in a set order, topic by topic.' },
  { icon: BarChart3, title: 'See your progress', text: 'Your marks update as you finish quizzes.' },
  { icon: Clock, title: 'Study on your schedule', text: 'Study anytime, on any device.' },
  { icon: InfinityIcon, title: 'Yours for good', text: 'Pay once, keep it forever.' },
  { icon: Wallet, title: 'Fairly priced', text: 'One fee for all six subjects.' },
];

const PITFALLS = [
  {
    icon: Wallet,
    title: 'Costs nobody warns you about',
    text: 'Exam fees, retakes, conversion, type rating. Most students spend lakhs more than they planned.',
  },
  {
    icon: Building2,
    title: 'The wrong flight school',
    text: 'Not every school abroad converts easily to a DGCA licence. The wrong one costs you again.',
  },
  {
    icon: Hourglass,
    title: 'A year lost to delays',
    text: 'Failed papers, visa waits and bad weather add a year. Most of it can be avoided.',
  },
];

const REVIEWS = [
  {
    name: 'Aditya Menon',
    colour: 'from-indigo-500 to-violet-500',
    role: 'Preparing for CPL, Kochi',
    text: 'I had failed Navigation twice. He looked at my papers and showed me where I was losing marks. I did not have to study the whole subject again. I got 88 in the next attempt.',
  },
  {
    name: 'Ishita Rao',
    colour: 'from-rose-500 to-pink-500',
    role: 'Student pilot, Bengaluru',
    text: 'I wanted a mentor, not one more class. He really knows his stuff, and he answers even the small doubts I felt shy to ask anywhere else.',
  },
  {
    name: 'Harshit Sabharwal',
    colour: 'from-sky-500 to-blue-600',
    role: 'Converting an FAA licence, Delhi',
    text: 'It is hard to find someone in this field who will talk to you honestly about money and time. One call stopped me from joining a school that would have cost me a year.',
  },
  {
    name: 'Nandini Pillai',
    colour: 'from-amber-400 to-orange-500',
    role: 'Cleared four papers, Chennai',
    text: 'The notes are the best I have used. They are written the same way the questions are asked, so nothing feels new in the exam.',
  },
  {
    name: 'Rohan Deshmukh',
    colour: 'from-emerald-500 to-teal-500',
    role: 'CPL aspirant, Pune',
    text: 'He cleared all my doubts in one call. Later I got stuck again and he replied on WhatsApp. He still remembers how hard this time is.',
  },
  {
    name: 'Simran Kaur',
    colour: 'from-fuchsia-500 to-purple-600',
    role: 'Ground school student, Amritsar',
    text: 'I paid a lot for classes before and nobody there knew my name. Here my plan is made for me, and someone checks on me if I fall behind.',
  },
];

const FAQS = [
  {
    q: 'Where should I do my CPL: South Africa, the USA or India?',
    a: 'I chose the USA and I still recommend it for most students. The price is reasonable, the course is faster, and there is more flying weather so you finish on time. South Africa can work, but check that the school converts cleanly to a DGCA licence. India is the slowest and usually the most expensive. On a call we can look at your budget and timeline and pick the right one for you.',
  },
  {
    q: 'Should I clear the DGCA papers before I go abroad?',
    a: 'Yes, clear as many as you can first. Papers are much harder to study for once flying training starts, and having them done means no waiting around after you come back.',
  },
  {
    q: 'Which exams does this prepare me for?',
    a: 'All six DGCA CPL ground subjects: Air Navigation, Aviation Meteorology, Air Regulations, Technical General, Technical Specific and Radio Telephony (RTR). You need at least 70% in each paper to pass.',
  },
  {
    q: 'What if I fail a paper?',
    a: 'It happens, and it happened to me. You write that paper again in the next session. What matters is finding out where you lost marks instead of studying the whole subject again.',
  },
  {
    q: 'How long does it take to finish?',
    a: 'Most students complete all six subjects in 3 to 5 months, studying an hour or two a day. You can go faster or slower.',
  },
  {
    q: 'What does the whole thing cost, start to finish?',
    a: 'It depends on the country and the school, and prices change. That is exactly what the consultation is for: we go through the real numbers, including the fees most schools do not mention up front.',
  },
  {
    q: 'Do I get access forever?',
    a: 'Yes. One payment gives you lifetime access to all the notes, questions and mock exams, plus future updates.',
  },
  {
    q: 'Should I book a call or buy the course?',
    a: 'Book a call if you are still deciding where to train or what to do next. Buy the course if you have exams to clear. Many students do both.',
  },
];

function LandingPage({ setAuthMode, signedIn = false }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSubject, setActiveSubject] = useState(0);
  const [openFaq, setOpenFaq] = useState(0);
  const subject = SUBJECTS[activeSubject];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-line/70 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-8 text-[15px] font-medium text-muted md:flex">
            <a href="#subjects" className="transition hover:text-ink">Subjects</a>
            <a href="#about" className="transition hover:text-ink">About</a>
            <a href="#why" className="transition hover:text-ink">Why flywithsam</a>
            <a href="#reviews" className="transition hover:text-ink">Reviews</a>
            <a href="#pricing" className="transition hover:text-ink">Pricing</a>
            <a href="#faq" className="transition hover:text-ink">FAQ</a>
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            <button
              onClick={() => setAuthMode(signedIn ? 'dashboard' : 'login')}
              className="rounded-full px-4 py-2 font-semibold text-ink transition hover:bg-mist"
            >
              {signedIn ? 'My dashboard' : 'Log in'}
            </button>
            <button onClick={() => setAuthMode('book')} className={`${btnPrimary} px-5 py-2.5 text-sm`}>
              Book a consultation
            </button>
          </div>
          <button className="rounded-lg p-2 md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Menu">
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="space-y-1 border-t border-line bg-white px-4 py-4 md:hidden">
            {[['#subjects', 'Subjects'], ['#about', 'About'], ['#why', 'Why flywithsam'], ['#reviews', 'Reviews'], ['#pricing', 'Pricing'], ['#faq', 'FAQ']].map(([href, label]) => (
              <a key={href} href={href} onClick={() => setMobileMenuOpen(false)} className="block rounded-lg px-3 py-2 font-medium text-ink hover:bg-mist">
                {label}
              </a>
            ))}
            <div className="flex gap-2 pt-3">
              <button onClick={() => setAuthMode('login')} className={`${btnGhost} flex-1 py-2.5`}>Log in</button>
              <button onClick={() => setAuthMode('book')} className={`${btnPrimary} flex-1 py-2.5`}>Book a call</button>
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-sky to-white">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-24">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-sm font-semibold text-brand shadow-sm ring-1 ring-line">
              <Plane className="h-4 w-4 -rotate-45" /> CPL ground school, online
            </p>
            <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-[3.6rem]">
              Pass your CPL ground exams without the guesswork.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
              Clear notes and 2000+ real exam questions, from a pilot who scored 90+ in all six papers.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <button onClick={() => setAuthMode('book')} className={btnPrimary}>Book a consultation</button>
              <a href="#pricing" className={btnGhost}>See the course</a>
            </div>
            <div className="mt-10 flex items-center gap-8 text-sm text-muted">
              <div><span className="block text-2xl font-extrabold text-ink">500+</span>students trained</div>
              <div className="h-10 w-px bg-line" />
              <div><span className="block text-2xl font-extrabold text-ink">95%</span>pass rate</div>
            </div>
          </div>

          {/* Photos */}
          <div className="relative mx-auto w-full max-w-md pb-14 pr-14 sm:pr-20 lg:max-w-none">
            <img
              src="/about/cockpit.jpg"
              alt="At the controls of a Cessna over the ocean off Miami"
              className="aspect-[4/5] w-full rounded-3xl object-cover shadow-[0_24px_60px_-24px_rgba(15,23,51,0.35)]"
            />
            <img
              src="/about/ramp.jpg"
              alt="On the ramp in uniform next to a training aircraft"
              className="absolute bottom-0 right-0 aspect-[3/4] w-[42%] rounded-2xl border-[6px] border-white object-cover object-[60%_72%] shadow-[0_20px_40px_-16px_rgba(15,23,51,0.35)]"
            />
            <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3.5 py-1.5 text-sm font-bold text-ink shadow-sm">
              90+ in all six DGCA papers
            </span>
          </div>
        </div>
      </section>

      {/* Subjects */}
      <section id="subjects" className="scroll-mt-20 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Six DGCA subjects, one clear path</h2>
            <p className="mt-4 text-lg text-muted">You need 70% in each paper to pass.</p>
          </div>

          <div className="mt-10 flex max-w-full gap-1 overflow-x-auto rounded-full bg-mist p-1.5 lg:inline-flex">
            {SUBJECTS.map((s, i) => (
              <button
                key={s.name}
                onClick={() => setActiveSubject(i)}
                className={`whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                  activeSubject === i ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'
                }`}
              >
                {s.tab}
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-6 rounded-3xl bg-sky p-6 sm:p-10 lg:grid-cols-2 lg:gap-12">
            <div>
              <h3 className="text-2xl font-bold text-ink">{subject.name}</h3>
              <p className="mt-3 text-muted leading-relaxed">{subject.blurb}</p>
              <ul className="mt-6 grid grid-cols-2 gap-3">
                {subject.topics.map((t) => (
                  <li key={t} className="flex items-center gap-2 text-[15px] font-medium text-ink">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand/10 text-brand">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
              <button onClick={() => setAuthMode('signup')} className={`${btnPrimary} mt-8`}>Start this subject</button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-2xl bg-white p-5">
                  <Icon className="h-6 w-6 text-brand" />
                  <p className="mt-3 font-bold text-ink">{title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="scroll-mt-20 py-20 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">I was exactly where you are now.</h2>
            <div className="mt-6 space-y-4 text-lg leading-relaxed text-muted">
              <p>
                I did my CPL at SkyDuo Aviation Academy in Miami. I could not find the right mentor, so even after paying for
                expensive classes I worked most of it out alone.
              </p>
              <p>
                I scored 90+ in every subject. A few papers took me two attempts, and those retakes showed me exactly where
                students lose marks.
              </p>
              <p>All of that is in these notes and questions, so you can clear every paper the first time.</p>
            </div>
            <ul className="mt-8 flex flex-wrap gap-3">
              <li className="inline-flex items-center gap-2 rounded-full bg-sky px-4 py-2 text-sm font-semibold text-ink">
                <GraduationCap className="h-4 w-4 text-brand" /> CPL, SkyDuo Aviation Academy, Miami
              </li>
              <li className="inline-flex items-center gap-2 rounded-full bg-sky px-4 py-2 text-sm font-semibold text-ink">
                <BarChart3 className="h-4 w-4 text-brand" /> 90+ in all DGCA subjects
              </li>
              <li className="inline-flex items-center gap-2 rounded-full bg-sky px-4 py-2 text-sm font-semibold text-ink">
                <NotebookPen className="h-4 w-4 text-brand" /> Notes built from real flying
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Why */}
      <section id="why" className="scroll-mt-20 bg-mist py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Why students choose flywithsam</h2>
              <p className="mt-5 text-lg text-muted">Six reasons students stay.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {REASONS.map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-2xl bg-white p-6 ring-1 ring-line">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky text-brand">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="mt-4 font-bold text-ink">{title}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section id="reviews" className="scroll-mt-20 bg-sky py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">What students say</h2>
            <p className="mt-4 text-lg text-muted">From people who were sitting exactly where you are.</p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {REVIEWS.map((r) => (
              <figure key={r.name} className="flex h-full flex-col rounded-3xl bg-white p-6 shadow-[0_12px_30px_-18px_rgba(15,23,51,0.35)]">
                <figcaption className="flex items-center gap-3.5">
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${r.colour} text-lg font-bold text-white`}>
                    {r.name[0]}
                  </span>
                  <span>
                    <span className="block font-bold text-ink">{r.name}</span>
                    <span className="mt-0.5 flex gap-0.5" aria-label="5 out of 5">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                      ))}
                    </span>
                  </span>
                </figcaption>
                <blockquote className="mt-5 flex-1 leading-relaxed text-muted">{r.text}</blockquote>
                <p className="mt-5 border-t border-line pt-4 text-sm text-muted">{r.role}</p>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* What goes wrong */}
      <section className="bg-night py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              What actually costs students their licence
            </h2>
            <p className="mt-4 text-lg text-blue-100/75">
              Flying is the easy part. Most money and time is lost before you reach a cockpit.
            </p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {PITFALLS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl bg-white/5 p-7 ring-1 ring-white/10">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-blue-200">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-5 text-lg font-bold text-white">{title}</p>
                <p className="mt-2 leading-relaxed text-blue-100/70">{text}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <button onClick={() => setAuthMode('book')} className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-ink transition hover:bg-sky">
              <CalendarClock className="h-4 w-4" /> Talk it through with me
            </button>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-20 bg-mist py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">What we offer</h2>
            <p className="mt-4 text-lg text-muted">A call when you need answers. A question bank and notes when you need to pass.</p>
          </div>

          <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
            {/* Consultation */}
            <div className={`${card} flex flex-col p-8`}>
              <p className="font-bold text-ink">1-on-1 consultation</p>
              <p className="mt-1 text-sm text-muted">For choosing a school, a country or your next step</p>
              <p className="mt-6 text-4xl font-extrabold tracking-tight text-ink">₹1,999</p>
              <p className="mt-1 text-sm text-muted">45 minutes, one session</p>
              <ul className="mt-7 flex-1 space-y-3 text-[15px]">
                {[
                  '45 minutes 1-on-1 on Google Meet',
                  'Ask anything: schools, exams, costs, visas',
                  'A study and career plan made for you',
                  'Honest answers on money and timelines',
                  'Session recording for ₹400 more',
                ].map((f) => (
                  <li key={f} className="flex gap-3 text-ink">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-go" strokeWidth={2.5} /> {f}
                  </li>
                ))}
              </ul>
              <button onClick={() => setAuthMode('book')} className={`${btnGhost} mt-8 w-full py-3.5`}>Book a consultation</button>
            </div>

            {/* Course */}
            <div className={`${card} relative flex flex-col p-8 ring-2 ring-brand shadow-[0_24px_60px_-24px_rgba(47,91,224,0.35)]`}>
              <span className="absolute -top-3 left-8 rounded-full bg-brand px-3 py-1 text-xs font-bold text-white">Most popular</span>
              <p className="font-bold text-ink">Full ground school course</p>
              <p className="mt-1 text-sm text-muted">Notes and questions for all six DGCA papers</p>
              <p className="mt-6 text-4xl font-extrabold tracking-tight text-ink">₹4,999</p>
              <p className="mt-1 text-sm text-muted">One-time payment, lifetime access</p>
              <ul className="mt-7 flex-1 space-y-3 text-[15px]">
                {[
                  'Complete notes for all six subjects',
                  '2000+ genuine exam questions',
                  'Topic tests and full mock exams',
                  'Study material you can download',
                  'Your marks tracked subject by subject',
                  'Free updates when the syllabus changes',
                ].map((f) => (
                  <li key={f} className="flex gap-3 text-ink">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-go" strokeWidth={2.5} /> {f}
                  </li>
                ))}
              </ul>
              <button onClick={() => setAuthMode('signup')} className={`${btnPrimary} mt-8 w-full py-3.5`}>Get the course</button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 py-20 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.6fr]">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Questions students ask</h2>
            <p className="mt-4 text-muted">Something else on your mind? Log in and message the instructor from your dashboard.</p>
          </div>
          <div className="space-y-3">
            {FAQS.map((f, i) => (
              <div key={f.q} className="rounded-2xl bg-white ring-1 ring-line">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left font-semibold text-ink"
                  aria-expanded={openFaq === i}
                >
                  {f.q}
                  <ChevronDown className={`h-5 w-5 shrink-0 text-muted transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                <div className={`grid transition-all duration-300 ${openFaq === i ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                  <p className="overflow-hidden px-6 text-muted leading-relaxed">
                    <span className="block pb-5">{f.a}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="px-4 py-20 sm:px-6">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-night px-6 py-16 text-center sm:px-12">
          <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-30" aria-hidden preserveAspectRatio="none" viewBox="0 0 800 300">
            <path d="M-20 250 C 200 60, 520 320, 820 40" fill="none" stroke="#6f8ff0" strokeWidth="2" strokeDasharray="6 10" />
          </svg>
          <h2 className="relative text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Your licence starts on the ground.</h2>
          <p className="relative mx-auto mt-4 max-w-xl text-lg text-blue-100/80">
            Join 500+ students who studied with a clear plan and passed.
          </p>
          <button onClick={() => setAuthMode('signup')} className="relative mt-8 inline-flex items-center justify-center rounded-full bg-white px-6 py-3 font-semibold text-ink transition hover:bg-sky">
            Create your account
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted sm:flex-row sm:px-6">
          <Logo />
          <p>&copy; {new Date().getFullYear()} flywithsam Ground School. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

// Instructors sign in with Google like everyone else; these addresses get the
// instructor portal. Knowing an address here does not let anyone in: they would
// still have to pass Google's sign-in for that account.
const INSTRUCTOR_EMAILS = [
  'samarthya.s02@gmail.com',
  'khanooja.anandita@gmail.com',
];

const isInstructor = (email) => INSTRUCTOR_EMAILS.includes((email || '').trim().toLowerCase());

// Show a person's first name. Google gives us a full name; with email signup we
// ask for one; otherwise fall back to the first part of the email address.
function firstName(user) {
  if (user?.name?.trim()) return user.name.trim().split(/\s+/)[0];
  const local = (user?.email || '').split('@')[0].split(/[._-]/)[0];
  return local ? local.charAt(0).toUpperCase() + local.slice(1) : 'there';
}

// ============= GOOGLE SIGN-IN =============
function GoogleButton({ onGoogleUser, label }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const click = async () => {
    setError('');
    if (!googleReady) {
      setError('Google sign-in is not connected yet. Use your email and password for now.');
      return;
    }
    setBusy(true);
    try {
      const user = await signInWithGoogle();
      if (user) onGoogleUser(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={click}
        disabled={busy}
        className="flex w-full items-center justify-center gap-3 rounded-full border border-line bg-white px-6 py-3 font-semibold text-ink transition hover:bg-mist disabled:opacity-60"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
          <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.4a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.8z" />
          <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3a7.2 7.2 0 0 1-10.7-3.8h-4v3.1A12 12 0 0 0 12 24z" />
          <path fill="#FBBC05" d="M5.3 14.3a7.1 7.1 0 0 1 0-4.6v-3.1h-4a12 12 0 0 0 0 10.8l4-3.1z" />
          <path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1A7.2 7.2 0 0 1 12 4.8z" />
        </svg>
        {busy ? 'Opening Google…' : label}
      </button>
      {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}
      <div className="h-6" />
    </div>
  );
}

// ============= AUTH LAYOUT =============
function AuthLayout({ title, subtitle, children, setAuthMode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-night p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-25" aria-hidden preserveAspectRatio="none" viewBox="0 0 400 600">
          <path d="M-10 520 C 120 380, 260 520, 420 120" fill="none" stroke="#6f8ff0" strokeWidth="2" strokeDasharray="6 10" />
        </svg>
        <button onClick={() => setAuthMode('landing')} className="relative w-fit"><Logo light /></button>
        <div className="relative max-w-md">
          <p className="text-3xl font-extrabold leading-tight">Everything you need for the CPL ground papers, in one place.</p>
          <p className="mt-4 text-blue-100/70">Notes, 2000+ questions, topic tests and mock exams.</p>
        </div>
        <p className="relative text-sm text-blue-100/50">Trusted by 500+ student pilots</p>
      </div>
      <div className="flex items-center justify-center bg-white px-4 py-12 sm:px-6">
        <div className="w-full max-w-sm">
          <button onClick={() => setAuthMode('landing')} className="mb-8 inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition hover:text-ink">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </button>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">{title}</h1>
          <p className="mt-2 text-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

// ============= SIGN IN =============
// Google is the only way in. There is no password to leak, and access is decided
// on the server from the signed-in address.
function AuthPage({ mode, setAuthMode, onGoogleUser }) {
  const joining = mode === 'signup';
  return (
    <AuthLayout
      setAuthMode={setAuthMode}
      title={joining ? 'Create your account' : 'Welcome back'}
      subtitle={joining
        ? 'Sign up with Google. It takes a few seconds and there is no password to remember.'
        : 'Sign in with the Google account you used before.'}
    >
      <GoogleButton onGoogleUser={onGoogleUser} label={joining ? 'Sign up with Google' : 'Continue with Google'} />

      <div className="rounded-2xl bg-mist p-5 text-sm text-muted">
        <p className="font-semibold text-ink">What happens next</p>
        <ul className="mt-2 space-y-1.5">
          <li>Booked a consultation? You do not need an account at all.</li>
          <li>Bought the course? Sign in and we switch on your subjects.</li>
          <li>Teaching here? The same button opens your instructor portal.</li>
        </ul>
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        {joining ? 'Already signed up?' : 'First time here?'}{' '}
        <button
          onClick={() => setAuthMode(joining ? 'login' : 'signup')}
          className="font-semibold text-brand hover:text-brand-dark"
        >
          {joining ? 'Sign in' : 'Create an account'}
        </button>
      </p>
    </AuthLayout>
  );
}

// ============= APP SHELL (dashboards) =============
function AppShell({ title, subtitle, onLogout, tabs, activeTab, setActiveTab, children }) {
  return (
    <div className="min-h-screen bg-mist">
      <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Logo />
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs text-muted">{subtitle}</p>
              <p className="text-sm font-semibold text-ink">{title}</p>
            </div>
            <button onClick={onLogout} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:border-red-200 hover:bg-red-50 hover:text-red-600">
              <LogOut className="h-4 w-4" /> Log out
            </button>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <nav className="-mb-px flex gap-1 overflow-x-auto">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold transition ${
                  activeTab === id ? 'border-brand text-brand' : 'border-transparent text-muted hover:text-ink'
                }`}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}

function ProgressBar({ value, color = 'bg-brand', height = 'h-2' }) {
  return (
    <div className={`${height} overflow-hidden rounded-full bg-line`}>
      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${value}%` }} />
    </div>
  );
}

// ============= STUDENT DASHBOARD =============
function StudentDashboard({ user, onLogout, onGoPublic, onRefreshAccess }) {
  const [activeTab, setActiveTab] = useState('overview');
  // What this person can open is decided by the instructor, saved on the server.
  const access = user.access || { plan: 'none', subjects: [], questions: false, tests: false };
  const allowed = SUBJECTS.filter((s) => access.subjects?.includes(s.name));

  // Everyone starts at zero. Real progress will come from the database once
  // students' work is saved; nothing here is pre-filled.
  const subjects = React.useMemo(
    () => allowed.map((s, i) => ({
      id: i + 1,
      name: s.name,
      topicsDone: 0,
      topicsTotal: s.topics.length,
      testsDone: 0,
      bestScore: null,
    })),
    [access.subjects?.join(',')],
  );

  const resources = React.useMemo(
    () => allowed.map((s, i) => ({
      id: i + 1,
      title: `${s.name} — complete notes`,
      subject: s.name,
      detail: 'PDF',
      opened: false,
    })),
    [access.subjects?.join(',')],
  );

  const topicsDone = subjects.reduce((sum, s) => sum + s.topicsDone, 0);
  const topicsTotal = subjects.reduce((sum, s) => sum + s.topicsTotal, 0);
  const overallPercentage = topicsTotal ? Math.round((topicsDone / topicsTotal) * 100) : 0;
  const testsDone = subjects.reduce((sum, s) => sum + s.testsDone, 0);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'resources', label: 'Resources', icon: FileText },
    ...(access.questions ? [{ id: 'quizzes', label: 'Practice questions', icon: ListChecks }] : []),
    ...(access.tests ? [{ id: 'scores', label: 'Test scores', icon: BarChart3 }] : []),
  ];

  // Nobody gets course material until the instructor grants it.
  if (allowed.length === 0) {
    return (
      <AppShell title={firstName(user)} subtitle="Welcome" onLogout={onLogout}
        tabs={[{ id: 'overview', label: 'Overview', icon: LayoutDashboard }]}
        activeTab="overview" setActiveTab={() => {}}>
        <div className={`${card} mx-auto max-w-xl p-10 text-center`}>
          <BookOpen className="mx-auto h-10 w-10 text-brand" />
          <h2 className="mt-5 text-xl font-bold text-ink">
            {access.plan === 'consultation' ? 'Your consultation is booked' : 'No course access yet'}
          </h2>
          <p className="mt-2 text-muted">
            {access.plan === 'consultation'
              ? 'Course notes and questions are part of the ground school course. Ask about it on your call, or get it below.'
              : 'Once you join the course, your notes, questions and tests appear here.'}
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <button onClick={() => onGoPublic('landing')} className={btnPrimary}>See the course</button>
            <button onClick={() => onGoPublic('book')} className={btnGhost}>Book a consultation</button>
          </div>
          <p className="mt-6 text-sm text-muted">
            Already paid? Email us from {user.email} and we will switch on your access.
          </p>
          <button onClick={onRefreshAccess} className="mt-4 text-sm font-semibold text-brand hover:text-brand-dark">
            Access just granted? Check again
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={firstName(user)} subtitle="Welcome back" onLogout={onLogout} tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className={`${card} grid gap-6 p-6 sm:p-8 md:grid-cols-[auto_1fr] md:items-center md:gap-10`}>
            <div>
              <p className="text-sm font-medium text-muted">Course completed</p>
              <p className="text-5xl font-extrabold tracking-tight text-ink">{overallPercentage}%</p>
            </div>
            <div>
              <ProgressBar value={overallPercentage} height="h-3" />
              <p className="mt-2 text-sm text-muted">
                {topicsDone === 0
                  ? `Nothing started yet. ${topicsTotal} topics are waiting for you.`
                  : `${topicsDone} of ${topicsTotal} topics done`}
              </p>
            </div>
          </div>

          <div>
            <h2 className="mb-4 text-lg font-bold text-ink">Your subjects</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {subjects.map((subject) => (
                <div key={subject.id} className={`${card} p-6`}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky text-brand">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <p className="mt-4 font-bold text-ink">{subject.name}</p>
                  <div className="mt-4 mb-1.5 flex justify-between text-sm">
                    <span className="text-muted">Completed</span>
                    <span className="font-semibold text-ink">
                      {Math.round((subject.topicsDone / subject.topicsTotal) * 100)}%
                    </span>
                  </div>
                  <ProgressBar value={Math.round((subject.topicsDone / subject.topicsTotal) * 100)} />
                  <div className="mt-4 flex justify-between border-t border-line pt-4 text-sm text-muted">
                    <span>{subject.topicsDone} of {subject.topicsTotal} topics</span>
                    <span>{subject.testsDone === 0 ? 'No tests yet' : `${subject.testsDone} tests done`}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'resources' && (
        <div className="space-y-3">
          <h2 className="mb-1 text-lg font-bold text-ink">Notes and question banks</h2>
          <p className="mb-4 text-sm text-muted">These are the subjects you can access. Files are being uploaded now.</p>
          {resources.map((item) => (
            <div key={item.id} className={`${card} flex flex-wrap items-center gap-4 p-5`}>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky text-brand">
                <FileText className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-ink">{item.title}</p>
                <p className="text-sm text-muted">{item.subject} · {item.detail}</p>
              </div>
              {item.opened && (
                <span className="inline-flex items-center gap-1 rounded-full bg-go/10 px-3 py-1 text-sm font-semibold text-go">
                  <Check className="h-4 w-4" /> Opened
                </span>
              )}
              <button disabled className={`${btnGhost} cursor-not-allowed px-5 py-2 text-sm opacity-60`}>
                Coming soon
              </button>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'quizzes' && (
        <div className="space-y-4">
          <h2 className="mb-4 text-lg font-bold text-ink">Practice questions</h2>
          <div className={`${card} p-8 text-center`}>
            <ListChecks className="mx-auto h-10 w-10 text-brand" />
            <p className="mt-4 font-bold text-ink">Questions are being added</p>
            <p className="mt-1 text-muted">Your subjects are unlocked. The question bank goes live shortly.</p>
          </div>
          <div className="hidden">
          {subjects.map((subject) => (
            <div key={subject.id} className={`${card} p-6`}>
              <p className="mb-4 font-bold text-ink">{subject.name}</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[1, 2, 3, 4].map((quiz) => (
                  <button key={quiz} className="rounded-xl border border-line p-4 text-left transition hover:border-brand hover:bg-sky">
                    <p className="font-bold text-ink">Quiz {quiz}</p>
                    <p className="text-sm text-muted">10 questions</p>
                  </button>
                ))}
              </div>
            </div>
          ))}
          </div>
        </div>
      )}

      {activeTab === 'scores' && (
        <div className="space-y-4">
          <h2 className="mb-4 text-lg font-bold text-ink">Test scores</h2>
          {testsDone === 0 ? (
            <div className={`${card} p-12 text-center`}>
              <BarChart3 className="mx-auto h-10 w-10 text-brand" />
              <p className="mt-4 font-bold text-ink">No tests taken yet</p>
              <p className="mt-1 text-muted">Your best score in each subject will show up here.</p>
              <button onClick={() => setActiveTab('quizzes')} className={`${btnPrimary} mt-6`}>Take your first test</button>
            </div>
          ) : (
            subjects.map((subject) => (
              <div key={subject.id} className={`${card} flex items-center gap-6 p-6`}>
                <div className="flex-1">
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-bold text-ink">{subject.name}</span>
                    <span className="text-muted">{subject.testsDone} tests</span>
                  </div>
                  <ProgressBar value={subject.bestScore ?? 0} color="bg-go" height="h-2.5" />
                </div>
                <p className="w-20 text-right text-2xl font-extrabold text-ink">
                  {subject.bestScore === null ? '—' : `${subject.bestScore}%`}
                </p>
              </div>
            ))
          )}
        </div>
      )}

    </AppShell>
  );
}

// ============= ADMIN PORTAL =============
const PLAN_LABELS = {
  none: 'No access',
  consultation: 'Consultation only',
  course: 'Course student',
};

function AdminPortal({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing] = useState(null); // email being edited
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploads, setUploads] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  const call = async (body, endpoint = '/api/students') => {
    // Ask Firebase for a current token; the one from sign-in expires in an hour.
    const idToken = (await currentIdToken()) || user.idToken;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, ...body }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Something went wrong.');
    return data;
  };

  const loadStudents = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await call({ action: 'list' });
      setStudents(data.students || []);
      setInstructors(data.instructors || []);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadBookings = async () => {
    setBookingsLoading(true);
    try {
      const data = await call({ action: 'list' }, '/api/bookings');
      setBookings(data.bookings || []);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setBookingsLoading(false);
    }
  };

  const cancelBooking = async (booking) => {
    if (!window.confirm(`Free up ${booking.date} at ${booking.time}? The student is not told automatically.`)) return;
    try {
      await call({ action: 'cancel', date: booking.date, time: booking.time }, '/api/bookings');
      setBookings((list) => list.filter((b) => !(b.date === booking.date && b.time === booking.time)));
    } catch (err) {
      setLoadError(err.message);
    }
  };

  useEffect(() => { loadStudents(); loadBookings(); }, []);

  const startEditing = (student) => {
    setEditing(student.email);
    setDraft({
      plan: student.access?.plan || 'none',
      subjects: student.access?.subjects || [],
      questions: Boolean(student.access?.questions),
      tests: Boolean(student.access?.tests),
    });
  };

  const saveAccess = async () => {
    setSaving(true);
    try {
      const data = await call({ action: 'update', email: editing, access: draft });
      setStudents((list) => list.map((s) => (s.email === editing ? data.student : s)));
      setEditing(null);
      setDraft(null);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleSubject = (name) => {
    setDraft((d) => ({
      ...d,
      subjects: d.subjects.includes(name) ? d.subjects.filter((x) => x !== name) : [...d.subjects, name],
    }));
  };

  const courseStudents = students.filter((s) => s.access?.plan === 'course').length;
  const consultOnly = students.filter((s) => s.access?.plan === 'consultation').length;
  const waiting = students.filter((s) => !s.access?.plan || s.access.plan === 'none').length;

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'bookings', label: 'Consultations', icon: CalendarClock },
    { id: 'upload', label: 'Upload material', icon: Upload },
  ];

  return (
    <AppShell title={firstName(user)} subtitle="Instructor portal" onLogout={onLogout} tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { label: 'Accounts', value: students.length },
              { label: 'Course students', value: courseStudents },
              { label: 'Consultation only', value: consultOnly },
              { label: 'Waiting for access', value: waiting },
            ].map((stat) => (
              <div key={stat.label} className={`${card} p-5`}>
                <p className="text-sm text-muted">{stat.label}</p>
                <p className="mt-1 text-3xl font-extrabold tracking-tight text-ink">{loading ? '—' : stat.value}</p>
              </div>
            ))}
          </div>

          <div className={`${card} p-6`}>
            <h2 className="mb-1 font-bold text-ink">Who needs access</h2>
            <p className="mb-4 text-sm text-muted">
              Everyone starts with no access. Give course access once you have confirmed their payment.
            </p>
            {loading && <p className="text-muted">Loading…</p>}
            {!loading && waiting === 0 && <p className="text-muted">Nobody is waiting right now.</p>}
            {!loading && waiting > 0 && (
              <div className="divide-y divide-line">
                {students.filter((s) => !s.access?.plan || s.access.plan === 'none').slice(0, 5).map((s) => (
                  <div key={s.email} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{s.name || s.email}</p>
                      <p className="truncate text-sm text-muted">{s.email}</p>
                    </div>
                    <button
                      onClick={() => { setActiveTab('students'); startEditing(s); }}
                      className={`${btnGhost} px-4 py-2 text-sm`}
                    >
                      Set access
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'students' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-bold text-ink">Everyone who has signed in ({students.length})</h2>
              <p className="text-sm text-muted">
                Signing in gives nobody course access until you grant it here.
                {instructors.length > 0 && ` Instructor accounts (${instructors.length}) are not listed.`}
              </p>
            </div>
            <button onClick={loadStudents} className={`${btnGhost} px-4 py-2 text-sm`}>Refresh</button>
          </div>

          {loadError && <p className="text-sm font-medium text-red-600">{loadError}</p>}
          {loading && <div className={`${card} p-12 text-center text-muted`}>Loading students…</div>}

          {!loading && students.length === 0 && !loadError && (
            <div className={`${card} p-12 text-center`}>
              <Users className="mx-auto h-10 w-10 text-brand" />
              <p className="mt-4 font-bold text-ink">Nobody has signed in yet</p>
              <p className="mt-1 text-muted">Accounts appear here as soon as someone signs in with Google.</p>
            </div>
          )}

          {!loading && students.map((student) => (
            <div key={student.email} className={`${card} p-5`}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-bold text-ink">{student.name || student.email}</p>
                  <p className="text-sm text-muted">{student.email}</p>
                  <p className="mt-1 text-xs text-muted">
                    First signed in {new Date(student.firstSeen).toLocaleDateString('en-IN')} · {student.signIns} sign-ins
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-sm font-semibold ${
                    student.access?.plan === 'course'
                      ? 'bg-go/10 text-go'
                      : student.access?.plan === 'consultation'
                        ? 'bg-sky text-brand'
                        : 'bg-mist text-muted'
                  }`}>
                    {PLAN_LABELS[student.access?.plan || 'none']}
                  </span>
                  <button
                    onClick={() => (editing === student.email ? setEditing(null) : startEditing(student))}
                    className={`${btnGhost} px-4 py-2 text-sm`}
                  >
                    {editing === student.email ? 'Close' : 'Manage access'}
                  </button>
                </div>
              </div>

              {student.access?.plan === 'course' && student.access.subjects?.length > 0 && editing !== student.email && (
                <p className="mt-3 border-t border-line pt-3 text-sm text-muted">
                  Subjects: {student.access.subjects.join(', ')}
                  {student.access.questions && ' · question bank'}
                  {student.access.tests && ' · tests'}
                </p>
              )}

              {editing === student.email && draft && (
                <div className="mt-5 border-t border-line pt-5">
                  <p className="mb-2 text-sm font-semibold text-ink">What is this person?</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(PLAN_LABELS).map(([value, label]) => (
                      <button
                        key={value}
                        onClick={() => setDraft({
                          ...draft,
                          plan: value,
                          subjects: value === 'course' ? draft.subjects : [],
                          questions: value === 'course' ? draft.questions : false,
                          tests: value === 'course' ? draft.tests : false,
                        })}
                        className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                          draft.plan === value ? 'border-brand bg-brand text-white' : 'border-line text-ink hover:border-brand'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {draft.plan === 'consultation' && (
                    <p className="mt-4 rounded-xl bg-mist p-4 text-sm text-muted">
                      Consultation students see the same pages as any visitor. They get no notes, questions or tests.
                    </p>
                  )}

                  {draft.plan === 'course' && (
                    <>
                      <div className="mt-5 flex items-center justify-between">
                        <p className="text-sm font-semibold text-ink">Subjects they can open</p>
                        <button
                          onClick={() => setDraft({
                            ...draft,
                            subjects: draft.subjects.length === SUBJECTS.length ? [] : SUBJECTS.map((s) => s.name),
                          })}
                          className="text-sm font-semibold text-brand"
                        >
                          {draft.subjects.length === SUBJECTS.length ? 'Clear all' : 'Select all six'}
                        </button>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {SUBJECTS.map((subject) => (
                          <label key={subject.name} className="flex cursor-pointer items-center gap-3 rounded-xl border border-line p-3 text-sm transition hover:border-brand/60">
                            <input
                              type="checkbox"
                              checked={draft.subjects.includes(subject.name)}
                              onChange={() => toggleSubject(subject.name)}
                              className="h-4 w-4 accent-[#2f5be0]"
                            />
                            <span className="font-medium text-ink">{subject.name}</span>
                          </label>
                        ))}
                      </div>

                      <p className="mt-5 text-sm font-semibold text-ink">What else can they use</p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line p-3 text-sm transition hover:border-brand/60">
                          <input type="checkbox" checked={draft.questions}
                            onChange={(e) => setDraft({ ...draft, questions: e.target.checked })}
                            className="h-4 w-4 accent-[#2f5be0]" />
                          <span className="font-medium text-ink">Question bank</span>
                        </label>
                        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line p-3 text-sm transition hover:border-brand/60">
                          <input type="checkbox" checked={draft.tests}
                            onChange={(e) => setDraft({ ...draft, tests: e.target.checked })}
                            className="h-4 w-4 accent-[#2f5be0]" />
                          <span className="font-medium text-ink">Topic tests and mock exams</span>
                        </label>
                      </div>
                    </>
                  )}

                  <div className="mt-6 flex gap-3">
                    <button onClick={saveAccess} disabled={saving} className={`${btnPrimary} px-6 py-2.5 text-sm`}>
                      {saving ? 'Saving…' : 'Save access'}
                    </button>
                    <button onClick={() => { setEditing(null); setDraft(null); }} className={`${btnGhost} px-6 py-2.5 text-sm`}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'bookings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-bold text-ink">Upcoming consultations ({bookings.length})</h2>
              <p className="text-sm text-muted">Cancelling frees the slot for someone else. The student is not emailed.</p>
            </div>
            <button onClick={loadBookings} className={`${btnGhost} px-4 py-2 text-sm`}>Refresh</button>
          </div>

          {bookingsLoading && <div className={`${card} p-12 text-center text-muted`}>Loading calendar…</div>}

          {!bookingsLoading && bookings.length === 0 && (
            <div className={`${card} p-12 text-center`}>
              <CalendarClock className="mx-auto h-10 w-10 text-brand" />
              <p className="mt-4 font-bold text-ink">No consultations booked</p>
              <p className="mt-1 text-muted">Bookings from the website show up here.</p>
            </div>
          )}

          {!bookingsLoading && bookings.map((booking) => (
            <div key={`${booking.date}-${booking.time}`} className={`${card} flex flex-wrap items-center gap-4 p-5`}>
              <div className="w-32 shrink-0">
                <p className="font-bold text-ink">{booking.time} IST</p>
                <p className="text-sm text-muted">{booking.date}</p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">{booking.name}</p>
                <p className="truncate text-sm text-muted">
                  {booking.email}{booking.phone ? ` · ${booking.phone}` : ''}
                </p>
                {booking.goal && <p className="mt-1 text-sm text-muted">{booking.goal}</p>}
              </div>
              <div className="text-right">
                {!booking.blocked && (
                  <p className="text-sm font-semibold text-ink">
                    ₹{(booking.amount || 1999).toLocaleString('en-IN')}
                    {booking.recording && ' · recording'}
                  </p>
                )}
                <button onClick={() => cancelBooking(booking)} className="mt-1 text-sm font-semibold text-red-600 hover:text-red-700">
                  Cancel
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'upload' && (
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div className={`${card} p-6 sm:p-8`}>
            <h2 className="mb-6 text-lg font-bold text-ink">Upload study material</h2>
            <form className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-ink">Subject</label>
                  <select className={input}>
                    <option>Select a subject</option>
                    {SUBJECTS.map((s) => <option key={s.name}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-ink">Type</label>
                  <select className={input}>
                    <option>Select type</option>
                    <option>Notes</option>
                    <option>Question bank</option>
                    <option>Topic test</option>
                    <option>Mock exam</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-ink">Title</label>
                <input type="text" placeholder="e.g. Air Regulations - complete notes" className={input} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-ink">File</label>
                <div className="cursor-pointer rounded-2xl border-2 border-dashed border-line bg-mist p-8 text-center transition hover:border-brand hover:bg-sky">
                  <Upload className="mx-auto mb-2 h-7 w-7 text-brand" />
                  <p className="font-semibold text-ink">Click to upload or drag a file here</p>
                  <p className="text-sm text-muted">PDF, DOCX or ZIP</p>
                </div>
              </div>
              <button type="submit" className={`${btnPrimary} w-full`}>
                <Upload className="h-4 w-4" /> Upload material
              </button>
              <p className="text-center text-sm text-muted">
                Uploading is not connected yet. Files will save once we switch on storage for material.
              </p>
            </form>
          </div>

          <div className={`${card} h-fit p-6`}>
            <h2 className="mb-4 font-bold text-ink">Your uploads</h2>
            {uploads.length === 0 ? (
              <p className="text-sm text-muted">Nothing uploaded yet.</p>
            ) : (
              <div className="space-y-2">
                {uploads.map((upload) => (
                  <div key={upload.id} className="flex items-center gap-3 rounded-xl bg-mist p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink">{upload.name}</p>
                      <p className="text-sm text-muted">{upload.subject}</p>
                    </div>
                    <button onClick={() => setUploads(uploads.filter((u) => u.id !== upload.id))}
                      className="rounded-lg p-2 text-muted transition hover:bg-white hover:text-red-600" aria-label="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
