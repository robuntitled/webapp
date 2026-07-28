'use client';

import { useEffect, useId, useRef } from 'react';

const VIATOR_SCRIPT = 'https://www.viator.com/orion/partner/widget.js';
const GYG_SCRIPT = 'https://widget.getyourguide.com/dist/pa.umd.production.min.js';

function loadScriptOnce(src: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset.loaded === '1') resolve();
      else existing.addEventListener('load', () => resolve(), { once: true });
      return;
    }
    const s = document.createElement('script');
    s.id = id;
    s.async = true;
    s.src = src;
    s.onload = () => {
      s.dataset.loaded = '1';
      resolve();
    };
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(s);
  });
}

type ViatorWidgetProps = {
  searchTerm: string;
  startDate?: string;
  endDate?: string;
  className?: string;
};

/** Widget destinazione Viator (richiede NEXT_PUBLIC_VIATOR_PARTNER_ID + WIDGET_REF). */
export function ViatorDestinationWidget({
  searchTerm,
  startDate,
  endDate,
  className,
}: ViatorWidgetProps) {
  const partnerId = process.env.NEXT_PUBLIC_VIATOR_PARTNER_ID?.trim();
  const widgetRef = process.env.NEXT_PUBLIC_VIATOR_WIDGET_REF?.trim();
  const mountRef = useRef<HTMLDivElement>(null);
  const uid = useId();

  useEffect(() => {
    if (!partnerId || !widgetRef || !searchTerm.trim()) return;
    let cancelled = false;
    void (async () => {
      try {
        await loadScriptOnce(VIATOR_SCRIPT, 'viator-partner-widget');
        if (cancelled || !mountRef.current) return;
        mountRef.current.replaceChildren();
        const el = document.createElement('div');
        el.setAttribute('data-vi-partner-id', partnerId);
        el.setAttribute('data-vi-widget-ref', widgetRef);
        el.setAttribute('data-vi-search-term', searchTerm.trim());
        el.setAttribute('data-vi-currency', 'EUR');
        el.setAttribute('data-vi-language', 'IT');
        if (startDate) el.setAttribute('data-vi-travel-date-from', startDate);
        if (endDate) el.setAttribute('data-vi-travel-date-to', endDate);
        mountRef.current.appendChild(el);
        const w = window as unknown as { viatorWidget?: { refresh?: () => void } };
        w.viatorWidget?.refresh?.();
      } catch {
        // ignore — widget optional
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [partnerId, widgetRef, searchTerm, startDate, endDate, uid]);

  if (!partnerId || !widgetRef) return null;

  return (
    <div className={className}>
      <p className="mb-2 text-xs font-medium text-muted-foreground">
        Offerte Viator per {searchTerm}
      </p>
      <div ref={mountRef} className="min-h-[120px] overflow-hidden rounded-2xl" />
    </div>
  );
}

type GygWidgetProps = {
  /** Es. "Roma, Italia" */
  query: string;
  className?: string;
};

/** Widget attività GetYourGuide (richiede NEXT_PUBLIC_GYG_PARTNER_ID). */
export function GygDestinationWidget({ query, className }: GygWidgetProps) {
  const partnerId = process.env.NEXT_PUBLIC_GYG_PARTNER_ID?.trim();
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!partnerId || !query.trim()) return;
    let cancelled = false;
    void (async () => {
      try {
        await loadScriptOnce(GYG_SCRIPT, 'gyg-partner-widget');
        if (cancelled || !mountRef.current) return;
        mountRef.current.replaceChildren();
        const el = document.createElement('div');
        el.setAttribute(
          'data-gyg-href',
          'https://widget.getyourguide.com/default/activities.frame'
        );
        el.setAttribute('data-gyg-locale-code', 'it-IT');
        el.setAttribute('data-gyg-widget', 'activities');
        el.setAttribute('data-gyg-number-of-items', '6');
        el.setAttribute('data-gyg-cmp', 'nomadlink');
        el.setAttribute('data-gyg-partner-id', partnerId);
        el.setAttribute('data-gyg-currency', 'EUR');
        el.setAttribute('data-gyg-q', query.trim());
        el.innerHTML =
          'Powered by <a target="_blank" rel="sponsored" href="https://www.getyourguide.com/">GetYourGuide</a>';
        mountRef.current.appendChild(el);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [partnerId, query]);

  if (!partnerId) return null;

  return (
    <div className={className}>
      <p className="mb-2 text-xs font-medium text-muted-foreground">
        Offerte GetYourGuide per {query}
      </p>
      <div ref={mountRef} className="min-h-[120px] overflow-hidden rounded-2xl" />
    </div>
  );
}
