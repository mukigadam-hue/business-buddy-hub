/**
 * bannerSpace — tiny shared store telling the layout how much bottom space
 * must be reserved for the ad banner.
 *
 * Why: on the web the reserved space used to be painted with an opaque bar even
 * when AdSense returned "unfilled", which looked like a white block floating on
 * top of the app features. Now the space is reserved ONLY when a real banner is
 * actually present (native shell banner, or a filled web AdSense banner).
 */
import { useEffect, useState } from 'react';
import { BANNER_HEIGHT_PX, isNativeShell } from './nativeAdBridge';

let reserved = 0;
const listeners = new Set<(px: number) => void>();

export function setBannerReserved(px: number) {
  if (reserved === px) return;
  reserved = px;
  listeners.forEach(fn => fn(reserved));
}

export function getBannerReserved(): number {
  // The native shell always overlays a real AdMob banner, so its space must be
  // reserved unconditionally or the bottom navigation becomes untappable.
  if (isNativeShell()) return BANNER_HEIGHT_PX;
  return reserved;
}

export function useBannerReserved(): number {
  const [px, setPx] = useState(() => getBannerReserved());
  useEffect(() => {
    const fn = () => setPx(getBannerReserved());
    listeners.add(fn);
    fn();
    return () => { listeners.delete(fn); };
  }, []);
  return px;
}
