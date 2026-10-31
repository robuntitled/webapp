'use client';

import { useEffect, useRef } from 'react';

/**
 * setInterval che pausa quando la scheda è nascosta e riesegue subito al ritorno.
 */
export function useIntervalWhenVisible(
  callback: () => void,
  delayMs: number | null,
  opts?: { runOnMount?: boolean }
) {
  const saved = useRef(callback);
  saved.current = callback;

  useEffect(() => {
    if (delayMs == null || delayMs <= 0) return;

    const tick = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      saved.current();
    };

    if (opts?.runOnMount !== false) tick();

    const id = window.setInterval(tick, delayMs);
    const onVis = () => {
      if (!document.hidden) saved.current();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [delayMs, opts?.runOnMount]);
}
