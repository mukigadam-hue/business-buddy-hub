import { useCallback, useEffect, useState } from 'react';
import { bridgeShowBanner, bridgeHideBanner, detectShell, BANNER_HEIGHT_PX } from '@/lib/nativeAdBridge';
import { setBannerReserved } from '@/lib/bannerSpace';
import WebNativeAd from '@/components/WebNativeAd';

/**
 * BottomBannerAd — persistent bottom banner mounted globally.
 *
 * - In a native shell (WebViewGold preferred, Despia fallback), the shell
 *   renders a real AdMob banner as a native overlay above the WebView. We
 *   just fire the show/hide URL scheme.
 * - On the web (browser / PWA) we fill the same space with a real Google
 *   AdSense banner, which refreshes every 120 seconds like the native banner.
 *   If AdSense has nothing to serve, the bar renders NOTHING and the layout
 *   reclaims the space — no white block floating over the app features.
 */
export default function BottomBannerAd() {
  const [shell] = useState(() => detectShell());
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    bridgeShowBanner();
    // Refresh the banner every 120s so AdMob serves a fresh creative.
    const interval = window.setInterval(() => {
      bridgeHideBanner();
      // Small gap so the native shell tears down before requesting again.
      window.setTimeout(() => bridgeShowBanner(), 250);
    }, 120_000);
    return () => {
      window.clearInterval(interval);
      bridgeHideBanner();
    };
  }, []);

  // Tell the layout how much bottom space to reserve on the web.
  useEffect(() => {
    if (shell !== 'none') return;
    setBannerReserved(filled ? BANNER_HEIGHT_PX : 0);
    return () => setBannerReserved(0);
  }, [shell, filled]);

  const handleFill = useCallback((v: boolean) => setFilled(v), []);

  // Native shell paints the banner itself as an overlay above the WebView.
  if (shell !== 'none') return null;

  return (
    <div
      className={`fixed left-0 right-0 z-30 ${filled ? 'border-t border-border bg-background/95 backdrop-blur' : 'pointer-events-none'}`}
      style={{
        bottom: 'env(safe-area-inset-bottom, 0px)',
        height: filled ? BANNER_HEIGHT_PX : 0,
        overflow: 'hidden',
      }}
    >
      <div className="mx-auto max-w-3xl h-full overflow-hidden">
        <WebNativeAd
          className="h-full"
          format="horizontal"
          height={BANNER_HEIGHT_PX}
          hidePlaceholder
          onFillChange={handleFill}
        />
      </div>
    </div>
  );
}
