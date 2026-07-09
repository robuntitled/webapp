'use client';

import { useEffect } from 'react';
import Script from 'next/script';

type TravelpayoutsScriptProps = {
  wlId: string;
  resultsPath?: string;
};

export function TravelpayoutsScript({ wlId, resultsPath }: TravelpayoutsScriptProps) {
  useEffect(() => {
    if (!resultsPath) return;
    window.TPWL_CONFIGURATION = {
      ...(window.TPWL_CONFIGURATION ?? {}),
      resultsURL: `${window.location.origin}${resultsPath}`,
    };
  }, [resultsPath]);

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
    };
  }
}