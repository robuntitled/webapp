'use client';

import { useEffect, useState, type RefObject } from 'react';

type ScrollProgressOptions = {
  /** Viewport ratio where progress = 0 (element entering). Default 0.92 */
  start?: number;
  /** Viewport ratio where progress = 1 (element settled). Default 0.58 */
  end?: number;
  enabled?: boolean;
};

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export function useScrollProgress(
  ref: RefObject<HTMLElement | null>,
  { start = 0.92, end = 0.58, enabled = true }: ScrollProgressOptions = {}
) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;

    let raf = 0;

    const update = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const startY = vh * start;
      const endY = vh * end;
      const span = startY - endY || 1;
      const raw = 1 - (rect.top - endY) / span;
      const clamped = Math.min(1, Math.max(0, raw));
      setProgress(easeOutCubic(clamped));
    };

    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [ref, start, end, enabled]);

  return progress;
}
