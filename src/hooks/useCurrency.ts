import { useState, useEffect } from 'react';

const STORAGE_KEY = 'biztrack_currency_symbol';

export function useCurrency() {
  const [currency, setCurrencyState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) || 'KSh';
  });

  function setCurrency(symbol: string) {
    localStorage.setItem(STORAGE_KEY, symbol);
    setCurrencyState(symbol);
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
    // Format with thousand separators
    const formatted = amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${currency} ${formatted}`;
  }

  return { currency, setCurrency, fmt };
}
