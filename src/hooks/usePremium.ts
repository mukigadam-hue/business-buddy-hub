import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/context/BusinessContext';

export interface PremiumLimits {
  isPremium: boolean;
  loading: boolean;
  /** Free plan limits */
  maxWorkers: number;       // 3 for free, Infinity for premium
  maxContacts: number;      // 15 for free, Infinity for premium
  canUploadItemPhotos: boolean;
  canShareReceipts: boolean;
  canDownloadReceipts: boolean;
  canPrintReceipts: boolean;
  canUseScanner: boolean;
  canScreenshot: boolean;
  showAds: boolean;
}

const FREE_LIMITS: PremiumLimits = {
  isPremium: false,
  loading: false,
  maxWorkers: 3,
  maxContacts: 15,
  canUploadItemPhotos: false,
  canShareReceipts: false,
  canDownloadReceipts: false,
  canPrintReceipts: false,
  canUseScanner: false,
  canScreenshot: false,
  showAds: true,
};

const PREMIUM_LIMITS: PremiumLimits = {
  isPremium: true,
  loading: false,
  maxWorkers: Infinity,
  maxContacts: Infinity,
  canUploadItemPhotos: true,
  canShareReceipts: true,
  canDownloadReceipts: true,
  canPrintReceipts: true,
  canUseScanner: true,
  canScreenshot: true,
  showAds: false,
};

export function usePremium(): PremiumLimits {
  const { currentBusiness } = useBusiness();
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentBusiness?.id) { setLoading(false); return; }

    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .rpc('is_premium', { _business_id: currentBusiness.id });
        if (!cancelled) setIsPremium(!!data && !error);
      } catch {
        if (!cancelled) setIsPremium(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [currentBusiness?.id]);

  if (loading) return { ...FREE_LIMITS, loading: true };
  return isPremium ? PREMIUM_LIMITS : FREE_LIMITS;
}
