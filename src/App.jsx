import React, { useState, useEffect } from 'react';
import { Menu, X, LogOut, Upload, Trash2, Eye, BarChart3, BookOpen, Users, FileText } from 'lucide-react';

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

// ============= MAIN APP =============
export default function AviationGroundSchool() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [authMode, setAuthMode] = useState('landing'); // landing, login, signup

  // Simulated login for demo
  const handleLogin = (email, password, isAdminLogin) => {
    if (isAdminLogin && email === 'admin@groundschool.com' && password === 'admin123') {
      setUser({ email, role: 'admin' });
      setIsAdmin(true);
      setAuthMode('admin');
    } else if (!isAdminLogin && email && password) {
      setUser({ email, role: 'student' });
      setIsAdmin(false);
      setAuthMode('dashboard');
    }
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
          {authMode === 'login' && <LoginPage setAuthMode={setAuthMode} onLogin={handleLogin} />}
          {authMode === 'signup' && <SignupPage setAuthMode={setAuthMode} onSignup={handleLogin} />}
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
function LandingPage({ setAuthMode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-blue-800/30 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-amber-400 rounded-lg flex items-center justify-center font-bold text-slate-900">
                ✈
              </div>
              <h1 className="text-xl font-bold text-white hidden sm:inline">SkyMaster Ground School</h1>
              <h1 className="text-lg font-bold text-white sm:hidden">SkyMaster</h1>
            </div>
            <div className="hidden md:flex gap-6">
              <a href="#about" className="text-blue-200 hover:text-white transition">About</a>
              <a href="#courses" className="text-blue-200 hover:text-white transition">Courses</a>
              <a href="#why" className="text-blue-200 hover:text-white transition">Why Us</a>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setAuthMode('login')}
                className="px-4 py-2 text-blue-200 hover:text-white transition"
              >
                Login
              </button>
              <button
                onClick={() => setAuthMode('signup')}
                className="px-4 py-2 bg-amber-400 text-slate-900 rounded-lg font-semibold hover:bg-amber-300 transition"
              >
                Join Now
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h2 className="text-5xl sm:text-6xl font-bold text-white mb-6 leading-tight">
            Master Your Ground School <span className="text-amber-400">with Confidence</span>
          </h2>
          <p className="text-xl text-blue-200 mb-8 max-w-2xl mx-auto">
            Comprehensive CPL ground school preparation from an experienced instructor. Structured lessons, practice quizzes, and real exam questions to get you ready.
          </p>
          <button
            onClick={() => setAuthMode('signup')}
            className="px-8 py-4 bg-amber-400 text-slate-900 rounded-lg font-bold text-lg hover:bg-amber-300 transition inline-block"
          >
            Start Learning Today
          </button>
        </div>
      </section>

      {/* About Founder */}
      <section id="about" className="bg-slate-800/50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-4xl font-bold text-white mb-12 text-center">About Your Instructor</h3>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg h-80 flex items-center justify-center text-8xl">
              👨‍✈️
            </div>
            <div>
              <h4 className="text-2xl font-bold text-white mb-4">Commercial Pilot License Holder</h4>
              <p className="text-blue-200 mb-4 leading-relaxed">
                With years of flying experience and a passion for education, I've created the most comprehensive ground school program available. Every lesson is designed from real exam questions and practical knowledge.
              </p>
              <p className="text-blue-200 mb-4 leading-relaxed">
                I know exactly what you need to pass—because I've been there myself, and I've helped hundreds of students achieve their aviation dreams.
              </p>
              <div className="grid grid-cols-2 gap-4 mt-8">
                <div className="bg-blue-900/50 p-4 rounded-lg border border-blue-700">
                  <p className="text-amber-400 font-bold text-2xl">500+</p>
                  <p className="text-blue-200 text-sm">Students Trained</p>
                </div>
                <div className="bg-blue-900/50 p-4 rounded-lg border border-blue-700">
                  <p className="text-amber-400 font-bold text-2xl">95%</p>
                  <p className="text-blue-200 text-sm">Pass Rate</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Courses */}
      <section id="courses" className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-4xl font-bold text-white mb-12 text-center">What You'll Learn</h3>
          <div className="grid md:grid-cols-3 gap-8">
            {['Air Law & Procedure', 'Navigation & Meteorology', 'Aircraft Technical Knowledge'].map((course) => (
              <div key={course} className="bg-blue-900/30 border border-blue-700 p-8 rounded-lg hover:border-amber-400 transition">
                <BookOpen className="w-12 h-12 text-amber-400 mb-4" />
                <h4 className="text-xl font-bold text-white mb-3">{course}</h4>
                <p className="text-blue-200 mb-4">Comprehensive modules with video lessons, detailed notes, and practice questions.</p>
                <ul className="text-blue-300 text-sm space-y-2">
                  <li>✓ Video lectures</li>
                  <li>✓ Study notes</li>
                  <li>✓ Quiz questions</li>
                  <li>✓ Mock exams</li>
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Us */}
      <section id="why" className="bg-slate-800/50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-4xl font-bold text-white mb-12 text-center">Why Choose Us</h3>
          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-amber-400/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-amber-400 font-bold">✓</span>
                </div>
                <div>
                  <h4 className="text-white font-bold text-lg">From a Real Pilot</h4>
                  <p className="text-blue-200">Taught by someone who's actually flown commercial aircraft</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-amber-400/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-amber-400 font-bold">✓</span>
                </div>
                <div>
                  <h4 className="text-white font-bold text-lg">Track Your Progress</h4>
                  <p className="text-blue-200">Real-time marks and performance analytics</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-amber-400/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-amber-400 font-bold">✓</span>
                </div>
                <div>
                  <h4 className="text-white font-bold text-lg">Learn at Your Pace</h4>
                  <p className="text-blue-200">Access recorded lectures anytime, anywhere</p>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-amber-400/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-amber-400 font-bold">✓</span>
                </div>
                <div>
                  <h4 className="text-white font-bold text-lg">Practice Like You'll Test</h4>
                  <p className="text-blue-200">Real exam questions and full mock papers</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-amber-400/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-amber-400 font-bold">✓</span>
                </div>
                <div>
                  <h4 className="text-white font-bold text-lg">Lifetime Access</h4>
                  <p className="text-blue-200">Once you join, all materials are yours forever</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-amber-400/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-amber-400 font-bold">✓</span>
                </div>
                <div>
                  <h4 className="text-white font-bold text-lg">Affordable Pricing</h4>
                  <p className="text-blue-200">Best value ground school program in India</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-4xl font-bold text-white mb-12 text-center">Simple, Transparent Pricing</h3>
          <div className="max-w-2xl mx-auto bg-blue-900/40 border border-blue-700 rounded-lg p-12 text-center">
            <p className="text-blue-300 mb-2">One-time payment</p>
            <p className="text-6xl font-bold text-amber-400 mb-4">₹4,999</p>
            <p className="text-blue-200 mb-8">Lifetime access to all materials and future updates</p>
            <button
              onClick={() => setAuthMode('signup')}
              className="px-8 py-4 bg-amber-400 text-slate-900 rounded-lg font-bold text-lg hover:bg-amber-300 transition inline-block"
            >
              Enroll Now
            </button>
            <p className="text-blue-300 text-sm mt-6">No credit card required • Money-back guarantee within 7 days</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-blue-800/30 bg-slate-900 py-8 text-center text-blue-300">
        <p>&copy; 2024 SkyMaster Ground School. All rights reserved.</p>
      </footer>
    </div>
  );
}

// ============= LOGIN PAGE =============
function LoginPage({ setAuthMode, onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isAdminLogin, setIsAdminLogin] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    onLogin(email, password, isAdminLogin);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-blue-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-800 border border-blue-700 rounded-lg p-8">
          <div className="text-center mb-8">
            <div className="inline-block w-16 h-16 bg-amber-400 rounded-lg flex items-center justify-center font-bold text-2xl text-slate-900 mb-4">
              ✈
            </div>
            <h2 className="text-2xl font-bold text-white">SkyMaster Ground School</h2>
            <p className="text-blue-300 mt-2">{isAdminLogin ? 'Instructor Login' : 'Student Login'}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-white text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-amber-400 focus:outline-none"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-white text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-amber-400 focus:outline-none"
                placeholder="••••••••"
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              type="submit"
              className="w-full py-2 bg-amber-400 text-slate-900 rounded-lg font-bold hover:bg-amber-300 transition"
            >
              Sign In
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-700">
            <button
              onClick={() => setIsAdminLogin(!isAdminLogin)}
              className="text-blue-300 text-sm hover:text-blue-200 transition w-full text-center"
            >
              {isAdminLogin ? 'Student login?' : 'Instructor login?'}
            </button>
            {isAdminLogin && (
              <p className="text-blue-300 text-xs mt-2 text-center">
                Demo: admin@groundschool.com / admin123
              </p>
            )}
          </div>

          <div className="mt-6 text-center">
            <p className="text-blue-300 text-sm">
              Don't have an account?{' '}
              <button
                onClick={() => setAuthMode('signup')}
                className="text-amber-400 hover:text-amber-300 font-semibold transition"
              >
                Sign up
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============= SIGNUP PAGE =============
function SignupPage({ setAuthMode, onSignup }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Please fill in all fields');
      return;
    }
    onSignup(email, password, false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-blue-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-800 border border-blue-700 rounded-lg p-8">
          <div className="text-center mb-8">
            <div className="inline-block w-16 h-16 bg-amber-400 rounded-lg flex items-center justify-center font-bold text-2xl text-slate-900 mb-4">
              ✈
            </div>
            <h2 className="text-2xl font-bold text-white">Join SkyMaster</h2>
            <p className="text-blue-300 mt-2">Start your ground school journey</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-white text-sm font-medium mb-2">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-amber-400 focus:outline-none"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-white text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-amber-400 focus:outline-none"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-white text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-amber-400 focus:outline-none"
                placeholder="••••••••"
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              type="submit"
              className="w-full py-2 bg-amber-400 text-slate-900 rounded-lg font-bold hover:bg-amber-300 transition"
            >
              Create Account
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-blue-300 text-sm">
              Already have an account?{' '}
              <button
                onClick={() => setAuthMode('login')}
                className="text-amber-400 hover:text-amber-300 font-semibold transition"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============= STUDENT DASHBOARD =============
function StudentDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [subjects] = useState([
    { id: 1, name: 'Air Law & Procedure', progress: 75, quizzes: 8, totalMarks: 650, outOf: 800 },
    { id: 2, name: 'Navigation & Meteorology', progress: 60, quizzes: 6, totalMarks: 480, outOf: 800 },
    { id: 3, name: 'Aircraft Technical', progress: 85, quizzes: 10, totalMarks: 720, outOf: 800 },
  ]);

  const [videos] = useState([
    { id: 1, title: 'Introduction to Air Law', subject: 'Air Law & Procedure', duration: '45 mins', watched: true },
    { id: 2, title: 'Flight Rules and Procedures', subject: 'Air Law & Procedure', duration: '38 mins', watched: true },
    { id: 3, title: 'Weather Systems', subject: 'Navigation & Meteorology', duration: '52 mins', watched: false },
  ]);

  const overallPercentage = Math.round((1850 / 2400) * 100);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-400 rounded-lg flex items-center justify-center font-bold text-slate-900">
              ✈
            </div>
            <h1 className="text-2xl font-bold text-slate-900">SkyMaster</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-slate-600">Welcome back</p>
              <p className="font-semibold text-slate-900">{user.email}</p>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-slate-200 overflow-x-auto pb-4">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'courses', label: 'Courses', icon: '📚' },
            { id: 'quizzes', label: 'Quizzes', icon: '✏️' },
            { id: 'videos', label: 'Videos', icon: '🎥' },
            { id: 'marks', label: 'Marks', icon: '📈' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 font-medium whitespace-nowrap transition ${
                activeTab === tab.id
                  ? 'text-amber-600 border-b-2 border-amber-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Overall Progress */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg p-8 text-white">
              <h2 className="text-2xl font-bold mb-4">Your Progress</h2>
              <div className="flex items-center gap-8">
                <div>
                  <p className="text-6xl font-bold text-amber-400">{overallPercentage}%</p>
                  <p className="text-blue-200 text-lg">Overall Completion</p>
                </div>
                <div className="flex-1">
                  <div className="bg-blue-900/50 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-amber-400 h-full transition-all"
                      style={{ width: `${overallPercentage}%` }}
                    ></div>
                  </div>
                  <p className="text-blue-200 text-sm mt-2">1850 / 2400 marks obtained</p>
                </div>
              </div>
            </div>

            {/* Subject Cards */}
            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">Your Subjects</h3>
              <div className="grid md:grid-cols-3 gap-6">
                {subjects.map(subject => (
                  <div key={subject.id} className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-lg transition">
                    <h4 className="font-bold text-slate-900 mb-4">{subject.name}</h4>
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-slate-600 mb-2">
                        <span>Progress</span>
                        <span>{subject.progress}%</span>
                      </div>
                      <div className="bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-blue-600 h-full transition-all"
                          style={{ width: `${subject.progress}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm text-slate-600">
                      <p>📝 {subject.quizzes} quizzes attempted</p>
                      <p>✓ {subject.totalMarks}/{subject.outOf} marks</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Videos Tab */}
        {activeTab === 'videos' && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Video Lectures</h3>
            {videos.map(video => (
              <div key={video.id} className="bg-white rounded-lg border border-slate-200 p-6 flex items-center justify-between hover:shadow-lg transition">
                <div className="flex-1">
                  <h4 className="font-bold text-slate-900">{video.title}</h4>
                  <p className="text-slate-600 text-sm">{video.subject} • {video.duration}</p>
                </div>
                <div className="flex items-center gap-4">
                  {video.watched && <span className="text-green-600 font-semibold">✓ Watched</span>}
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                    Watch
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quizzes Tab */}
        {activeTab === 'quizzes' && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Available Quizzes</h3>
            {subjects.map(subject => (
              <div key={subject.id} className="bg-white rounded-lg border border-slate-200 p-6">
                <h4 className="font-bold text-slate-900 mb-4">{subject.name}</h4>
                <div className="grid sm:grid-cols-4 gap-3">
                  {[1, 2, 3, 4].map(quiz => (
                    <button
                      key={quiz}
                      className="p-4 border border-slate-300 rounded-lg hover:border-blue-600 hover:bg-blue-50 transition text-center"
                    >
                      <p className="font-bold text-slate-900">Quiz {quiz}</p>
                      <p className="text-sm text-slate-600">10 questions</p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Marks Tab */}
        {activeTab === 'marks' && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Your Marks</h3>
            {subjects.map(subject => (
              <div key={subject.id} className="bg-white rounded-lg border border-slate-200 p-6">
                <h4 className="font-bold text-slate-900 mb-4">{subject.name}</h4>
                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm text-slate-600 mb-2">
                      <span>Score</span>
                      <span className="font-bold text-slate-900">{subject.totalMarks}/{subject.outOf}</span>
                    </div>
                    <div className="bg-slate-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-green-600 h-full transition-all"
                        style={{ width: `${(subject.totalMarks / subject.outOf) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{Math.round((subject.totalMarks / subject.outOf) * 100)}%</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Courses & Practice Papers Tabs */}
        {['courses', 'marks'].includes(activeTab) === false && !['overview', 'videos', 'quizzes', 'marks'].includes(activeTab) && (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <p className="text-slate-600">Content coming soon</p>
          </div>
        )}
      </main>
    </div>
  );
}

// ============= ADMIN PORTAL =============
function AdminPortal({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [uploads, setUploads] = useState([
    { id: 1, name: 'Introduction to Air Law.mp4', size: '2.4 GB', subject: 'Air Law & Procedure', date: '2024-01-15', type: 'video' },
    { id: 2, name: 'Navigation Notes.pdf', size: '5.2 MB', subject: 'Navigation & Meteorology', date: '2024-01-10', type: 'pdf' },
  ]);

  const [students] = useState([
    { id: 1, name: 'Raj Kumar', email: 'raj@email.com', joinDate: '2024-01-01', progress: 75 },
    { id: 2, name: 'Priya Singh', email: 'priya@email.com', joinDate: '2024-01-05', progress: 60 },
    { id: 3, name: 'Vikram Patel', email: 'vikram@email.com', joinDate: '2024-01-08', progress: 85 },
  ]);

  const handleDelete = (id) => {
    setUploads(uploads.filter(upload => upload.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-400 rounded-lg flex items-center justify-center font-bold text-slate-900">
              ✈
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">SkyMaster Admin</h1>
              <p className="text-xs text-slate-500">Instructor Portal</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-slate-200 overflow-x-auto pb-4">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: '📊' },
            { id: 'upload', label: 'Upload Content', icon: '📤' },
            { id: 'students', label: 'Students', icon: '👥' },
            { id: 'analytics', label: 'Analytics', icon: '📈' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 font-medium whitespace-nowrap transition ${
                activeTab === tab.id
                  ? 'text-amber-600 border-b-2 border-amber-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div className="grid md:grid-cols-4 gap-4">
              {[
                { label: 'Total Students', value: '247', icon: '👥' },
                { label: 'Total Uploads', value: '48', icon: '📁' },
                { label: 'Avg. Progress', value: '72%', icon: '📈' },
                { label: 'This Month', value: '23 new', icon: '📊' }
              ].map((stat, i) => (
                <div key={i} className="bg-white rounded-lg border border-slate-200 p-6">
                  <p className="text-slate-600 text-sm mb-2">{stat.label}</p>
                  <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" /> Recent Uploads
              </h3>
              <div className="space-y-3">
                {uploads.slice(0, 3).map(upload => (
                  <div key={upload.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{upload.name}</p>
                      <p className="text-sm text-slate-600">{upload.subject} • {upload.size}</p>
                    </div>
                    <p className="text-xs text-slate-500">{upload.date}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <div className="space-y-8">
            <div className="bg-white rounded-lg border border-slate-200 p-8">
              <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Upload className="w-6 h-6" /> Upload Course Content
              </h3>

              <form className="space-y-6">
                <div>
                  <label className="block text-slate-900 font-medium mb-2">Subject</label>
                  <select className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none">
                    <option>Select a subject</option>
                    <option>Air Law & Procedure</option>
                    <option>Navigation & Meteorology</option>
                    <option>Aircraft Technical Knowledge</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-900 font-medium mb-2">Content Type</label>
                  <select className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none">
                    <option>Select type</option>
                    <option>Video Lecture</option>
                    <option>Study Notes</option>
                    <option>Practice Questions</option>
                    <option>Mock Paper</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-900 font-medium mb-2">Title</label>
                  <input
                    type="text"
                    placeholder="e.g., Introduction to Air Law"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-900 font-medium mb-2">File Upload</label>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-600 transition cursor-pointer">
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-slate-900 font-medium">Click to upload or drag and drop</p>
                    <p className="text-sm text-slate-500">MP4, PDF, ZIP or other files</p>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-900 font-medium mb-2">Description (Optional)</label>
                  <textarea
                    rows="4"
                    placeholder="Add any additional notes or description"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" /> Upload Content
                </button>
              </form>
            </div>

            {/* Uploaded Content */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="font-bold text-slate-900 mb-4">Your Uploads</h3>
              <div className="space-y-3">
                {uploads.map(upload => (
                  <div key={upload.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{upload.name}</p>
                      <p className="text-sm text-slate-600">{upload.subject} • {upload.size} • {upload.date}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(upload.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5" /> Enrolled Students ({students.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Email</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Joined</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {students.map(student => (
                    <tr key={student.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 font-medium text-slate-900">{student.name}</td>
                      <td className="px-6 py-4 text-slate-600">{student.email}</td>
                      <td className="px-6 py-4 text-slate-600">{student.joinDate}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="bg-green-600 h-full"
                              style={{ width: `${student.progress}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-slate-900">{student.progress}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h3 className="font-bold text-slate-900 mb-4">Student Enrollment Trend</h3>
                <div className="h-64 bg-slate-50 rounded-lg flex items-center justify-center text-slate-500">
                  Chart placeholder - integrate with chart library
                </div>
              </div>
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h3 className="font-bold text-slate-900 mb-4">Subject Performance</h3>
                <div className="space-y-4">
                  {['Air Law & Procedure', 'Navigation & Meteorology', 'Aircraft Technical'].map((subject, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-900">{subject}</span>
                        <span className="font-medium text-slate-900">{70 + i * 5}%</span>
                      </div>
                      <div className="bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-blue-600 h-full"
                          style={{ width: `${70 + i * 5}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}