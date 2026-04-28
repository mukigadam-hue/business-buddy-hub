import { useEffect } from 'react';
import despia from 'despia-native';

/**
 * AdMobManager
 *
 * Initializes the Despia native bridge once on app mount and pre-warms the
 * Google ad tag queue used by Despia's WebView API for Ads pipeline.
 *
 * Despia's inline AdMob support is activated in the native wrapper after the
 * app is rebuilt with AdMob enabled. The web layer should only initialize the
 * bridge and render standard Google ad tags when slots become visible.
 *
 * Real AdMob IDs used by this project:
 *   App ID:               ca-app-pub-9605564713228252~8941826330
 *   Banner unit:          ca-app-pub-9605564713228252/4713172172
 *   Native (home) unit:   ca-app-pub-9605564713228252/3146574176
 *   Native (general):     ca-app-pub-9605564713228252/4713172172
 */
export default function AdMobManager() {
  useEffect(() => {
    // 1. Native shell: wake the AdMob pipeline immediately on app startup.
    try {
      despia('initializeAds://');
      despia('admobappid://?id=ca-app-pub-9605564713228252~8941826330');
    } catch {
      /* no-op: native bridge not present */
    }

    // 2. Web / WebView for Ads: ensure the queue exists before slots mount.
    try {
      (window as any).adsbygoogle = (window as any).adsbygoogle || [];
    } catch {
      /* ignore */
    }
  }, []);

  return null;
}
