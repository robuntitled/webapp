'use client';

import { useEffect, useRef, useCallback } from 'react';

const SCRIPT_ID = 'cf-turnstile-script';
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

type TurnstileWidgetProps = {
  siteKey: string;
  onToken: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  className?: string;
};

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
          size?: 'normal' | 'compact' | 'flexible';
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

/**
 * Cloudflare Turnstile — solo su registrazione.
 */
export function TurnstileWidget({
  siteKey,
  onToken,
  onExpire,
  onError,
  className,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const onExpireRef = useRef(onExpire);
  const onErrorRef = useRef(onError);

  onTokenRef.current = onToken;
  onExpireRef.current = onExpire;
  onErrorRef.current = onError;

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile || !siteKey) return;
    if (widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch {
        /* ignore */
      }
      widgetIdRef.current = null;
    }
    containerRef.current.innerHTML = '';
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      theme: 'auto',
      size: 'flexible',
      callback: (token) => onTokenRef.current(token),
      'expired-callback': () => {
        onTokenRef.current('');
        onExpireRef.current?.();
      },
      'error-callback': () => {
        onTokenRef.current('');
        onErrorRef.current?.();
      },
    });
  }, [siteKey]);

  useEffect(() => {
    if (!siteKey) return;

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;

    if (window.turnstile) {
      renderWidget();
    } else if (existing) {
      const prev = window.onTurnstileLoad;
      window.onTurnstileLoad = () => {
        prev?.();
        renderWidget();
      };
    } else {
      window.onTurnstileLoad = () => renderWidget();
      const script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      // api.js?render=explicit chiama onload se passiamo onload=...
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad';
      document.head.appendChild(script);
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          /* ignore */
        }
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, renderWidget]);

  if (!siteKey) return null;

  return (
    <div className={className}>
      <div ref={containerRef} className="cf-turnstile min-h-[65px]" />
      <p className="mt-1.5 text-[10px] text-muted-foreground text-center">
        Protezione anti-bot · Cloudflare Turnstile
      </p>
    </div>
  );
}

export function resetTurnstile() {
  try {
    window.turnstile?.reset();
  } catch {
    /* ignore */
  }
}
