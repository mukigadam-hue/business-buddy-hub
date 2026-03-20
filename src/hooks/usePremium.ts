import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

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

export function usePremium(): PremiumLimits {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) { setLoading(false); return; }

      const { data } = await supabase
        .from('profiles')
        .select('is_premium')
        .eq('id', user.id)
        .single();

      if (!cancelled) {
        setIsPremium(data?.is_premium ?? false);
        setLoading(false);
      }
    }

    check();
    return () => { cancelled = true; };
  }, []);

  if (loading) return { ...FREE_LIMITS, loading: true };
  return isPremium ? PREMIUM_LIMITS : FREE_LIMITS;
}
