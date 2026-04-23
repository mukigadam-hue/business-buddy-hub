import { useEffect, useState, useRef } from 'react';
import { useAdRefresh } from '@/hooks/useAdRefresh';
import '@/types/despia.d.ts';

// Production AdMob Native Ad Unit IDs
export const NATIVE_AD_UNIT_HOME = 'ca-app-pub-9605564713228252/3146574176';
export const NATIVE_AD_UNIT_GENERAL = 'ca-app-pub-9605564713228252/4713172172';

interface NativeAdProps {
  /** Which native ad unit to load. Defaults to general. */
  placement?: 'home' | 'general';
  className?: string;
  slotId?: string;
}

/**
 * Native AdMob ad component (rendered via Despia native shell).
 * Falls back to nothing on web — pair with <AdSpace /> for web fallback.
 * Auto-refreshes every 60s while visible.
 */
export default function NativeAd({ placement = 'general', className, slotId }: NativeAdProps) {
  const adUnitId = placement === 'home' ? NATIVE_AD_UNIT_HOME : NATIVE_AD_UNIT_GENERAL;
  const id = slotId || `native-${placement}`;
  const containerId = `admob-native-${id}`;
  const { refreshKey, onAdLoaded } = useAdRefresh(id);
  const [isNative, setIsNative] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    if (!window.despia?.AdMob?.showNative) return;
    setIsNative(true);

    let cancelled = false;
    const loadAd = async () => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      try {
        await window.despia?.AdMob?.hideNative?.(containerId).catch(() => {});
        if (cancelled) return;
        await window.despia?.AdMob?.showNative?.({
          adId: adUnitId,
          containerId,
        });
        if (!cancelled) {
          setError(null);
          onAdLoaded();
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Ad failed');
      } finally {
        loadingRef.current = false;
      }
    };
    loadAd();

    return () => {
      cancelled = true;
      window.despia?.AdMob?.hideNative?.(containerId).catch(() => {});
    };
  }, [adUnitId, containerId, refreshKey, onAdLoaded]);

  if (!isNative) return null;

  return (
    <div
      id={containerId}
      className={`w-full flex items-center justify-center transition-none ${className ?? ''}`}
      style={{ minHeight: 100 }}
    >
      {error && <p className="text-[10px] text-muted-foreground">{error}</p>}
    </div>
  );
}
