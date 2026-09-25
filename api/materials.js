// POST /api/materials → study material (notes, question banks, tests).
//
// Files live in a *private* Vercel Blob store, so a file's address is useless on
// its own. Students ask this route to open a file; it checks their access and
// hands back a link that works for 15 minutes.
//
//   { type: 'blob.generate-client-token', ... }        → upload handshake from the browser (instructor only)
//   { action: 'add', pathname, subject, type, title }   → instructor: record an uploaded file
//   { action: 'list' }                                  → instructor: everything; student: what they may open
//   { action: 'open', id }                              → a short-lived link to one file (not for student notes)
//   { action: 'chunk', id, start, end }                 → bytes start..end of a file, for the protected viewer
//   { action: 'delete', id }                            → instructor: remove a file
import { handleUpload, handleUploadPresigned } from '@vercel/blob/client';
import { head, del, get, issueSignedToken, presignUrl } from '@vercel/blob';
import {
  redis, verifyIdToken, isInstructorEmail, getAccess, storageReady, readJsonBody,
} from './_lib.js';

// Keep in sync with SUBJECTS and MATERIAL_TYPES in src/App.jsx.
const SUBJECT_NAMES = [
  'Air Navigation', 'Aviation Meteorology', 'Air Regulations',
  'Technical General', 'Technical Specific', 'Radio Telephony (RTR)',
];
const TYPES = ['notes', 'questions', 'test', 'mock'];

const ALLOWED_CONTENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'application/x-zip-compressed',
  'image/png',
  'image/jpeg',
  'video/mp4',
];
const MAX_BYTES = 500 * 1024 * 1024;
// Largest piece the viewer asks for at once (well under Vercel's 4.5 MB response limit).
const MAX_CHUNK = 2 * 1024 * 1024;

// PDFs and images open in the protected viewer, so students never get the file itself.
export const viewable = (m) => /pdf|^image\//.test(m.contentType || '') || /\.(pdf|png|jpe?g)$/i.test(m.pathname || '');

// Reads bytes [start, end) of a stored file. Asks the store for just that range;
// if it sends the whole file anyway, skips to the part that is needed.
async function readRange(pathname, start, end) {
  const result = await get(pathname, {
    access: 'private', token: BLOB_TOKEN, headers: { Range: `bytes=${start}-${end - 1}` },
  });
  if (!result?.stream) throw new Error('File not found.');
  const partial = Boolean(result.headers.get('content-range'));
  const reader = result.stream.getReader();
  const out = new Uint8Array(end - start);
  let offset = partial ? start : 0; // position in the file of the next byte read
  let filled = 0;
  while (filled < out.length) {
    const { value, done } = await reader.read();
    if (done) break;
    const from = Math.max(0, start - offset);
    const to = Math.min(value.length, end - offset);
    if (to > from) { out.set(value.subarray(from, to), offset + from - start); filled += to - from; }
    offset += value.length;
    if (offset >= end) break;
  }
  reader.cancel().catch(() => {});
  return out.subarray(0, filled);
}
const LINK_MINUTES = 15;

// Connecting a Blob store normally adds BLOB_READ_WRITE_TOKEN, but a custom
// prefix typed in Vercel's connect dialog renames it (e.g. FILES_READ_WRITE_TOKEN).
// Every read-write key starts with vercel_blob_rw_, so find it by that instead.
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN
  || Object.values(process.env).find((v) => typeof v === 'string' && v.startsWith('vercel_blob_rw_'))
  || undefined;
// Newer stores connect without any key: Vercel only sets BLOB_STORE_ID and the
// function signs in to the store by itself (OIDC). Uploads then use presigned URLs.
const uploadMode = BLOB_TOKEN ? 'token' : process.env.BLOB_STORE_ID ? 'presigned' : null;
const blobReady = Boolean(uploadMode);
// Names only, never values: shown to instructors when storage is not working,
// so they can see what Vercel actually gave the site.
const blobSettingNames = () => Object.keys(process.env).filter((k) => /BLOB/i.test(k)).sort();

// Which files a student may open, from the access the instructor granted.
function canOpen(access, material) {
  if (access?.plan !== 'course') return false;
  if (!access.subjects?.includes(material.subject)) return false;
  if (access.paused?.includes(material.subject)) return false;
  if (material.type === 'questions') return Boolean(access.questions);
  if (material.type === 'test' || material.type === 'mock') return Boolean(access.tests);
  return true;
}

async function allMaterials() {
  const flat = await redis(['HGETALL', 'materials']);
  const out = [];
  for (let i = 0; i < (flat || []).length; i += 2) {
    try { out.push(JSON.parse(flat[i + 1])); } catch { /* skip unreadable rows */ }
  }
  return out.sort((a, b) => (b.uploadedAt || '').localeCompare(a.uploadedAt || ''));
}

async function getMaterial(id) {
  const raw = await redis(['HGET', 'materials', String(id || '')]);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST.' });
    return;
  }

  const body = readJsonBody(req);

  // ---------- Upload handshake from the browser's Blob client ----------
  if (typeof body.type === 'string' && body.type.startsWith('blob.')) {
    if (!blobReady) {
      res.status(503).json({ error: 'File storage is not switched on yet (Vercel → Storage → Blob).' });
      return;
    }
    const checkUploader = async (pathname, clientPayload) => {
      let payload = {};
      try { payload = JSON.parse(clientPayload || '{}'); } catch { /* treated as signed out */ }
      const person = await verifyIdToken(payload.idToken);
      if (!person || !isInstructorEmail(person.email)) throw new Error('Only instructors can upload.');
      if (!pathname.startsWith('materials/')) throw new Error('Wrong folder.');
    };
    try {
      const result = uploadMode === 'token'
        ? await handleUpload({
          token: BLOB_TOKEN,
          body,
          request: req,
          onBeforeGenerateToken: async (pathname, clientPayload) => {
            await checkUploader(pathname, clientPayload);
            return { allowedContentTypes: ALLOWED_CONTENT_TYPES, maximumSizeInBytes: MAX_BYTES };
          },
        })
        : await handleUploadPresigned({
          body,
          request: req,
          // Only used to verify upload-finished callbacks, which this site never asks for.
          webhookPublicKey: process.env.BLOB_WEBHOOK_PUBLIC_KEY || 'unused',
          getSignedToken: async (pathname, clientPayload) => {
            await checkUploader(pathname, clientPayload);
            const token = await issueSignedToken({
              pathname,
              operations: ['put'],
              allowedContentTypes: ALLOWED_CONTENT_TYPES,
              maximumSizeInBytes: MAX_BYTES,
              validUntil: Date.now() + 60 * 60 * 1000,
            });
            return { token, urlOptions: { allowedContentTypes: ALLOWED_CONTENT_TYPES, maximumSizeInBytes: MAX_BYTES } };
          },
        });
      res.status(200).json(result);
    } catch (err) {
      res.status(400).json({ error: err?.message || 'Upload was refused.' });
    }
    return;
  }

  const person = await verifyIdToken(body.idToken);
  if (!person) {
    res.status(401).json({ error: 'Please sign in again.' });
    return;
  }
  if (!storageReady) {
    res.status(503).json({ error: 'Storage is not switched on yet.' });
    return;
  }
  const instructor = isInstructorEmail(person.email);

  try {
    if (body.action === 'list') {
      const materials = await allMaterials();
      if (instructor) {
        res.status(200).json({ materials, blobReady, uploadMode, blobSettings: blobReady ? [] : blobSettingNames() });
        return;
      }
      const access = await getAccess(person.email);
      res.status(200).json({ materials: materials.filter((m) => canOpen(access, m)) });
      return;
    }

    if (body.action === 'chunk') {
      const material = await getMaterial(body.id);
      if (!material) {
        res.status(404).json({ error: 'That file is no longer available.' });
        return;
      }
      if (!instructor && !canOpen(await getAccess(person.email), material)) {
        res.status(403).json({ error: 'This file is not part of your access.' });
        return;
      }
      const size = Number(material.size) || 0;
      const start = Math.max(0, Math.floor(Number(body.start) || 0));
      const end = Math.min(size, start + MAX_CHUNK, Math.floor(Number(body.end) || size));
      if (!(end > start)) {
        res.status(416).json({ error: 'Nothing to read there.' });
        return;
      }
      const bytes = await readRange(material.pathname, start, end);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).send(Buffer.from(bytes));
      return;
    }

    if (body.action === 'open') {
      const material = await getMaterial(body.id);
      if (!material) {
        res.status(404).json({ error: 'That file is no longer available.' });
        return;
      }
      if (!instructor && !canOpen(await getAccess(person.email), material)) {
        res.status(403).json({ error: 'This file is not part of your access.' });
        return;
      }
      // Notes are read in the protected viewer only; there is no download link for students.
      if (!instructor && viewable(material)) {
        res.status(403).json({ error: 'Open this file in the viewer.' });
        return;
      }
      const validUntil = Date.now() + LINK_MINUTES * 60 * 1000;
      const signed = await issueSignedToken({
        token: BLOB_TOKEN, pathname: material.pathname, operations: ['get'], validUntil,
      });
      const { presignedUrl } = await presignUrl(signed, {
        operation: 'get', pathname: material.pathname, access: 'private', validUntil,
      });
      res.status(200).json({ url: presignedUrl });
      return;
    }

    if (!instructor) {
      res.status(403).json({ error: 'Only instructors can change material.' });
      return;
    }

    if (body.action === 'add') {
      const pathname = String(body.pathname || '');
      if (!pathname.startsWith('materials/')) {
        res.status(400).json({ error: 'That upload is not in the materials folder.' });
        return;
      }
      if (!SUBJECT_NAMES.includes(body.subject) || !TYPES.includes(body.type)) {
        res.status(400).json({ error: 'Pick a subject and a type.' });
        return;
      }
      // Confirm the file really arrived in our store before listing it.
      const blob = await head(pathname, { token: BLOB_TOKEN });
      const material = {
        id: crypto.randomUUID(),
        pathname: blob.pathname,
        title: String(body.title || '').trim().slice(0, 160) || blob.pathname.split('/').pop(),
        subject: body.subject,
        type: body.type,
        size: blob.size,
        contentType: blob.contentType,
        uploadedAt: new Date().toISOString(),
        uploadedBy: person.email,
      };
      await redis(['HSET', 'materials', material.id, JSON.stringify(material)]);
      res.status(200).json({ ok: true, material });
      return;
    }

    if (body.action === 'delete') {
      const material = await getMaterial(body.id);
      if (!material) {
        res.status(200).json({ ok: true });
        return;
      }
      await del(material.pathname, { token: BLOB_TOKEN });
      await redis(['HDEL', 'materials', material.id]);
      res.status(200).json({ ok: true });
      return;
    }

    res.status(400).json({ error: 'Unknown action.' });
  } catch (err) {
    console.error('materials failed:', err?.message);
    res.status(503).json({ error: 'Could not reach the file store. Try again in a moment.' });
  }
}
