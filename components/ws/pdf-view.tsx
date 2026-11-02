'use client';
// Renders PDF pages to canvas with pdf.js so previews work on every device (mobile browsers often cannot show PDFs in iframes).
import { useEffect, useRef, useState } from 'react';

export function PdfView({ url, maxPages = 10, className = '' }: { url: string; maxPages?: number; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [pages, setPages] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const el = box.current;
    if (!el) return;
    el.innerHTML = '';
    setState('loading');
    (async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        const doc = await pdfjs.getDocument(url).promise;
        if (cancelled) return;
        setPages(doc.numPages);
        const width = Math.max(280, el.clientWidth - 2);
        for (let i = 1; i <= Math.min(doc.numPages, maxPages); i++) {
          const page = await doc.getPage(i);
          if (cancelled) return;
          const base = page.getViewport({ scale: 1 });
          const scale = width / base.width, dpr = Math.min(2, window.devicePixelRatio || 1);
          const vp = page.getViewport({ scale: scale * dpr });
          const canvas = document.createElement('canvas');
          canvas.width = vp.width; canvas.height = vp.height;
          canvas.style.width = '100%';
          canvas.setAttribute('aria-label', `Page ${i}`);
          el.appendChild(canvas);
          await page.render({ canvasContext: canvas.getContext('2d')!, viewport: vp }).promise;
        }
        if (!cancelled) setState('ok');
      } catch {
        if (!cancelled) setState('error');
      }
    })();
    return () => { cancelled = true; };
  }, [url, maxPages]);
  return <div className={'pdf-view ' + className}>
    {state === 'loading' && <div className="pdf-msg">Loading PDF…</div>}
    {state === 'error' && <div className="pdf-msg">Preview unavailable. Use the download button to open the PDF.</div>}
    <div ref={box} className="pdf-pages" />
    {state === 'ok' && pages > maxPages && <div className="pdf-msg">Showing {maxPages} of {pages} pages — download to read the rest.</div>}
  </div>;
}
