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
 * Premium is determined by the BUSINESS OWNER's subscription status.
 * 
 * Rules:
 * - Worker at a premium business → gets premium features at THAT business only
 * - Worker switches to own non-premium business → no premium features
 * - Premium user working at non-premium boss's business → no premium at that business
 * - Expired premium → existing photos stay visible, but no new uploads/changes allowed
 * 
 * Automatically reads the current business owner from localStorage cache.
 */
export function usePremium(): PremiumLimits {
  // TESTING MODE: All features are free until premium is activated
  return PREMIUM_LIMITS;
}
