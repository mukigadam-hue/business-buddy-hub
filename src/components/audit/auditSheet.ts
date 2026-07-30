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
    { header: 'Purchases out', width: 64, align: 'right' },
    { header: 'Expected in drawer', width: 80, align: 'right' },
    { header: 'Counted in drawer', width: 80, align: 'right' },
    { header: 'Difference', width: 64, align: 'right' },
    { header: 'Note', width: 96 },
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
    ['TOTAL', 'TOTAL OWED TO THE BUSINESS', '', '', '', num(i.receivableTotal)]);
  note('These goods and services left the shop but the money has not come in yet. When a customer pays, record the payment in the app straight away.');

  // SECTION 4 — payables
  sectionTitle('SECTION 4 — MONEY WE OWE SUPPLIERS (GOODS TAKEN ON CREDIT)');
  table(debtCols, i.payables.map(d => [d.kind, d.party, d.date, num(d.total), num(d.paid), num(d.balance)]),
    ['TOTAL', 'TOTAL THE BUSINESS MUST PAY', '', '', '', num(i.payableTotal)]);
  note('Workers may pay these suppliers when the boss is away and must record each payment in the app under the same purchase.');

  // SECTION 5 — reconciliation
  sectionTitle('SECTION 5 — FINAL RECONCILIATION (IS EVERYTHING ACCOUNTED FOR?)');
  note('How the final balance is calculated:  (cash excess or shortage)  MINUS  (value of missing stock)  PLUS  (value of extra stock)  =  FINAL BALANCE. '
    + 'The two memo lines below are shown for information only — they are NOT added or subtracted, because that money has not moved yet.');

  const recCols: Col[] = [
    { header: 'Line', width: 40 },
    { header: 'Description', width: 330 },
    { header: 'Sign used in the calculation', width: 130 },
    { header: 'Amount', width: 120, align: 'right' },
  ];
  table(recCols, [
    ['1', 'Cash excess / shortage (counted cash minus expected cash)', 'Starting figure', num(i.cashVariance)],
    ['2', 'Value of missing stock (goods gone with no sale recorded)', 'Subtracted (minus)', num(i.shortfallValue)],
    ['3', 'Value of extra stock (goods found that were never recorded)', 'Added (+)', num(i.surplusValue)],
    ['4', 'MEMO ONLY — money customers still owe the business', 'Not counted in balance', num(i.receivableTotal)],
    ['5', 'MEMO ONLY — money the business still owes suppliers', 'Not counted in balance', num(i.payableTotal)],
  ], ['', `FINAL BALANCE  =  ${num(i.cashVariance)}  minus  ${num(i.shortfallValue)}  plus  ${num(i.surplusValue)}`, '', num(i.netBalance)]);

  // Plain-language verdict
  const verdict =
    i.netBalance < 0
      ? {
          title: `RESULT: SHORTAGE — ${num(Math.abs(i.netBalance))} IS MISSING FROM THE BUSINESS`,
          body: 'This is money or goods that left the business without being recorded. It is a LOSS to the business until it is explained or returned. '
            + 'It does NOT mean the business made a loss overall — it only means this amount cannot be accounted for.',
          msg: 'MESSAGE TO ALL WORKERS: Please remember to record EVERY transaction in the app — every sale, every service, every payment received, every expense and every item taken out. '
            + 'Nothing should leave the shop without being entered. Recording as it happens protects you, protects the business, and makes sure nobody is wrongly blamed for missing money.',
          fill: [255, 232, 232] as [number, number, number],
        }
      : i.netBalance === 0
        ? {
            title: 'RESULT: BALANCED — NOTHING IS MISSING AND NOTHING IS EXTRA',
            body: 'The cash counted and the stock counted match exactly what the app expected. Everything that happened in this period was recorded correctly.',
            msg: 'WELL DONE: This is a perfect record. Thank you for entering every transaction on time. Please keep working this way — accurate records like these are what let the business grow and reward the team.',
            fill: [230, 248, 236] as [number, number, number],
          }
        : {
            title: `RESULT: SURPLUS — ${num(i.netBalance)} MORE THAN EXPECTED IS PRESENT`,
            body: 'There is more cash or more stock in the business than the app expected. This is usually caused by purchases, returns or services that were never entered in the app. '
              + 'It is NOT profit and it does NOT belong to any worker — it must be traced and recorded properly.',
            msg: 'GOOD WORK, KEEP IT UP: Nothing is missing here. Please continue recording every sale, purchase and payment as it happens — and enter the missing purchases or returns above so the records match perfectly next time.',
            fill: [232, 242, 255] as [number, number, number],
          };

  const boxTextW = PAGE_W - MARGIN * 2 - 24;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const verdictLines = doc.splitTextToSize(verdict.body, boxTextW);
  doc.setFont('helvetica', 'bold');
  const msgLines = doc.splitTextToSize(verdict.msg, boxTextW);
  const boxH = 26 + verdictLines.length * 11 + 8 + msgLines.length * 11 + 14;
  need(boxH + 10);
  doc.setFillColor(...verdict.fill);
  doc.setDrawColor(...NAVY);
  doc.rect(MARGIN, y, PAGE_W - MARGIN * 2, boxH, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text(verdict.title, MARGIN + 10, y + 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(verdictLines, MARGIN + 10, y + 32);
  doc.setFont('helvetica', 'bold');
  doc.text(msgLines, MARGIN + 10, y + 32 + verdictLines.length * 11 + 10);
  y += boxH + 16;

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
