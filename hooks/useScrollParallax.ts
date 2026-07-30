'use client';

import { useEffect, useState } from 'react';

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

/** Page scroll progress 0–1 for hero parallax (first ~120vh). */
export function useScrollParallax(enabled = true, maxOffset = 1.2) {
  const [style, setStyle] = useState<{ y: number; scale: number }>({ y: 0, scale: 1.06 });

  useEffect(() => {
    if (!enabled) {
      setStyle({ y: 0, scale: 1.06 });
      return;
    }

    let raf = 0;

    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      const maxScroll = vh * maxOffset;
      const raw = Math.min(1, Math.max(0, window.scrollY / maxScroll));
      const p = easeOutCubic(raw);
      setStyle({
        y: p * -0.06 * vh,
        scale: 1.06 + p * 0.04,
      });
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
  }, [enabled, maxOffset]);

  return style;
}
