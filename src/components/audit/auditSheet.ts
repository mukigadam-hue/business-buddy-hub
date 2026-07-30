import { jsPDF } from 'jspdf';
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

type Col = { header: string; width: number; align?: 'left' | 'right' };
type Cell = string | number;

const MARGIN = 32;
const PAGE_W = 842; // A4 landscape (pt)
const PAGE_H = 595;
const BODY_BOTTOM = PAGE_H - 46;

const NAVY: [number, number, number] = [15, 40, 71];
const GOLD: [number, number, number] = [212, 160, 23];
const LINE: [number, number, number] = [214, 219, 226];

function num(n: number) {
  return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/**
 * Accountability data sheet meant to be shared with workers.
 * Deliberately contains NO profit or loss figures.
 */
export function buildAuditPdf(i: SheetInput): Blob {
  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' });
  let y = 0;

  const header = () => {
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, PAGE_W, 54, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('BUSINESS ACCOUNTABILITY SHEET', MARGIN, 24);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...GOLD);
    doc.text(
      `${i.businessName}   •   Period: ${i.startDate} to ${i.endDate}   •   Generated: ${new Date().toLocaleString()}`,
      MARGIN, 41,
    );
    doc.setTextColor(0, 0, 0);
    y = 78;
  };

  const newPage = () => { doc.addPage(); header(); };
  const need = (h: number) => { if (y + h > BODY_BOTTOM) newPage(); };

  const sectionTitle = (text: string) => {
    need(38);
    doc.setFillColor(240, 243, 247);
    doc.rect(MARGIN, y - 12, PAGE_W - MARGIN * 2, 20, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    doc.text(text, MARGIN + 6, y + 2);
    doc.setTextColor(0, 0, 0);
    y += 22;
  };

  const note = (text: string) => {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(90, 96, 104);
    const lines = doc.splitTextToSize(text, PAGE_W - MARGIN * 2);
    need(lines.length * 10 + 6);
    doc.text(lines, MARGIN, y + 6);
    y += lines.length * 10 + 12;
    doc.setTextColor(0, 0, 0);
  };

  const table = (cols: Col[], rows: Cell[][], totalRow?: Cell[]) => {
    const total = cols.reduce((s, c) => s + c.width, 0);
    const scale = (PAGE_W - MARGIN * 2) / total;
    const w = cols.map(c => c.width * scale);

    const drawHead = () => {
      need(26);
      doc.setFillColor(...NAVY);
      doc.rect(MARGIN, y, PAGE_W - MARGIN * 2, 18, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      let x = MARGIN;
      cols.forEach((c, idx) => {
        const right = c.align === 'right';
        doc.text(c.header, right ? x + w[idx] - 5 : x + 5, y + 12, { align: right ? 'right' : 'left' });
        x += w[idx];
      });
      doc.setTextColor(0, 0, 0);
      y += 18;
    };

    drawHead();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    const drawRow = (cells: Cell[], bold = false, fill?: [number, number, number]) => {
      const wrapped = cells.map((c, idx) => doc.splitTextToSize(String(c ?? ''), w[idx] - 10));
      const h = Math.max(16, Math.max(...wrapped.map(l => l.length)) * 10 + 6);
      if (y + h > BODY_BOTTOM) { newPage(); drawHead(); doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(8); }
      if (fill) { doc.setFillColor(...fill); doc.rect(MARGIN, y, PAGE_W - MARGIN * 2, h, 'F'); }
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      let x = MARGIN;
      cols.forEach((c, idx) => {
        const right = c.align === 'right';
        doc.text(wrapped[idx], right ? x + w[idx] - 5 : x + 5, y + 11, { align: right ? 'right' : 'left' });
        x += w[idx];
      });
      doc.setDrawColor(...LINE);
      doc.line(MARGIN, y + h, PAGE_W - MARGIN, y + h);
      y += h;
    };

    if (!rows.length) drawRow([cols.length > 1 ? 'No records for this period' : '—', ...Array(cols.length - 1).fill('')]);
    rows.forEach((r, idx) => drawRow(r, false, idx % 2 ? [249, 250, 252] : undefined));
    if (totalRow) drawRow(totalRow, true, [255, 246, 214]);
    y += 14;
  };

  header();

  // SECTION 1 — daily cash
  sectionTitle('SECTION 1 — DAILY CASH RECONCILIATION');
  const cashCols: Col[] = [
    { header: 'Date', width: 70 },
    { header: 'Sales cash', width: 60, align: 'right' },
    { header: 'Services cash', width: 62, align: 'right' },
    { header: 'Repaid debts', width: 60, align: 'right' },
    { header: 'Booking cash', width: 60, align: 'right' },
    { header: 'Expenses out', width: 60, align: 'right' },
    { header: 'Purchases out', width: 62, align: 'right' },
    { header: 'Expected in drawer', width: 72, align: 'right' },
    { header: 'Counted in drawer', width: 72, align: 'right' },
    { header: 'Difference', width: 62, align: 'right' },
    { header: 'Note', width: 110 },
  ];
  let totExp = 0, totCount = 0;
  const cashRows: Cell[][] = [...i.days].sort((a, b) => (a.date < b.date ? -1 : 1)).map(d => {
    const rec = i.cash[d.date];
    const counted = rec ? rec.counted_cash : null;
    totExp += d.expected;
    if (counted != null) totCount += counted;
    return [
      d.date, num(d.salesCash), num(d.servicesCash), num(d.debtCash), num(d.bookingCash),
      num(d.expensesOut), num(d.purchasesOut), num(d.expected),
      counted == null ? 'Not recorded' : num(counted),
      counted == null ? '—' : num(counted - d.expected),
      rec?.note || '—',
    ];
  });
  table(cashCols, cashRows, ['TOTAL', '', '', '', '', '', '', num(totExp), num(totCount), num(i.cashVariance), '']);

  // SECTION 2 — stock count
  sectionTitle('SECTION 2 — PHYSICAL STOCK COUNT');
  const stockCols: Col[] = [
    { header: 'Item', width: 120 },
    { header: 'Category', width: 70 },
    { header: 'Quality', width: 60 },
    { header: 'Sold in period', width: 58, align: 'right' },
    { header: 'App quantity', width: 55, align: 'right' },
    { header: 'Counted', width: 55, align: 'right' },
    { header: 'Missing', width: 50, align: 'right' },
    { header: 'Extra', width: 45, align: 'right' },
    { header: 'Unit value', width: 60, align: 'right' },
    { header: 'Basis', width: 48 },
    { header: 'Value missing', width: 65, align: 'right' },
    { header: 'Value extra', width: 62, align: 'right' },
  ];
  const stockRows: Cell[][] = i.items.map(it => {
    const diff = it.physical_qty == null ? null : it.physical_qty - it.system_qty;
    const missing = diff == null ? null : Math.max(-diff, 0);
    const extra = diff == null ? null : Math.max(diff, 0);
    return [
      it.item_name, it.category || '—', it.quality || '—', num(it.qty_sold), num(it.system_qty),
      it.physical_qty == null ? 'Not counted' : num(it.physical_qty),
      missing == null ? '—' : num(missing),
      extra == null ? '—' : num(extra),
      num(it.unit_value), it.price_basis,
      missing == null ? '—' : num(missing * it.unit_value),
      extra == null ? '—' : num(extra * it.unit_value),
    ];
  });
  table(stockCols, stockRows, ['TOTALS', '', '', '', '', '', '', '', '', '', num(i.shortfallValue), num(i.surplusValue)]);
  note('Extra items are goods found in the shop that the app does not know about — usually purchases or returns that were never recorded. Record them in the app.');

  // SECTION 3 — receivables
  sectionTitle('SECTION 3 — MONEY CUSTOMERS OWE US (CREDIT SALES IN THIS PERIOD)');
  const debtCols: Col[] = [
    { header: 'Type', width: 60 },
    { header: 'Name', width: 180 },
    { header: 'Date', width: 80 },
    { header: 'Total', width: 90, align: 'right' },
    { header: 'Paid', width: 90, align: 'right' },
    { header: 'Balance', width: 90, align: 'right' },
  ];
  table(debtCols, i.receivables.map(d => [d.kind, d.party, d.date, num(d.total), num(d.paid), num(d.balance)]),
    ['TOTAL OWED TO THE BUSINESS', '', '', '', '', num(i.receivableTotal)]);
  note('These goods and services left the shop but the money has not come in yet. When a customer pays, record the payment in the app straight away.');

  // SECTION 4 — payables
  sectionTitle('SECTION 4 — MONEY WE OWE SUPPLIERS (GOODS TAKEN ON CREDIT)');
  table(debtCols, i.payables.map(d => [d.kind, d.party, d.date, num(d.total), num(d.paid), num(d.balance)]),
    ['TOTAL THE BUSINESS MUST PAY', '', '', '', '', num(i.payableTotal)]);
  note('Workers may pay these suppliers when the boss is away and must record each payment in the app under the same purchase.');

  // SECTION 5 — reconciliation
  sectionTitle('SECTION 5 — FINAL RECONCILIATION');
  const recCols: Col[] = [{ header: 'Description', width: 400 }, { header: 'Amount', width: 190, align: 'right' }];
  table(recCols, [
    ['Cash excess / shortage', num(i.cashVariance)],
    ['Less value of missing stock', num(i.shortfallValue)],
    ['Plus value of extra stock', num(i.surplusValue)],
    ['Memo — owed to us by customers', num(i.receivableTotal)],
    ['Memo — owed by us to suppliers', num(i.payableTotal)],
  ], ['BALANCE', num(i.netBalance)]);
  note(i.netBalance === 0
    ? 'Everything was recorded correctly.'
    : i.netBalance < 0
      ? 'Money is missing. Items or services were sold or spent without being recorded. This amount is owed to the business.'
      : 'Extra money or extra stock is present. Likely unrecorded purchases, returns or services. This money cannot be claimed by workers.');
  note('This sheet is for accountability of cash, stock and debts only. It does not show business profit or loss.');

  // page numbers
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 126, 134);
    doc.text(`${i.businessName} — accountability sheet`, MARGIN, PAGE_H - 20);
    doc.text(`Page ${p} of ${pages}`, PAGE_W - MARGIN, PAGE_H - 20, { align: 'right' });
  }

  return doc.output('blob');
}

export function sheetFileName(businessName: string, start: string, end: string) {
  const safe = businessName.replace(/[^\w-]+/g, '_').slice(0, 30);
  return `${safe}_accountability_${start}_to_${end}.pdf`;
}

export function sheetMime(name: string) {
  return name.toLowerCase().endsWith('.csv') ? 'text/csv;charset=utf-8' : 'application/pdf';
}

/** Store the sheet permanently so it can be re-downloaded any time. */
export async function saveSheetPermanently(sessionId: string, fileName: string, blob: Blob): Promise<boolean> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id;
  if (!uid) return false;
  const path = `${uid}/${FOLDER}/${sessionId}__${fileName}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: sheetMime(fileName), upsert: true,
  });
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
