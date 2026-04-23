import { useEffect, useState, useRef } from 'react';
import { useAdRefresh } from '@/hooks/useAdRefresh';
import '@/types/despia.d.ts';

// Production AdMob Banner Ad Unit ID
const ADMOB_AD_UNIT_ID = 'ca-app-pub-9605564713228252/4713172172';

interface BannerAdProps {
  position?: 'top' | 'bottom';
  className?: string;
  slotId?: string;
}

export default function BannerAd({ position = 'bottom', className, slotId }: BannerAdProps) {
  const id = slotId || `banner-${position}`;
  const { refreshKey, onAdLoaded } = useAdRefresh(id);
  const [isNative, setIsNative] = useState(false);
  const [adLoaded, setAdLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    if (!window.despia) return;
    setIsNative(true);

    let cancelled = false;
    const loadAd = async () => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      try {
        // Destroy previous instance first
        await window.despia?.AdMob?.hideBanner().catch(() => {});
        if (cancelled) return;
        await window.despia?.AdMob?.showBanner({
          adId: ADMOB_AD_UNIT_ID,
          position,
          autoShow: true,
        });
        if (!cancelled) {
          setAdLoaded(true);
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
      window.despia?.AdMob?.hideBanner().catch(() => {});
    };
  }, [position, refreshKey, onAdLoaded]);

  if (!isNative) return null;

  return (
    <div
      className={`w-full flex items-center justify-center transition-none ${className ?? ''}`}
      style={{ minHeight: 50 }}
    >
      {error && <p className="text-[10px] text-muted-foreground">{error}</p>}
    </div>
  );
}
