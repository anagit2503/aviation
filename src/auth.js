// Google sign-in through Firebase Authentication.
//
// The Firebase keys come from environment variables so they can be set in Vercel
// without touching the code. Until they are set, googleReady is false and the
// login pages explain that Google sign-in is not connected yet.
const env = import.meta.env;

const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
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
