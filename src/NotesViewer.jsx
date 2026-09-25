import React, { useEffect, useRef, useState } from 'react';
import { X, ZoomIn, ZoomOut, Maximize2, PanelLeft, LoaderCircle, EyeOff } from 'lucide-react';

// Protected notes viewer.
//
// The file never reaches the student as a file: pages are fetched in small
// pieces through our own API (which checks access on every piece) and drawn
// onto canvases with an "Avero Aviation" watermark. There is no link, no save
// button, printing shows a blank page, and copy / save / print shortcuts and
// right-click are blocked. The pages blur while the window is not focused.
// A screenshot or a photo of the screen can never be fully prevented on the web.

const WATERMARK = 'Avero Aviation';
const CHUNK = 2 * 1024 * 1024; // matches MAX_CHUNK in api/materials.js

export const isViewable = (m) => /pdf|^image\//.test(m.contentType || '') || /\.(pdf|png|jpe?g)$/i.test(m.pathname || '');
const isPdf = (m) => /pdf/.test(m.contentType || '') || /\.pdf$/i.test(m.pathname || '');

function drawWatermark(ctx, width, height) {
  ctx.save();
  ctx.globalAlpha = 0.09;
  ctx.fillStyle = '#000';
  const size = Math.max(18, Math.round(width / 16));
  ctx.font = `800 ${size}px "Plus Jakarta Sans", system-ui, sans-serif`;
  ctx.translate(width / 2, height / 2);
  ctx.rotate(-Math.PI / 6);
  const step = size * 5;
  for (let y = -height; y < height; y += step) {
    for (let x = -width; x < width; x += size * 10) {
      ctx.fillText(WATERMARK, x + ((y / step) % 2) * size * 5, y);
    }
  }
  ctx.restore();
}

export default function NotesViewer({ material, getToken, onClose }) {
  const [doc, setDoc] = useState(null); // { kind: 'pdf', pdf, sizes } | { kind: 'image', bitmap }
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(1);
  const [page, setPage] = useState(1);
  const [hidden, setHidden] = useState(false);
  const [sidebar, setSidebar] = useState(() => window.innerWidth >= 768);
  const [width, setWidth] = useState(800);
  const mainRef = useRef(null);
  const pageRefs = useRef([]);

  // Bytes [start, end) through our API, 2 MB at a time.
  const fetchRange = async (start, end) => {
    const parts = [];
    for (let at = start; at < end; at += CHUNK) {
      const res = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: await getToken(), action: 'chunk', id: material.id, start: at, end: Math.min(end, at + CHUNK) }),
      });
      if (!res.ok) {
        let msg = 'Could not load these notes.';
        try { msg = (await res.json()).error || msg; } catch { /* binary or empty */ }
        throw new Error(msg);
      }
      parts.push(new Uint8Array(await res.arrayBuffer()));
    }
    const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
    let o = 0;
    for (const p of parts) { out.set(p, o); o += p.length; }
    return out;
  };

  // Load the document.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const size = Number(material.size) || 0;
        if (isPdf(material)) {
          const pdfjs = await import('pdfjs-dist');
          const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
          pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
          const first = await fetchRange(0, Math.min(size, 512 * 1024));
          // Only the parts of the file that pages need are fetched, as they are needed.
          const transport = new pdfjs.PDFDataRangeTransport(size, first);
          transport.requestDataRange = (begin, end) => {
            fetchRange(begin, end).then((data) => transport.onDataRange(begin, data)).catch((err) => !cancelled && setError(err.message));
          };
          const pdf = await pdfjs.getDocument({ range: transport, length: size, disableAutoFetch: true, disableStream: true }).promise;
          // Measure page 1 now and assume the rest match (scanned notes almost always do);
          // each page corrects its own size when it is drawn. Opening stays instant for long files.
          const vp = (await pdf.getPage(1)).getViewport({ scale: 1 });
          const sizes = Array.from({ length: pdf.numPages }, () => ({ w: vp.width, h: vp.height }));
          if (!cancelled) setDoc({ kind: 'pdf', pdf, sizes });
        } else {
          const bytes = await fetchRange(0, size);
          const bitmap = await createImageBitmap(new Blob([bytes], { type: material.contentType || 'image/jpeg' }));
          if (!cancelled) setDoc({ kind: 'image', bitmap, sizes: [{ w: bitmap.width, h: bitmap.height }] });
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not open these notes.');
      }
    })();
    return () => { cancelled = true; };
  }, [material.id]);

  // Protections while the viewer is open.
  useEffect(() => {
    const block = (e) => {
      const k = e.key?.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && ['p', 's', 'c', 'a', 'x'].includes(k)) e.preventDefault();
      if (e.key === 'Escape') onClose();
      if (e.key === 'PrintScreen') { setHidden(true); navigator.clipboard?.writeText('').catch(() => {}); }
    };
    const hide = () => setHidden(true);
    const onVisibility = () => setHidden(document.visibilityState !== 'visible');
    const style = document.createElement('style');
    style.textContent = '@media print { body > * { display: none !important; } body::after { content: "Printing is turned off for these notes."; } }';
    document.head.appendChild(style);
    window.addEventListener('keydown', block, true);
    window.addEventListener('keyup', block, true);
    window.addEventListener('blur', hide);
    document.addEventListener('visibilitychange', onVisibility);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      style.remove();
      window.removeEventListener('keydown', block, true);
      window.removeEventListener('keyup', block, true);
      window.removeEventListener('blur', hide);
      document.removeEventListener('visibilitychange', onVisibility);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Page width follows the viewer width.
  useEffect(() => {
    const measure = () => setWidth(Math.max(240, (mainRef.current?.clientWidth || 800) - 48));
    measure();
    const ro = new ResizeObserver(measure);
    if (mainRef.current) ro.observe(mainRef.current);
    return () => ro.disconnect();
  }, [sidebar]);

  // Track which page is in view.
  useEffect(() => {
    if (!doc) return undefined;
    const io = new IntersectionObserver((entries) => {
      const best = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (best) setPage(Number(best.target.dataset.page));
    }, { root: mainRef.current, threshold: [0.25, 0.5, 0.75] });
    pageRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [doc, zoom, width]);

  const goTo = (n) => pageRefs.current[n - 1]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const pageWidth = Math.round(Math.min(width, 1100) * zoom);
  const pages = doc?.sizes || [];

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-neutral-900 text-white select-none"
      onContextMenu={(e) => e.preventDefault()} onDragStart={(e) => e.preventDefault()} onCopy={(e) => e.preventDefault()}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-white/10 bg-neutral-950 px-3 py-2">
        <button onClick={() => setSidebar(!sidebar)} className="rounded-lg p-2 hover:bg-white/10" aria-label="Page thumbnails"><PanelLeft className="h-5 w-5" /></button>
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{material.title}</p>
        {pages.length > 0 && <span className="hidden text-sm text-neutral-300 sm:inline">Page {page} of {pages.length}</span>}
        <button onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))} className="rounded-lg p-2 hover:bg-white/10" aria-label="Zoom out"><ZoomOut className="h-5 w-5" /></button>
        <span className="w-12 text-center text-sm text-neutral-300">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))} className="rounded-lg p-2 hover:bg-white/10" aria-label="Zoom in"><ZoomIn className="h-5 w-5" /></button>
        <button onClick={() => setZoom(1)} className="rounded-lg p-2 hover:bg-white/10" aria-label="Fit to width" title="Fit to width"><Maximize2 className="h-5 w-5" /></button>
        <button onClick={onClose} className="ml-1 rounded-lg p-2 hover:bg-white/10" aria-label="Close"><X className="h-5 w-5" /></button>
      </div>

      <div className="relative flex min-h-0 flex-1">
        {/* Thumbnails, like Adobe's page panel */}
        {sidebar && pages.length > 1 && (
          <aside className="w-40 shrink-0 space-y-3 overflow-y-auto border-r border-white/10 bg-neutral-950 p-3">
            {pages.map((s, i) => (
              <button key={i} onClick={() => goTo(i + 1)} className="block w-full text-center">
                <div className={`overflow-hidden rounded ring-2 ${page === i + 1 ? 'ring-white' : 'ring-transparent hover:ring-white/40'}`}>
                  <PageCanvas doc={doc} index={i} width={112} thumb />
                </div>
                <span className="mt-1 block text-xs text-neutral-400">{i + 1}</span>
              </button>
            ))}
          </aside>
        )}

        {/* Pages */}
        <main ref={mainRef} className="min-w-0 flex-1 overflow-auto">
          {error ? (
            <div className="flex h-full items-center justify-center p-6 text-center text-neutral-300">{error}</div>
          ) : !doc ? (
            <div className="flex h-full items-center justify-center gap-3 text-neutral-300">
              <LoaderCircle className="h-5 w-5 animate-spin" /> Opening your notes…
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 p-6">
              {pages.map((s, i) => (
                <div key={i} ref={(el) => { pageRefs.current[i] = el; }} data-page={i + 1}
                  style={{ width: pageWidth }}
                  className="shrink-0 bg-white shadow-2xl">
                  <PageCanvas doc={doc} index={i} width={pageWidth} />
                </div>
              ))}
            </div>
          )}
        </main>

        {hidden && (
          <button onClick={() => setHidden(false)}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-neutral-900/95 text-neutral-200 backdrop-blur-xl">
            <EyeOff className="h-8 w-8" />
            <span className="font-semibold">Notes hidden while you are away</span>
            <span className="text-sm text-neutral-400">Click to continue reading</span>
          </button>
        )}
      </div>
    </div>
  );
}

// Draws one page (only once it scrolls near the screen) with the watermark baked in.
function PageCanvas({ doc, index, width, thumb = false }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const [real, setReal] = useState(null); // this page's own size, once known

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { rootMargin: '800px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !doc) return undefined;
    let task = null;
    let cancelled = false;
    (async () => {
      const canvas = ref.current;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      let { w, h } = doc.sizes[index];
      const pdfPage = doc.kind === 'pdf' ? await doc.pdf.getPage(index + 1) : null;
      if (cancelled) return;
      if (pdfPage) {
        const vp = pdfPage.getViewport({ scale: 1 });
        ({ width: w, height: h } = vp);
        if (Math.abs(w - doc.sizes[index].w) > 1 || Math.abs(h - doc.sizes[index].h) > 1) setReal({ w, h });
      }
      const scale = (width / w) * ratio;
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext('2d');
      if (pdfPage) {
        task = pdfPage.render({ canvasContext: ctx, viewport: pdfPage.getViewport({ scale }) });
        try { await task.promise; } catch { return; }
      } else {
        ctx.drawImage(doc.bitmap, 0, 0, canvas.width, canvas.height);
      }
      if (!cancelled && !thumb) drawWatermark(ctx, canvas.width, canvas.height);
    })();
    return () => { cancelled = true; task?.cancel?.(); };
  }, [visible, doc, index, width]);

  const { w, h } = real || doc.sizes[index];
  return <canvas ref={ref} style={{ width, height: Math.round((width * h) / w) }} className="block bg-white" />;
}
