import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { usePremium } from '@/hooks/usePremium';
import { useAdRefresh } from '@/hooks/useAdRefresh';
import despia from 'despia-native';

/**
 * Real Google AdMob / AdSense ad slot.
 *
 * Inside the Despia native shell these <ins class="adsbygoogle"> tags are
 * served by the native AdMob SDK ("WebView for Ads"), so each render
 * generates a real ad request that shows up in your AdMob dashboard.
 * On the web they are served by Google AdSense.
 *
 * The component:
 *  - hides itself for premium users,
 *  - pushes a real ad request on mount and on every 60s refresh tick,
 *  - additionally fires `despia('displaynativead://?adid=...')` inside the
 *    native shell as a hint so the runtime preloads inventory.
 */

const ADSENSE_CLIENT = 'ca-pub-9605564713228252';

// Real AdMob ad unit IDs (slot portion mirrors the AdMob unit).
const SLOT_BY_VARIANT: Record<NonNullable<AdSpaceProps['variant']>, string> = {
  banner: '4713172172',
  inline: '3146574176',
  compact: '4713172172',
};

const NATIVE_AD_UNIT_BY_VARIANT: Record<NonNullable<AdSpaceProps['variant']>, string> = {
  banner: 'ca-app-pub-9605564713228252/4713172172',
  inline: 'ca-app-pub-9605564713228252/3146574176',
  compact: 'ca-app-pub-9605564713228252/4713172172',
};

interface AdSpaceProps {
  variant?: 'banner' | 'inline' | 'compact';
  className?: string;
  slotId?: string;
}

export default function AdSpace({ variant = 'banner', className, slotId }: AdSpaceProps) {
  const { showAds } = usePremium();
  const id = slotId || `adspace-${variant}`;
  const { refreshKey, onAdLoaded } = useAdRefresh(id);
  const insRef = useRef<HTMLModElement | null>(null);
  const pushedRef = useRef(false);
  const [failed, setFailed] = useState(false);

  // Force a real ad request on mount and on each refresh tick.
  useEffect(() => {
    if (!showAds) return;
    // Reset for new refresh cycle.
    pushedRef.current = false;
    setFailed(false);

    const tryPush = () => {
      if (pushedRef.current) return;
      try {
        const w = window as any;
        w.adsbygoogle = w.adsbygoogle || [];
        w.adsbygoogle.push({});
        pushedRef.current = true;
        onAdLoaded();
      } catch (err) {
        setFailed(true);
      }
    };

    // Hint to the native Despia shell to preload native inventory.
    try {
      const ua = (navigator.userAgent || '').toLowerCase();
      if (ua.includes('despia') || typeof (window as any).despia === 'function') {
        const adId = NATIVE_AD_UNIT_BY_VARIANT[variant];
        try { despia(`displaynativead://?adid=${encodeURIComponent(adId)}`); } catch {}
      }
    } catch {}

    // Defer slightly to ensure adsbygoogle.js has loaded.
    const t = setTimeout(tryPush, 50);
    return () => clearTimeout(t);
  }, [showAds, variant, refreshKey, onAdLoaded]);

  if (!showAds) return null;

  const slot = SLOT_BY_VARIANT[variant];

  return (
    <div
      key={refreshKey}
      className={cn(
        'w-full overflow-hidden rounded-lg bg-muted/20 transition-none',
        variant === 'banner' && 'min-h-[80px]',
        variant === 'inline' && 'min-h-[100px]',
        variant === 'compact' && 'min-h-[60px]',
        className,
      )}
    >
      <ins
        ref={insRef}
        className="adsbygoogle block w-full"
        style={{ display: 'block', width: '100%', minHeight: variant === 'compact' ? 60 : variant === 'banner' ? 80 : 100 }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format={variant === 'inline' ? 'fluid' : 'auto'}
        data-full-width-responsive="true"
      />
      {failed && (
        <div className="flex items-center justify-center py-2 text-[10px] uppercase tracking-widest text-muted-foreground/60">
          Sponsored
        </div>
      )}
    </div>
  );
}

/**
 * Utility: interleave ad placeholders every `interval` items in a list.
 */
export function withInlineAds<T>(
  items: T[],
  renderItem: (item: T, index: number) => React.ReactNode,
  interval = 8,
): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  items.forEach((item, i) => {
    result.push(renderItem(item, i));
    if ((i + 1) % interval === 0 && i + 1 < items.length) {
      result.push(<AdSpace key={`ad-${i}`} variant="inline" />);
    }
  });
  return result;
}
