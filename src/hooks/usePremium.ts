import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PremiumLimits {
  isPremium: boolean;
  loading: boolean;
  maxWorkers: number;
  maxContacts: number;
  canUploadItemPhotos: boolean;
  canShareReceipts: boolean;
  canDownloadReceipts: boolean;
  canPrintReceipts: boolean;
  canUseScanner: boolean;
  canScreenshot: boolean;
  showAds: boolean;
  maxAssets: number;
  maxPropertyWorkers: number;
  maxRenters: number;
  canUploadAssetPhotos: boolean;
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
  maxAssets: 3,
  maxPropertyWorkers: 1,
  maxRenters: 15,
  canUploadAssetPhotos: false,
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
  maxAssets: Infinity,
  maxPropertyWorkers: Infinity,
  maxRenters: Infinity,
  canUploadAssetPhotos: true,
};

/**
 * Premium is determined by the BUSINESS OWNER's subscription, not the current user.
 * - If a worker is at a premium-subscribed business, they get premium features THERE.
 * - If that worker switches to their own non-premium business, they lose premium features.
 * - If a premium user is working at a non-premium boss's business, no premium there.
 * 
 * Pass businessOwnerId to check that specific business owner's premium status.
 * If not provided, falls back to the current user's own premium status.
 */
export function usePremium(businessOwnerId?: string): PremiumLimits {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) { setLoading(false); return; }

      // Check the business owner's premium status (or current user if no owner specified)
      const checkId = businessOwnerId || user.id;

      const { data } = await supabase
        .from('profiles')
        .select('is_premium')
        .eq('id', checkId)
        .single();

      if (!cancelled) {
        setIsPremium(data?.is_premium ?? false);
        setLoading(false);
      }
    }

    check();
    return () => { cancelled = true; };
  }, [businessOwnerId]);

  if (loading) return { ...FREE_LIMITS, loading: true };
  return isPremium ? PREMIUM_LIMITS : FREE_LIMITS;
}
