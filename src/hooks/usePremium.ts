import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/context/BusinessContext';

export interface PremiumLimits {
  isPremium: boolean;
  loading: boolean;
  /** Business / Factory limits */
  maxWorkers: number;       // 3 for free, Infinity for premium
  maxContacts: number;      // 15 for free, Infinity for premium
  canUploadItemPhotos: boolean;
  canShareReceipts: boolean;
  canDownloadReceipts: boolean;
  canPrintReceipts: boolean;
  canUseScanner: boolean;
  canScreenshot: boolean;
  showAds: boolean;
  /** Property / FlexRent limits */
  maxAssets: number;          // 3 for free, Infinity for premium
  maxPropertyWorkers: number; // 1 for free, Infinity for premium
  maxRenters: number;         // 15 for free, Infinity for premium
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
  // Premium enforcement is disabled for now — all users get full access.
  // The subscription table still exists in the database for future use.
  // To re-enable, restore the original logic that checks is_premium RPC.
  //
  // FREE PLAN LIMITS (per business/factory/property):
  //   Business & Factory:
  //     - maxWorkers: 3 team members
  //     - maxContacts: 15 contacts
  //     - canUploadItemPhotos: false (except business logo)
  //     - canDownloadReceipts / canPrintReceipts: false
  //     - canUseScanner / canScreenshot: false
  //     - showAds: true
  //   Property / FlexRent:
  //     - maxAssets: 3 assets
  //     - maxPropertyWorkers: 1 staff member in Team
  //     - maxRenters: 15 tenants/renters
  //     - canUploadAssetPhotos: false (except business logo)
  //     - canDownloadReceipts / canPrintReceipts: false
  //     - showAds: true
  //
  // NOTE: Limits apply per-entity. A free user can create multiple
  // businesses/factories/properties, each getting fresh limits.
  // This maximises ad impressions across entities.
  return PREMIUM_LIMITS;
}
