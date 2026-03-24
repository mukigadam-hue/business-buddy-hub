import { useState, useEffect } from 'react';

const STORAGE_KEY = 'biztrack_currency_symbol';

// Custom event for same-tab currency updates
const CURRENCY_EVENT = 'biztrack_currency_changed';

export function useCurrency() {
  const [currency, setCurrencyState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) || 'KSh';
  });

  function setCurrency(symbol: string) {
    localStorage.setItem(STORAGE_KEY, symbol);
    setCurrencyState(symbol);
    // Broadcast to all instances in same tab
    window.dispatchEvent(new CustomEvent(CURRENCY_EVENT, { detail: symbol }));
    // Also broadcast cross-tab
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: symbol }));
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
  function syncFromBusiness(businessCurrencySymbol: string | undefined) {
    if (businessCurrencySymbol && businessCurrencySymbol !== currency) {
      localStorage.setItem(STORAGE_KEY, businessCurrencySymbol);
      setCurrencyState(businessCurrencySymbol);
    }
  }

  function fmt(amount: number): string {
    const formatted = amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${currency} ${formatted}`;
  }

  return { currency, setCurrency, syncFromBusiness, fmt };
}
