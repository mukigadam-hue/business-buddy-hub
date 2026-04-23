// Global Despia native shell + AdMob bridge types.
// The Despia shell injects `window.despia.AdMob` at runtime when the app
// runs inside the native wrapper. On web these are undefined.

export {};

declare global {
  interface Window {
    despia?: {
      AdMob?: {
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
