import {
  buildOmioWidgetLoadOptions,
  getOmioWidgetType,
  resolveOmioWidgetScriptUrl,
  type OmioTransportMode,
} from '@/lib/omio/config';

export type OmioWidgetsApi = {
  load: (
    containerId: string,
    widgetType: string,
    options?: Record<string, string>
  ) => void;
};

declare global {
  interface Window {
    omioWidgetLoad?: (widgets: OmioWidgetsApi) => void;
  }
}

const loadedScripts = new Set<string>();
let cachedWidgetsApi: OmioWidgetsApi | null = null;

export function loadOmioWidgetScript(scriptUrl: string): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('SSR'));
  }
  if (loadedScripts.has(scriptUrl)) {
    return Promise.resolve();
  }

  const existing = document.querySelector<HTMLScriptElement>(
    `script[data-omio-widget="${scriptUrl}"]`
  );
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Omio script load failed')), {
        once: true,
      });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = scriptUrl;
    script.dataset.omioWidget = scriptUrl;
    script.onload = () => {
      loadedScripts.add(scriptUrl);
      resolve();
    };
    script.onerror = () => reject(new Error('Omio script load failed'));
    document.head.appendChild(script);
  });
}

export async function mountOmioSearchWidget(
  containerId: string,
  mode: OmioTransportMode
): Promise<void> {
  const scriptUrl = resolveOmioWidgetScriptUrl();
  if (!scriptUrl) {
    throw new Error('Omio widget script URL non configurato');
  }

  const options = buildOmioWidgetLoadOptions(mode);
  const widgetType = getOmioWidgetType();

  if (cachedWidgetsApi) {
    cachedWidgetsApi.load(containerId, widgetType, options);
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const previous = window.omioWidgetLoad;
    window.omioWidgetLoad = (widgets) => {
      cachedWidgetsApi = widgets;
      try {
        widgets.load(containerId, widgetType, options);
        resolve();
      } catch (e) {
        reject(e instanceof Error ? e : new Error('Omio widget mount failed'));
      } finally {
        window.omioWidgetLoad = previous;
      }
    };

    void loadOmioWidgetScript(scriptUrl).catch((err) => {
      window.omioWidgetLoad = previous;
      reject(err);
    });
  });
}
