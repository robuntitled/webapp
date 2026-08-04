import { getOmioNemoBundleUrls, getOmioWidgetLocale } from '@/lib/omio/config';

let cssPromise: Promise<void> | null = null;
let jsLoadGeneration = 0;

/** Versione stabile: evita `Date.now()` che bypassa la cache CDN (30 giorni). */
const BUNDLE_CACHE_KEY = '20260716';

function bundleUrls() {
  return getOmioNemoBundleUrls(getOmioWidgetLocale());
}

function withCacheKey(url: string): string {
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}v=${BUNDLE_CACHE_KEY}`;
}

function ensurePreconnect() {
  if (typeof document === 'undefined') return;
  if (document.querySelector('link[data-omio-preconnect]')) return;
  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = 'https://www.omio.com';
  link.crossOrigin = 'anonymous';
  link.dataset.omioPreconnect = '1';
  document.head.appendChild(link);

  const dns = document.createElement('link');
  dns.rel = 'dns-prefetch';
  dns.href = 'https://www.omio.com';
  document.head.appendChild(dns);
}

function loadOmioCss(): Promise<void> {
  if (typeof document === 'undefined') {
    return Promise.reject(new Error('SSR'));
  }
  if (cssPromise) return cssPromise;

  const { css } = bundleUrls();
  const href = withCacheKey(css);

  cssPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLLinkElement>(
      'link[data-omio-nemo-css]'
    );
    if (existing) {
      if (existing.sheet || existing.dataset.loaded === '1') {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error('Omio widget CSS load failed')),
        { once: true }
      );
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.omioNemoCss = '1';
    link.onload = () => {
      link.dataset.loaded = '1';
      resolve();
    };
    link.onerror = () => {
      cssPromise = null;
      reject(new Error('Omio widget CSS load failed'));
    };
    document.head.appendChild(link);
  });

  return cssPromise;
}

/**
 * Carica (o ri-esegue) il bundle JS Nemo.
 * Omio monta solo all'esecuzione dello script (`querySelectorAll([data-omio-widget])`),
 * quindi dopo navigazione client serve re-iniettare lo script.
 */
function injectOmioJs(forceReload: boolean): Promise<void> {
  if (typeof document === 'undefined') {
    return Promise.reject(new Error('SSR'));
  }

  const { js } = bundleUrls();
  const src = withCacheKey(js);
  const existing = document.querySelector<HTMLScriptElement>(
    'script[data-omio-nemo-js]'
  );

  if (existing && !forceReload) {
    if (existing.dataset.loaded === '1') return Promise.resolve();
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error('Omio widget script load failed')),
        { once: true }
      );
    });
  }

  if (forceReload && existing) {
    existing.remove();
  }

  const generation = ++jsLoadGeneration;

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.async = true;
    script.src = src;
    script.dataset.omioNemoJs = '1';
    script.onload = () => {
      if (generation !== jsLoadGeneration) return;
      script.dataset.loaded = '1';
      resolve();
    };
    script.onerror = () => {
      if (generation !== jsLoadGeneration) return;
      script.remove();
      reject(new Error('Omio widget script load failed'));
    };
    document.body.appendChild(script);
  });
}

/** Scarica CSS+JS (prima volta). Non garantisce il mount se il div non c'è ancora. */
export function loadOmioNemoBundle(): Promise<void> {
  ensurePreconnect();
  return Promise.all([loadOmioCss(), injectOmioJs(false)]).then(() => undefined);
}

/** Prefetch in background (hover nav / pagina trasporti). */
export function prefetchOmioNemoBundle(): void {
  if (typeof window === 'undefined') return;
  void loadOmioNemoBundle().catch(() => {
    /* silent */
  });
}

/**
 * Assicura che `el` sia montato da Omio.
 * Se il nodo è vuoto (navigazione client / race), ri-esegue lo script
 * mettendo in pausa gli altri mount già idratati.
 */
export async function mountOmioNemoWidget(el: HTMLElement): Promise<void> {
  ensurePreconnect();
  await loadOmioCss();

  if (el.childElementCount > 0) {
    // Già idratato (es. Strict Mode remount dello stesso nodo raro)
    return;
  }

  const others = Array.from(
    document.querySelectorAll<HTMLElement>('div[data-omio-widget="true"]')
  ).filter((node) => node !== el);

  for (const node of others) {
    if (node.childElementCount > 0) {
      node.dataset.omioPaused = '1';
      node.removeAttribute('data-omio-widget');
    }
  }

  try {
    // Prima esecuzione: se lo script non c'è ancora, lo carica e monta.
    // Se c'è già ma el è vuoto, force reload per ri-scan.
    const alreadyLoaded = Boolean(
      document.querySelector('script[data-omio-nemo-js][data-loaded="1"]')
    );
    await injectOmioJs(alreadyLoaded);

    // Piccolo delay: Svelte mount è sync ma a volte il paint arriva al tick dopo
    if (el.childElementCount === 0) {
      await new Promise((r) => requestAnimationFrame(() => r(undefined)));
    }
  } finally {
    for (const node of others) {
      if (node.dataset.omioPaused === '1') {
        node.setAttribute('data-omio-widget', 'true');
        delete node.dataset.omioPaused;
      }
    }
  }

  if (el.childElementCount === 0) {
    throw new Error('Omio widget non si è montato');
  }
}
