import React, { useState, useEffect } from 'react';
import {
  Menu, X, LogOut, Upload, Trash2, Eye, BookOpen, Users, FileText, Plane,
  PlayCircle, NotebookPen, ListChecks, ClipboardCheck, Check, ChevronDown, FileQuestion,
  LayoutDashboard, ArrowLeft, Star, Building2, Hourglass, Quote, CalendarClock, BarChart3, GraduationCap, Wallet, Compass, Clock, Infinity as InfinityIcon,
  MessageCircle, Inbox, Send, ExternalLink, LoaderCircle, ChevronRight, ChevronLeft, Bookmark, Pause, Play,
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

import { Logo, ThemeToggle, btnPrimary, btnGhost, input, card, SLOT_TIMES } from './ui.jsx';
import BookingPage from './BookingPage.jsx';
import EnrollPage, { SUBJECT_PRICE, rememberSubjectPick } from './EnrollPage.jsx';
import { parseQuestions, parseAnswerKey, applyAnswerKey, questionWarnings, pdfToText } from './questionParser.js';
import { googleReady, signInWithGoogle, watchGoogleUser, signOutGoogle, currentIdToken } from './auth.js';

const PATH_TO_MODE = { '/login': 'login', '/signup': 'signup', '/book': 'book', '/enroll': 'enroll' };
const MODE_TO_PATH = { landing: '/', login: '/login', signup: '/signup', book: '/book', enroll: '/enroll' };

// ============= NEW VERSION BANNER =============
// A tab that stays open keeps running the version it loaded, so after an
// update people would see old behaviour until they refresh. This compares the
// running script with the one the site serves now and offers a refresh.
function useNewVersionAvailable() {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    const running = document.querySelector('script[type="module"][src*="/assets/index-"]')?.getAttribute('src');
    if (!running) return undefined; // local development: nothing to compare
    const check = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const html = await (await fetch('/', { cache: 'no-store' })).text();
        const served = html.match(/src="(\/assets\/index-[^"]+\.js)"/)?.[1];
        if (served && served !== running) setAvailable(true);
      } catch { /* offline: try again later */ }
    };
    const timer = setInterval(check, 60000);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
    };
  }, []);
  return available;
}

function NewVersionBanner() {
  if (!useNewVersionAvailable()) return null;
  return (
    <div className="fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4">
      <div className="flex items-center gap-4 rounded-full bg-night py-2 pl-5 pr-2 text-sm text-white shadow-2xl ring-1 ring-white/10">
        <span>A new version of the site is ready.</span>
        <button onClick={() => window.location.reload()} className="rounded-full bg-white px-4 py-2 font-semibold text-black transition hover:bg-neutral-200">
          Refresh
        </button>
      </div>
    </div>
  );
}

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

  // Signing in from the subject picker goes straight back to it.
  const handleGoogleUser = (googleUser) => applyGoogleUser(googleUser, { keepPage: authMode === 'enroll' });

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
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="flex items-center gap-3 text-muted">
          <Plane className="h-5 w-5 -rotate-45 animate-pulse text-brand" />
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface">
      <NewVersionBanner />
      {/* The public pages stay reachable while signed in. */}
      {authMode === 'landing' && user ? (
        <LandingPage setAuthMode={setAuthMode} signedIn />
      ) : authMode === 'book' ? (
        <BookingPage goHome={() => setAuthMode(user ? (isAdmin ? 'admin' : 'dashboard') : 'landing')} />
      ) : authMode === 'enroll' && !user ? (
        <AuthPage mode="login" setAuthMode={setAuthMode} onGoogleUser={handleGoogleUser} forEnroll />
      ) : authMode === 'enroll' && !isAdmin ? (
        <EnrollPage
          user={user}
          subjects={SUBJECTS}
          api={(endpoint, body) => api(endpoint, body, user.idToken)}
          goBack={() => setAuthMode('dashboard')}
          onPaid={refreshAccess}
        />
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
  { icon: MessageCircle, title: 'Never stuck on a doubt', text: 'Ask in the chat and your instructor replies.' },
  { icon: Wallet, title: 'Fairly priced', text: 'Pay per subject, month by month.' },
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
    q: 'How does the monthly fee work?',
    a: 'Each subject is ₹5,000 a month, and you only pay for the subjects you choose. While a subject is active you get its notes, questions and mock exams, plus free 1-on-1 consultations and the doubts chat. Stop a subject once you have cleared that paper.',
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
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-line/70 bg-surface/85 backdrop-blur-md">
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
            <ThemeToggle />
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
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button className="rounded-lg p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Menu">
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="space-y-1 border-t border-line bg-surface px-4 py-4 md:hidden">
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
      <section className="relative overflow-hidden bg-gradient-to-b from-sky to-surface">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-24">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-surface px-3.5 py-1.5 text-sm font-semibold text-brand shadow-sm ring-1 ring-line">
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
              className="absolute bottom-0 right-0 aspect-[3/4] w-[42%] rounded-2xl border-[6px] border-surface object-cover object-[60%_72%] shadow-[0_20px_40px_-16px_rgba(15,23,51,0.35)]"
            />
            <span className="absolute left-4 top-4 rounded-full bg-surface/95 px-3.5 py-1.5 text-sm font-bold text-ink shadow-sm">
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
                  activeSubject === i ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
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
              <button onClick={() => { rememberSubjectPick(subject.name); setAuthMode('enroll'); }} className={`${btnPrimary} mt-8`}>Start this subject</button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-2xl bg-surface p-5">
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
            <div className="mt-6 space-y-5 text-lg leading-relaxed text-muted">
              <p>When I first entered aviation, I had to figure almost everything out myself.</p>
              <ul className="space-y-2 border-l-2 border-line pl-5 text-ink">
                {[
                  'How to clear the DGCA exams.',
                  'Where to find the right study material.',
                  'How to choose a flight school.',
                  'How the licensing process actually works.',
                  'How to apply for a visa.',
                  'What documents were required.',
                  'What was worth paying for — and what wasn\'t.',
                ].map((line) => <li key={line}>{line}</li>)}
              </ul>
              <p>And somewhere along the way, I realised something important:</p>
              <p className="text-2xl font-bold leading-snug text-ink">
                Aviation is expensive. But becoming a pilot doesn&apos;t have to be unnecessarily expensive.
              </p>
              <p>
                For someone entering aviation for the first time, the industry can be overwhelming. There are unfamiliar exams,
                regulations, flight schools, licenses, documentation, visas, medicals and countless decisions to make. When
                students and parents don&apos;t have a background in aviation, it is natural to look for someone who can simply
                &ldquo;handle everything.&rdquo;
              </p>
              <p>That&apos;s where we believe transparency matters.</p>
              <p>
                There is a difference between paying for genuine expertise and paying someone simply because you don&apos;t
                know how to navigate the system yourself.
              </p>
              <p className="text-xl font-bold text-ink">You don&apos;t need a middleman to enter aviation.</p>
              <p>
                I cleared my exams myself. I found my flight school myself. I handled my applications and visa myself. I
                completed my CPL myself. And every step taught me something that I wish someone had explained clearly from the
                beginning.
              </p>
              <p>This platform exists to put that knowledge in your hands.</p>
              <p>
                From DGCA notes and question banks to practice tests, mock exams, career guidance and practical advice about
                flight training, our goal is simple: give you the information you need to make your own decisions.
              </p>
              <p>We don&apos;t want you to depend on us for every step.</p>
              <p>We want you to understand the process well enough that you don&apos;t have to.</p>
              <p>
                Because your money should go toward becoming a pilot—not toward paying for information that should have been
                accessible in the first place.
              </p>
              <p>
                Flight training itself is a significant investment. There is no reason for the ground preparation and guidance
                around it to become another unnecessary financial burden.
              </p>
              <p>So this isn&apos;t just another ground school.</p>
              <p>It&apos;s a place to learn, prepare, understand the process and navigate aviation independently.</p>
              <p>We built this because we went through it ourselves.</p>
              <p>
                And if our experience can save you from making an expensive mistake, paying for something you don&apos;t need,
                or simply feeling lost at the beginning of your aviation journey, then we&apos;ve done what we set out to do.
              </p>
              <p className="border-t border-line pt-5 text-2xl font-extrabold tracking-tight text-ink">
                Learn the system. Make your own decisions. Become the pilot.
              </p>
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
                <div key={title} className="rounded-2xl bg-surface p-6 ring-1 ring-line">
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
              <figure key={r.name} className="flex h-full flex-col rounded-3xl bg-surface p-6 shadow-[0_12px_30px_-18px_rgba(15,23,51,0.35)]">
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
            <p className="mt-4 text-lg text-neutral-300/75">
              Flying is the easy part. Most money and time is lost before you reach a cockpit.
            </p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {PITFALLS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl bg-white/5 p-7 ring-1 ring-white/10">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-neutral-300">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-5 text-lg font-bold text-white">{title}</p>
                <p className="mt-2 leading-relaxed text-neutral-300/70">{text}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <button onClick={() => setAuthMode('book')} className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-black transition hover:bg-neutral-200">
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
              <p className="mt-1 text-sm text-muted">1 hour, and I don’t watch the clock</p>
              <ul className="mt-7 flex-1 space-y-3 text-[15px]">
                {[
                  '1 hour 1-on-1 on Google Meet, no clock-watching',
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
            <div className={`${card} relative flex flex-col p-8 ring-2 ring-brand shadow-[0_24px_60px_-24px_rgba(0,0,0,0.35)]`}>
              <span className="absolute -top-3 left-8 rounded-full bg-brand px-3 py-1 text-xs font-bold text-on-brand">Most popular</span>
              <p className="font-bold text-ink">Full ground school course</p>
              <p className="mt-1 text-sm text-muted">Pick only the DGCA subjects you need</p>
              <p className="mt-6 text-4xl font-extrabold tracking-tight text-ink">
                ₹{SUBJECT_PRICE.toLocaleString('en-IN')}<span className="text-lg font-semibold text-muted"> / subject / month</span>
              </p>
              <p className="mt-1 text-sm text-muted">Add or pause subjects month by month</p>
              <ul className="mt-7 flex-1 space-y-3 text-[15px]">
                {[
                  'Complete notes for every subject you pick',
                  '2000+ genuine exam questions',
                  'Topic tests and full mock exams',
                  'Study material you can download',
                  'Your marks tracked subject by subject',
                  'Doubts chat with your instructor',
                  'Free 1-on-1 consultations while enrolled',
                ].map((f) => (
                  <li key={f} className="flex gap-3 text-ink">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-go" strokeWidth={2.5} /> {f}
                  </li>
                ))}
              </ul>
              <button onClick={() => setAuthMode('enroll')} className={`${btnPrimary} mt-8 w-full py-3.5`}>Choose your subjects</button>
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
              <div key={f.q} className="rounded-2xl bg-surface ring-1 ring-line">
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
            <path d="M-20 250 C 200 60, 520 320, 820 40" fill="none" stroke="#8a8a8a" strokeWidth="2" strokeDasharray="6 10" />
          </svg>
          <h2 className="relative text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Your licence starts on the ground.</h2>
          <p className="relative mx-auto mt-4 max-w-xl text-lg text-neutral-300/80">
            Join 500+ students who studied with a clear plan and passed.
          </p>
          <button onClick={() => setAuthMode('signup')} className="relative mt-8 inline-flex items-center justify-center rounded-full bg-white px-6 py-3 font-semibold text-black transition hover:bg-neutral-200">
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
        className="flex w-full items-center justify-center gap-3 rounded-full border border-line bg-surface px-6 py-3 font-semibold text-ink transition hover:bg-mist disabled:opacity-60"
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
          <path d="M-10 520 C 120 380, 260 520, 420 120" fill="none" stroke="#8a8a8a" strokeWidth="2" strokeDasharray="6 10" />
        </svg>
        <button onClick={() => setAuthMode('landing')} className="relative w-fit"><Logo light /></button>
        <div className="relative max-w-md">
          <p className="text-3xl font-extrabold leading-tight">Everything you need for the CPL ground papers, in one place.</p>
          <p className="mt-4 text-neutral-300/70">Notes, 2000+ questions, topic tests and mock exams.</p>
        </div>
        <p className="relative text-sm text-neutral-300/50">Trusted by 500+ student pilots</p>
      </div>
      <div className="flex items-center justify-center bg-surface px-4 py-12 sm:px-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center justify-between">
            <button onClick={() => setAuthMode('landing')} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition hover:text-ink">
              <ArrowLeft className="h-4 w-4" /> Back to home
            </button>
            <ThemeToggle />
          </div>
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
function AuthPage({ mode, setAuthMode, onGoogleUser, forEnroll = false }) {
  const joining = mode === 'signup';
  return (
    <AuthLayout
      setAuthMode={setAuthMode}
      title={forEnroll ? 'First, sign in' : joining ? 'Create your account' : 'Welcome back'}
      subtitle={forEnroll
        ? 'Sign in with Google so we can save the subjects you pick and link your payment to you. Then you choose your subjects.'
        : joining
          ? 'Sign up with Google. It takes a few seconds and there is no password to remember.'
          : 'Sign in with the Google account you used before.'}
    >
      <GoogleButton onGoogleUser={onGoogleUser} label={joining ? 'Sign up with Google' : 'Continue with Google'} />

      <div className="rounded-2xl bg-mist p-5 text-sm text-muted">
        <p className="font-semibold text-ink">What happens next</p>
        <ul className="mt-2 space-y-1.5">
          <li>Booked a consultation? You do not need an account at all.</li>
          <li>Joining the course? After signing in you pick your subjects and pay.</li>
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
      <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Logo />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="hidden text-right sm:block">
              <p className="text-xs text-muted">{subtitle}</p>
              <p className="text-sm font-semibold text-ink">{title}</p>
            </div>
            <button onClick={onLogout} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:border-red-200 hover:bg-red-50 dark:hover:border-red-900 dark:hover:bg-red-950/50 hover:text-red-600">
              <LogOut className="h-4 w-4" /> Log out
            </button>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <nav className="-mb-px flex gap-1 overflow-x-auto">
            {tabs.map(({ id, label, icon: Icon, badge }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold transition ${
                  activeTab === id ? 'border-brand text-brand' : 'border-transparent text-muted hover:text-ink'
                }`}
              >
                <Icon className="h-4 w-4" /> {label}
                {badge > 0 && (
                  <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white">{badge}</span>
                )}
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

// ============= SHARED PORTAL PIECES =============
// Where students write about payments. Keep in sync with BOOKING_EMAIL in api/_lib.js.
const BOOKING_CONTACT = 'samarthya.s02@gmail.com';

// Every portal call carries a current Google token; the one from sign-in
// expires after an hour.
async function api(endpoint, body, fallbackToken) {
  const idToken = (await currentIdToken()) || fallbackToken;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken, ...body }),
  });
  let data = {};
  try { data = await res.json(); } catch { /* empty or non-JSON reply */ }
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

// Keep in sync with TYPES in api/materials.js.
const MATERIAL_TYPES = [
  { id: 'notes', label: 'Notes' },
  { id: 'questions', label: 'Question bank' },
  { id: 'test', label: 'Topic test' },
  { id: 'mock', label: 'Mock exam' },
];
const typeLabel = (id) => MATERIAL_TYPES.find((t) => t.id === id)?.label || 'File';

function fileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Opens a stored file. The tab is opened straight away, before the link is
// fetched, because browsers block tabs opened after a wait.
async function openMaterial(material, fallbackToken) {
  const tab = window.open('', '_blank');
  try {
    const { url } = await api('/api/materials', { action: 'open', id: material.id }, fallbackToken);
    if (tab) tab.location.href = url;
    else window.location.href = url;
  } catch (err) {
    if (tab) tab.close();
    window.alert(err.message);
  }
}

function MaterialRow({ material, onOpen, onDelete }) {
  return (
    <div className={`${card} flex flex-wrap items-center gap-4 p-5`}>
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky text-brand">
        <FileText className="h-6 w-6" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-ink">{material.title}</p>
        <p className="text-sm text-muted">
          {material.subject} · {typeLabel(material.type)}{material.size ? ` · ${fileSize(material.size)}` : ''}
        </p>
      </div>
      <button onClick={() => onOpen(material)} className={`${btnPrimary} px-5 py-2 text-sm`}>
        <ExternalLink className="h-4 w-4" /> Open
      </button>
      {onDelete && (
        <button onClick={() => onDelete(material)}
          className="rounded-lg p-2 text-muted transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50" aria-label="Delete">
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

const chatTime = (iso) => new Date(iso).toLocaleString('en-IN', {
  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
});

// The conversation itself, used by both the student and the instructor.
function ChatThread({ messages, mine, onSend, placeholder, emptyText, loading }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const endRef = React.useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [messages.length]);

  const send = async () => {
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    setError('');
    try {
      await onSend(value);
      setText('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-[min(70vh,640px)] flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">
        {loading && messages.length === 0 && <p className="text-center text-sm text-muted">Loading…</p>}
        {!loading && messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <MessageCircle className="h-10 w-10 text-brand" />
            <p className="mt-3 max-w-sm text-muted">{emptyText}</p>
          </div>
        )}
        {messages.map((m, i) => {
          const own = m.from === mine;
          return (
            <div key={`${m.at}-${i}`} className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 sm:max-w-[70%] ${
                own ? 'rounded-br-md bg-brand text-on-brand' : 'rounded-bl-md bg-mist text-ink'
              }`}>
                <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{m.text}</p>
                <p className={`mt-1 text-xs ${own ? 'text-on-brand/70' : 'text-muted'}`}>
                  {m.from === 'instructor' && !own ? `${m.by?.split(' ')[0] || 'Instructor'} · ` : ''}
                  {chatTime(m.at)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <div className="border-t border-line p-3 sm:p-4">
        {error && <p className="mb-2 text-sm font-medium text-red-600">{error}</p>}
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            rows={2}
            maxLength={2000}
            placeholder={placeholder}
            className={`${input} resize-none`}
          />
          <button onClick={send} disabled={sending || !text.trim()} aria-label="Send" title="Send"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand text-on-brand transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40">
            {sending ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 -translate-x-px translate-y-px" />}
          </button>
        </div>
        <p className="mt-1.5 text-xs text-muted">Enter to send · Shift + Enter for a new line</p>
      </div>
    </div>
  );
}

// Polls while the tab is visible, so replies show up without a refresh.
// Hidden tabs pause (no wasted requests) and catch up the moment they are
// shown again, instead of waiting for the next tick.
function usePolling(fn, ms, deps) {
  useEffect(() => {
    let live = true;
    const run = () => { if (live && document.visibilityState === 'visible') fn(); };
    fn();
    const timer = setInterval(run, ms);
    document.addEventListener('visibilitychange', run);
    window.addEventListener('focus', run);
    return () => {
      live = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', run);
      window.removeEventListener('focus', run);
    };
  }, deps);
}

function StudentDoubts({ user, onRead }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const data = await api('/api/messages', { action: 'thread', markRead: true }, user.idToken);
      setMessages(data.messages || []);
      setError('');
      onRead();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  usePolling(load, 5000, []);

  const send = async (text) => {
    const data = await api('/api/messages', { action: 'send', text }, user.idToken);
    setMessages((list) => [...list, data.message]);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-ink">Doubts and queries</h2>
        <p className="text-sm text-muted">Ask anything about your subjects or training. Your instructor replies here.</p>
      </div>
      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
      <div className={card}>
        <ChatThread
          messages={messages}
          mine="student"
          onSend={send}
          loading={loading}
          placeholder="Type your doubt…"
          emptyText="No questions yet. Ask your first doubt below and you will get a reply here."
        />
      </div>
    </div>
  );
}

// ============= PRACTICE QUESTIONS (student) =============
const STATUSES = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'Not tried' },
  { id: 'tried', label: 'Tried' },
  { id: 'wrong', label: 'Got wrong' },
  { id: 'bookmarked', label: 'Bookmarked' },
];

function matchesStatus(p, status) {
  if (status === 'new') return !p?.attempts;
  if (status === 'tried') return Boolean(p?.attempts);
  if (status === 'wrong') return Boolean(p?.attempts) && p.lastCorrect === false;
  if (status === 'bookmarked') return Boolean(p?.bookmarked);
  return true;
}

function PracticeQuestions({ user, subjects }) {
  const [questions, setQuestions] = useState([]);
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState({ subject: '', topic: '', subtopic: '', status: 'all' });
  // The set being practised is fixed when it starts, so answering a
  // "Not tried" question does not make it vanish mid-way.
  const [set, setSet] = useState(null);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState({}); // id → { choice, answer, correct } for this sitting
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    api('/api/questions', { action: 'list' }, user.idToken)
      .then((data) => { setQuestions(data.questions || []); setProgress(data.progress || {}); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const inSubject = questions.filter((q) => !filter.subject || q.subject === filter.subject);
  const topics = [...new Set(inSubject.map((q) => q.topic).filter(Boolean))].sort();
  const subtopics = [...new Set(inSubject.filter((q) => !filter.topic || q.topic === filter.topic)
    .map((q) => q.subtopic).filter(Boolean))].sort();
  const matching = inSubject.filter((q) => (!filter.topic || q.topic === filter.topic)
    && (!filter.subtopic || q.subtopic === filter.subtopic)
    && matchesStatus(progress[q.id], filter.status));

  const tried = questions.filter((q) => progress[q.id]?.attempts).length;
  const right = questions.filter((q) => progress[q.id]?.everCorrect).length;

  const start = () => { setSet(matching.map((q) => q.id)); setIndex(0); setResults({}); setPicks({}); window.scrollTo(0, 0); };

  // Picking an option only selects it; nothing is revealed until "Check".
  const [picks, setPicks] = useState({});
  const pick = (q, choice) => {
    if (results[q.id] || checking) return;
    setPicks((p) => ({ ...p, [q.id]: choice }));
  };

  const check = async (q) => {
    const choice = picks[q.id];
    if (choice === undefined || results[q.id] || checking) return;
    setChecking(true);
    try {
      const data = await api('/api/questions', { action: 'answer', id: q.id, choice }, user.idToken);
      setResults((r) => ({ ...r, [q.id]: { choice, answer: data.answer, correct: data.correct } }));
      setProgress((p) => ({ ...p, [q.id]: data.progress }));
    } catch (err) {
      setError(err.message);
    } finally {
      setChecking(false);
    }
  };

  const bookmark = async (q) => {
    const on = !progress[q.id]?.bookmarked;
    setProgress((p) => ({ ...p, [q.id]: { ...p[q.id], bookmarked: on } }));
    try {
      await api('/api/questions', { action: 'bookmark', id: q.id, on }, user.idToken);
    } catch (err) {
      setProgress((p) => ({ ...p, [q.id]: { ...p[q.id], bookmarked: !on } }));
      setError(err.message);
    }
  };

  if (loading) return <div className={`${card} p-10 text-center text-muted`}>Loading questions…</div>;

  // ---------- Practising ----------
  if (set) {
    const byId = new Map(questions.map((q) => [q.id, q]));
    const q = byId.get(set[index]);
    const result = q && results[q.id];
    const done = Object.values(results);
    const score = done.filter((r) => r.correct).length;
    const finished = index >= set.length;

    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button onClick={() => setSet(null)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
            <ArrowLeft className="h-4 w-4" /> Change filters
          </button>
          <p className="text-sm text-muted">{done.length} answered · {score} correct</p>
        </div>
        <ProgressBar value={set.length ? Math.round((Math.min(index + (result ? 1 : 0), set.length) / set.length) * 100) : 0} />
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}

        {finished ? (
          <div className={`${card} p-10 text-center`}>
            <ListChecks className="mx-auto h-10 w-10 text-brand" />
            <p className="mt-4 text-2xl font-extrabold text-ink">{score} / {done.length}</p>
            <p className="mt-1 text-muted">You finished this set.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {done.some((r) => !r.correct) && (
                <button onClick={() => { setSet(set.filter((id) => results[id] && !results[id].correct)); setIndex(0); setResults({}); setPicks({}); }}
                  className={btnPrimary}>Retry the ones I got wrong</button>
              )}
              <button onClick={() => setSet(null)} className={btnGhost}>Pick another set</button>
            </div>
          </div>
        ) : q && (
          <div className={`${card} p-6 sm:p-8`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                <span className="rounded-full bg-sky px-2.5 py-1 text-ink">Question {index + 1} of {set.length}</span>
                {q.topic && <span className="rounded-full border border-line px-2.5 py-1 text-muted">{q.topic}</span>}
                {q.subtopic && <span className="rounded-full border border-line px-2.5 py-1 text-muted">{q.subtopic}</span>}
              </div>
              <button onClick={() => bookmark(q)} className="rounded-full p-2 text-muted transition hover:text-ink"
                aria-label={progress[q.id]?.bookmarked ? 'Remove bookmark' : 'Bookmark'}>
                <Bookmark className={`h-5 w-5 ${progress[q.id]?.bookmarked ? 'fill-current text-ink' : ''}`} />
              </button>
            </div>
            <p className="mt-5 whitespace-pre-wrap text-lg font-semibold leading-relaxed text-ink">{q.text}</p>
            <div className="mt-6 space-y-2.5">
              {q.options.map((option, i) => {
                const isAnswer = result && i === result.answer;
                const isWrongPick = result && i === result.choice && !result.correct;
                const isPicked = !result && picks[q.id] === i;
                return (
                  <button key={i} onClick={() => pick(q, i)} disabled={Boolean(result) || checking} aria-pressed={isPicked}
                    className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition ${
                      isAnswer ? 'border-go bg-go/10'
                        : isWrongPick ? 'border-red-400 bg-red-50 dark:bg-red-950/40'
                          : result ? 'border-line opacity-60'
                            : isPicked ? 'border-brand bg-sky ring-2 ring-brand'
                              : 'border-line hover:border-brand hover:bg-sky'
                    }`}>
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${
                      isAnswer ? 'border-go bg-go text-white' : isWrongPick ? 'border-red-500 bg-red-500 text-white'
                        : isPicked ? 'border-brand bg-brand text-on-brand' : 'border-line text-muted'
                    }`}>
                      {isAnswer ? <Check className="h-4 w-4" strokeWidth={3} /> : isWrongPick ? <X className="h-4 w-4" strokeWidth={3} /> : letter(i)}
                    </span>
                    <span className="text-ink">{option}</span>
                  </button>
                );
              })}
            </div>
            {result && (
              <p className={`mt-5 font-semibold ${result.correct ? 'text-go' : 'text-red-600'}`}>
                {result.correct ? 'Correct!' : `Not quite. The answer is ${letter(result.answer)}.`}
              </p>
            )}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <button onClick={() => setIndex(Math.max(0, index - 1))} disabled={index === 0}
                className={`${btnGhost} px-5 py-2.5 text-sm disabled:opacity-50`}>Previous</button>
              {result ? (
                <button onClick={() => setIndex(index + 1)} className={`${btnPrimary} px-6 py-2.5 text-sm`}>
                  {index === set.length - 1 ? 'Finish' : 'Next question'}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={() => setIndex(index + 1)} className="px-3 py-2.5 text-sm font-semibold text-muted transition hover:text-ink">
                    {index === set.length - 1 ? 'Finish' : 'Skip'}
                  </button>
                  <button onClick={() => check(q)} disabled={picks[q.id] === undefined || checking}
                    className={`${btnPrimary} px-7 py-2.5 text-sm`}>
                    {checking ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                    {picks[q.id] === undefined ? 'Pick an answer' : 'Check'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------- Choosing a set ----------
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink">Practice questions</h2>
          <p className="text-sm text-muted">{questions.length} questions · {tried} tried · {right} answered correctly at least once</p>
        </div>
      </div>
      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      {questions.length === 0 ? (
        <div className={`${card} p-10 text-center`}>
          <ListChecks className="mx-auto h-10 w-10 text-brand" />
          <p className="mt-4 font-bold text-ink">Questions are being added</p>
          <p className="mt-1 text-muted">Your subjects are unlocked. The question bank goes live shortly.</p>
        </div>
      ) : (
        <div className={`${card} space-y-5 p-6`}>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-ink">Subject</label>
              <select className={input} value={filter.subject} onChange={(e) => setFilter({ ...filter, subject: e.target.value, topic: '', subtopic: '' })}>
                <option value="">All my subjects</option>
                {subjects.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-ink">Topic</label>
              <select className={input} value={filter.topic} onChange={(e) => setFilter({ ...filter, topic: e.target.value, subtopic: '' })}>
                <option value="">All topics</option>
                {topics.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-ink">Subtopic</label>
              <select className={input} value={filter.subtopic} onChange={(e) => setFilter({ ...filter, subtopic: e.target.value })}
                disabled={subtopics.length === 0}>
                <option value="">All subtopics</option>
                {subtopics.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">Status</p>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => {
                const count = inSubject.filter((q) => (!filter.topic || q.topic === filter.topic)
                  && (!filter.subtopic || q.subtopic === filter.subtopic) && matchesStatus(progress[q.id], s.id)).length;
                return (
                  <button key={s.id} onClick={() => setFilter({ ...filter, status: s.id })}
                    className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                      filter.status === s.id ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface text-ink hover:border-brand'
                    }`}>
                    {s.label} <span className="opacity-60">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
            <p className="text-muted"><b className="text-ink">{matching.length}</b> question{matching.length === 1 ? '' : 's'} match</p>
            <button onClick={start} disabled={matching.length === 0} className={btnPrimary}>Start practice</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============= STUDENT DASHBOARD =============
function StudentDashboard({ user, onLogout, onGoPublic, onRefreshAccess }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [materials, setMaterials] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(true);
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [unread, setUnread] = useState(0);
  // What this person can open is decided by the instructor, saved on the server.
  // A paused subject (e.g. this month unpaid) stays listed but is locked.
  const access = user.access || { plan: 'none', subjects: [], paused: [], questions: false, tests: false };
  const pausedNames = access.paused || [];
  const allowed = SUBJECTS.filter((s) => access.subjects?.includes(s.name) && !pausedNames.includes(s.name));
  const pausedSubjects = SUBJECTS.filter((s) => access.subjects?.includes(s.name) && pausedNames.includes(s.name));
  const accessKey = [access.plan, access.questions, access.tests, ...(access.subjects || []), '|', ...pausedNames].join(',');
  const [materialsError, setMaterialsError] = useState('');
  const [payments, setPayments] = useState([]);
  const [checking, setChecking] = useState(false);
  const [checked, setChecked] = useState(false);

  // The server only returns files this student is allowed to open.
  useEffect(() => {
    if (allowed.length === 0) { setMaterialsLoading(false); return; }
    let live = true;
    setMaterialsLoading(true);
    setMaterialsError('');
    api('/api/materials', { action: 'list' }, user.idToken)
      .then((data) => { if (live) setMaterials(data.materials || []); })
      .catch((err) => { if (live) { setMaterials([]); setMaterialsError(err.message); } })
      .finally(() => { if (live) setMaterialsLoading(false); });
    return () => { live = false; };
  }, [accessKey]);

  // Payments waiting for the instructor to confirm.
  useEffect(() => {
    api('/api/payment', { action: 'mine' }, user.idToken)
      .then((data) => setPayments(data.requests || []))
      .catch(() => {});
  }, [accessKey]);
  const pending = payments.filter((p) => p.status === 'awaiting' || p.status === 'claimed');
  // Only the latest request matters: an old decline is irrelevant once a newer payment went through.
  const rejected = !pending.length && payments[0]?.status === 'rejected' ? payments[0] : null;
  const pendingNames = [...new Set(pending.flatMap((p) => p.subjects))];

  const checkAgain = async () => {
    setChecking(true);
    await onRefreshAccess();
    setChecking(false);
    setChecked(true);
  };

  // Unread replies, for the badge on the Doubts tab.
  usePolling(() => {
    if (activeTab === 'doubts' || allowed.length === 0) return;
    api('/api/messages', { action: 'thread' }, user.idToken)
      .then((data) => setUnread(data.unread || 0))
      .catch(() => {});
  }, 60000, [activeTab, accessKey]);

  // Scores stay at zero until tests are taken on the site.
  const subjects = React.useMemo(
    () => allowed.map((s, i) => ({
      id: i + 1,
      name: s.name,
      blurb: s.blurb,
      testsDone: 0,
      bestScore: null,
      files: materials.filter((m) => m.subject === s.name).length,
    })),
    [accessKey, materials],
  );
  const testsDone = subjects.reduce((sum, s) => sum + s.testsDone, 0);

  const open = (material) => openMaterial(material, user.idToken);
  const openSubject = (name) => { setSubjectFilter(name); setActiveTab('resources'); window.scrollTo(0, 0); };
  const enroll = () => onGoPublic('enroll');

  const doubtsTab = { id: 'doubts', label: 'Doubts', icon: MessageCircle, badge: unread };
  // The doubts chat is part of the course, so it appears with course access.
  const tabs = allowed.length === 0
    ? [{ id: 'overview', label: 'Overview', icon: LayoutDashboard }]
    : [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard },
      { id: 'resources', label: 'Notes', icon: FileText },
      ...(access.questions ? [{ id: 'quizzes', label: 'Practice questions', icon: ListChecks }] : []),
      ...(access.tests ? [{ id: 'scores', label: 'Tests', icon: BarChart3 }] : []),
      ...(access.plan === 'course' ? [{ id: 'book', label: 'Book a consultation', icon: CalendarClock }] : []),
      doubtsTab,
    ];

  const shownMaterials = materials.filter((m) => subjectFilter === 'all' || m.subject === subjectFilter);
  const tests = materials.filter((m) => m.type === 'test' || m.type === 'mock');

  const emptyFiles = (text) => (
    <div className={`${card} p-10 text-center`}>
      <FileText className="mx-auto h-10 w-10 text-brand" />
      <p className="mt-4 font-bold text-ink">{materialsError ? 'Could not load your files' : 'Nothing here yet'}</p>
      <p className="mt-1 text-muted">{materialsError ? `${materialsError} Refresh the page to try again.` : text}</p>
    </div>
  );

  const rejectedNote = rejected && (
    <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-left text-sm leading-relaxed text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
      <p className="font-semibold">We’re sorry, we couldn’t confirm your payment for {rejected.subjects.join(', ')} yet.</p>
      <p className="mt-1">
        Apologies for the inconvenience. If you have already paid and still see this message, please email us at{' '}
        <a href={`mailto:${BOOKING_CONTACT}?subject=${encodeURIComponent('My flywithsam payment')}`} className="font-semibold underline">{BOOKING_CONTACT}</a>{' '}
        with your UPI transaction ID, and we will sort it out straight away.
      </p>
      {rejected.note && <p className="mt-2">Note from your instructor: {rejected.note}</p>}
    </div>
  );

  const pendingNote = pending.length > 0 && (
    <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
      <Hourglass className="mt-0.5 h-5 w-5 shrink-0" />
      <p>
        We are checking your payment for <b>{pendingNames.join(', ')}</b>. They switch on as soon as it is confirmed,
        usually within a few hours.
      </p>
    </div>
  );

  return (
    <AppShell title={firstName(user)} subtitle={allowed.length ? 'Welcome back' : 'Welcome'} onLogout={onLogout}
      tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab}>
      {/* Nobody gets course material until a payment is confirmed. */}
      {activeTab === 'overview' && allowed.length === 0 && (
        <div className="mx-auto max-w-xl space-y-4">
          {pendingNote}
          <div className={`${card} p-8 text-center sm:p-10`}>
            {pausedSubjects.length > 0 ? <Pause className="mx-auto h-10 w-10 text-brand" /> : <BookOpen className="mx-auto h-10 w-10 text-brand" />}
            <h2 className="mt-5 text-xl font-bold text-ink">
              {pending.length ? 'Almost there' : pausedSubjects.length ? 'Your subjects are paused' : 'Start the ground school course'}
            </h2>
            <p className="mt-2 text-muted">
              {pending.length
                ? 'Your notes, questions and tests appear here once your payment is confirmed.'
                : pausedSubjects.length
                  ? `${pausedSubjects.map((s) => s.name).join(', ')} ${pausedSubjects.length === 1 ? 'is' : 'are'} on hold until this month is paid.`
                  : `Pick the subjects you need, ₹${SUBJECT_PRICE.toLocaleString('en-IN')} each per month. Notes, questions and tests appear here once you have paid.`}
            </p>
            {rejectedNote}
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              {!pending.length && (
                <button onClick={enroll} className={btnPrimary}>
                  {pausedSubjects.length ? 'Renew my subjects' : 'Choose your subjects'}
                </button>
              )}
              <button onClick={() => onGoPublic('book')} className={btnGhost}>Book a consultation</button>
            </div>
            <button onClick={checkAgain} disabled={checking} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand hover:text-brand-dark">
              {checking && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {checking ? 'Checking…' : 'Paid already? Check again'}
            </button>
            {checked && !checking && (
              <p className="mt-2 text-sm text-muted">Not switched on yet. It happens as soon as your instructor confirms the payment.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'overview' && allowed.length > 0 && (
        <div className="space-y-8">
          {pendingNote}
          {rejectedNote}
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-ink">Your subjects</h2>
              <p className="text-sm text-muted">Open a subject to see its notes.</p>
            </div>
            <button onClick={enroll} className={`${btnGhost} px-5 py-2 text-sm`}>+ Add subjects</button>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {subjects.map((subject) => (
              <button key={subject.id} onClick={() => openSubject(subject.name)}
                className={`${card} group flex flex-col p-6 text-left transition hover:border-brand hover:shadow-[0_12px_30px_-18px_rgba(0,0,0,0.5)]`}>
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky text-brand">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand" />
                </div>
                <p className="mt-4 font-bold text-ink">{subject.name}</p>
                <p className="mt-1 flex-1 text-sm text-muted">{subject.blurb}</p>
                <p className="mt-4 border-t border-line pt-4 text-sm font-semibold text-brand">
                  {materialsLoading ? 'Open notes' : subject.files === 0 ? 'Notes coming soon' : `${subject.files} file${subject.files === 1 ? '' : 's'} · Open`}
                </p>
              </button>
            ))}
            {pausedSubjects.map((s) => (
              <button key={s.name} onClick={enroll}
                className={`${card} flex flex-col border-dashed p-6 text-left opacity-80 transition hover:border-brand hover:opacity-100`}>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-mist text-muted">
                  <Pause className="h-5 w-5" />
                </div>
                <p className="mt-4 font-bold text-ink">{s.name}</p>
                <p className="mt-1 flex-1 text-sm text-muted">Paused until this month is paid.</p>
                <p className="mt-4 border-t border-line pt-4 text-sm font-semibold text-brand">Renew · ₹{SUBJECT_PRICE.toLocaleString('en-IN')}</p>
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              access.questions && { label: 'Practise questions', text: 'Filter by topic and track what you got wrong.', icon: ListChecks, tab: 'quizzes' },
              access.plan === 'course' && { label: 'Book a free consultation', text: '1 hour 1-on-1, included with your course.', icon: CalendarClock, tab: 'book' },
              { label: 'Ask a doubt', text: 'Your instructor replies in the chat.', icon: MessageCircle, tab: 'doubts' },
            ].filter(Boolean).map(({ label, text, icon: Icon, tab }) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`${card} flex items-start gap-3 p-5 text-left transition hover:border-brand`}>
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                <span>
                  <span className="block font-semibold text-ink">{label}</span>
                  <span className="block text-sm text-muted">{text}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'resources' && (
        <div className="space-y-3">
          <h2 className="mb-1 text-lg font-bold text-ink">Notes and question banks</h2>
          <div className="mb-4 flex flex-wrap gap-2">
            {['all', ...allowed.map((s) => s.name)].map((name) => (
              <button key={name} onClick={() => setSubjectFilter(name)}
                className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                  subjectFilter === name ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface text-ink hover:border-brand'
                }`}>
                {name === 'all' ? 'All subjects' : name}
              </button>
            ))}
          </div>
          {materialsLoading && <div className={`${card} p-10 text-center text-muted`}>Loading files…</div>}
          {!materialsLoading && shownMaterials.length === 0 && emptyFiles(
            subjectFilter === 'all'
              ? 'Your instructor is uploading material now. It will appear here.'
              : `Nothing uploaded for ${subjectFilter} yet. It will appear here as soon as it is.`,
          )}
          {!materialsLoading && shownMaterials.map((m) => <MaterialRow key={m.id} material={m} onOpen={open} />)}
        </div>
      )}

      {activeTab === 'quizzes' && <PracticeQuestions user={user} subjects={allowed} />}

      {activeTab === 'scores' && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-ink">Topic tests and mock exams</h2>
          {!materialsLoading && tests.length === 0 && emptyFiles('Tests appear here once your instructor uploads them.')}
          {tests.map((m) => <MaterialRow key={m.id} material={m} onOpen={open} />)}

          <h2 className="pt-4 text-lg font-bold text-ink">Your scores</h2>
          {testsDone === 0 ? (
            <div className={`${card} p-8 text-center`}>
              <BarChart3 className="mx-auto h-10 w-10 text-brand" />
              <p className="mt-4 font-bold text-ink">No scores yet</p>
              <p className="mt-1 text-muted">Your best score in each subject will show up here.</p>
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

      {activeTab === 'book' && (
        <BookingPage
          free
          embedded
          account={{ name: user.name, email: user.email }}
          getIdToken={async () => (await currentIdToken()) || user.idToken}
          goHome={() => setActiveTab('overview')}
        />
      )}

      {activeTab === 'doubts' && <StudentDoubts user={user} onRead={() => setUnread(0)} />}
    </AppShell>
  );
}

// ============= ADMIN PORTAL =============
const PLAN_LABELS = {
  none: 'No access',
  consultation: 'Consultation only',
  course: 'Course student',
};

// Every student's doubts, newest first, with a reply box.
function InstructorInbox({ user, threads, loadThreads, error }) {
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadThread = async (email, quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const data = await api('/api/messages', { action: 'thread', email }, user.idToken);
      setMessages(data.messages || []);
    } finally {
      setLoading(false);
    }
  };

  // Opening a conversation marks it read, then the inbox refreshes its counts.
  const pick = async (email) => {
    setSelected(email);
    setMessages([]);
    await loadThread(email).catch(() => {});
    loadThreads();
  };

  usePolling(() => { if (selected) loadThread(selected, true).catch(() => {}); }, 5000, [selected]);

  const reply = async (text) => {
    const data = await api('/api/messages', { action: 'reply', email: selected, text }, user.idToken);
    setMessages((list) => [...list, data.message]);
    loadThreads();
  };

  const current = threads.find((t) => t.email === selected);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-ink">Doubts inbox</h2>
          <p className="text-sm text-muted">Questions students send from their portal. Your reply appears in their chat.</p>
        </div>
        <button onClick={loadThreads} className={`${btnGhost} px-4 py-2 text-sm`}>Refresh</button>
      </div>
      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      {threads.length === 0 ? (
        <div className={`${card} p-12 text-center`}>
          <Inbox className="mx-auto h-10 w-10 text-brand" />
          <p className="mt-4 font-bold text-ink">No doubts yet</p>
          <p className="mt-1 text-muted">When a student asks something, it shows up here.</p>
        </div>
      ) : (
        <div className={`${card} grid overflow-hidden md:grid-cols-[300px_1fr]`}>
          <div className={`${selected ? 'hidden md:block' : ''} max-h-[min(70vh,640px)] overflow-y-auto border-line md:border-r`}>
            {threads.map((t) => (
              <button key={t.email} onClick={() => pick(t.email)}
                className={`block w-full border-b border-line px-4 py-3.5 text-left transition hover:bg-mist ${
                  selected === t.email ? 'bg-sky' : ''
                }`}>
                <div className="flex items-center justify-between gap-2">
                  <p className={`truncate text-ink ${t.unread ? 'font-bold' : 'font-semibold'}`}>{t.name || t.email}</p>
                  {t.unread > 0 && (
                    <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white">{t.unread}</span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-sm text-muted">
                  {t.lastFrom === 'instructor' ? 'You: ' : ''}{t.lastText}
                </p>
                <p className="mt-0.5 text-xs text-muted">{chatTime(t.lastAt)}</p>
              </button>
            ))}
          </div>

          <div className={selected ? '' : 'hidden md:block'}>
            {!selected ? (
              <div className="flex h-[min(70vh,640px)] items-center justify-center p-6 text-center text-muted">
                Pick a conversation on the left.
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 border-b border-line px-4 py-3">
                  <button onClick={() => setSelected(null)} className="rounded-lg p-1 text-muted hover:text-ink md:hidden" aria-label="Back">
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-ink">{current?.name || selected}</p>
                    <p className="truncate text-sm text-muted">{selected}</p>
                  </div>
                </div>
                <ChatThread
                  messages={messages}
                  mine="instructor"
                  onSend={reply}
                  loading={loading}
                  placeholder="Write your reply…"
                  emptyText="No messages in this conversation."
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Uploads go straight from the browser to private Blob storage; the server only
// hands out a one-time upload token after checking the instructor's sign-in.
function UploadMaterial({ user }) {
  const [subject, setSubject] = useState('');
  const [type, setType] = useState('');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [materials, setMaterials] = useState([]);
  const [blobReady, setBlobReady] = useState(true);
  const [blobSettings, setBlobSettings] = useState([]);
  const [uploadMode, setUploadMode] = useState('token');
  const fileInput = React.useRef(null);

  const load = async () => {
    try {
      const data = await api('/api/materials', { action: 'list' }, user.idToken);
      setMaterials(data.materials || []);
      setBlobReady(data.blobReady !== false);
      setBlobSettings(data.blobSettings || []);
      if (data.uploadMode) setUploadMode(data.uploadMode);
    } catch (err) {
      setError(err.message);
    }
  };
  useEffect(() => { load(); }, []);

  const choose = (picked) => {
    if (!picked) return;
    setFile(picked);
    setError('');
    setNotice('');
    if (!title) setTitle(picked.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    if (!subject || !type) { setError('Pick a subject and a type.'); return; }
    if (!file) { setError('Choose a file to upload.'); return; }

    setProgress(0);
    try {
      const { upload, uploadPresigned } = await import('@vercel/blob/client');
      const send = uploadMode === 'presigned' ? uploadPresigned : upload;
      const idToken = (await currentIdToken()) || user.idToken;
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-120);
      const slug = subject.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      // A short random prefix keeps two files with the same name apart.
      const unique = Math.random().toString(36).slice(2, 8);
      const blob = await send(`materials/${slug}/${unique}-${safeName}`, file, {
        access: 'private',
        handleUploadUrl: '/api/materials',
        clientPayload: JSON.stringify({ idToken }),
        multipart: file.size > 20 * 1024 * 1024,
        onUploadProgress: ({ percentage }) => setProgress(Math.round(percentage)),
      });
      const data = await api('/api/materials', {
        action: 'add', pathname: blob.pathname, subject, type, title,
      }, user.idToken);
      setMaterials((list) => [data.material, ...list]);
      setNotice(`"${data.material.title}" is uploaded. Students with ${subject} can open it now.`);
      setFile(null);
      setTitle('');
      if (fileInput.current) fileInput.current.value = '';
    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setProgress(null);
    }
  };

  const remove = async (material) => {
    if (!window.confirm(`Delete "${material.title}"? Students lose access to it straight away.`)) return;
    try {
      await api('/api/materials', { action: 'delete', id: material.id }, user.idToken);
      setMaterials((list) => list.filter((m) => m.id !== material.id));
    } catch (err) {
      setError(err.message);
    }
  };

  const uploading = progress !== null;

  const pickers = (
    <div className="grid gap-5 sm:grid-cols-2">
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-ink">Subject</label>
        <select className={input} value={subject} onChange={(e) => setSubject(e.target.value)}>
          <option value="">Select a subject</option>
          {SUBJECTS.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-ink">Type</label>
        <select className={input} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Select type</option>
          {MATERIAL_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </div>
    </div>
  );

  // A question bank is not stored as a file: it is split into separate
  // questions that students practise one by one.
  if (type === 'questions') {
    return (
      <div className="space-y-5">
        <div className={`${card} p-6 sm:p-8`}>
          <h2 className="mb-1 text-lg font-bold text-ink">Upload a question bank</h2>
          <p className="mb-6 text-sm text-muted">
            Your paper is split into separate questions: every numbered line (<b>1.</b>, <b>2.</b>) is a question and every
            lettered line (<b>a)</b>, <b>b)</b>) is an option. You mark answers and add topics before saving.
          </p>
          {pickers}
        </div>
        {subject
          ? <QuestionBankAdmin key={subject} user={user} fixedSubject={subject} addOnly />
          : <div className={`${card} p-8 text-center text-muted`}>Pick the subject to continue.</div>}
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <div className={`${card} h-fit p-6 sm:p-8`}>
        <h2 className="mb-6 text-lg font-bold text-ink">Upload study material</h2>
        {!blobReady && (
          <div className="mb-5 space-y-2 rounded-xl bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
            <p className="font-semibold">File storage is not reaching the site yet.</p>
            {blobSettings.length === 0 ? (
              <p>
                The site sees no Blob settings at all. In Vercel open your Blob store → <b>Projects</b>, and check this
                project is connected with <b>Production</b> ticked. Then redeploy.
              </p>
            ) : (
              <p>
                The site sees <b>{blobSettings.join(', ')}</b> but no upload key. Open your Blob store in Vercel, copy
                the <b>BLOB_READ_WRITE_TOKEN</b> value from its <b>.env.local</b> tab, add it under this project's
                Settings → Environment Variables (Production), then redeploy.
              </p>
            )}
          </div>
        )}
        <form onSubmit={submit} className="space-y-5">
          {pickers}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-ink">Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Air Regulations - complete notes" className={input} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-ink">File</label>
            <label
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); choose(e.dataTransfer.files?.[0]); }}
              className={`block cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition ${
                dragging ? 'border-brand bg-sky' : 'border-line bg-mist hover:border-brand hover:bg-sky'
              }`}
            >
              <input
                ref={fileInput}
                type="file"
                className="sr-only"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,.png,.jpg,.jpeg,.mp4"
                onChange={(e) => choose(e.target.files?.[0])}
              />
              <Upload className="mx-auto mb-2 h-7 w-7 text-brand" />
              {file ? (
                <>
                  <p className="break-all font-semibold text-ink">{file.name}</p>
                  <p className="text-sm text-muted">{fileSize(file.size)} · click to choose a different file</p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-ink">Click to upload or drag a file here</p>
                  <p className="text-sm text-muted">PDF, Word, PowerPoint, ZIP, images or MP4 · up to 500 MB</p>
                </>
              )}
            </label>
          </div>

          {uploading && (
            <div>
              <ProgressBar value={progress} />
              <p className="mt-1.5 text-sm text-muted">Uploading… {progress}%</p>
            </div>
          )}
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
          {notice && <p className="rounded-xl bg-go/10 p-3 text-sm font-medium text-go">{notice}</p>}

          <button type="submit" disabled={uploading} className={`${btnPrimary} w-full`}>
            <Upload className="h-4 w-4" /> {uploading ? 'Uploading…' : 'Upload material'}
          </button>
        </form>
      </div>

      <div className="space-y-3">
        <h2 className="font-bold text-ink">Your uploads ({materials.length})</h2>
        {materials.length === 0 ? (
          <div className={`${card} p-6 text-sm text-muted`}>Nothing uploaded yet.</div>
        ) : (
          materials.map((m) => (
            <MaterialRow key={m.id} material={m} onOpen={(x) => openMaterial(x, user.idToken)} onDelete={remove} />
          ))
        )}
      </div>
    </div>
  );
}

// ============= QUESTION BANK (instructor) =============
const inputCompact = input.replace('py-3', 'py-2');
const letter = (i) => String.fromCharCode(97 + i);
let questionKey = 0;
const withKey = (q) => ({ ...q, key: q.key || `q${(questionKey += 1)}` });

// Topic suggestions: the subject's syllabus topics plus any already used.
function topicSuggestions(subject, questions, field, topic) {
  const used = questions
    .filter((q) => (!subject || q.subject === subject) && (field === 'topic' || q.topic === topic))
    .map((q) => q[field]);
  const base = field === 'topic' ? (SUBJECTS.find((s) => s.name === subject)?.topics || []) : [];
  return [...new Set([...base, ...used].filter(Boolean))].sort();
}

function QuestionCard({ q, onChange, selected, onSelect, topics, subtopics, listId }) {
  const warnings = questionWarnings(q);
  const set = (patch) => onChange({ ...q, ...patch, dirty: true });
  const setOption = (i, value) => set({ options: q.options.map((o, j) => (j === i ? value : o)) });
  const removeOption = (i) => set({
    options: q.options.filter((_, j) => j !== i),
    answer: q.answer === i ? null : q.answer > i ? q.answer - 1 : q.answer,
  });

  return (
    <div className={`${card} p-4 sm:p-5 ${selected ? 'ring-2 ring-brand' : ''}`}>
      <div className="flex items-start gap-3">
        <input type="checkbox" checked={selected} onChange={onSelect} className="mt-1.5 h-4 w-4 accent-brand" aria-label="Select question" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-ink">Q{q.number || '?'}</span>
            {q.source && <span className="text-xs text-muted">{q.source}</span>}
            {warnings.map((w) => (
              <span key={w} className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">{w}</span>
            ))}
          </div>
          <textarea value={q.text} onChange={(e) => set({ text: e.target.value })} rows={2}
            className={`${inputCompact} resize-y text-[15px]`} />
          <div className="space-y-2">
            {q.options.map((option, i) => (
              <div key={i} className="flex items-center gap-2">
                <button type="button" onClick={() => set({ answer: i })}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold transition ${
                    q.answer === i ? 'border-go bg-go text-white' : 'border-line text-muted hover:border-go hover:text-go'
                  }`}
                  title="Mark as the correct answer" aria-label={`Mark option ${letter(i)} correct`}>
                  {q.answer === i ? <Check className="h-4 w-4" strokeWidth={3} /> : letter(i)}
                </button>
                <input value={option} onChange={(e) => setOption(i, e.target.value)} className={`${inputCompact}`} />
                <button type="button" onClick={() => removeOption(i)} className="rounded-lg p-1.5 text-muted hover:text-red-600" aria-label="Remove option">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            {q.options.length < 8 && (
              <button type="button" onClick={() => set({ options: [...q.options, ''] })} className="text-sm font-semibold text-brand">
                + Add option
              </button>
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <input value={q.topic || ''} onChange={(e) => set({ topic: e.target.value })} list={`${listId}-topics`}
              placeholder="Topic" className={`${inputCompact}`} />
            <input value={q.subtopic || ''} onChange={(e) => set({ subtopic: e.target.value })} list={`${listId}-subtopics-${q.key}`}
              placeholder="Subtopic" className={`${inputCompact}`} />
            <datalist id={`${listId}-subtopics-${q.key}`}>
              {subtopics(q.topic).map((t) => <option key={t} value={t} />)}
            </datalist>
          </div>
        </div>
      </div>
    </div>
  );
}

// A page of question cards with bulk tagging. Used for new and saved questions.
function QuestionEditor({ items, setItems, allQuestions, subject, listId, footer }) {
  const [selected, setSelected] = useState(() => new Set());
  const [bulkTopic, setBulkTopic] = useState('');
  const [bulkSubtopic, setBulkSubtopic] = useState('');
  const [onlyProblems, setOnlyProblems] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE = 50;

  const pool = [...allQuestions, ...items];
  const topics = topicSuggestions(subject, pool, 'topic');
  const subtopics = (topic) => topicSuggestions(subject, pool, 'subtopic', topic);

  const problems = items.filter((q) => questionWarnings(q).length > 0);
  const shown = onlyProblems ? problems : items;
  const pages = Math.max(1, Math.ceil(shown.length / PAGE));
  // The list can shrink (filter, removal, save); never sit on an empty page.
  const current = Math.min(page, pages - 1);
  const pageItems = shown.slice(current * PAGE, current * PAGE + PAGE);

  const toggle = (key) => setSelected((s) => { const n = new Set(s); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  const allShownSelected = shown.length > 0 && shown.every((q) => selected.has(q.key));
  const selectAll = () => setSelected(allShownSelected ? new Set() : new Set(shown.map((q) => q.key)));

  const apply = () => {
    setItems(items.map((q) => (selected.has(q.key)
      ? { ...q, ...(bulkTopic.trim() ? { topic: bulkTopic.trim() } : {}), ...(bulkSubtopic.trim() ? { subtopic: bulkSubtopic.trim() } : {}), dirty: true }
      : q)));
  };
  const removeSelected = () => {
    setItems(items.filter((q) => !selected.has(q.key)));
    setSelected(new Set());
  };

  return (
    <div className="space-y-4">
      <datalist id={`${listId}-topics`}>{topics.map((t) => <option key={t} value={t} />)}</datalist>

      <div className={`${card} sticky top-[118px] z-30 space-y-3 p-4`}>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="inline-flex cursor-pointer items-center gap-2 font-semibold text-ink">
            <input type="checkbox" checked={allShownSelected} onChange={selectAll} className="h-4 w-4 accent-brand" />
            Select all{onlyProblems ? ' shown' : ''}
          </label>
          <span className="text-muted">{selected.size} selected</span>
          <span className="text-muted">·</span>
          <button onClick={() => { setOnlyProblems(!onlyProblems); setPage(0); }}
            className={`rounded-full border px-3 py-1 font-semibold transition ${onlyProblems ? 'border-brand bg-brand text-on-brand' : 'border-line text-ink hover:border-brand'}`}>
            Needs attention ({problems.length})
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <input value={bulkTopic} onChange={(e) => setBulkTopic(e.target.value)} list={`${listId}-topics`}
            placeholder="Topic for selected" className={`${inputCompact} min-w-[180px] flex-1`} />
          <input value={bulkSubtopic} onChange={(e) => setBulkSubtopic(e.target.value)} list={`${listId}-bulk-subtopics`}
            placeholder="Subtopic for selected" className={`${inputCompact} min-w-[180px] flex-1`} />
          <datalist id={`${listId}-bulk-subtopics`}>{subtopics(bulkTopic).map((t) => <option key={t} value={t} />)}</datalist>
          <button onClick={apply} disabled={!selected.size || (!bulkTopic.trim() && !bulkSubtopic.trim())}
            className={`${btnPrimary} px-5 py-2 text-sm`}>Apply to {selected.size || 'selected'}</button>
          <button onClick={removeSelected} disabled={!selected.size}
            className={`${btnGhost} px-5 py-2 text-sm disabled:opacity-50`}>Remove selected</button>
        </div>
      </div>

      {pageItems.map((q) => (
        <QuestionCard key={q.key} q={q} listId={listId} topics={topics} subtopics={subtopics}
          selected={selected.has(q.key)} onSelect={() => toggle(q.key)}
          onChange={(next) => setItems(items.map((x) => (x.key === q.key ? next : x)))} />
      ))}
      {shown.length === 0 && <div className={`${card} p-8 text-center text-muted`}>Nothing to show.</div>}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button disabled={current === 0} onClick={() => { setPage(current - 1); window.scrollTo(0, 0); }} className={`${btnGhost} px-4 py-2 disabled:opacity-50`}>Previous</button>
          <span className="text-muted">Page {current + 1} of {pages}</span>
          <button disabled={current >= pages - 1} onClick={() => { setPage(current + 1); window.scrollTo(0, 0); }} className={`${btnGhost} px-4 py-2 disabled:opacity-50`}>Next</button>
        </div>
      )}
      {footer}
    </div>
  );
}

// The unsaved draft is kept in this browser tab, so switching portal tabs or
// changing the subject for a moment does not throw away marked answers.
const DRAFT_STORE = 'flywithsam-question-draft';
const readDraft = () => {
  try { return JSON.parse(sessionStorage.getItem(DRAFT_STORE) || 'null'); } catch { return null; }
};
const writeDraft = (value) => {
  try {
    if (value?.draft?.length) sessionStorage.setItem(DRAFT_STORE, JSON.stringify(value));
    else sessionStorage.removeItem(DRAFT_STORE);
  } catch { /* storage unavailable: the draft just lives in memory */ }
};

function StepTitle({ n, title, children }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-on-brand">{n}</span>
      <div>
        <p className="font-bold text-ink">{title}</p>
        {children && <p className="mt-0.5 text-sm text-muted">{children}</p>}
      </div>
    </div>
  );
}

function Message({ error, notice }) {
  if (error) return <p className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>;
  if (notice) return <p className="rounded-xl bg-go/10 p-3 text-sm font-medium text-go">{notice}</p>;
  return null;
}

// Reads a PDF or text file; scanned PDFs (pictures of pages) have no text.
async function fileToText(file) {
  const text = /\.pdf$/i.test(file.name) ? await pdfToText(file) : await file.text();
  if (text.replace(/\s/g, '').length < 20) {
    throw new Error('This file has no readable text. It is probably a scanned picture of the pages. Paste the text instead.');
  }
  return text;
}

// `fixedSubject` / `addOnly`: used inside the Upload tab, where the subject is
// already picked there and only the add-and-split flow is shown.
function QuestionBankAdmin({ user, fixedSubject = '', addOnly = false }) {
  const stored = React.useMemo(() => {
    const d = readDraft();
    return d && (!fixedSubject || d.subject === fixedSubject) ? d : null;
  }, [fixedSubject]);

  const [view, setView] = useState('add');
  const [saved, setSaved] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(stored ? 'Your unsaved questions from earlier are back.' : '');
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  // Adding
  const [pickedSubject, setSubject] = useState(stored?.subject || '');
  const subject = fixedSubject || pickedSubject;
  const [source, setSource] = useState(stored?.source || '');
  const [pasted, setPasted] = useState('');
  const [draft, setDraft] = useState(() => (stored?.draft || []).map(withKey));
  const [keyText, setKeyText] = useState('');
  const [keyResult, setKeyResult] = useState('');
  const fileRef = React.useRef(null);
  const keyFileRef = React.useRef(null);

  // Browsing saved questions: edits and removals are kept by id, so changing a
  // filter never throws them away.
  const [filter, setFilter] = useState({ subject: '', topic: '', subtopic: '' });
  const [edits, setEdits] = useState(() => new Map());
  const [removed, setRemoved] = useState(() => new Set());

  // Skip the first run: opening the screen for another subject must not wipe
  // a draft that belongs to a different subject.
  const firstRun = React.useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    writeDraft({ subject, source, draft });
  }, [draft, subject, source]);

  // Warn before closing the page with unsaved work.
  const unsaved = draft.length > 0 || edits.size > 0 || removed.size > 0;
  useEffect(() => {
    if (!unsaved) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [unsaved]);

  const load = async () => {
    try {
      const data = await api('/api/questions', { action: 'list' }, user.idToken);
      setSaved((data.questions || []).map(withKey));
    } catch (err) {
      setError(err.message);
    }
  };
  useEffect(() => { load(); }, []);

  const matches = (q) => (!filter.subject || q.subject === filter.subject)
    && (!filter.topic || q.topic === filter.topic)
    && (!filter.subtopic || q.subtopic === filter.subtopic);
  const editing = saved.filter((q) => matches(q) && !removed.has(q.id)).map((q) => edits.get(q.id) || q);
  const setEditing = (next) => {
    const nextIds = new Set(next.map((q) => q.id));
    setRemoved((r) => new Set([...r, ...editing.filter((q) => !nextIds.has(q.id)).map((q) => q.id)]));
    setEdits((e) => {
      const m = new Map(e);
      next.forEach((q) => { if (q.dirty) m.set(q.id, q); });
      return m;
    });
  };

  const split = (text, name) => {
    const found = parseQuestions(text);
    if (found.length === 0) {
      setError('No questions found. Each question should start with a number like "12." and each option with a letter like "a)".');
      return;
    }
    setDraft(found.map((q) => withKey({ ...q, subject, source: source || name || '', topic: '', subtopic: '' })));
    setKeyResult('');
    const answered = found.filter((q) => q.answer !== null).length;
    setNotice(answered ? `Found ${found.length} questions. The answer key in the file filled in ${answered}.` : '');
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const readFile = async (file) => {
    if (!file) return;
    if (!subject) { setError('Pick the subject first.'); return; }
    setBusy(true);
    setError('');
    try {
      const name = file.name.replace(/\.[^.]+$/, '');
      if (!source) setSource(name);
      split(await fileToText(file), name);
    } catch (err) {
      console.error('Reading the question file failed:', err);
      setError(err?.message?.startsWith('This file') ? err.message
        : `Could not read that file (${err?.message || 'unknown error'}). Try again, or paste the text instead.`);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const applyKey = (text) => {
    const key = parseAnswerKey(text);
    if (key.length === 0) {
      setKeyResult('No answers found in that key. Write it like "1. b  2. c  3. a".');
      return;
    }
    const result = applyAnswerKey(draft, key);
    setDraft(result.questions);
    setKeyResult(`Filled in ${result.applied} of ${draft.length} answers.`
      + (result.missing.length ? ` Still to do by hand: Q${result.missing.slice(0, 12).join(', Q')}${result.missing.length > 12 ? '…' : ''}.` : ' Every question has an answer now.')
      + (result.unmatched.length ? ` Not used (no such question or option): ${result.unmatched.slice(0, 8).join(', ')}.` : ''));
  };

  const readKeyFile = async (file) => {
    if (!file) return;
    try {
      const text = await fileToText(file);
      setKeyText(text);
      applyKey(text);
    } catch (err) {
      setKeyResult(err.message || 'Could not read that file.');
    } finally {
      if (keyFileRef.current) keyFileRef.current.value = '';
    }
  };

  const save = async (items) => {
    const bad = items.filter((q) => questionWarnings(q).length > 0);
    if (bad.length) {
      setError(`${bad.length} question${bad.length === 1 ? ' needs' : 's need'} attention first (Q${bad.slice(0, 8).map((q) => q.number || '?').join(', Q')}${bad.length > 8 ? '…' : ''}). Click "Needs attention" to see them.`);
      return false;
    }
    const payload = items.map(({ key, dirty, ...q }) => ({ ...q, subject: q.subject || subject }));
    const data = await api('/api/questions', { action: 'save', questions: payload }, user.idToken);
    const byId = new Map(data.questions.map((q) => [q.id, q]));
    setSaved((list) => [...list.filter((q) => !byId.has(q.id)), ...data.questions.map(withKey)]);
    return data.questions.length;
  };

  const saveDraft = async () => {
    setBusy(true);
    setError('');
    try {
      const count = await save(draft);
      if (count) {
        setDraft([]);
        setPasted('');
        setSource('');
        setKeyText('');
        setKeyResult('');
        setNotice(`${count} question${count === 1 ? '' : 's'} saved. Students with ${subject} can practise them now.`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const saveChanges = async () => {
    const gone = [...removed];
    const changed = [...edits.values()].filter((q) => !removed.has(q.id));
    if (!gone.length && !changed.length) { setNotice('Nothing has changed.'); return; }
    // Check the edits before deleting anything, so a save never half-happens.
    if (changed.some((q) => questionWarnings(q).length)) {
      setError('Some edited questions need attention first. Click "Needs attention" to see them.');
      return;
    }
    if (gone.length && !window.confirm(`Delete ${gone.length} question${gone.length === 1 ? '' : 's'} for good? Students lose their progress on them.`)) return;
    setBusy(true);
    setError('');
    try {
      if (changed.length) await save(changed);
      if (gone.length) {
        await api('/api/questions', { action: 'delete', ids: gone }, user.idToken);
        setSaved((list) => list.filter((q) => !removed.has(q.id)));
      }
      setEdits(new Map());
      setRemoved(new Set());
      setNotice([changed.length && `${changed.length} updated`, gone.length && `${gone.length} deleted`].filter(Boolean).join(', ') + '.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const savedTopics = topicSuggestions(filter.subject, saved, 'topic');
  const savedSubtopics = topicSuggestions(filter.subject, saved, 'subtopic', filter.topic);
  const needAnswer = draft.filter((q) => q.answer === null || q.answer === undefined).length;
  const needTopic = draft.filter((q) => !q.topic?.trim()).length;

  return (
    <div className="space-y-5">
      {!addOnly && (
        <div className="flex flex-wrap gap-2">
          {[['add', 'Add questions'], ['saved', `All questions (${saved.length})`]].map(([id, label]) => (
            <button key={id} onClick={() => { setView(id); setError(''); setNotice(''); }}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                view === id ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface text-ink hover:border-brand'
              }`}>{label}</button>
          ))}
        </div>
      )}
      <Message error={error} notice={notice} />

      {view === 'add' && draft.length === 0 && (
        <div className={`${card} space-y-6 p-6 sm:p-8`}>
          <StepTitle n={1} title="Choose the question paper">
            Questions start with a number (<b>12.</b>) and options with a letter (<b>a)</b>). Nothing is saved until step 3.
          </StepTitle>
          <div className="grid gap-5 sm:grid-cols-2">
            {!fixedSubject && (
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-ink">Subject</label>
                <select className={input} value={subject} onChange={(e) => setSubject(e.target.value)}>
                  <option value="">Select a subject</option>
                  {SUBJECTS.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-ink">Paper name <span className="font-normal text-muted">(optional)</span></label>
              <input className={input} value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. MET1" />
            </div>
          </div>
          <label
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); readFile(e.dataTransfer.files?.[0]); }}
            className={`block cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition ${
              dragging ? 'border-brand bg-sky' : 'border-line bg-mist hover:border-brand hover:bg-sky'} ${!subject ? 'opacity-60' : ''}`}>
            <input ref={fileRef} type="file" accept=".pdf,.txt" className="sr-only" disabled={!subject || busy}
              onChange={(e) => readFile(e.target.files?.[0])} />
            {busy ? <LoaderCircle className="mx-auto mb-2 h-7 w-7 animate-spin text-brand" /> : <Upload className="mx-auto mb-2 h-7 w-7 text-brand" />}
            <p className="font-semibold text-ink">{busy ? 'Reading your paper…' : subject ? 'Click to choose the PDF, or drag it here' : 'Pick the subject first'}</p>
            <p className="text-sm text-muted">PDF or .txt · every question becomes its own card</p>
          </label>
          <details className="group">
            <summary className="cursor-pointer text-sm font-semibold text-brand">Or paste the questions as text</summary>
            <textarea rows={8} value={pasted} onChange={(e) => setPasted(e.target.value)} className={`${input} mt-3 font-mono text-sm`}
              placeholder={'1. Coriolis force is strongest at\na) Equator\nb) Poles\nc) Mid latitudes'} />
            <button onClick={() => (subject ? split(pasted, source) : setError('Pick the subject first.'))} disabled={!pasted.trim()}
              className={`${btnPrimary} mt-3 px-6 py-2.5 text-sm`}>Split into questions</button>
          </details>
        </div>
      )}

      {view === 'add' && draft.length > 0 && (
        <>
          <div className={`${card} space-y-4 p-5 sm:p-6`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <StepTitle n={2} title={`Check the ${draft.length} questions from ${source || 'your paper'} · ${subject}`}>
                {needAnswer > 0
                  ? `${needAnswer} still need the correct answer: add an answer key below, or click the letter next to the right option.`
                  : 'Every question has an answer.'}
                {needTopic > 0 ? ` ${needTopic} have no topic yet (optional).` : ''}
              </StepTitle>
              <button onClick={() => { if (window.confirm('Throw away these questions and start again?')) { setDraft([]); setKeyResult(''); setNotice(''); } }}
                className={`${btnGhost} px-4 py-2 text-sm`}>Start over</button>
            </div>
            <ProgressBar value={Math.round(((draft.length - needAnswer) / draft.length) * 100)} color="bg-go" />

            <div className="rounded-xl border border-line p-4">
              <p className="font-semibold text-ink">Add the answer key</p>
              <p className="mt-0.5 text-sm text-muted">Paste it or choose the file. Any layout works: <b>1. b 2. c</b>, <b>1-B</b>, <b>1) (b)</b>, one per line or all together.</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <textarea rows={2} value={keyText} onChange={(e) => setKeyText(e.target.value)} placeholder="1. b  2. c  3. a …"
                  className={`${inputCompact} font-mono text-sm`} />
                <div className="flex shrink-0 gap-2 sm:flex-col">
                  <button onClick={() => applyKey(keyText)} disabled={!keyText.trim()} className={`${btnPrimary} px-5 py-2 text-sm`}>Apply key</button>
                  <label className={`${btnGhost} cursor-pointer px-5 py-2 text-sm`}>
                    <input ref={keyFileRef} type="file" accept=".pdf,.txt" className="sr-only" onChange={(e) => readKeyFile(e.target.files?.[0])} />
                    Key from file
                  </label>
                </div>
              </div>
              {keyResult && <p className="mt-2 text-sm font-medium text-ink">{keyResult}</p>}
            </div>
          </div>

          <QuestionEditor items={draft} setItems={setDraft} allQuestions={saved} subject={subject} listId="draft"
            footer={(
              <div className={`${card} space-y-3 p-5`}>
                <StepTitle n={3} title="Save">
                  {needAnswer > 0 ? `Mark the remaining ${needAnswer} answer${needAnswer === 1 ? '' : 's'} first.` : 'Students see the questions as soon as you save.'}
                </StepTitle>
                <button onClick={saveDraft} disabled={busy} className={`${btnPrimary} w-full py-3.5`}>
                  {busy ? 'Saving…' : `Save ${draft.length} questions`}
                </button>
              </div>
            )} />
        </>
      )}

      {view === 'saved' && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <select className={input} value={filter.subject} onChange={(e) => setFilter({ subject: e.target.value, topic: '', subtopic: '' })}>
              <option value="">All subjects</option>
              {SUBJECTS.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
            <select className={input} value={filter.topic} onChange={(e) => setFilter({ ...filter, topic: e.target.value, subtopic: '' })}>
              <option value="">All topics</option>
              {savedTopics.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select className={input} value={filter.subtopic} onChange={(e) => setFilter({ ...filter, subtopic: e.target.value })}>
              <option value="">All subtopics</option>
              {savedSubtopics.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {(edits.size > 0 || removed.size > 0) && (
            <p className="text-sm font-medium text-ink">
              Unsaved: {[edits.size && `${edits.size} edited`, removed.size && `${removed.size} to delete`].filter(Boolean).join(', ')}. Click “Save changes” at the bottom.
            </p>
          )}
          <QuestionEditor items={editing} setItems={setEditing} allQuestions={saved} subject={filter.subject} listId="saved"
            footer={saved.length > 0 ? (
              <button onClick={saveChanges} disabled={busy} className={`${btnPrimary} w-full py-3.5`}>
                {busy ? 'Saving…' : 'Save changes'}
              </button>
            ) : null} />
        </>
      )}
    </div>
  );
}

// ============= CONSULTATION CALENDAR (instructor) =============
// Dates are in IST, like the booking page. Keep SLOT_TIMES in sync with ui.jsx.
const IST_ZONE = 'Asia/Kolkata';
const istNow = () => new Date(new Date().toLocaleString('en-US', { timeZone: IST_ZONE }));
const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function weekDays(offset) {
  const today = istNow();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      key: dayKey(d),
      weekday: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      dayMonth: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      isToday: dayKey(d) === dayKey(today),
    };
  });
}

function BookingsCalendar({ bookings, onCancel, onBlock, busySlot }) {
  const [week, setWeek] = useState(0);
  const [picked, setPicked] = useState(null);
  const days = weekDays(week);
  const bySlot = new Map(bookings.map((b) => [`${b.date} ${b.time}`, b]));
  const isPast = (date, time) => new Date(`${date}T${time}:00+05:30`).getTime() < Date.now();
  const weekCount = days.reduce((n, d) => n + SLOT_TIMES.filter((t) => {
    const b = bySlot.get(`${d.key} ${t}`);
    return b && !b.blocked;
  }).length, 0);

  const click = (date, time) => {
    const booking = bySlot.get(`${date} ${time}`);
    if (booking?.blocked) { onCancel(booking, { quiet: true }); return; }
    if (booking) { setPicked(booking); return; }
    if (!isPast(date, time)) onBlock(date, time);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setWeek(week - 1)} className="rounded-full border border-line p-2 text-muted transition hover:text-ink" aria-label="Previous week">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => setWeek(0)} disabled={week === 0} className={`${btnGhost} px-4 py-2 text-sm disabled:opacity-50`}>This week</button>
          <button onClick={() => setWeek(week + 1)} className="rounded-full border border-line p-2 text-muted transition hover:text-ink" aria-label="Next week">
            <ChevronRight className="h-4 w-4" />
          </button>
          <p className="ml-2 font-semibold text-ink">{days[0].dayMonth} – {days[6].dayMonth}</p>
        </div>
        <p className="text-sm text-muted">{weekCount} consultation{weekCount === 1 ? '' : 's'} this week</p>
      </div>

      <div className={`${card} overflow-x-auto`}>
        <table className="w-full min-w-[760px] table-fixed border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-20 border-b border-line p-2 text-left text-xs font-semibold text-muted">IST</th>
              {days.map((d) => (
                <th key={d.key} className={`border-b border-l border-line p-2 text-center ${d.isToday ? 'bg-sky' : ''}`}>
                  <span className="block text-xs font-medium text-muted">{d.weekday}</span>
                  <span className="block font-bold text-ink">{d.dayMonth}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SLOT_TIMES.map((time) => (
              <tr key={time}>
                <td className="border-b border-line p-2 text-xs font-semibold text-muted">{time}</td>
                {days.map((d) => {
                  const slot = `${d.key} ${time}`;
                  const booking = bySlot.get(slot);
                  const past = isPast(d.key, time);
                  const busy = busySlot === slot;
                  return (
                    <td key={slot} className="border-b border-l border-line p-1">
                      {booking && !booking.blocked ? (
                        <button onClick={() => click(d.key, time)} title={`${booking.name} · ${booking.email}`}
                          className={`block w-full truncate rounded-lg px-2 py-2 text-left text-xs font-semibold transition hover:opacity-85 ${
                            booking.amount === 0 ? 'bg-go text-white' : 'bg-brand text-on-brand'} ${past ? 'opacity-50' : ''}`}>
                          {booking.name?.split(' ')[0] || 'Booked'}
                        </button>
                      ) : booking?.blocked ? (
                        <button onClick={() => click(d.key, time)} disabled={busy} title="Blocked by you. Click to open it again."
                          className="block w-full rounded-lg bg-mist px-2 py-2 text-xs font-semibold text-muted transition hover:bg-sky"
                          style={{ backgroundImage: 'repeating-linear-gradient(135deg, transparent 0 6px, rgba(128,128,128,0.15) 6px 12px)' }}>
                          {busy ? '…' : 'Blocked'}
                        </button>
                      ) : past ? (
                        <div className="h-8" />
                      ) : (
                        <button onClick={() => click(d.key, time)} disabled={busy} title="Free. Click to block it for yourself."
                          className="group block h-8 w-full rounded-lg text-xs font-semibold text-line transition hover:bg-mist hover:text-muted">
                          {busy ? '…' : <><span className="group-hover:hidden">+</span><span className="hidden group-hover:inline">Block</span></>}
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-brand" /> Paid consultation</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-go" /> Free, course student</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-line bg-mist" /> Blocked by you</span>
        <span>Click an empty slot to block it · click a booking for details</span>
      </div>

      {picked && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => setPicked(null)}>
          <div className={`${card} w-full max-w-md p-6`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted">{picked.dayLabel || picked.date} · {picked.time} IST</p>
                <p className="mt-1 text-xl font-bold text-ink">{picked.name}</p>
              </div>
              <button onClick={() => setPicked(null)} className="rounded-lg p-1 text-muted hover:text-ink" aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-4 space-y-1.5 text-sm">
              <p><a href={`mailto:${picked.email}`} className="font-semibold text-brand">{picked.email}</a></p>
              {picked.phone && <p className="text-ink">{picked.phone}</p>}
              {picked.goal && <p className="rounded-xl bg-mist p-3 text-muted">{picked.goal}</p>}
              <p className="pt-2 font-semibold text-ink">
                {picked.amount === 0 ? 'Free · course student' : `₹${(picked.amount ?? 1999).toLocaleString('en-IN')} to collect`}
                {picked.recording && ' · wants the recording'}
              </p>
            </div>
            <button onClick={() => { onCancel(picked); setPicked(null); }}
              className="mt-6 w-full rounded-full border border-red-200 px-6 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/50">
              Cancel this consultation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============= PAYMENTS (instructor) =============
const PAYMENT_STATUS = {
  awaiting: { label: 'Opened the QR, not confirmed yet', tone: 'bg-mist text-muted' },
  claimed: { label: 'Says they have paid', tone: 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200' },
  approved: { label: 'Approved', tone: 'bg-go/10 text-go' },
  rejected: { label: 'Rejected', tone: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300' },
};

function PaymentsAdmin({ requests, onApprove, onReject, busyId, error, onRefresh }) {
  const [showDone, setShowDone] = useState(false);
  const open = requests.filter((r) => r.status === 'claimed' || r.status === 'awaiting')
    .sort((a, b) => (a.status === 'claimed' ? -1 : 1) - (b.status === 'claimed' ? -1 : 1));
  const done = requests.filter((r) => r.status === 'approved' || r.status === 'rejected');
  const when = (iso) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  const row = (r) => (
    <div key={r.id} className={`${card} p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-bold text-ink">{r.name || r.email}</p>
          <p className="text-sm text-muted">{r.email}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {r.subjects.map((s) => <span key={s} className="rounded-full bg-sky px-2.5 py-1 text-xs font-semibold text-ink">{s}</span>)}
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-extrabold text-ink">₹{r.amount.toLocaleString('en-IN')}</p>
          <span className={`mt-1 inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${PAYMENT_STATUS[r.status]?.tone}`}>
            {PAYMENT_STATUS[r.status]?.label}
          </span>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
        <span>Asked {when(r.createdAt)}</span>
        {r.claimedAt && <span>Paid {when(r.claimedAt)}</span>}
        {r.reference && <span>UPI ref: <b className="text-ink">{r.reference}</b></span>}
        {r.decidedAt && <span>{r.status === 'approved' ? 'Approved' : 'Rejected'} {when(r.decidedAt)}</span>}
        {r.note && <span>Note: {r.note}</span>}
      </div>
      {(r.status === 'claimed' || r.status === 'awaiting') && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
          <button onClick={() => onApprove(r)} disabled={busyId === r.id} className={`${btnPrimary} px-5 py-2 text-sm`}>
            {busyId === r.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Payment received · switch on {r.subjects.length === 1 ? 'this subject' : `these ${r.subjects.length} subjects`}
          </button>
          <button onClick={() => onReject(r)} disabled={busyId === r.id} className={`${btnGhost} px-5 py-2 text-sm`}>Not received</button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-ink">Payments to check ({open.length})</h2>
          <p className="text-sm text-muted">Check the money has arrived in your UPI app, then switch the subjects on. The student sees them straight away.</p>
        </div>
        <button onClick={onRefresh} className={`${btnGhost} px-4 py-2 text-sm`}>Refresh</button>
      </div>
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
      {open.length === 0 ? (
        <div className={`${card} p-10 text-center`}>
          <Wallet className="mx-auto h-10 w-10 text-brand" />
          <p className="mt-4 font-bold text-ink">Nothing to check</p>
          <p className="mt-1 text-muted">When a student pays for subjects, it shows up here.</p>
        </div>
      ) : open.map(row)}
      {done.length > 0 && (
        <div className="pt-4">
          <button onClick={() => setShowDone(!showDone)} className="text-sm font-semibold text-brand">
            {showDone ? 'Hide' : 'Show'} past payments ({done.length})
          </button>
          {showDone && <div className="mt-3 space-y-3">{done.map(row)}</div>}
        </div>
      )}
    </div>
  );
}

function AdminPortal({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing] = useState(null); // email being edited
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [threads, setThreads] = useState([]);
  const [inboxError, setInboxError] = useState('');
  const [payments, setPayments] = useState([]);
  const [paymentsError, setPaymentsError] = useState('');
  const [paymentBusy, setPaymentBusy] = useState(null);
  const [instructors, setInstructors] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsView, setBookingsView] = useState('calendar');
  const [busySlot, setBusySlot] = useState(null);

  const call = (body, endpoint = '/api/students') => api(endpoint, body, user.idToken);

  const loadThreads = async () => {
    try {
      const data = await call({ action: 'inbox' }, '/api/messages');
      setThreads(data.threads || []);
      setInboxError('');
    } catch (err) {
      setInboxError(err.message);
    }
  };
  usePolling(loadThreads, 10000, []);
  const unreadDoubts = threads.reduce((sum, t) => sum + (t.unread || 0), 0);

  const loadPayments = async () => {
    try {
      const data = await call({ action: 'list' }, '/api/payment');
      setPayments(data.requests || []);
      setPaymentsError('');
    } catch (err) {
      setPaymentsError(err.message);
    }
  };
  usePolling(loadPayments, 30000, []);
  const paymentsToCheck = payments.filter((p) => p.status === 'claimed' || p.status === 'awaiting').length;

  const approvePayment = async (request) => {
    setPaymentBusy(request.id);
    try {
      const data = await call({ action: 'approve', id: request.id }, '/api/payment');
      setPayments((list) => list.map((p) => (p.id === request.id ? data.request : p)));
      setStudents((list) => list.map((st) => (st.email === request.email ? { ...st, access: data.access } : st)));
    } catch (err) {
      setPaymentsError(err.message);
    } finally {
      setPaymentBusy(null);
    }
  };

  const rejectPayment = async (request) => {
    const note = window.prompt(
      'Mark as not received? The student sees an apology and the contact email. Add a note for them if you like (optional):',
      '',
    );
    if (note === null) return;
    setPaymentBusy(request.id);
    try {
      const data = await call({ action: 'reject', id: request.id, note }, '/api/payment');
      setPayments((list) => list.map((p) => (p.id === request.id ? data.request : p)));
    } catch (err) {
      setPaymentsError(err.message);
    } finally {
      setPaymentBusy(null);
    }
  };

  const deleteStudent = async (student) => {
    if (!window.confirm(
      `Delete ${student.name || student.email}? Their access and doubts chat are removed. `
      + 'If they sign in again they come back as a new account with no access.',
    )) return;
    try {
      await call({ action: 'delete', email: student.email });
      setStudents((list) => list.filter((s) => s.email !== student.email));
      setThreads((list) => list.filter((t) => t.email !== student.email));
      if (editing === student.email) { setEditing(null); setDraft(null); }
    } catch (err) {
      setLoadError(err.message);
    }
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

  // `quiet`: opening up a slot you blocked yourself needs no warning.
  const cancelBooking = async (booking, { quiet = false } = {}) => {
    if (!quiet && !window.confirm(`Free up ${booking.date} at ${booking.time}? The student is not told automatically.`)) return;
    setBusySlot(`${booking.date} ${booking.time}`);
    try {
      await call({ action: 'cancel', date: booking.date, time: booking.time }, '/api/bookings');
      setBookings((list) => list.filter((b) => !(b.date === booking.date && b.time === booking.time)));
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setBusySlot(null);
    }
  };

  // Keeps a slot for yourself, so students cannot book it.
  const blockSlot = async (date, time) => {
    setBusySlot(`${date} ${time}`);
    try {
      await call({ action: 'block', date, time }, '/api/bookings');
      setBookings((list) => [...list, { date, time, blocked: true, name: 'Blocked by instructor' }]);
    } catch (err) {
      setLoadError(err.message);
      loadBookings();
    } finally {
      setBusySlot(null);
    }
  };

  useEffect(() => { loadStudents(); loadBookings(); }, []);

  const startEditing = (student) => {
    setEditing(student.email);
    setDraft({
      plan: student.access?.plan || 'none',
      subjects: student.access?.subjects || [],
      paused: student.access?.paused || [],
      questions: Boolean(student.access?.questions),
      tests: Boolean(student.access?.tests),
    });
  };

  const saveAccess = async () => {
    if (draft.plan === 'course' && draft.subjects.length === 0) {
      setLoadError('Tick at least one subject for a course student.');
      return;
    }
    setLoadError('');
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
    { id: 'payments', label: 'Payments', icon: Wallet, badge: paymentsToCheck },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'questions', label: 'Question bank', icon: ListChecks },
    { id: 'inbox', label: 'Inbox', icon: Inbox, badge: unreadDoubts },
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
                  <button onClick={() => deleteStudent(student)}
                    className="rounded-full p-2 text-muted transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50"
                    aria-label={`Delete ${student.email}`} title="Delete student">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {student.access?.plan === 'course' && student.access.subjects?.length > 0 && editing !== student.email && (
                <p className="mt-3 border-t border-line pt-3 text-sm text-muted">
                  Subjects: {student.access.subjects.map((sub) => ((student.access.paused || []).includes(sub) ? `${sub} (paused)` : sub)).join(', ')}
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
                          // Course students normally get the question bank and tests too.
                          questions: value === 'course' ? (draft.plan === 'course' ? draft.questions : true) : false,
                          tests: value === 'course' ? (draft.plan === 'course' ? draft.tests : true) : false,
                        })}
                        className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                          draft.plan === value ? 'border-brand bg-brand text-on-brand' : 'border-line text-ink hover:border-brand'
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
                        {SUBJECTS.map((subject) => {
                          const on = draft.subjects.includes(subject.name);
                          const isPaused = on && (draft.paused || []).includes(subject.name);
                          return (
                            <div key={subject.name} className={`flex items-center gap-3 rounded-xl border p-3 text-sm transition ${isPaused ? 'border-dashed border-line bg-mist' : 'border-line hover:border-brand/60'}`}>
                              <label className="flex flex-1 cursor-pointer items-center gap-3">
                                <input type="checkbox" checked={on} onChange={() => toggleSubject(subject.name)} className="h-4 w-4 accent-brand" />
                                <span className={`font-medium ${isPaused ? 'text-muted' : 'text-ink'}`}>{subject.name}</span>
                                {isPaused && <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-muted ring-1 ring-line">Paused</span>}
                              </label>
                              {on && (
                                <button type="button"
                                  onClick={() => setDraft({
                                    ...draft,
                                    paused: isPaused ? draft.paused.filter((x) => x !== subject.name) : [...(draft.paused || []), subject.name],
                                  })}
                                  title={isPaused ? 'Give access back' : 'Lock this subject until they pay'}
                                  className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-ink transition hover:border-brand">
                                  {isPaused ? <><Play className="h-3 w-3" /> Resume</> : <><Pause className="h-3 w-3" /> Pause</>}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <p className="mt-5 text-sm font-semibold text-ink">What else can they use</p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line p-3 text-sm transition hover:border-brand/60">
                          <input type="checkbox" checked={draft.questions}
                            onChange={(e) => setDraft({ ...draft, questions: e.target.checked })}
                            className="h-4 w-4 accent-brand" />
                          <span className="font-medium text-ink">Question bank</span>
                        </label>
                        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line p-3 text-sm transition hover:border-brand/60">
                          <input type="checkbox" checked={draft.tests}
                            onChange={(e) => setDraft({ ...draft, tests: e.target.checked })}
                            className="h-4 w-4 accent-brand" />
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
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-bold text-ink">Upcoming consultations ({bookings.filter((b) => !b.blocked).length})</h2>
              <p className="text-sm text-muted">Every booking appears here the moment it is made. Cancelling frees the slot; the student is not emailed.</p>
            </div>
            <div className="flex items-center gap-2">
              {[['calendar', 'Calendar'], ['list', 'List']].map(([id, label]) => (
                <button key={id} onClick={() => setBookingsView(id)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    bookingsView === id ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface text-ink hover:border-brand'
                  }`}>{label}</button>
              ))}
              <button onClick={loadBookings} className={`${btnGhost} px-4 py-2 text-sm`}>Refresh</button>
            </div>
          </div>

          {loadError && <p className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">{loadError}</p>}
          {bookingsLoading && <div className={`${card} p-12 text-center text-muted`}>Loading calendar…</div>}

          {!bookingsLoading && bookingsView === 'calendar' && (
            <BookingsCalendar bookings={bookings} onCancel={cancelBooking} onBlock={blockSlot} busySlot={busySlot} />
          )}

          {!bookingsLoading && bookingsView === 'list' && bookings.length === 0 && (
            <div className={`${card} p-12 text-center`}>
              <CalendarClock className="mx-auto h-10 w-10 text-brand" />
              <p className="mt-4 font-bold text-ink">No consultations booked</p>
              <p className="mt-1 text-muted">Bookings from the website show up here.</p>
            </div>
          )}

          {!bookingsLoading && bookingsView === 'list' && bookings.map((booking) => (
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
                    {booking.amount === 0 ? 'Free · course student' : `₹${(booking.amount ?? 1999).toLocaleString('en-IN')}`}
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

      {activeTab === 'inbox' && (
        <InstructorInbox user={user} threads={threads} loadThreads={loadThreads} error={inboxError} />
      )}

      {activeTab === 'payments' && (
        <PaymentsAdmin requests={payments} onApprove={approvePayment} onReject={rejectPayment}
          busyId={paymentBusy} error={paymentsError} onRefresh={loadPayments} />
      )}

      {activeTab === 'questions' && <QuestionBankAdmin user={user} />}

      {activeTab === 'upload' && <UploadMaterial user={user} />}
    </AppShell>
  );
}
