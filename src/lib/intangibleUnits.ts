// Helpers for intangible / bulk-estimation stock items.
// A "base unit" is the smallest measurable unit (ml, g, or a single piece).
// A "full unit" is what the user sells by (Litre, Kg, Packet).

export type IntangibleMetric = 'Liters' | 'Kilograms' | 'Pieces';

export const METRIC_OPTIONS: { value: IntangibleMetric; label: string; baseLabel: string; conversion: number }[] = [
  { value: 'Liters',     label: 'Liters (measured in ml)',     baseLabel: 'ml',    conversion: 1000 },
  { value: 'Kilograms',  label: 'Kilograms (measured in g)',   baseLabel: 'g',     conversion: 1000 },
  { value: 'Pieces',     label: 'Pieces / Packets',            baseLabel: 'piece', conversion: 1    },
];

export function conversionFor(metric: string): number {
  return METRIC_OPTIONS.find(m => m.value === metric)?.conversion ?? 1;
}

/**
 * Given a cash amount received and the retail price per full unit,
 * compute the equivalent quantity expressed in full units (decimal).
 * Example: cash=500 UGX, retail=5000/Liter → 0.1 Liter.
 */
export function cashToFullUnits(cash: number, retailPerFullUnit: number): number {
  if (!retailPerFullUnit || retailPerFullUnit <= 0) return 0;
  return cash / retailPerFullUnit;
}
