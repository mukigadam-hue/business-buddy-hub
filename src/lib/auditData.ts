import { supabase } from '@/integrations/supabase/client';

export type DayTotals = {
  date: string;              // YYYY-MM-DD
  salesCash: number;         // cash received from sales on that day
  servicesCash: number;      // cash received from services
  debtCash: number;          // repaid debts recorded that day
  bookingCash: number;       // rental / booking payments
  expensesOut: number;       // operational expenses (incl. waste-categorised)
  purchasesOut: number;      // cash paid out for purchases
  expected: number;          // expected cash in drawer = in - out
};

export type PeriodTotals = {
  days: DayTotals[];
  revenue: number;           // full sales + services value (paid or not)
  cogsPurchases: number;     // purchase value in period
  expensesTotal: number;
  wasteTotal: number;
};

export type SoldItem = {
  stock_item_id: string | null;
  item_name: string;
  category: string;
  quality: string;
  qty_sold: number;
  system_qty: number;
  unit_value: number;
  price_basis: 'wholesale' | 'retail';
};

function dayKey(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

export function localDayKey(d: Date) {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function enumerateDays(start: string, end: string): string[] {
  const out: string[] = [];
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  for (let d = s; d <= e; d = new Date(d.getTime() + 86400000)) out.push(localDayKey(d));
  return out;
}

const WASTE_CATEGORIES = new Set(['Expired', 'Faulty', 'Returned', 'Damaged', 'Spoiled', 'Waste']);

/**
 * Pulls every money movement in the period and rolls it up per day.
 * Everything the app knows about (sales, services, debts, bookings,
 * expenses, waste and purchases) is included so the drawer figure is
 * always in sync with the rest of the app.
 */
export async function fetchPeriodTotals(businessId: string, start: string, end: string): Promise<PeriodTotals> {
  const from = start + 'T00:00:00.000Z';
  const to = new Date(new Date(end + 'T00:00:00Z').getTime() + 86400000).toISOString();

  const [sales, services, debts, bookings, bizExp, facExp, purchases] = await Promise.all([
    supabase.from('sales').select('created_at, amount_paid, grand_total').eq('business_id', businessId).is('deleted_at', null).gte('created_at', from).lt('created_at', to),
    supabase.from('services').select('created_at, amount_paid, cost').eq('business_id', businessId).is('deleted_at', null).gte('created_at', from).lt('created_at', to),
    supabase.from('debt_payments').select('created_at, amount').eq('business_id', businessId).gte('created_at', from).lt('created_at', to),
    supabase.from('property_bookings').select('created_at, amount_paid').eq('business_id', businessId).is('deleted_at', null).gte('created_at', from).lt('created_at', to),
    supabase.from('business_expenses').select('created_at, amount, category').eq('business_id', businessId).is('deleted_at', null).gte('created_at', from).lt('created_at', to),
    supabase.from('factory_expenses').select('created_at, amount, category').eq('business_id', businessId).is('deleted_at', null).gte('created_at', from).lt('created_at', to),
    supabase.from('purchases').select('created_at, amount_paid, grand_total').eq('business_id', businessId).is('deleted_at', null).gte('created_at', from).lt('created_at', to),
  ]);

  const map = new Map<string, DayTotals>();
  const blank = (date: string): DayTotals => ({ date, salesCash: 0, servicesCash: 0, debtCash: 0, bookingCash: 0, expensesOut: 0, purchasesOut: 0, expected: 0 });
  for (const d of enumerateDays(start, end)) map.set(d, blank(d));
  const get = (iso: string) => {
    const k = dayKey(iso);
    if (!map.has(k)) map.set(k, blank(k));
    return map.get(k)!;
  };

  let revenue = 0, cogsPurchases = 0, expensesTotal = 0, wasteTotal = 0;

  (sales.data || []).forEach((r: any) => { get(r.created_at).salesCash += Number(r.amount_paid) || 0; revenue += Number(r.grand_total) || 0; });
  (services.data || []).forEach((r: any) => { get(r.created_at).servicesCash += Number(r.amount_paid) || 0; revenue += Number(r.cost) || 0; });
  (debts.data || []).forEach((r: any) => { get(r.created_at).debtCash += Number(r.amount) || 0; });
  (bookings.data || []).forEach((r: any) => { get(r.created_at).bookingCash += Number(r.amount_paid) || 0; revenue += Number(r.amount_paid) || 0; });
  [...(bizExp.data || []), ...(facExp.data || [])].forEach((r: any) => {
    const amt = Number(r.amount) || 0;
    get(r.created_at).expensesOut += amt;
    if (WASTE_CATEGORIES.has(r.category)) wasteTotal += amt; else expensesTotal += amt;
  });
  (purchases.data || []).forEach((r: any) => { get(r.created_at).purchasesOut += Number(r.amount_paid) || 0; cogsPurchases += Number(r.grand_total) || 0; });

  const days = Array.from(map.values())
    .map(d => ({ ...d, expected: d.salesCash + d.servicesCash + d.debtCash + d.bookingCash - d.expensesOut - d.purchasesOut }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  return { days, revenue, cogsPurchases, expensesTotal, wasteTotal };
}

/**
 * Items that actually moved during the period — these are the only ones
 * that need a physical count. Falls back to retail price when no
 * wholesale price is recorded.
 */
export async function fetchSoldItems(businessId: string, start: string, end: string): Promise<SoldItem[]> {
  const from = start + 'T00:00:00.000Z';
  const to = new Date(new Date(end + 'T00:00:00Z').getTime() + 86400000).toISOString();

  const { data: sales } = await supabase
    .from('sales').select('id').eq('business_id', businessId).is('deleted_at', null)
    .gte('created_at', from).lt('created_at', to);
  const saleIds = (sales || []).map((s: any) => s.id);

  const agg = new Map<string, { name: string; qty: number; category: string; quality: string }>();
  if (saleIds.length) {
    for (let i = 0; i < saleIds.length; i += 200) {
      const { data: items } = await supabase
        .from('sale_items').select('stock_item_id, item_name, category, quality, quantity').in('sale_id', saleIds.slice(i, i + 200));
      (items || []).forEach((it: any) => {
        const key = it.stock_item_id || `name:${it.item_name}`;
        const cur = agg.get(key) || { name: it.item_name, qty: 0, category: it.category || '', quality: it.quality || '' };
        cur.qty += Number(it.quantity) || 0;
        agg.set(key, cur);
      });
    }
  }

  const { data: stock } = await supabase
    .from('stock_items').select('id, name, category, quality, quantity, wholesale_price, retail_price')
    .eq('business_id', businessId).is('deleted_at', null);
  const stockById = new Map((stock || []).map((s: any) => [s.id, s]));

  const out: SoldItem[] = [];
  agg.forEach((v, key) => {
    const s = key.startsWith('name:') ? null : stockById.get(key);
    const wholesale = Number(s?.wholesale_price) || 0;
    const retail = Number(s?.retail_price) || 0;
    out.push({
      stock_item_id: s ? s.id : null,
      item_name: s?.name || v.name,
      category: s?.category || v.category || '',
      quality: s?.quality || v.quality || '',
      qty_sold: v.qty,
      system_qty: Number(s?.quantity) || 0,
      unit_value: wholesale > 0 ? wholesale : retail,
      price_basis: wholesale > 0 ? 'wholesale' : 'retail',
    });
  });
  return out.sort((a, b) => a.item_name.localeCompare(b.item_name));
}

/** All current stock items — used by the search box inside stock counting. */
export async function fetchAllStockItems(businessId: string): Promise<SoldItem[]> {
  const { data } = await supabase
    .from('stock_items').select('id, name, category, quality, quantity, wholesale_price, retail_price')
    .eq('business_id', businessId).is('deleted_at', null).order('name');
  return (data || []).map((s: any) => {
    const wholesale = Number(s.wholesale_price) || 0;
    const retail = Number(s.retail_price) || 0;
    return {
      stock_item_id: s.id,
      item_name: s.name,
      category: s.category || '',
      quality: s.quality || '',
      qty_sold: 0,
      system_qty: Number(s.quantity) || 0,
      unit_value: wholesale > 0 ? wholesale : retail,
      price_basis: (wholesale > 0 ? 'wholesale' : 'retail') as 'wholesale' | 'retail',
    };
  });
}

export type DebtRow = {
  kind: 'sale' | 'service' | 'order' | 'purchase';
  id: string;
  party: string;          // customer or supplier name
  date: string;           // YYYY-MM-DD
  total: number;
  paid: number;
  balance: number;
};

export type DebtTotals = {
  receivables: DebtRow[];      // money customers owe the business
  payables: DebtRow[];         // money the business owes suppliers
  receivableTotal: number;
  payableTotal: number;
};

/**
 * Unpaid balances created inside the audit period.
 * Receivables = credit sales / services / orders.
 * Payables = purchases taken from suppliers on credit.
 */
export async function fetchPeriodDebts(businessId: string, start: string, end: string): Promise<DebtTotals> {
  const from = start + 'T00:00:00.000Z';
  const to = new Date(new Date(end + 'T00:00:00Z').getTime() + 86400000).toISOString();
  const range = (q: any) => q.eq('business_id', businessId).is('deleted_at', null).gte('created_at', from).lt('created_at', to);

  const [sales, services, orders, purchases] = await Promise.all([
    range(supabase.from('sales').select('id, created_at, customer_name, grand_total, amount_paid, balance')),
    range(supabase.from('services').select('id, created_at, customer_name, cost, amount_paid, balance')),
    range(supabase.from('orders').select('id, created_at, customer_name, grand_total, amount_paid, balance')),
    range(supabase.from('purchases').select('id, created_at, supplier, grand_total, amount_paid, balance')),
  ]);

  const receivables: DebtRow[] = [];
  const payables: DebtRow[] = [];
  const push = (arr: DebtRow[], kind: DebtRow['kind'], r: any, party: string, total: number) => {
    const bal = Number(r.balance) || 0;
    if (bal > 0.009) arr.push({ kind, id: r.id, party: party || '—', date: dayKey(r.created_at), total, paid: Number(r.amount_paid) || 0, balance: bal });
  };

  (sales.data || []).forEach((r: any) => push(receivables, 'sale', r, r.customer_name, Number(r.grand_total) || 0));
  (services.data || []).forEach((r: any) => push(receivables, 'service', r, r.customer_name, Number(r.cost) || 0));
  (orders.data || []).forEach((r: any) => push(receivables, 'order', r, r.customer_name, Number(r.grand_total) || 0));
  (purchases.data || []).forEach((r: any) => push(payables, 'purchase', r, r.supplier, Number(r.grand_total) || 0));

  const sum = (a: DebtRow[]) => a.reduce((s, r) => s + r.balance, 0);
  receivables.sort((a, b) => b.balance - a.balance);
  payables.sort((a, b) => b.balance - a.balance);
  return { receivables, payables, receivableTotal: sum(receivables), payableTotal: sum(payables) };
}
