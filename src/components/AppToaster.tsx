import { Toaster as SonnerToaster } from '@/components/ui/sonner';
import { useBannerReserved } from '@/lib/bannerSpace';

/**
 * AppToaster — global sonner toaster that never hides behind the bottom
 * banner ad.
 *
 * Why: confirmation messages (sale recorded, stock saved, auth feedback…)
 * used to render flush against the bottom of the screen, where the AdMob
 * banner (a native overlay in the WebViewGold shell, or the AdSense bar on
 * the web) physically covered them. Users could not tell whether their
 * action succeeded, and Google flags ads that overlap app UI.
 *
 * The toaster's bottom offset now tracks the reserved banner height from
 * `bannerSpace` — 60px in a native shell, 60px on the web only when AdSense
 * actually filled a banner, 0 when no banner is present — plus a small gap.
 */
export default function AppToaster() {
  const reserved = useBannerReserved();
  const bottom = `${reserved + 16}px`;

  return (
    <SonnerToaster
      offset={{ top: '32px', right: '32px', bottom, left: '32px' }}
      mobileOffset={{ top: '16px', right: '16px', bottom, left: '16px' }}
    />
  );
}
