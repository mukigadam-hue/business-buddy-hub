import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Capitalize first letter of string, rest lowercase. For items, descriptions, comments. */
export function toSentenceCase(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/** Capitalize first letter of each word. For person names. */
export function toTitleCase(str: string): string {
  if (!str) return str;
  return str.replace(/\b\w/g, c => c.toUpperCase()).replace(/\B\w/g, c => c.toLowerCase());
}

/**
 * Broad stock search: matches every whitespace-separated token of the query against
 * the item's name, category, quality, unit type and barcode. Order-independent, so
 * "charger tecno" finds "Ac Chargers · Tecno".
 */
export function stockMatchesQuery(item: any, query: string): boolean {
  const q = (query || '').trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    item?.name, item?.category, item?.quality, item?.unit_type,
    item?.base_unit_type, item?.barcode, item?.description,
  ].filter(Boolean).join(' ').toLowerCase();
  return q.split(/\s+/).every(tok => haystack.includes(tok));
}
