# WebViewGold — On-Demand Interstitial Setup (REQUIRED, one-time, ~30 lines)

## Why this is needed

WebViewGold presents interstitials after every `SHOW_AD_AFTER_X` **website
interactions**, and that counter only increments on **real page loads**.
BizTrack is a single-page app (React Router never reloads the WebView), so the
counter never reaches X: AdMob shows a **100% match rate with 0 impressions**
— the ad loads silently but is never presented. No `SHOW_AD_AFTER_X` value can
fix an SPA.

The web app therefore fires two custom URL schemes, exactly like WebViewGold's
own documented schemes (`enableads://`, `displayrewardedad://`):

| Scheme                    | Native action                                            |
| ------------------------- | -------------------------------------------------------- |
| `preloadinterstitial://`  | Load the next interstitial silently in the background    |
| `showinterstitial://`     | Present the preloaded interstitial immediately           |

The web app fires `preloadinterstitial://` at startup and after every ad, and
`showinterstitial://` 600 ms after a receipt is closed (natural transition
point, AdMob-policy compliant, max one per 60 seconds).

## Step 1 — Open `MainActivity.java`

Find `shouldOverrideUrlLoading` (search for `enableads` — the other scheme
handlers are all there).

## Step 2 — Paste the two scheme handlers

Inside `shouldOverrideUrlLoading`, next to the existing `else if` blocks:

```java
else if (url.startsWith("showinterstitial://")) {
    showInterstitialAdNow();
    return true;
}
else if (url.startsWith("preloadinterstitial://")) {
    preloadInterstitialAd();
    return true;
}
```

## Step 3 — Announce support to the web app (REQUIRED)

For safety, the web app **never fires the custom schemes until the native
build announces that the handlers exist** (an unhandled scheme navigation
would crash the WebView with `net::ERR_UNKNOWN_URL_SCHEME`). Add this one
call so the announcement happens on every page load — in `onPageFinished`
(or directly after your WebView is set up):

```java
webView.evaluateJavascript(
    "try{window.WebViewGoldInterstitial=true;localStorage.setItem('bm:wvg-bridge:supported','1');}catch(e){}",
    null);
```

Once this runs on a device even once, the web app remembers it
(`localStorage`) and enables `preloadinterstitial://` / `showinterstitial://`
permanently on that device.

## Step 4 — Paste the two helper methods

Anywhere inside the `MainActivity` class body:

```java
// ===== BizTrack on-demand interstitial =====
private com.google.android.gms.ads.interstitial.InterstitialAd bizInterstitial;
private boolean bizInterstitialLoading = false;

private void preloadInterstitialAd() {
    if (bizInterstitialLoading || bizInterstitial != null) return; // already ready/loading
    bizInterstitialLoading = true;
    com.google.android.gms.ads.interstitial.InterstitialAd.load(
        this,
        // Use the SAME interstitial ad unit ID that SHOW_FULL_SCREEN_AD uses.
        // Either reference the strings.xml resource your template already uses…
        getString(R.string.admob_fullscreen_id),
        // …or paste the unit ID directly:
        // "ca-app-pub-9605564713228252/9382423774",
        new com.google.android.gms.ads.AdRequest.Builder().build(),
        new com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback() {
            @Override
            public void onAdLoaded(com.google.android.gms.ads.interstitial.InterstitialAd ad) {
                bizInterstitialLoading = false;
                bizInterstitial = ad;
            }
            @Override
            public void onAdFailedToLoad(com.google.android.gms.ads.LoadAdError error) {
                bizInterstitialLoading = false;
                bizInterstitial = null;
            }
        });
}

private void showInterstitialAdNow() {
    if (bizInterstitial != null) {
        final com.google.android.gms.ads.interstitial.InterstitialAd ad = bizInterstitial;
        bizInterstitial = null;
        ad.setFullScreenContentCallback(new com.google.android.gms.ads.FullScreenContentCallback() {
            @Override
            public void onAdDismissedFullScreenContent() {
                preloadInterstitialAd(); // silently warm the next one
            }
            @Override
            public void onAdFailedToShowFullScreenContent(com.google.android.gms.ads.AdError e) {
                preloadInterstitialAd();
            }
        });
        ad.show(this);
    } else {
        preloadInterstitialAd(); // not loaded yet — warm it for the next trigger
    }
}
```

> **Older template?** If your `MainActivity.java` uses the legacy
> `com.google.android.gms.ads.InterstitialAd` (with `isLoaded()` / `show()`
> and no `Activity` argument), reuse the variable your template already loads
> for `SHOW_FULL_SCREEN_AD`: the handlers become
> `if (mInterstitialAd.isLoaded()) { mInterstitialAd.show(); } else { /* your template's load call */ }`.

## Step 5 — Rebuild

Build → Generate Signed Bundle/APK and install the new build. The schemes only
exist once this snippet is compiled into the app — until then the web app
silently skips them, so the app always opens normally.

## Verification checklist

1. Open the app → logcat shows no scheme errors; the first interstitial
   preloads silently in the background.
2. Record a sale → close the receipt → within ~1 s the interstitial appears.
3. Close the ad → the next one preloads silently; subsequent receipt closures
   show it (at most once per 60 s).
4. AdMob dashboard: the interstitial ad unit starts reporting **impressions**
   (not just match rate).
