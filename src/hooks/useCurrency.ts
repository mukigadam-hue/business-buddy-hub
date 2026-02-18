import { useState, useEffect } from 'react';

const STORAGE_KEY = 'biztrack_currency_symbol';

export function useCurrency() {
  const [currency, setCurrencyState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) || '$';
  });

  function setCurrency(symbol: string) {
    localStorage.setItem(STORAGE_KEY, symbol);
    setCurrencyState(symbol);
    // Dispatch so other hooks can sync
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: symbol }));
  }

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY && e.newValue) setCurrencyState(e.newValue);
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  function fmt(amount: number): string {
    return `${currency}${amount.toFixed(2)}`;
  }

  return { currency, setCurrency, fmt };
}
