import React, { useState, useEffect } from 'react';
import {
  Menu, X, LogOut, Upload, Trash2, Eye, BookOpen, Users, FileText, Plane,
  PlayCircle, NotebookPen, ListChecks, ClipboardCheck, Check, ChevronDown,
  LayoutDashboard, Video, ArrowLeft, Building2, Hourglass, Quote, CalendarClock, BarChart3, GraduationCap, Wallet, Compass, Clock, Infinity as InfinityIcon,
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
import { googleReady, signInWithGoogle } from './auth.js';

const PATH_TO_MODE = { '/login': 'login', '/signup': 'signup', '/book': 'book' };
const MODE_TO_PATH = { landing: '/', login: '/login', signup: '/signup', book: '/book' };

// ============= MAIN APP =============
export default function AviationGroundSchool() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
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
  const handleLogin = (email, password, isAdminLogin) => {
    if (isAdminLogin && email === 'admin@groundschool.com' && password === 'admin123') {
      setUser({ email, role: 'admin' });
      setIsAdmin(true);
      setAuthModeState('admin');
      window.history.replaceState(null, '', '/');
    } else if (!isAdminLogin && email && password) {
      setUser({ email, role: 'student' });
      setIsAdmin(false);
      setAuthModeState('dashboard');
      window.history.replaceState(null, '', '/');
    }
  };

  const handleGoogleUser = (googleUser) => {
    setUser({ email: googleUser.email, name: googleUser.name, role: 'student' });
    setIsAdmin(false);
    setAuthModeState('dashboard');
    window.history.replaceState(null, '', '/');
  };

  const handleLogout = () => {
    setUser(null);
    setIsAdmin(false);
    setAuthMode('landing');
  };

  return (
    <div className="bg-white">
      {!user ? (
        <>
          {authMode === 'landing' && <LandingPage setAuthMode={setAuthMode} />}
          {authMode === 'login' && <LoginPage setAuthMode={setAuthMode} onLogin={handleLogin} onGoogleUser={handleGoogleUser} />}
          {authMode === 'signup' && <SignupPage setAuthMode={setAuthMode} onSignup={handleLogin} onGoogleUser={handleGoogleUser} />}
          {authMode === 'book' && <BookingPage goHome={() => setAuthMode('landing')} />}
        </>
      ) : isAdmin ? (
        <AdminPortal user={user} onLogout={handleLogout} />
      ) : (
        <StudentDashboard user={user} onLogout={handleLogout} />
      )}
    </div>
  );
}

// ============= LANDING PAGE =============
const SUBJECTS = [
  {
    name: 'Air Navigation',
    tab: 'Air Navigation',
    blurb: 'Map reading, flight planning, compass use and radio aids. Every calculation worked through step by step, the way the paper sets it.',
    topics: ['Maps & charts', 'Flight planning', 'Compass & magnetism', 'Radio navigation aids'],
  },
  {
    name: 'Aviation Meteorology',
    tab: 'Meteorology',
    blurb: 'Weather systems, clouds and pressure explained from the cockpit, plus plenty of practice decoding METARs and TAFs.',
    topics: ['Weather systems & fronts', 'Clouds & precipitation', 'Atmospheric pressure', 'METARs & TAFs'],
  },
  {
    name: 'Air Regulations',
    tab: 'Air Regulations',
    blurb: 'Aviation law, air traffic rules and safety procedures, taught with the exact wording the exam uses.',
    topics: ['Rules of the air', 'Airspace & ATC services', 'Licensing & medicals', 'Safety procedures'],
  },
  {
    name: 'Technical General',
    tab: 'Technical General',
    blurb: 'Aircraft structures, principles of flight, engines and general systems, explained so they stick.',
    topics: ['Principles of flight', 'Aircraft structures', 'Piston & turbine engines', 'Systems & instruments'],
  },
  {
    name: 'Technical Specific',
    tab: 'Technical Specific',
    blurb: 'In-depth knowledge of the aircraft type you will fly: its limits, systems and performance figures.',
    topics: ['Type limitations', 'Aircraft systems', 'Performance & loading', 'Emergency procedures'],
  },
  {
    name: 'Radio Telephony (RTR)',
    tab: 'RTR',
    blurb: 'Standard phraseology and communication procedures for talking to air traffic control, with practice for the oral exam.',
    topics: ['Standard phraseology', 'Radio procedures', 'Emergency calls', 'Practice exchanges'],
  },
];

const FEATURES = [
  { icon: PlayCircle, title: 'Video lessons', text: 'Recorded lectures for every topic. Pause, rewind and rewatch before the exam.' },
  { icon: NotebookPen, title: 'Study notes', text: 'Concise notes that follow the syllabus, so you revise what gets asked.' },
  { icon: ListChecks, title: 'Topic quizzes', text: 'Ten-question quizzes after each lesson show what stuck and what to revisit.' },
  { icon: ClipboardCheck, title: 'Mock exams', text: 'Full papers under exam timing, marked instantly with explanations.' },
];

const REASONS = [
  { icon: GraduationCap, title: 'Taught by a CPL holder', text: 'Every lesson comes from someone who has sat these papers and trained in the cockpit.' },
  { icon: Compass, title: 'Always know what is next', text: 'Subjects are broken into short lessons in a set order, so you never wonder where to start.' },
  { icon: BarChart3, title: 'See your progress', text: 'Marks and completion for each subject update as you finish quizzes.' },
  { icon: Clock, title: 'Study on your schedule', text: 'Watch lectures between shifts, on the train, or the night before a paper.' },
  { icon: InfinityIcon, title: 'Yours for good', text: 'Pay once and keep every lesson, including updates when the syllabus changes.' },
  { icon: Wallet, title: 'Fairly priced', text: 'One flat fee for all six subjects. No add-ons, no monthly bill.' },
];

const PITFALLS = [
  {
    icon: Wallet,
    title: 'Costs nobody warns you about',
    text: 'Ground classes, exam fees, reattempts, conversion, type rating. Students routinely spend lakhs more than they budgeted because they did not know what to ask.',
  },
  {
    icon: Building2,
    title: 'The wrong flight school',
    text: 'Not every school abroad converts smoothly to a DGCA licence. Pick the wrong one and you pay again in time, money and paperwork.',
  },
  {
    icon: Hourglass,
    title: 'A year lost to delays',
    text: 'Failed papers, visa waits and bad weather planning quietly add 12 to 18 months. Most of it is avoidable if you sequence your exams and training properly.',
  },
];

const REVIEWS = [
  {
    name: 'Aditya Menon',
    role: 'Preparing for CPL, Kochi',
    text: 'I had failed Navigation twice before this. He sat with me and worked out exactly where I was losing marks instead of making me redo the whole syllabus. Cleared it with 88 the next attempt.',
  },
  {
    name: 'Ishita Rao',
    role: 'Student pilot, Bengaluru',
    text: 'What I really wanted was a mentor, not another coaching class. He is genuinely knowledgeable and answers even the small doubts I felt silly asking anywhere else.',
  },
  {
    name: 'Harshit Sabharwal',
    role: 'Converting an FAA licence, Delhi',
    text: 'It is so difficult to find people in this industry who will actually talk to you honestly about money and timelines. One call saved me from picking a school that would have cost me a year.',
  },
  {
    name: 'Nandini Pillai',
    role: 'Cleared four papers, Chennai',
    text: 'The notes are the best I have used. Everything is in the exam language, so you are not translating a textbook in your head while the clock runs.',
  },
  {
    name: 'Rohan Deshmukh',
    role: 'CPL aspirant, Pune',
    text: 'He cleared every doubt I had in one sitting, and then followed up on WhatsApp when I got stuck again. You can tell he actually remembers what this phase feels like.',
  },
  {
    name: 'Simran Kaur',
    role: 'Ground school student, Amritsar',
    text: 'I paid a lot for classes earlier where nobody knew my name. Here the plan was made for me, and someone notices when I fall behind. That is the whole difference.',
  },
];

const FAQS = [
  { q: 'Which exams does this prepare me for?', a: 'All six DGCA CPL ground subjects: Air Navigation, Aviation Meteorology, Air Regulations, Technical General, Technical Specific and Radio Telephony (RTR). You need at least 70% in each paper to pass.' },
  { q: 'How long does it take to finish?', a: 'Most students complete all six subjects in 3 to 5 months studying an hour or two a day. You can go faster or slower.' },
  { q: 'Do I get access forever?', a: 'Yes. One payment gives you lifetime access to every lesson, note and mock exam, plus future updates.' },
];

function LandingPage({ setAuthMode }) {
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
            <a href="#why" className="transition hover:text-ink">Why SkyMaster</a>
            <a href="#reviews" className="transition hover:text-ink">Reviews</a>
            <a href="#pricing" className="transition hover:text-ink">Pricing</a>
            <a href="#faq" className="transition hover:text-ink">FAQ</a>
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            <button onClick={() => setAuthMode('login')} className="rounded-full px-4 py-2 font-semibold text-ink transition hover:bg-mist">
              Log in
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
            {[['#subjects', 'Subjects'], ['#about', 'About'], ['#why', 'Why SkyMaster'], ['#reviews', 'Reviews'], ['#pricing', 'Pricing'], ['#faq', 'FAQ']].map(([href, label]) => (
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
              Short video lessons, clear notes and real exam-style questions from an instructor who has flown the line.
              Follow the plan, track your marks, and walk into the exam ready.
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
            <p className="mt-4 text-lg text-muted">Everything the DGCA CPL ground papers cover, split into short lessons you can finish in a sitting. You need 70% in each paper to pass.</p>
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
                I earned my Commercial Pilot Licence at SkyDuo Aviation Academy in Miami. Before that, I was facing the same
                six DGCA papers you are, trying to work out who to learn from.
              </p>
              <p>
                I struggled to find the right coaching and the right mentor. Even after paying for very expensive classes, I
                ended up figuring most of it out on my own.
              </p>
              <p>
                I went on to score 90+ in every subject. Some papers took me more than one attempt, and each retake taught me
                exactly where students lose marks. I have built all of that into these lessons so you can clear every paper
                on your first attempt.
              </p>
              <p>
                SkyMaster is what I wish I had then. The notes are the ones I built and refined while studying, and the
                lessons draw on what I have learned flying, not just what is in the textbook. My job is to get you into your
                dream flying school and the life that comes after it.
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
              <h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Why students choose SkyMaster</h2>
              <p className="mt-5 text-lg leading-relaxed text-muted">
                Good coaching should not cost a fortune or leave you piecing things together alone. Here is what you get instead.
              </p>
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

      {/* What goes wrong */}
      <section className="bg-night py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              What actually costs students their licence
            </h2>
            <p className="mt-4 text-lg text-blue-100/75">
              Flying is the easy part. Most people lose money and years to decisions made before they ever reach a cockpit.
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

      {/* Reviews */}
      <section id="reviews" className="scroll-mt-20 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">What students say</h2>
            <p className="mt-4 text-lg text-muted">From people who were sitting exactly where you are.</p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {REVIEWS.map((r) => (
              <figure key={r.name} className="flex h-full flex-col rounded-2xl bg-mist p-6">
                <Quote className="h-6 w-6 text-brand/40" />
                <blockquote className="mt-4 flex-1 leading-relaxed text-ink">{r.text}</blockquote>
                <figcaption className="mt-6 border-t border-line pt-4">
                  <span className="block font-bold text-ink">{r.name}</span>
                  <span className="block text-sm text-muted">{r.role}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-20 bg-mist py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Two ways to work with me</h2>
            <p className="mt-4 text-lg text-muted">Start with a call if you have decisions to make. Take the course if you have exams to clear.</p>
          </div>

          <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
            {/* Consultation */}
            <div className={`${card} flex flex-col p-8`}>
              <p className="font-bold text-ink">1-on-1 consultation</p>
              <p className="mt-1 text-sm text-muted">For choosing a school, a country, or your next step</p>
              <p className="mt-6 text-4xl font-extrabold tracking-tight text-ink">₹1,999</p>
              <p className="mt-1 text-sm text-muted">45 minutes, one session</p>
              <ul className="mt-7 flex-1 space-y-3 text-[15px]">
                {[
                  '45 minutes 1-on-1 on Google Meet',
                  'Open Q&A for all your doubts',
                  'A study and career plan made for you',
                  'Honest answers on costs and timelines',
                  'Session recording available as an add-on',
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
              <p className="mt-1 text-sm text-muted">Everything you need for all six DGCA papers</p>
              <p className="mt-6 text-4xl font-extrabold tracking-tight text-ink">₹4,999</p>
              <p className="mt-1 text-sm text-muted">One-time payment, lifetime access</p>
              <ul className="mt-7 flex-1 space-y-3 text-[15px]">
                {[
                  'Complete notes for all six subjects',
                  '2000+ genuine practice questions',
                  'Topic tests and full mock exams',
                  'Study material and video lessons',
                  'Progress and marks tracking',
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
          <p>&copy; {new Date().getFullYear()} SkyMaster Ground School. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
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
      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="text-sm text-muted">or use your email</span>
        <span className="h-px flex-1 bg-line" />
      </div>
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
          <p className="text-3xl font-extrabold leading-tight">Every lesson you need for the CPL ground papers, in the order you need them.</p>
          <p className="mt-4 text-blue-100/70">Video lessons, notes, quizzes and mock exams in one place.</p>
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

// ============= LOGIN PAGE =============
function LoginPage({ setAuthMode, onLogin, onGoogleUser }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isAdminLogin, setIsAdminLogin] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Enter your email and password to log in.');
      return;
    }
    onLogin(email, password, isAdminLogin);
  };

  return (
    <AuthLayout
      setAuthMode={setAuthMode}
      title={isAdminLogin ? 'Instructor log in' : 'Welcome back'}
      subtitle={isAdminLogin ? 'Manage lessons, uploads and students.' : 'Log in to pick up where you left off.'}
    >
      {!isAdminLogin && <GoogleButton onGoogleUser={onGoogleUser} label="Continue with Google" />}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-ink">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} placeholder="you@email.com" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-ink">Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={input} placeholder="••••••••" />
        </div>
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        <button type="submit" className={`${btnPrimary} w-full`}>Log in</button>
      </form>

      <div className="mt-6 rounded-xl bg-mist p-4 text-center">
        <button onClick={() => setIsAdminLogin(!isAdminLogin)} className="text-sm font-semibold text-brand hover:text-brand-dark">
          {isAdminLogin ? 'Log in as a student instead' : 'Log in as the instructor'}
        </button>
        {isAdminLogin && <p className="mt-2 text-xs text-muted">Demo: admin@groundschool.com / admin123</p>}
      </div>

      <p className="mt-8 text-center text-sm text-muted">
        New here?{' '}
        <button onClick={() => setAuthMode('signup')} className="font-semibold text-brand hover:text-brand-dark">Create an account</button>
      </p>
    </AuthLayout>
  );
}

// ============= SIGNUP PAGE =============
function SignupPage({ setAuthMode, onSignup, onGoogleUser }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Fill in your name, email and password to continue.');
      return;
    }
    onSignup(email, password, false);
  };

  return (
    <AuthLayout setAuthMode={setAuthMode} title="Create your account" subtitle="Start your ground school prep in under a minute.">
      <GoogleButton onGoogleUser={onGoogleUser} label="Sign up with Google" />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-ink">Full name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={input} placeholder="Your name" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-ink">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} placeholder="you@email.com" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-ink">Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={input} placeholder="••••••••" />
        </div>
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        <button type="submit" className={`${btnPrimary} w-full`}>Create account</button>
      </form>
      <p className="mt-8 text-center text-sm text-muted">
        Already have an account?{' '}
        <button onClick={() => setAuthMode('login')} className="font-semibold text-brand hover:text-brand-dark">Log in</button>
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
function StudentDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [subjects] = useState([
    { id: 1, name: 'Air Navigation', progress: 75, quizzes: 8, totalMarks: 82, outOf: 100 },
    { id: 2, name: 'Aviation Meteorology', progress: 60, quizzes: 6, totalMarks: 74, outOf: 100 },
    { id: 3, name: 'Air Regulations', progress: 85, quizzes: 10, totalMarks: 88, outOf: 100 },
    { id: 4, name: 'Technical General', progress: 50, quizzes: 5, totalMarks: 71, outOf: 100 },
    { id: 5, name: 'Technical Specific', progress: 30, quizzes: 3, totalMarks: 65, outOf: 100 },
    { id: 6, name: 'Radio Telephony (RTR)', progress: 90, quizzes: 7, totalMarks: 91, outOf: 100 },
  ]);

  const [videos] = useState([
    { id: 1, title: 'Introduction to Air Law', subject: 'Air Regulations', duration: '45 mins', watched: true },
    { id: 2, title: 'Flight Rules and Procedures', subject: 'Air Regulations', duration: '38 mins', watched: true },
    { id: 3, title: 'Weather Systems', subject: 'Aviation Meteorology', duration: '52 mins', watched: false },
  ]);

  const marksObtained = subjects.reduce((sum, s) => sum + s.totalMarks, 0);
  const marksTotal = subjects.reduce((sum, s) => sum + s.outOf, 0);
  const overallPercentage = Math.round((marksObtained / marksTotal) * 100);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'courses', label: 'Courses', icon: BookOpen },
    { id: 'quizzes', label: 'Quizzes', icon: ListChecks },
    { id: 'videos', label: 'Videos', icon: Video },
    { id: 'marks', label: 'Marks', icon: BarChart3 },
  ];

  return (
    <AppShell title={user.email} subtitle="Welcome back" onLogout={onLogout} tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className={`${card} grid gap-6 p-6 sm:p-8 md:grid-cols-[auto_1fr] md:items-center md:gap-10`}>
            <div>
              <p className="text-sm font-medium text-muted">Overall marks</p>
              <p className="text-5xl font-extrabold tracking-tight text-ink">{overallPercentage}%</p>
            </div>
            <div>
              <ProgressBar value={overallPercentage} height="h-3" />
              <p className="mt-2 text-sm text-muted">{marksObtained} of {marksTotal} marks across all six subjects</p>
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
                    <span className="text-muted">Progress</span>
                    <span className="font-semibold text-ink">{subject.progress}%</span>
                  </div>
                  <ProgressBar value={subject.progress} />
                  <div className="mt-4 flex justify-between border-t border-line pt-4 text-sm text-muted">
                    <span>{subject.quizzes} quizzes done</span>
                    <span className="font-semibold text-ink">{subject.totalMarks}/{subject.outOf}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'videos' && (
        <div className="space-y-3">
          <h2 className="mb-4 text-lg font-bold text-ink">Video lessons</h2>
          {videos.map((video) => (
            <div key={video.id} className={`${card} flex flex-wrap items-center gap-4 p-5`}>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky text-brand">
                <PlayCircle className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-ink">{video.title}</p>
                <p className="text-sm text-muted">{video.subject} · {video.duration}</p>
              </div>
              {video.watched && (
                <span className="inline-flex items-center gap-1 rounded-full bg-go/10 px-3 py-1 text-sm font-semibold text-go">
                  <Check className="h-4 w-4" /> Watched
                </span>
              )}
              <button className={`${video.watched ? btnGhost : btnPrimary} px-5 py-2 text-sm`}>
                {video.watched ? 'Rewatch' : 'Watch'}
              </button>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'quizzes' && (
        <div className="space-y-4">
          <h2 className="mb-4 text-lg font-bold text-ink">Quizzes</h2>
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
      )}

      {activeTab === 'marks' && (
        <div className="space-y-4">
          <h2 className="mb-4 text-lg font-bold text-ink">Your marks</h2>
          {subjects.map((subject) => {
            const pct = Math.round((subject.totalMarks / subject.outOf) * 100);
            return (
              <div key={subject.id} className={`${card} flex items-center gap-6 p-6`}>
                <div className="flex-1">
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-bold text-ink">{subject.name}</span>
                    <span className="text-muted">{subject.totalMarks}/{subject.outOf}</span>
                  </div>
                  <ProgressBar value={pct} color="bg-go" height="h-2.5" />
                </div>
                <p className="w-16 text-right text-2xl font-extrabold text-ink">{pct}%</p>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'courses' && (
        <div className={`${card} p-12 text-center`}>
          <BookOpen className="mx-auto h-10 w-10 text-brand" />
          <p className="mt-4 font-bold text-ink">Course materials are on their way</p>
          <p className="mt-1 text-muted">Meanwhile, start with the video lessons or a quiz.</p>
          <button onClick={() => setActiveTab('videos')} className={`${btnPrimary} mt-6`}>Go to video lessons</button>
        </div>
      )}
    </AppShell>
  );
}

// ============= ADMIN PORTAL =============
function AdminPortal({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [uploads, setUploads] = useState([
    { id: 1, name: 'Introduction to Air Law.mp4', size: '2.4 GB', subject: 'Air Regulations', date: '2024-01-15', type: 'video' },
    { id: 2, name: 'Navigation Notes.pdf', size: '5.2 MB', subject: 'Air Navigation', date: '2024-01-10', type: 'pdf' },
  ]);

  const [students] = useState([
    { id: 1, name: 'Raj Kumar', email: 'raj@email.com', joinDate: '2024-01-01', progress: 75 },
    { id: 2, name: 'Priya Singh', email: 'priya@email.com', joinDate: '2024-01-05', progress: 60 },
    { id: 3, name: 'Vikram Patel', email: 'vikram@email.com', joinDate: '2024-01-08', progress: 85 },
  ]);

  const handleDelete = (id) => {
    setUploads(uploads.filter(upload => upload.id !== id));
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'upload', label: 'Upload content', icon: Upload },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <AppShell title="Instructor portal" subtitle={user.email} onLogout={onLogout} tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { label: 'Total students', value: '247' },
              { label: 'Total uploads', value: '48' },
              { label: 'Average progress', value: '72%' },
              { label: 'New this month', value: '23' },
            ].map((stat) => (
              <div key={stat.label} className={`${card} p-5`}>
                <p className="text-sm text-muted">{stat.label}</p>
                <p className="mt-1 text-3xl font-extrabold tracking-tight text-ink">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className={`${card} p-6`}>
            <h2 className="mb-4 flex items-center gap-2 font-bold text-ink">
              <FileText className="h-5 w-5 text-brand" /> Recent uploads
            </h2>
            <div className="divide-y divide-line">
              {uploads.slice(0, 3).map((upload) => (
                <div key={upload.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-semibold text-ink">{upload.name}</p>
                    <p className="text-sm text-muted">{upload.subject} · {upload.size}</p>
                  </div>
                  <p className="text-sm text-muted">{upload.date}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'upload' && (
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div className={`${card} p-6 sm:p-8`}>
            <h2 className="mb-6 text-lg font-bold text-ink">Upload course content</h2>
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
                  <label className="mb-1.5 block text-sm font-semibold text-ink">Content type</label>
                  <select className={input}>
                    <option>Select type</option>
                    <option>Video Lecture</option>
                    <option>Study Notes</option>
                    <option>Practice Questions</option>
                    <option>Mock Paper</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-ink">Title</label>
                <input type="text" placeholder="e.g. Introduction to Air Law" className={input} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-ink">File</label>
                <div className="cursor-pointer rounded-2xl border-2 border-dashed border-line bg-mist p-8 text-center transition hover:border-brand hover:bg-sky">
                  <Upload className="mx-auto mb-2 h-7 w-7 text-brand" />
                  <p className="font-semibold text-ink">Click to upload or drag a file here</p>
                  <p className="text-sm text-muted">MP4, PDF, ZIP and other files</p>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-ink">Description (optional)</label>
                <textarea rows="3" placeholder="Anything students should know about this file" className={input}></textarea>
              </div>
              <button type="submit" className={`${btnPrimary} w-full`}>
                <Upload className="h-4 w-4" /> Upload content
              </button>
            </form>
          </div>

          <div className={`${card} h-fit p-6`}>
            <h2 className="mb-4 font-bold text-ink">Your uploads</h2>
            <div className="space-y-2">
              {uploads.map((upload) => (
                <div key={upload.id} className="flex items-center gap-3 rounded-xl bg-mist p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">{upload.name}</p>
                    <p className="text-sm text-muted">{upload.size} · {upload.date}</p>
                  </div>
                  <button className="rounded-lg p-2 text-muted transition hover:bg-white hover:text-brand" aria-label="View">
                    <Eye className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(upload.id)} className="rounded-lg p-2 text-muted transition hover:bg-white hover:text-red-600" aria-label="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {uploads.length === 0 && <p className="text-sm text-muted">No uploads yet. Add your first file with the form.</p>}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'students' && (
        <div className={`${card} overflow-hidden`}>
          <div className="border-b border-line p-6">
            <h2 className="font-bold text-ink">Enrolled students ({students.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-mist text-left text-muted">
                <tr>
                  <th className="px-6 py-3 font-semibold">Name</th>
                  <th className="px-6 py-3 font-semibold">Email</th>
                  <th className="px-6 py-3 font-semibold">Joined</th>
                  <th className="px-6 py-3 font-semibold">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {students.map((student) => (
                  <tr key={student.id} className="transition hover:bg-mist/60">
                    <td className="px-6 py-4 font-semibold text-ink">{student.name}</td>
                    <td className="px-6 py-4 text-muted">{student.email}</td>
                    <td className="px-6 py-4 text-muted">{student.joinDate}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-28"><ProgressBar value={student.progress} color="bg-go" /></div>
                        <span className="font-semibold text-ink">{student.progress}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className={`${card} p-6`}>
            <h2 className="mb-4 font-bold text-ink">Enrollment over time</h2>
            <div className="flex h-64 items-center justify-center rounded-xl bg-mist text-sm text-muted">
              Enrollment chart appears here once real data is connected
            </div>
          </div>
          <div className={`${card} p-6`}>
            <h2 className="mb-4 font-bold text-ink">Average marks by subject</h2>
            <div className="space-y-5">
              {SUBJECTS.map(({ name: subject }, i) => (
                <div key={subject}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="text-ink">{subject}</span>
                    <span className="font-semibold text-ink">{70 + i * 5}%</span>
                  </div>
                  <ProgressBar value={70 + i * 5} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
