/**
 * WebNativeAd — global Google AdSense slot for the PUBLISHED WEB site only.
 *
 * Defaults to Native Advanced (fluid / in-article). Can also render a fixed
 * horizontal banner (used to fill the reserved bottom banner space on web).
 *
 * Anti-ban developer shield:
 *  1. Hidden entirely (display:none, no script) inside the Android app wrapper
 *     (window.JSInterface present or userAgent contains "; wv)") — WebViewGold
 *     handles AdMob natively there.
 *  2. Never injects on localhost / 127.0.0.1 / any *lovable* host — renders a
 *     safe dev placeholder instead.
 *  3. Never injects for the developer accounts (hardcoded email blacklist).
 *  4. Only real public visitors on the live production domain load the script.
 *
 * Layout safety: the slot collapses to ZERO height whenever AdSense reports the
 * slot as `unfilled` (or nothing renders within a few seconds), so an empty ad
 * never leaves a white block floating over the app UI.
 *
 * Every filled slot refreshes itself every 120 seconds (visibility-aware: the
 * timer only fires while the tab is actually in the foreground).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

const AD_CLIENT = 'ca-pub-960556471328252';
const AD_SLOT = '1234567890';
export const WEB_AD_REFRESH_MS = 120_000;

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
  /** Ad slot id (defaults to the native advanced slot). */
  slot?: string;
  /** 'fluid' (native advanced, default) or 'horizontal' / 'auto' banner. */
  format?: 'fluid' | 'horizontal' | 'auto';
  /** Only used with format="fluid". */
  layout?: string;
  /** Fixed height in px (used for the bottom banner). */
  height?: number;
  /** Placeholder label in dev/preview mode. */
  placeholderLabel?: string;
  /** Hide the dev/preview placeholder box (used by the bottom banner). */
  hidePlaceholder?: boolean;
  /** Notified with true once the slot actually renders an ad, false if empty. */
  onFillChange?: (filled: boolean) => void;
}

export default function WebNativeAd({
  className,
  slot = AD_SLOT,
  format = 'fluid',
  layout = 'in-article',
  height,
  placeholderLabel,
  hidePlaceholder,
  onFillChange,
}: WebNativeAdProps) {
  const { user } = useAuth();
  const email = (user?.email || '').trim().toLowerCase();
  const isDeveloper = DEV_EMAILS.includes(email);

  const insRef = useRef<HTMLModElement | null>(null);
  const [wrapper] = useState(() => isAndroidWrapper());
  const [devHost] = useState(() => isDevHost());
  // Bumping this remounts the <ins> so AdSense fills a brand-new slot.
  const [refreshKey, setRefreshKey] = useState(0);
  // null = unknown yet, true = filled, false = unfilled (collapse the space).
  const [filled, setFilled] = useState<boolean | null>(null);

  const blocked = wrapper || devHost || isDeveloper;

  const report = useCallback((value: boolean) => {
    setFilled(value);
    onFillChange?.(value);
  }, [onFillChange]);

  // Load the AdSense library once.
  useEffect(() => {
    if (blocked) return;
    const src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${AD_CLIENT}`;
    if (!document.querySelector(`script[src="${src}"]`)) {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.crossOrigin = 'anonymous';
      document.head.appendChild(s);
    }
  }, [blocked]);

  // Request a fill for the current <ins> (runs again on every refresh) and
  // watch whether Google actually served something.
  useEffect(() => {
    if (blocked) return;
    setFilled(null);
    try {
      (window as any).adsbygoogle = (window as any).adsbygoogle || [];
      (window as any).adsbygoogle.push({});
    } catch {
      /* ignore */
    }

    const el = insRef.current;
    if (!el) return;

    const check = () => {
      const status = el.getAttribute('data-ad-status');
      if (status === 'filled') { report(true); return true; }
      if (status === 'unfilled') { report(false); return true; }
      return false;
    };

    if (check()) return;
    const observer = new MutationObserver(() => { check(); });
    observer.observe(el, { attributes: true, attributeFilter: ['data-ad-status'] });
    // Hard timeout: if nothing rendered after 6s treat the slot as empty so we
    // never keep dead space in the layout.
    const timer = window.setTimeout(() => {
      if (!check()) report(el.clientHeight > 20);
    }, 6000);
    return () => { observer.disconnect(); window.clearTimeout(timer); };
  }, [blocked, refreshKey, report]);

  // 120s visibility-aware refresh cycle.
  useEffect(() => {
    if (blocked) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      setRefreshKey(k => k + 1);
    }, WEB_AD_REFRESH_MS);
    return () => window.clearInterval(interval);
  }, [blocked]);

  // 1. Inside the native Android wrapper: render nothing at all (no gaps).
  if (wrapper) return null;

  // 2. Developer account shield.
  if (isDeveloper) {
    if (hidePlaceholder) return null;
    return (
      <div
        className={`rounded-lg border-2 border-dashed border-muted-foreground/40 bg-muted/30 p-2 text-center text-[11px] text-muted-foreground ${className || 'my-4'}`}
        style={height ? { height } : undefined}
      >
        [Developer Shield Active: Live Ads Blocked for Your Safety]
      </div>
    );
  }

  // 3. Local / preview environments.
  if (devHost) {
    if (hidePlaceholder) return null;
    return (
      <div
        className={`flex items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/40 bg-muted/20 p-2 text-center text-[11px] text-muted-foreground ${className || 'my-4'}`}
        style={height ? { height } : undefined}
      >
        {placeholderLabel || '[AdSense Native Ad Placeholder - Safe Dev Mode]'}
      </div>
    );
  }

  // 4. Live public visitor on the production domain.
  // While the fill state is unknown the container has no min height, and once
  // it is known to be unfilled it collapses completely.
  const collapsed = filled === false;
  return (
    <div
      className={collapsed ? undefined : (className || 'my-4')}
      style={{
        ...(collapsed ? { height: 0, overflow: 'hidden', margin: 0 } : height ? { height } : {}),
      }}
      aria-hidden={collapsed || undefined}
    >
      <ins
        key={refreshKey}
        ref={insRef}
        className="adsbygoogle"
        style={{ display: 'block', textAlign: 'center', ...(height ? { height } : {}) }}
        data-ad-client={AD_CLIENT}
        data-ad-slot={slot}
        data-ad-format={format}
        {...(format === 'fluid' ? { 'data-ad-layout': layout } : { 'data-full-width-responsive': 'true' })}
      />
    </div>
  );
}
