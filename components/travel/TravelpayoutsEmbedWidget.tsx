'use client';

import { useEffect, useId } from 'react';

type TravelpayoutsEmbedWidgetProps = {
  embedUrl: string | null;
  /** Altezza minima contenitore mentre il widget carica */
  minHeight?: number;
  className?: string;
};

export function TravelpayoutsEmbedWidget({
  embedUrl,
  minHeight = 120,
  className = '',
}: TravelpayoutsEmbedWidgetProps) {
  const reactId = useId();
  const containerId = `tp-embed-${reactId.replace(/:/g, '')}`;

  useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';
    if (!embedUrl) return;

    const script = document.createElement('script');
    script.async = true;
    script.src = embedUrl;
    script.charset = 'utf-8';
    container.appendChild(script);

    return () => {
      container.innerHTML = '';
    };
  }, [containerId, embedUrl]);

  if (!embedUrl) return null;

  return (
    <div
      id={containerId}
      className={`tp-embed-root w-full overflow-hidden ${className}`}
      style={{ minHeight }}
    />
  );
}