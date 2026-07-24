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
    return () => { bridgeHideBanner(); };
  }, []);

  const shell = detectShell();
  // Native shell paints the banner itself — reserve space but don't overlay.
  const isNative = shell !== 'none';

  return (
    <div
      aria-hidden={isNative}
      className="fixed left-0 right-0 z-40 pointer-events-none"
      style={{
        bottom: 'env(safe-area-inset-bottom, 0px)',
        height: BANNER_HEIGHT_PX,
      }}
    >
      {!isNative && (
        <div className="mx-auto max-w-md h-full flex items-center justify-center bg-muted/60 border-t border-border text-[11px] text-muted-foreground">
          Sponsored · Ad
        </div>
      )}
    </div>
  );
}
