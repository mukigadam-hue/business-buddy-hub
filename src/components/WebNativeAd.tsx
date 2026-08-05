/**
 * WebNativeAd — global Google AdSense Native Advanced (in-article / fluid) slot
 * for the PUBLISHED WEB site only.
 *
 * Anti-ban developer shield:
 *  1. Hidden entirely (display:none, no script) inside the Android app wrapper
 *     (window.JSInterface present or userAgent contains "; wv)") — WebViewGold
 *     handles AdMob natively there.
 *  2. Never injects on localhost / 127.0.0.1 / any *lovable* host — renders a
 *     safe dev placeholder instead.
 *  3. Never injects for the developer accounts (hardcoded email blacklist).
 *  4. Only real public visitors on the live production domain load the script.
 */
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

const AD_CLIENT = 'ca-pub-960556471328252';
const AD_SLOT = '1234567890';

const DEV_EMAILS = ['ndamson8@gmail.com', 'mukigadam@gmail.com'];

function isAndroidWrapper() {
  if (typeof window === 'undefined') return false;
  const hasBridge = typeof (window as any).JSInterface !== 'undefined';
  const ua = navigator.userAgent || '';
  return hasBridge || ua.includes('; wv)');
}

function isDevHost() {
  if (typeof window === 'undefined') return true;
  const h = window.location.hostname.toLowerCase();
  return h === 'localhost' || h === '127.0.0.1' || h.includes('lovable');
}

interface WebNativeAdProps {
  className?: string;
}

export default function WebNativeAd({ className }: WebNativeAdProps) {
  const { user } = useAuth();
  const email = (user?.email || '').trim().toLowerCase();
  const isDeveloper = DEV_EMAILS.includes(email);

  const insRef = useRef<HTMLModElement | null>(null);
  const pushed = useRef(false);
  const [wrapper] = useState(() => isAndroidWrapper());
  const [devHost] = useState(() => isDevHost());

  const blocked = wrapper || devHost || isDeveloper;

  useEffect(() => {
    if (blocked || pushed.current) return;

    // Load the AdSense library once.
    const src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${AD_CLIENT}`;
    if (!document.querySelector(`script[src="${src}"]`)) {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.crossOrigin = 'anonymous';
      document.head.appendChild(s);
    }

    try {
      (window as any).adsbygoogle = (window as any).adsbygoogle || [];
      (window as any).adsbygoogle.push({});
      pushed.current = true;
    } catch {
      /* ignore */
    }
  }, [blocked]);

  // 1. Inside the native Android wrapper: render nothing at all (no gaps).
  if (wrapper) {
    return <div style={{ display: 'none' }} aria-hidden="true" />;
  }

  // 2. Developer account shield.
  if (isDeveloper) {
    return (
      <div
        className={`my-4 rounded-lg border-2 border-dashed border-muted-foreground/40 bg-muted/30 p-4 text-center text-xs text-muted-foreground ${className || ''}`}
      >
        [Developer Shield Active: Live Ads Blocked for Your Safety]
      </div>
    );
  }

  // 3. Local / preview environments.
  if (devHost) {
    return (
      <div
        className={`my-4 rounded-lg border-2 border-dashed border-muted-foreground/40 bg-muted/20 p-4 text-center text-xs text-muted-foreground ${className || ''}`}
      >
        [AdSense Native Ad Placeholder - Safe Dev Mode]
      </div>
    );
  }

  // 4. Live public visitor on the production domain.
  return (
    <div className={`my-4 ${className || ''}`}>
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: 'block', textAlign: 'center' }}
        data-ad-client={AD_CLIENT}
        data-ad-slot={AD_SLOT}
        data-ad-format="fluid"
        data-ad-layout="in-article"
      />
    </div>
  );
}
