// Format a phone number for public display in Discover by ensuring a country
// dialing prefix is shown. Businesses often register local-format numbers
// (e.g. "0788123456"); when shown to outside viewers we prefix the
// country's dial code so they can call across borders.
import { getCountryByCode } from './countries';

export function formatPhoneForDisplay(rawPhone?: string | null, countryCode?: string | null): string {
  const phone = (rawPhone || '').trim();
  if (!phone) return '';

  // Already in international format.
  if (phone.startsWith('+')) return phone;

  const country = getCountryByCode((countryCode || '').toUpperCase());
  const dial = country?.dial;
  if (!dial) return phone; // unknown country → leave as-is

  // Strip common local trunk prefixes (leading 0s) and any non-digits.
  let digits = phone.replace(/\D/g, '');
  digits = digits.replace(/^0+/, '');

  // If user already typed the dial digits without the +, normalise.
  const dialDigits = dial.replace(/\D/g, '');
  if (digits.startsWith(dialDigits)) return `+${digits}`;

  return `${dial} ${digits}`;
}
