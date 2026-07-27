import { useEffect } from 'react';
import { bridgeShowBanner, bridgeHideBanner, detectShell, BANNER_HEIGHT_PX } from '@/lib/nativeAdBridge';

/**
 * BottomBannerAd — persistent bottom banner mounted globally.
 *
 * - In a native shell (WebViewGold preferred, Despia fallback), the shell
 *   renders a real AdMob banner as a native overlay above the WebView. We
 *   just fire the show/hide URL scheme.
 * - In the web preview / PWA we render a subtle branded placeholder so the
 *   layout reserves the same space and the mobile bottom nav is never covered.
 *
 * The parent layout must reserve `BANNER_HEIGHT_PX` of bottom padding.
 */
export default function BottomBannerAd() {
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

  const shell = detectShell();
  // Native shell paints the banner itself as an overlay above the WebView.
  // Render nothing here so the user never sees an empty "Sponsored · Ad"
  // placeholder stacked above the real native AdMob banner.
  if (shell !== 'none') return null;

  return (
    <div
      className="fixed left-0 right-0 z-40 pointer-events-none"
      style={{
        bottom: 'env(safe-area-inset-bottom, 0px)',
        height: BANNER_HEIGHT_PX,
      }}
    >
      <div className="mx-auto max-w-md h-full flex items-center justify-center bg-muted/60 border-t border-border text-[11px] text-muted-foreground">
        Sponsored · Ad
      </div>
    </div>
  );
}
