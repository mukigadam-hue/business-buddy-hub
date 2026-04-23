import { useState, useEffect } from 'react';

const STORAGE_KEY = 'biztrack_currency_symbol';
const OVERRIDE_KEY_PREFIX = 'biztrack_currency_override_';

// Custom event for same-tab currency updates
const CURRENCY_EVENT = 'biztrack_currency_changed';

function getOverrideKey(businessId: string) {
  return `${OVERRIDE_KEY_PREFIX}${businessId}`;
}

export function getCurrencyOverride(businessId?: string) {
  if (!businessId) return null;
  return localStorage.getItem(getOverrideKey(businessId));
}

export function resolveCurrencySymbol(businessId?: string, businessCurrencySymbol?: string) {
  return getCurrencyOverride(businessId) || businessCurrencySymbol || localStorage.getItem(STORAGE_KEY) || 'KSh';
}

export function broadcastCurrency(symbol: string) {
  window.dispatchEvent(new CustomEvent(CURRENCY_EVENT, { detail: symbol }));
  window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: symbol }));
}

export function useCurrency() {
  const [currency, setCurrencyState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) || 'KSh';
  });

  function setCurrency(symbol: string, options?: { businessId?: string; persistAsOverride?: boolean }) {
    localStorage.setItem(STORAGE_KEY, symbol);
    if (options?.businessId) {
      const overrideKey = getOverrideKey(options.businessId);
      if (options.persistAsOverride) localStorage.setItem(overrideKey, symbol);
      else localStorage.removeItem(overrideKey);
    }
    setCurrencyState(symbol);
    broadcastCurrency(symbol);
  }

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY && e.newValue) setCurrencyState(e.newValue);
    }
    function onCustom(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail) setCurrencyState(detail);
    }
    window.addEventListener('storage', onStorage);
    window.addEventListener(CURRENCY_EVENT, onCustom);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(CURRENCY_EVENT, onCustom);
    };
  }, []);

  // Sync from business context when business data updates via realtime
  function syncFromBusiness(businessCurrencySymbol: string | undefined, businessId?: string) {
    const resolved = resolveCurrencySymbol(businessId, businessCurrencySymbol);
    if (resolved && resolved !== currency) {
      localStorage.setItem(STORAGE_KEY, resolved);
      setCurrencyState(resolved);
    }
  }

  function fmt(amount: number): string {
    const formatted = amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${currency} ${formatted}`;
  }

  return { currency, setCurrency, syncFromBusiness, fmt };
}
