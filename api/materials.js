// POST /api/materials → study material (notes, question banks, tests).
//
// Files live in a *private* Vercel Blob store, so a file's address is useless on
// its own. Students ask this route to open a file; it checks their access and
// hands back a link that works for 15 minutes.
//
//   { type: 'blob.generate-client-token', ... }        → upload handshake from the browser (instructor only)
//   { action: 'add', pathname, subject, type, title }   → instructor: record an uploaded file
//   { action: 'list' }                                  → instructor: everything; student: what they may open
//   { action: 'open', id }                              → a short-lived link to one file
//   { action: 'delete', id }                            → instructor: remove a file
import { handleUpload } from '@vercel/blob/client';
import { head, del, issueSignedToken, presignUrl } from '@vercel/blob';
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
const LINK_MINUTES = 15;

const blobReady = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

// Which files a student may open, from the access the instructor granted.
function canOpen(access, material) {
  if (access?.plan !== 'course') return false;
  if (!access.subjects?.includes(material.subject)) return false;
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
    try {
      const result = await handleUpload({
        body,
        request: req,
        onBeforeGenerateToken: async (pathname, clientPayload) => {
          let payload = {};
          try { payload = JSON.parse(clientPayload || '{}'); } catch { /* treated as signed out */ }
          const person = await verifyIdToken(payload.idToken);
          if (!person || !isInstructorEmail(person.email)) throw new Error('Only instructors can upload.');
          if (!pathname.startsWith('materials/')) throw new Error('Wrong folder.');
          return {
            allowedContentTypes: ALLOWED_CONTENT_TYPES,
            maximumSizeInBytes: MAX_BYTES,
            addRandomSuffix: true,
          };
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
        res.status(200).json({ materials, blobReady });
        return;
      }
      const access = await getAccess(person.email);
      res.status(200).json({ materials: materials.filter((m) => canOpen(access, m)) });
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
      const validUntil = Date.now() + LINK_MINUTES * 60 * 1000;
      const signed = await issueSignedToken({ pathname: material.pathname, operations: ['get'], validUntil });
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
      const blob = await head(pathname);
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
      await del(material.pathname);
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
