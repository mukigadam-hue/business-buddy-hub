// Country dial codes + currency, ordered with East Africa first (primary market).
export interface Country {
  code: string;        // ISO2
  name: string;
  dial: string;        // e.g. "+256" (alias: phonePrefix)
  phonePrefix: string; // same as dial
  flag: string;
  currencySymbol: string;
  language: string;    // primary language code (e.g. "en")
}

export const COUNTRIES: Country[] = [
  { code: "UG", name: "Uganda",          dial: "+256", flag: "🇺🇬", currencySymbol: "USh" },
  { code: "KE", name: "Kenya",           dial: "+254", flag: "🇰🇪", currencySymbol: "KSh" },
  { code: "TZ", name: "Tanzania",        dial: "+255", flag: "🇹🇿", currencySymbol: "TSh" },
  { code: "RW", name: "Rwanda",          dial: "+250", flag: "🇷🇼", currencySymbol: "RF" },
  { code: "BI", name: "Burundi",         dial: "+257", flag: "🇧🇮", currencySymbol: "FBu" },
  { code: "SS", name: "South Sudan",     dial: "+211", flag: "🇸🇸", currencySymbol: "SSP" },
  { code: "ET", name: "Ethiopia",        dial: "+251", flag: "🇪🇹", currencySymbol: "Br" },
  { code: "CD", name: "DR Congo",        dial: "+243", flag: "🇨🇩", currencySymbol: "FC" },
  { code: "NG", name: "Nigeria",         dial: "+234", flag: "🇳🇬", currencySymbol: "₦" },
  { code: "GH", name: "Ghana",           dial: "+233", flag: "🇬🇭", currencySymbol: "₵" },
  { code: "ZA", name: "South Africa",    dial: "+27",  flag: "🇿🇦", currencySymbol: "R" },
  { code: "EG", name: "Egypt",           dial: "+20",  flag: "🇪🇬", currencySymbol: "E£" },
  { code: "GB", name: "United Kingdom",  dial: "+44",  flag: "🇬🇧", currencySymbol: "£" },
  { code: "US", name: "United States",   dial: "+1",   flag: "🇺🇸", currencySymbol: "$" },
  { code: "CA", name: "Canada",          dial: "+1",   flag: "🇨🇦", currencySymbol: "C$" },
  { code: "IN", name: "India",           dial: "+91",  flag: "🇮🇳", currencySymbol: "₹" },
  { code: "PK", name: "Pakistan",        dial: "+92",  flag: "🇵🇰", currencySymbol: "₨" },
  { code: "AE", name: "UAE",             dial: "+971", flag: "🇦🇪", currencySymbol: "AED" },
  { code: "SA", name: "Saudi Arabia",    dial: "+966", flag: "🇸🇦", currencySymbol: "SAR" },
  { code: "DE", name: "Germany",         dial: "+49",  flag: "🇩🇪", currencySymbol: "€" },
  { code: "FR", name: "France",          dial: "+33",  flag: "🇫🇷", currencySymbol: "€" },
  { code: "CN", name: "China",           dial: "+86",  flag: "🇨🇳", currencySymbol: "¥" },
  { code: "AU", name: "Australia",       dial: "+61",  flag: "🇦🇺", currencySymbol: "A$" },
];

// Back-compat alias used elsewhere in the app.
export const countries = COUNTRIES;

export function getCountryByCode(code: string | null | undefined): Country | undefined {
  if (!code) return undefined;
  const upper = code.toUpperCase();
  return COUNTRIES.find((c) => c.code === upper);
}

export function getCountryFlag(code: string | null | undefined): string {
  return getCountryByCode(code)?.flag ?? "🌐";
}

export function detectDefaultCountry(): Country {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (tz.startsWith("Africa/Kampala")) return COUNTRIES[0];
    if (tz.startsWith("Africa/Nairobi")) return COUNTRIES[1];
    if (tz.startsWith("Africa/Dar")) return COUNTRIES[2];
    if (tz.startsWith("Africa/Kigali")) return COUNTRIES[3];
    if (tz.startsWith("Africa/Bujumbura")) return COUNTRIES[4];
    if (tz.startsWith("Africa/Juba")) return COUNTRIES[5];
    if (tz.startsWith("Africa/Addis")) return COUNTRIES[6];
    if (tz.startsWith("Africa/Lagos")) return COUNTRIES[8];
    if (tz.startsWith("Africa/Accra")) return COUNTRIES[9];
    if (tz.startsWith("Africa/Johannesburg")) return COUNTRIES[10];
    if (tz.startsWith("Africa/Cairo")) return COUNTRIES[11];
    if (tz.startsWith("Europe/London")) return COUNTRIES[12];
    if (tz.startsWith("America/")) return COUNTRIES[13];
    if (tz.startsWith("Asia/Kolkata") || tz.startsWith("Asia/Calcutta")) return COUNTRIES[15];
    if (tz.startsWith("Asia/Dubai")) return COUNTRIES[17];
    if (tz.startsWith("Europe/Berlin")) return COUNTRIES[19];
    if (tz.startsWith("Europe/Paris")) return COUNTRIES[20];
    if (tz.startsWith("Asia/Shanghai")) return COUNTRIES[21];
    if (tz.startsWith("Australia/")) return COUNTRIES[22];
  } catch {}
  return COUNTRIES[0];
}
