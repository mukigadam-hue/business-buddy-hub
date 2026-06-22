// Country dial codes + currency, ordered with East Africa first (primary market).
export interface Country {
  code: string;            // ISO2
  name: string;
  dial: string;            // e.g. "+256"
  phonePrefix: string;     // alias of dial, used by some legacy components
  flag: string;
  currencySymbol: string;
  language: string;        // primary BCP-47 language tag (e.g. "en", "sw")
}

const RAW: Array<Omit<Country, "phonePrefix">> = [
  { code: "UG", name: "Uganda",          dial: "+256", flag: "🇺🇬", currencySymbol: "USh", language: "en" },
  { code: "KE", name: "Kenya",           dial: "+254", flag: "🇰🇪", currencySymbol: "KSh", language: "sw" },
  { code: "TZ", name: "Tanzania",        dial: "+255", flag: "🇹🇿", currencySymbol: "TSh", language: "sw" },
  { code: "RW", name: "Rwanda",          dial: "+250", flag: "🇷🇼", currencySymbol: "RF",  language: "rw" },
  { code: "BI", name: "Burundi",         dial: "+257", flag: "🇧🇮", currencySymbol: "FBu", language: "fr" },
  { code: "SS", name: "South Sudan",     dial: "+211", flag: "🇸🇸", currencySymbol: "SSP", language: "en" },
  { code: "ET", name: "Ethiopia",        dial: "+251", flag: "🇪🇹", currencySymbol: "Br",  language: "am" },
  { code: "CD", name: "DR Congo",        dial: "+243", flag: "🇨🇩", currencySymbol: "FC",  language: "fr" },
  { code: "NG", name: "Nigeria",         dial: "+234", flag: "🇳🇬", currencySymbol: "₦",   language: "en" },
  { code: "GH", name: "Ghana",           dial: "+233", flag: "🇬🇭", currencySymbol: "₵",   language: "en" },
  { code: "ZA", name: "South Africa",    dial: "+27",  flag: "🇿🇦", currencySymbol: "R",   language: "en" },
  { code: "EG", name: "Egypt",           dial: "+20",  flag: "🇪🇬", currencySymbol: "E£",  language: "ar" },
  { code: "GB", name: "United Kingdom",  dial: "+44",  flag: "🇬🇧", currencySymbol: "£",   language: "en" },
  { code: "US", name: "United States",   dial: "+1",   flag: "🇺🇸", currencySymbol: "$",   language: "en" },
  { code: "CA", name: "Canada",          dial: "+1",   flag: "🇨🇦", currencySymbol: "C$",  language: "en" },
  { code: "IN", name: "India",           dial: "+91",  flag: "🇮🇳", currencySymbol: "₹",   language: "hi" },
  { code: "PK", name: "Pakistan",        dial: "+92",  flag: "🇵🇰", currencySymbol: "₨",   language: "ur" },
  { code: "AE", name: "UAE",             dial: "+971", flag: "🇦🇪", currencySymbol: "AED", language: "ar" },
  { code: "SA", name: "Saudi Arabia",    dial: "+966", flag: "🇸🇦", currencySymbol: "SAR", language: "ar" },
  { code: "DE", name: "Germany",         dial: "+49",  flag: "🇩🇪", currencySymbol: "€",   language: "de" },
  { code: "FR", name: "France",          dial: "+33",  flag: "🇫🇷", currencySymbol: "€",   language: "fr" },
  { code: "CN", name: "China",           dial: "+86",  flag: "🇨🇳", currencySymbol: "¥",   language: "zh" },
  { code: "AU", name: "Australia",       dial: "+61",  flag: "🇦🇺", currencySymbol: "A$",  language: "en" },
];

export const COUNTRIES: Country[] = RAW.map((c) => ({ ...c, phonePrefix: c.dial }));

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
