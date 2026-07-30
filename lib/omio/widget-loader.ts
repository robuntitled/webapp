import { getOmioNemoBundleUrls, getOmioWidgetLocale } from '@/lib/omio/config';

let loadPromise: Promise<void> | null = null;

/** Carica CSS + JS Nemo Omio una sola volta (pattern ufficiale Impact). */
export function loadOmioNemoBundle(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('SSR'));
  }
  if (loadPromise) return loadPromise;

  const { css, js } = getOmioNemoBundleUrls(getOmioWidgetLocale());
  const v = String(Date.now());

  loadPromise = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[data-omio-nemo-css]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `${css}?v=${v}`;
      link.dataset.omioNemoCss = '1';
      document.head.appendChild(link);
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-omio-nemo-js]'
    );
    if (existing) {
      if (existing.dataset.loaded === '1') {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => {
          loadPromise = null;
          reject(new Error('Omio widget script load failed'));
        },
        { once: true }
      );
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.src = `${js}?v=${v}`;
    script.dataset.omioNemoJs = '1';
    script.onload = () => {
      script.dataset.loaded = '1';
      resolve();
    };
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('Omio widget script load failed'));
    };
    document.body.appendChild(script);
  });

  return loadPromise;
}
