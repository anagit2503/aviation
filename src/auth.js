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
      email: result.user.email,
      name: result.user.displayName || '',
      photo: result.user.photoURL || '',
      uid: result.user.uid,
    };
  } catch (err) {
    if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
      return null; // the person changed their mind; not an error worth showing
    }
    if (err?.code === 'auth/unauthorized-domain') {
      throw new Error('This website is not allowed in your Firebase settings yet.');
    }
    throw new Error('Google sign-in did not work. Please try again.');
  }
}
