import { adLog, APP_ADS_DOMAIN, ADMOB_APP_ID, ADMOB_INTERSTITIAL_AD_UNIT_ID } from '@/lib/despiaAds';
import { initInterstitialAds } from '@/lib/interstitialAd';
import { getAdLocale, bridgePreloadInterstitial } from '@/lib/nativeAdBridge';
import i18n from '@/i18n';
import { useEffect } from 'react';

/**
 * AdMobManager — initializes the AdMob SDK at app launch and preloads the
 * first interstitial in the background so it's ready before the first trigger.
 * Ads are localized: the current i18n language + device region are passed to
 * the native shell so AdMob serves creatives in the user's country language.
 */
export { adLog, APP_ADS_DOMAIN };

export default function AdMobManager() {
  useEffect(() => {
    const { locale } = getAdLocale();
    adLog(`[AD-INFO] AdMob App ID: ${ADMOB_APP_ID}`);
    adLog(`[AD-INFO] app-ads.txt: ${APP_ADS_DOMAIN}/app-ads.txt`);
    adLog(`[AD-INFO] Interstitial Ad Unit: ${ADMOB_INTERSTITIAL_AD_UNIT_ID}`);
    adLog(`[AD-INFO] Locale for ad targeting: ${locale}`);
    adLog('[AD-INFO] Initializing AdMob SDK + preloading interstitial...');
    initInterstitialAds();

    // When the user switches app language, re-preload so the next ad is in
    // the newly-selected language.
    const onLang = (lng: string) => {
      adLog(`[AD-INFO] Language changed to ${lng} — re-preloading interstitial`);
      try { bridgePreloadInterstitial(); } catch {}
    };
    i18n.on('languageChanged', onLang);
    return () => { i18n.off('languageChanged', onLang); };
  }, []);
  return null;
}
