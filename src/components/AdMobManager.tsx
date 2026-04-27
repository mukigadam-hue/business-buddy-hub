import { useEffect } from 'react';
import despia from 'despia-native';

/**
 * AdMobManager
 *
 * Initializes the native AdMob bridge once on app mount and pre-warms the
 * Google AdSense queue used by Despia's "WebView for Ads" pipeline.
 *
 * - Inside the Despia native shell: calls `despia('initializeAds://')` so the
 *   native AdMob SDK is started and ready to serve <ins class="adsbygoogle">
 *   placements, banners, interstitials, and rewarded ads.
 * - On the web: just primes `window.adsbygoogle` so the first <AdSpace /> render
 *   actually triggers an ad request to Google.
 *
 * Real AdMob IDs used by this project:
 *   App ID:               ca-app-pub-9605564713228252~8941826330
 *   Banner unit:          ca-app-pub-9605564713228252/4713172172
 *   Native (home) unit:   ca-app-pub-9605564713228252/3146574176
 *   Native (general):     ca-app-pub-9605564713228252/4713172172
 */
export default function AdMobManager() {
  useEffect(() => {
    // 1. Native shell: kick the AdMob SDK to life.
    try {
      const ua = (navigator.userAgent || '').toLowerCase();
      const isDespia = ua.includes('despia') || typeof (window as any).despia === 'function';
      if (isDespia) {
        // Initialize ads pipeline.
        try { despia('initializeAds://'); } catch {}
        // Tell the shell our App ID, in case the runtime needs it explicitly.
        try { despia('admobappid://?id=ca-app-pub-9605564713228252~8941826330'); } catch {}
      }
    } catch {
      /* no-op: native bridge not present */
    }

    // 2. Web / WebView for Ads: ensure the AdSense queue exists so individual
    //    <AdSpace /> components can push their ad requests to Google.
    try {
      (window as any).adsbygoogle = (window as any).adsbygoogle || [];
    } catch {
      /* ignore */
    }
  }, []);

  return null;
}
