// Global Despia native shell type declarations.
//
// The Despia native wrapper injects two things at runtime:
//   1. A global `despia(command)` function — used to dispatch native bridge
//      commands like `despia("takescreenshot://")` for screenshot capture,
//      `despia("vibrate://")`, etc.
//   2. A `window.despia.AdMob` object — for banner/native AdMob ads.
//
// On the web (outside the native shell) both are undefined.

export {};

declare global {
  /**
   * Despia native bridge function. Call with a URL-style command, e.g.
   * `despia("takescreenshot://")` to capture a screenshot to the device gallery.
   * Only defined inside the Despia native wrapper.
   */
  function despia(command: string): void;

  interface Window {
    /** Same `despia()` function attached to window for safe access checks. */
    despia?: ((command: string) => void) & {
      AdMob?: {
        initialize?: (options?: {
          appId?: string;
          requestTrackingAuthorization?: boolean;
        }) => Promise<void>;
        showBanner: (options: {
          adId: string;
          position?: 'top' | 'bottom';
          autoShow?: boolean;
        }) => Promise<void>;
        hideBanner: () => Promise<void>;
        showNative?: (options: {
          adId: string;
          containerId?: string;
        }) => Promise<void>;
        hideNative?: (containerId?: string) => Promise<void>;
      };
    };
  }
}
