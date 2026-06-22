// Maps ISO country codes to their local currency display symbol.
// Used in Discover so each business is shown in its own country's currency,
// unless the owner has intentionally selected a non-default international symbol.

export const COUNTRY_CURRENCY: Record<string, string> = {
  // East Africa
  KE: 'KSh',
  UG: 'UGX',
  TZ: 'TSh',
  RW: 'RWF',
  BI: 'FBu',
  SS: 'SSP',
  ET: 'Br',
  SO: 'Sh.So.',
  DJ: 'Fdj',
  ER: 'Nfk',

  // West Africa (CFA franc BCEAO – XOF)
  BJ: 'CFA', BF: 'CFA', CI: 'CFA', GW: 'CFA', ML: 'CFA',
  NE: 'CFA', SN: 'CFA', TG: 'CFA',

  // Central Africa (CFA franc BEAC – XAF)
  CM: 'FCFA', CF: 'FCFA', TD: 'FCFA', CG: 'FCFA', GQ: 'FCFA', GA: 'FCFA',

  // Other African
  NG: '₦',
  GH: 'GH₵',
  ZA: 'R',
  EG: 'E£',
  MA: 'DH',
  DZ: 'DA',
  TN: 'DT',
  LY: 'LD',
  SD: 'SDG',
  ZM: 'ZK',
  ZW: 'Z$',
  MW: 'MK',
  MZ: 'MT',
  AO: 'Kz',
  NA: 'N$',
  BW: 'P',
  LS: 'L',
  SZ: 'E',
  MG: 'Ar',
  MU: '₨',
  SC: '₨',
  CD: 'FC',
  LR: 'L$',
  SL: 'Le',
  GM: 'D',
  GN: 'FG',
  CV: '$',

  // Europe (Euro zone uses €)
  DE: '€', FR: '€', IT: '€', ES: '€', PT: '€', NL: '€', BE: '€',
  AT: '€', IE: '€', FI: '€', GR: '€', LU: '€', SK: '€', SI: '€',
  EE: '€', LV: '€', LT: '€', MT: '€', CY: '€', HR: '€',
  GB: '£',
  CH: 'CHF',
  SE: 'kr', NO: 'kr', DK: 'kr', IS: 'kr',
  PL: 'zł',
  CZ: 'Kč',
  HU: 'Ft',
  RO: 'lei',
  BG: 'лв',
  RS: 'дин',
  RU: '₽',
  UA: '₴',
  TR: '₺',

  // Americas
  US: '$', CA: 'C$', MX: 'Mex$',
  BR: 'R$', AR: 'AR$', CL: 'CL$', CO: 'COL$', PE: 'S/', VE: 'Bs',
  UY: '$U', PY: '₲', BO: 'Bs', EC: '$', CR: '₡', PA: 'B/.',
  GT: 'Q', HN: 'L', NI: 'C$', SV: '$', DO: 'RD$', CU: '₱', JM: 'J$',
  HT: 'G', TT: 'TT$', BS: 'B$', BB: 'Bds$',

  // Asia
  CN: '¥', JP: '¥', KR: '₩', KP: '₩',
  IN: '₹', PK: '₨', BD: '৳', LK: 'Rs', NP: '₨', BT: 'Nu',
  ID: 'Rp', MY: 'RM', SG: 'S$', TH: '฿', PH: '₱', VN: '₫',
  KH: '៛', LA: '₭', MM: 'K', MN: '₮', TW: 'NT$', HK: 'HK$', MO: 'MOP$',
  AF: '؋', IR: '﷼', IQ: 'ع.د', SY: '£S', LB: 'ل.ل', JO: 'JD',
  IL: '₪', PS: '₪', SA: 'ر.س', AE: 'د.إ', QA: 'ر.ق', BH: 'BD',
  KW: 'KD', OM: 'ر.ع.', YE: '﷼',
  KZ: '₸', UZ: 'soʻm', KG: 'с', TJ: 'SM', TM: 'm', AZ: '₼', GE: '₾',
  AM: '֏', BY: 'Br', MD: 'L',

  // Oceania
  AU: 'A$', NZ: 'NZ$', FJ: 'FJ$', PG: 'K', SB: 'SI$', VU: 'Vt', WS: 'WS$',
};

// Currency symbols a user may legitimately set as an "international" override.
// If a stored symbol is one of these (and differs from country default), we keep it.
const INTERNATIONAL_SYMBOLS = new Set(['$', '€', '£', '¥', 'US$', 'USD', 'EUR', 'GBP']);

// Symbols that were the global default before per-country was enforced.
// Treat these as "not intentionally chosen" and override using country mapping.
const DEFAULT_OR_LEGACY_SYMBOLS = new Set([
  '', 'ksh', 'kshs', 'kes',
  'ugsh', 'ugshs', 'ugx', 'ush', 'ushs',
]);

/**
 * Resolve the currency symbol that should be shown to a viewer for a given business.
 * Rules:
 *   1. If owner has set an explicit international symbol ($, €, £, ¥) we keep it.
 *   2. If owner's stored symbol is empty / a generic legacy default (KSh, UGX variants…)
 *      → use the country's local currency.
 *   3. Otherwise keep the stored symbol (owner picked something specific & local).
 */
export function resolveDisplayCurrency(
  storedSymbol?: string | null,
  countryCode?: string | null,
): string {
  const stored = (storedSymbol || '').trim();
  const cc = (countryCode || '').trim().toUpperCase();
  const countryDefault = (cc && COUNTRY_CURRENCY[cc]) || '';

  if (stored && INTERNATIONAL_SYMBOLS.has(stored)) return stored;

  const isLegacy = DEFAULT_OR_LEGACY_SYMBOLS.has(stored.toLowerCase());
  if (!stored || isLegacy) {
    return countryDefault || stored || 'KSh';
  }

  return stored;
}
