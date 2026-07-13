'use client';

import Script from 'next/script';

type TravelpayoutsScriptProps = {
  wlId: string;
  /**
   * Path fisso per i risultati (es. /prenota/voli).
   * Se omesso, usa la pagina corrente — evita redirect alla home del sito.
   */
  resultsPath?: string;
  /** Codice ricerca WL (es. ROM0108BCN15082) — precompila e avvia risultati */
  flightSearch?: string | null;
};

function buildWlBootstrap(wlId: string, resultsPath?: string, flightSearch?: string | null): string {
  const resultsPathLiteral = resultsPath ? JSON.stringify(resultsPath) : 'null';
  const flightSearchLiteral = flightSearch ? JSON.stringify(flightSearch) : 'null';

  return `
(function () {
  var config = Object.assign({}, window.TPWL_CONFIGURATION || {});

  var resultsPath = ${resultsPathLiteral};
  if (resultsPath) {
    config.resultsURL = window.location.origin + resultsPath;
  } else {
    config.resultsURL = window.location.origin + window.location.pathname;
  }

  var flightSearch = ${flightSearchLiteral};
  if (flightSearch) {
    config.flightSearch = flightSearch;
  }

  window.TPWL_CONFIGURATION = config;

  if (document.querySelector('script[src*="wl_id=${wlId}"]')) return;

  var script = document.createElement("script");
  script.async = 1;
  script.type = "module";
  script.src = "https://tpemd.com/wl_web/main.js?wl_id=${wlId}";
  document.head.appendChild(script);
})();
`.trim();
}

export function TravelpayoutsScript({
  wlId,
  resultsPath,
  flightSearch,
}: TravelpayoutsScriptProps) {
  const bootstrap = buildWlBootstrap(wlId, resultsPath, flightSearch);
  const scriptKey = `${wlId}-${resultsPath ?? 'current'}-${flightSearch ?? 'none'}`;

  return (
    <Script
      id={`travelpayouts-wl-${scriptKey}`}
      key={scriptKey}
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html: bootstrap }}
    />
  );
}

declare global {
  interface Window {
    TPWL_CONFIGURATION?: {
      resultsURL?: string;
      flightSearch?: string;
    };
  }
}