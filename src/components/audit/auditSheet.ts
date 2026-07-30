import { supabase } from '@/integrations/supabase/client';
import type { DayTotals, SoldItem, DebtRow } from '@/lib/auditData';

const BUCKET = 'receipt-exports';
const FOLDER = 'audit-sheets';

export type SheetInput = {
  businessName: string;
  currency: (n: number) => string;
  startDate: string;
  endDate: string;
  days: DayTotals[];
  cash: Record<string, { counted_cash: number; note?: string }>;
  items: Array<SoldItem & { physical_qty: number | null }>;
  cashVariance: number;
  shortfallValue: number;
  surplusValue: number;
  receivables: DebtRow[];
  payables: DebtRow[];
  receivableTotal: number;
  payableTotal: number;
  netBalance: number;
};


function esc(v: string | number) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const row = (...cells: Array<string | number>) => cells.map(esc).join(',');

/**
 * Accountability data sheet meant to be shared with workers.
 * Deliberately contains NO profit or loss figures.
 */
export function buildAuditCsv(i: SheetInput): string {
  const L: string[] = [];
  L.push(row('BUSINESS ACCOUNTABILITY SHEET'));
  L.push(row('Business', i.businessName));
  L.push(row('Audit period', `${i.startDate} to ${i.endDate}`));
  L.push(row('Generated', new Date().toLocaleString()));
  L.push('');

  L.push(row('SECTION 1 — DAILY CASH RECONCILIATION'));
  L.push(row('Date', 'Sales cash', 'Services cash', 'Repaid debts', 'Booking cash', 'Expenses out', 'Purchases out', 'Expected in drawer', 'Counted in drawer', 'Difference', 'Note'));
  let totExp = 0, totCount = 0;
  [...i.days].sort((a, b) => (a.date < b.date ? -1 : 1)).forEach(d => {
    const rec = i.cash[d.date];
    const counted = rec ? rec.counted_cash : null;
    totExp += d.expected;
    if (counted != null) totCount += counted;
    L.push(row(d.date, d.salesCash, d.servicesCash, d.debtCash, d.bookingCash, d.expensesOut, d.purchasesOut,
      d.expected, counted == null ? 'not recorded' : counted, counted == null ? '' : counted - d.expected, rec?.note || ''));
  });
  L.push(row('TOTAL', '', '', '', '', '', '', totExp, totCount, i.cashVariance, ''));
  L.push('');

  L.push(row('SECTION 2 — PHYSICAL STOCK COUNT'));
  L.push(row('Item', 'Category', 'Quality', 'Sold in period', 'App quantity', 'Physically counted', 'Missing units', 'Unit value', 'Price basis', 'Value of missing'));
  i.items.forEach(it => {
    const missing = it.physical_qty == null ? null : Math.max(it.system_qty - it.physical_qty, 0);
    L.push(row(it.item_name, it.category, it.quality, it.qty_sold, it.system_qty,
      it.physical_qty == null ? 'not counted' : it.physical_qty,
      missing == null ? '' : missing, it.unit_value, it.price_basis,
      missing == null ? '' : missing * it.unit_value));
  });
  L.push(row('TOTAL VALUE OF MISSING STOCK', '', '', '', '', '', '', '', '', i.shortfallValue));
  L.push('');

  L.push(row('SECTION 3 — FINAL RECONCILIATION'));
  L.push(row('Cash excess / shortage', i.cashVariance));
  L.push(row('Less value of missing stock', i.shortfallValue));
  L.push(row('BALANCE', i.netBalance));
  L.push(row('Explanation', i.netBalance === 0
    ? 'Everything was recorded correctly.'
    : i.netBalance < 0
      ? 'Money is missing. Items or services were sold or spent without being recorded. This amount is owed to the business.'
      : 'Extra money is present. Likely unrecorded services, or items sold at retail while missing stock is valued at wholesale. This money cannot be claimed by workers.'));
  L.push('');
  L.push(row('This sheet is for accountability of cash and stock only. It does not show business profit or loss.'));
  return L.join('\n');
}

export function sheetFileName(businessName: string, start: string, end: string) {
  const safe = businessName.replace(/[^\w-]+/g, '_').slice(0, 30);
  return `${safe}_accountability_${start}_to_${end}.csv`;
}

/** Store the sheet permanently so it can be re-downloaded any time. */
export async function saveSheetPermanently(sessionId: string, fileName: string, csv: string): Promise<boolean> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id;
  if (!uid) return false;
  const path = `${uid}/${FOLDER}/${sessionId}__${fileName}`;
  const { error } = await supabase.storage.from(BUCKET).upload(
    path,
    new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }),
    { contentType: 'text/csv;charset=utf-8', upsert: true },
  );
  return !error;
}

export type SavedSheet = { name: string; path: string; created_at: string };

export async function listSavedSheets(): Promise<SavedSheet[]> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id;
  if (!uid) return [];
  const { data } = await supabase.storage.from(BUCKET).list(`${uid}/${FOLDER}`, {
    limit: 100, sortBy: { column: 'created_at', order: 'desc' },
  });
  return (data || []).map(f => ({
    name: f.name.includes('__') ? f.name.split('__').slice(1).join('__') : f.name,
    path: `${uid}/${FOLDER}/${f.name}`,
    created_at: (f as { created_at?: string }).created_at || '',
  }));
}

export async function downloadSavedSheet(path: string): Promise<Blob | null> {
  const { data } = await supabase.storage.from(BUCKET).download(path);
  return data ?? null;
}
