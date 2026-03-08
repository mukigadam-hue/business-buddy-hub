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
