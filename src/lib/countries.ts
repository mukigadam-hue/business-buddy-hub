// Minimal country dial code list, ordered with East Africa first (app's primary market).
export interface Country {
  code: string;        // ISO2
  name: string;
  dial: string;        // e.g. "+256"
  flag: string;
}

export const COUNTRIES: Country[] = [
  { code: "UG", name: "Uganda",          dial: "+256", flag: "🇺🇬" },
  { code: "KE", name: "Kenya",           dial: "+254", flag: "🇰🇪" },
  { code: "TZ", name: "Tanzania",        dial: "+255", flag: "🇹🇿" },
  { code: "RW", name: "Rwanda",          dial: "+250", flag: "🇷🇼" },
  { code: "BI", name: "Burundi",         dial: "+257", flag: "🇧🇮" },
  { code: "SS", name: "South Sudan",     dial: "+211", flag: "🇸🇸" },
  { code: "ET", name: "Ethiopia",        dial: "+251", flag: "🇪🇹" },
  { code: "CD", name: "DR Congo",        dial: "+243", flag: "🇨🇩" },
  { code: "NG", name: "Nigeria",         dial: "+234", flag: "🇳🇬" },
  { code: "GH", name: "Ghana",           dial: "+233", flag: "🇬🇭" },
  { code: "ZA", name: "South Africa",    dial: "+27",  flag: "🇿🇦" },
  { code: "EG", name: "Egypt",           dial: "+20",  flag: "🇪🇬" },
  { code: "GB", name: "United Kingdom",  dial: "+44",  flag: "🇬🇧" },
  { code: "US", name: "United States",   dial: "+1",   flag: "🇺🇸" },
  { code: "CA", name: "Canada",          dial: "+1",   flag: "🇨🇦" },
  { code: "IN", name: "India",           dial: "+91",  flag: "🇮🇳" },
  { code: "PK", name: "Pakistan",        dial: "+92",  flag: "🇵🇰" },
  { code: "AE", name: "UAE",             dial: "+971", flag: "🇦🇪" },
  { code: "SA", name: "Saudi Arabia",    dial: "+966", flag: "🇸🇦" },
  { code: "DE", name: "Germany",         dial: "+49",  flag: "🇩🇪" },
  { code: "FR", name: "France",          dial: "+33",  flag: "🇫🇷" },
  { code: "CN", name: "China",           dial: "+86",  flag: "🇨🇳" },
  { code: "AU", name: "Australia",       dial: "+61",  flag: "🇦🇺" },
];

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
