'use client';

import { useEffect } from 'react';
import Script from 'next/script';

type TravelpayoutsScriptProps = {
  wlId: string;
  resultsPath?: string;
  /** Codice ricerca WL (es. ROM0108BCN15082) — precompila e avvia risultati */
  flightSearch?: string | null;
};

export function TravelpayoutsScript({
  wlId,
  resultsPath,
  flightSearch,
}: TravelpayoutsScriptProps) {
  useEffect(() => {
    const config: NonNullable<Window['TPWL_CONFIGURATION']> = {
      ...(window.TPWL_CONFIGURATION ?? {}),
    };
    if (resultsPath) {
      config.resultsURL = `${window.location.origin}${resultsPath}`;
    }
    if (flightSearch) {
      config.flightSearch = flightSearch;
    }
    window.TPWL_CONFIGURATION = config;
  }, [resultsPath, flightSearch]);

  return (
    <Script
      id="travelpayouts-wl-main"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
(function () {
  var script = document.createElement("script");
  script.async = 1;
  script.type = "module";
  script.src = "https://tpwgts.com/wl_web/main.js?wl_id=${wlId}";
  document.head.appendChild(script);
})();
        `.trim(),
      }}
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