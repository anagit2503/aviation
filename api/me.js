// POST /api/me → record this sign-in and report what the person can see.
//
// Called right after someone signs in with Google. The browser sends the Google
// token; the server checks it, so nobody can claim an email that is not theirs.
import {
  verifyIdToken, getAccount, saveAccount, emptyAccess,
  isInstructorEmail, storageReady, readJsonBody,
} from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST.' });
    return;
  }

  const { idToken } = readJsonBody(req);
  const person = await verifyIdToken(idToken);
  if (!person) {
    res.status(401).json({ error: 'Sign-in could not be checked. Please sign in again.' });
    return;
  }

  const instructor = isInstructorEmail(person.email);

  // Without storage we can still let people in; they simply have no course access.
  if (!storageReady) {
    res.status(200).json({
      email: person.email,
      name: person.name,
      instructor,
      access: emptyAccess(),
      saved: false,
    });
    return;
  }

  const now = new Date().toISOString();
  let account;
  try {
    account = await getAccount(person.email);
    account = {
      email: person.email,
      name: person.name || account?.name || '',
      firstSeen: account?.firstSeen || now,
      lastSeen: now,
      signIns: (account?.signIns || 0) + 1,
      access: account?.access || emptyAccess(),
    };
    await saveAccount(account);
  } catch {
    res.status(200).json({
      email: person.email, name: person.name, instructor, access: emptyAccess(), saved: false,
    });
    return;
  }

  res.status(200).json({
    email: account.email,
    name: account.name,
    instructor,
    access: account.access,
    saved: true,
  });
}
