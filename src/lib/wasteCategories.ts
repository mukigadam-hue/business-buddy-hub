// Single source of truth for separating WASTE records from operational EXPENSES.
// Both live in the same *_expenses tables, so classification must be identical
// everywhere (Business + Factory) to avoid records showing up in both modules.

export const WASTE_TYPES = ['Expired', 'Faulty', 'Returned', 'Damaged', 'Spoiled', 'Other'] as const;

// Categories that are stored in the DB for waste records.
// NOTE: waste of type "Other" is stored as "Waste" so it never collides with
// the operational expense category "Other".
export const WASTE_CATEGORIES = new Set(['Expired', 'Faulty', 'Returned', 'Damaged', 'Spoiled', 'Waste']);

export function wasteCategoryFor(wasteType: string): string {
  return WASTE_CATEGORIES.has(wasteType) ? wasteType : 'Waste';
}

const LEGACY_OTHER_WASTE = /^\[(Expired|Faulty|Returned|Damaged|Spoiled|Other|Waste)\]/i;

export interface ExpenseLike {
  category: string;
  description?: string | null;
  from_order_id?: string | null;
}

/** True when the record belongs to the Waste module (not operational expenses). */
export function isWasteExpense(e: ExpenseLike): boolean {
  if (WASTE_CATEGORIES.has(e.category)) return true;
  // Legacy rows saved before the split used category "Other" with a "[Type]" prefix.
  if (e.category === 'Other' && LEGACY_OTHER_WASTE.test((e.description || '').trim())) return true;
  return false;
}
