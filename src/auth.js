// Google sign-in through Firebase Authentication.
//
// The project's own Firebase config is below; Vercel environment variables can
// override it without a code change.
const env = import.meta.env;

// Firebase web config is public by design: it ships inside the page either way.
// What actually protects the project is the Authorized domains list and the
// sign-in providers you switch on in the Firebase console.
// Setting the VITE_FIREBASE_* variables in Vercel overrides anything here.
const config = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyCoajtzxGIQdvx1zWPZY-cPtQ7LVhFjYT0',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'flywithsam-46790.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'flywithsam-46790',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'flywithsam-46790.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '387256125481',
  appId: env.VITE_FIREBASE_APP_ID || '1:387256125481:web:93abff13d01b8afe517438',
};

export const googleReady = Boolean(config.apiKey && config.authDomain && config.appId);

// Firebase is loaded only when someone actually clicks the button, so it never
// slows down the first page load.
export async function signInWithGoogle() {
  if (!googleReady) {
    throw new Error('Google sign-in is not connected yet.');
  }

  const { initializeApp, getApps, getApp } = await import('firebase/app');
  const { getAuth, GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');

  const app = getApps().length ? getApp() : initializeApp(config);
  const auth = getAuth(app);
  auth.useDeviceLanguage();

  try {
    const result = await signInWithPopup(auth, new GoogleAuthProvider());
    return {
      idToken: await result.user.getIdToken(),
      email: result.user.email,
      name: result.user.displayName || '',
      photo: result.user.photoURL || '',
      uid: result.user.uid,
    };
  } catch (err) {
    // The person closed the popup; not worth an error message.
    if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
      return null;
    }
    console.error('Google sign-in failed:', err?.code, err?.message);
    const messages = {
      'auth/configuration-not-found':
        'Google sign-in is not switched on in Firebase yet (Authentication → Get started → Google).',
      'auth/operation-not-allowed':
        'Google sign-in is not switched on in Firebase yet (Authentication → Sign-in method → Google).',
      'auth/unauthorized-domain':
        'This website is not in the Firebase authorized domains list yet.',
      'auth/popup-blocked':
        'Your browser blocked the Google window. Allow pop-ups for this site and try again.',
      'auth/network-request-failed':
        'No connection to Google. Check your internet and try again.',
    };
    throw new Error(messages[err?.code] || `Google sign-in failed (${err?.code || 'unknown error'}).`);
  }
}

// Keeps people signed in across refreshes. Firebase stores the session in the
// browser; this reads it back on page load and hands over a fresh token.
export async function watchGoogleUser(onUser) {
  if (!googleReady) {
    onUser(null);
    return () => {};
  }
  try {
    const { initializeApp, getApps, getApp } = await import('firebase/app');
    const { getAuth, onAuthStateChanged } = await import('firebase/auth');
    const app = getApps().length ? getApp() : initializeApp(config);
    const auth = getAuth(app);
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        onUser(null);
        return;
      }
      onUser({
        idToken: await user.getIdToken(),
        email: user.email,
        name: user.displayName || '',
        photo: user.photoURL || '',
        uid: user.uid,
      });
    });
  } catch {
    onUser(null);
    return () => {};
  }
}

export async function signOutGoogle() {
  if (!googleReady) return;
  try {
    const { getApps, getApp } = await import('firebase/app');
    if (!getApps().length) return;
    const { getAuth, signOut } = await import('firebase/auth');
    await signOut(getAuth(getApp()));
  } catch {
    // already signed out; nothing to do
  }
}
