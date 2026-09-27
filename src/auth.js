// Google sign-in through Firebase Authentication.
//
// The project's own Firebase config is below; Vercel environment variables can
// override it without a code change.
const env = import.meta.env;

// Firebase web config is public by design: it ships inside the page either way.
// What actually protects the project is the Authorized domains list and the
// sign-in providers you switch on in the Firebase console.
// Setting the VITE_FIREBASE_* variables in Vercel overrides anything here.
// Phone browsers (iPhone Safari especially) block sign-in when Google's step
// runs on another address (firebaseapp.com). vercel.json passes /__/auth
// through this site, so sign-in can run on the site's own address instead.
// Turn on only after https://aviation-psi.vercel.app/__/auth/handler is added
// to the OAuth client's "Authorized redirect URIs" in Google Cloud Console;
// before that, Google would refuse the sign-in everywhere.
const SIGN_IN_ON_OWN_ADDRESS = false;
// Only phones and tablets use it; computers keep signing in exactly as before.
const onPhone = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
const ownAddress = typeof window !== 'undefined' && onPhone && window.location.hostname === 'aviation-psi.vercel.app'
  ? window.location.host : null;

const config = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyCoajtzxGIQdvx1zWPZY-cPtQ7LVhFjYT0',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || (SIGN_IN_ON_OWN_ADDRESS && ownAddress) || 'flywithsam-46790.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'flywithsam-46790',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'flywithsam-46790.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '387256125481',
  appId: env.VITE_FIREBASE_APP_ID || '1:387256125481:web:93abff13d01b8afe517438',
};

export const googleReady = Boolean(config.apiKey && config.authDomain && config.appId);

// Phones only allow the Google window to open straight away on a tap. So the
// sign-in code is loaded in the background when the sign-in page opens
// (prepareGoogle), and the tap then opens the window with nothing to wait for.
let loading = null;
let ready = null; // set once loaded, so a tap can use it without waiting
export function prepareGoogle() {
  if (!googleReady) return Promise.resolve(null);
  loading ??= Promise.all([import('firebase/app'), import('firebase/auth')]).then(([appMod, authMod]) => {
    const app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(config);
    const auth = authMod.getAuth(app);
    auth.useDeviceLanguage();
    ready = { auth, ...authMod };
    return ready;
  });
  return loading;
}

// Google refuses sign-in inside apps' built-in browsers (WhatsApp, Instagram,
// Facebook, LinkedIn…), so those visitors are asked to open a real browser.
export function inAppBrowser() {
  const ua = navigator.userAgent || '';
  if (/WhatsApp/i.test(ua)) return 'WhatsApp';
  if (/Instagram/i.test(ua)) return 'Instagram';
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return 'Facebook';
  if (/LinkedInApp/i.test(ua)) return 'LinkedIn';
  if (/Snapchat/i.test(ua)) return 'Snapchat';
  if (/Line\//i.test(ua)) return 'LINE';
  if (/; wv\)/.test(ua)) return 'this app';
  return null;
}

export async function signInWithGoogle() {
  if (!googleReady) {
    throw new Error('Google sign-in is not connected yet.');
  }

  // If the code is already loaded, open the window right now, inside the tap.
  const { auth, GoogleAuthProvider, signInWithPopup, signInWithRedirect } = ready || await prepareGoogle();
  const popup = signInWithPopup(auth, new GoogleAuthProvider());

  try {
    const result = await popup;
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
    // The Google window was blocked. Do NOT fall back to a redirect: phone
    // browsers break redirect sign-in when Google's step runs on another
    // address ("missing initial state"). Only use it once sign-in runs on this
    // site's own address (see SIGN_IN_ON_OWN_ADDRESS), where it works.
    if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment'].includes(err?.code)) {
      if (SIGN_IN_ON_OWN_ADDRESS && ownAddress) {
        await signInWithRedirect(auth, new GoogleAuthProvider());
        return null;
      }
      throw new Error('Your phone blocked the Google sign-in window. Please tap the button again. If it keeps happening, allow pop-ups for this site in your browser settings.');
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
    throw new Error(messages[err?.code] || `Google sign-in failed (${err?.code || err?.message || 'unknown error'}). Try again, or open the site in Chrome or Safari.`);
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

// Google tokens expire after about an hour, so every call to our own API asks
// Firebase for a current one instead of reusing the one from sign-in time.
export async function currentIdToken() {
  if (!googleReady) return null;
  try {
    const { getApps, getApp } = await import('firebase/app');
    if (!getApps().length) return null;
    const { getAuth } = await import('firebase/auth');
    const user = getAuth(getApp()).currentUser;
    return user ? await user.getIdToken() : null;
  } catch {
    return null;
  }
}
