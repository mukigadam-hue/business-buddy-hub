import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useBusiness } from '@/context/BusinessContext';
import { useCurrency } from '@/hooks/useCurrency';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  ClipboardCheck, Search, Eye, EyeOff, Save, Lock, ChevronDown, ChevronUp, History, Loader2,
} from 'lucide-react';
import {
  fetchPeriodTotals, fetchSoldItems, fetchAllStockItems, localDayKey,
  type DayTotals, type SoldItem,
} from '@/lib/auditData';

type Session = {
  id: string; business_id: string; start_date: string; end_date: string | null; status: string;
  opening_note: string; closing_note: string; total_expected_cash: number; total_counted_cash: number;
  cash_variance_total: number; stock_shortfall_value: number; net_balance: number; profit_amount: number;
  closed_at: string | null; created_at: string;
};

type CashRow = { id?: string; audit_date: string; counted_cash: number; note: string };
type CountRow = { id?: string; stock_item_id: string | null; item_name: string; system_qty: number; physical_qty: number; unit_value: number; price_basis: string };

export default function BusinessAuditPanel() {
  const { t } = useTranslation();
  const { currentBusiness, userRole } = useBusiness();
  const { fmt } = useCurrency();
  const businessId = currentBusiness?.id;
  const canAudit = userRole === 'owner' || userRole === 'admin';

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [history, setHistory] = useState<Session[]>([]);
  const [startDate, setStartDate] = useState(localDayKey(new Date()));
  const [days, setDays] = useState<DayTotals[]>([]);
  const [period, setPeriod] = useState({ revenue: 0, cogsPurchases: 0, expensesTotal: 0, wasteTotal: 0 });
  const [cash, setCash] = useState<Record<string, CashRow>>({});
  const [counts, setCounts] = useState<Record<string, CountRow>>({});
  const [soldItems, setSoldItems] = useState<SoldItem[]>([]);
  const [allItems, setAllItems] = useState<SoldItem[]>([]);
  const [itemSearch, setItemSearch] = useState('');
  const [showStock, setShowStock] = useState(false);
  const [showProfit, setShowProfit] = useState(false);
  const [saving, setSaving] = useState(false);

  const today = localDayKey(new Date());

  const loadSession = useCallback(async () => {
    if (!businessId) return;
    const { data } = await supabase.from('audit_sessions').select('*')
      .eq('business_id', businessId).order('created_at', { ascending: false });
    const list = (data || []) as unknown as Session[];
    setSession(list.find(s => s.status === 'open') || null);
    setHistory(list.filter(s => s.status !== 'open'));
  }, [businessId]);

  useEffect(() => { if (open) loadSession(); }, [open, loadSession]);

  // Load the whole period once a session is open
  const loadPeriod = useCallback(async () => {
    if (!businessId || !session) return;
    setLoading(true);
    try {
      const [totals, sold, all, cashRows, countRows] = await Promise.all([
        fetchPeriodTotals(businessId, session.start_date, today),
        fetchSoldItems(businessId, session.start_date, today),
        fetchAllStockItems(businessId),
        supabase.from('audit_daily_cash').select('*').eq('business_id', businessId).gte('audit_date', session.start_date),
        supabase.from('audit_stock_counts').select('*').eq('session_id', session.id),
      ]);
      setDays(totals.days);
      setPeriod({ revenue: totals.revenue, cogsPurchases: totals.cogsPurchases, expensesTotal: totals.expensesTotal, wasteTotal: totals.wasteTotal });
      setSoldItems(sold);
      setAllItems(all);
      const cm: Record<string, CashRow> = {};
      (cashRows.data || []).forEach((r: any) => { cm[r.audit_date] = { id: r.id, audit_date: r.audit_date, counted_cash: Number(r.counted_cash), note: r.note || '' }; });
      setCash(cm);
      const km: Record<string, CountRow> = {};
      (countRows.data || []).forEach((r: any) => {
        km[r.stock_item_id || `name:${r.item_name}`] = {
          id: r.id, stock_item_id: r.stock_item_id, item_name: r.item_name,
          system_qty: Number(r.system_qty), physical_qty: Number(r.physical_qty),
          unit_value: Number(r.unit_value), price_basis: r.price_basis,
        };
      });
      setCounts(km);
    } finally { setLoading(false); }
  }, [businessId, session, today]);

  useEffect(() => { if (open && session) loadPeriod(); }, [open, session, loadPeriod]);

  async function startSession() {
    if (!businessId) return;
    setSaving(true);
    const { error } = await supabase.from('audit_sessions').insert({
      business_id: businessId, start_date: startDate, status: 'open',
      created_by: (await supabase.auth.getUser()).data.user?.id ?? null,
    } as any);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t('audit.started', 'Audit period started'));
    loadSession();
  }

  async function saveCash(date: string, value: string, note = '') {
    if (!businessId || !session) return;
    const counted = parseFloat(value);
    if (isNaN(counted)) return;
    const day = days.find(d => d.date === date);
    const expected = day?.expected ?? 0;
    const { error } = await supabase.from('audit_daily_cash').upsert({
      business_id: businessId, session_id: session.id, audit_date: date,
      expected_cash: expected, counted_cash: counted, variance: counted - expected, note,
    } as any, { onConflict: 'business_id,audit_date' });
    if (error) { toast.error(error.message); return; }
    setCash(c => ({ ...c, [date]: { audit_date: date, counted_cash: counted, note } }));
    toast.success(t('audit.daySaved', 'Day saved'));
  }

  async function saveCount(item: SoldItem, value: string) {
    if (!businessId || !session) return;
    const physical = parseFloat(value);
    if (isNaN(physical)) return;
    const shortfallQty = Math.max(item.system_qty - physical, 0);
    const { error } = await supabase.from('audit_stock_counts').upsert({
      business_id: businessId, session_id: session.id, stock_item_id: item.stock_item_id,
      item_name: item.item_name, system_qty: item.system_qty, physical_qty: physical,
      shortfall_qty: shortfallQty, unit_value: item.unit_value, price_basis: item.price_basis,
      shortfall_value: shortfallQty * item.unit_value,
    } as any, { onConflict: 'session_id,stock_item_id' });
    if (error) { toast.error(error.message); return; }
    setCounts(c => ({
      ...c,
      [item.stock_item_id || `name:${item.item_name}`]: {
        stock_item_id: item.stock_item_id, item_name: item.item_name, system_qty: item.system_qty,
        physical_qty: physical, unit_value: item.unit_value, price_basis: item.price_basis,
      },
    }));
    toast.success(t('audit.itemCounted', 'Count saved'));
  }

  const totals = useMemo(() => {
    const expected = days.reduce((s, d) => s + d.expected, 0);
    const counted = Object.values(cash).reduce((s, c) => s + c.counted_cash, 0);
    const recordedDays = days.filter(d => cash[d.date]);
    const cashVariance = recordedDays.reduce((s, d) => s + (cash[d.date].counted_cash - d.expected), 0);
    const shortfallValue = Object.values(counts).reduce((s, c) => s + Math.max(c.system_qty - c.physical_qty, 0) * c.unit_value, 0);
    const netBalance = cashVariance - shortfallValue;
    const profit = period.revenue - period.cogsPurchases - period.expensesTotal - period.wasteTotal - shortfallValue;
    return { expected, counted, cashVariance, shortfallValue, netBalance, profit, recordedDays: recordedDays.length };
  }, [days, cash, counts, period]);

  async function closeSession() {
    if (!businessId || !session) return;
    setSaving(true);
    const { error } = await supabase.from('audit_sessions').update({
      status: 'closed', end_date: today, closed_at: new Date().toISOString(),
      total_expected_cash: totals.expected, total_counted_cash: totals.counted,
      cash_variance_total: totals.cashVariance, stock_shortfall_value: totals.shortfallValue,
      net_balance: totals.netBalance, profit_amount: totals.profit,
    } as any).eq('id', session.id);
    if (error) { setSaving(false); toast.error(error.message); return; }
    const next = localDayKey(new Date(Date.now() + 86400000));
    await supabase.from('audit_sessions').insert({ business_id: businessId, start_date: next, status: 'open' } as any);
    setSaving(false);
    toast.success(t('audit.closed', 'Audit closed and saved. Next period starts tomorrow.'));
    loadSession();
  }

  if (!canAudit) return null;

  const displayItems = itemSearch.trim()
    ? allItems.filter(i => i.item_name.toLowerCase().includes(itemSearch.trim().toLowerCase()))
    : soldItems;

  return (
    <Card className="shadow-card border-primary/30">
      <CardContent className="p-4 space-y-3">
        <button className="w-full flex items-center justify-between gap-2 min-h-[44px]" onClick={() => setOpen(o => !o)}>
          <span className="flex items-center gap-2 text-base font-semibold">
            <ClipboardCheck className="h-5 w-5 text-primary" /> {t('audit.title', 'Business Audit & Accountability')}
          </span>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <p className="text-xs text-muted-foreground">
          {t('audit.subtitle', 'Compare daily drawer cash and physical stock against what the app recorded.')}
        </p>

        {open && (
          <div className="space-y-4 pt-1">
            {loading && <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>}

            {/* No open session → choose a starting point */}
            {!session && (
              <div className="p-3 rounded-lg border bg-muted/40 space-y-3">
                <p className="text-sm font-medium">{t('audit.startPrompt', 'Choose the date this audit should start from')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('audit.startHint', 'New businesses can start from their first day. Older businesses may pick any date they want to be accountable from.')}
                </p>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label>{t('audit.startDate', 'Start date')}</Label>
                    <Input type="date" value={startDate} max={today} onChange={e => setStartDate(e.target.value)} />
                  </div>
                  <Button onClick={startSession} disabled={saving} className="min-h-[44px]">
                    {t('audit.start', 'Start audit')}
                  </Button>
                </div>
              </div>
            )}

            {session && (
              <>
                <div className="text-xs text-muted-foreground">
                  {t('audit.periodLabel', 'Current period')}: <span className="font-semibold text-foreground">{session.start_date} → {today}</span>
                </div>

                {/* Daily cash table */}
                <div className="rounded-lg border overflow-hidden">
                  <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-2 py-2 bg-muted text-[11px] font-semibold">
                    <span>{t('audit.day', 'Day')}</span>
                    <span className="text-right">{t('audit.appCash', 'App cash')}</span>
                    <span className="text-right">{t('audit.drawer', 'In drawer')}</span>
                    <span className="text-right">{t('audit.diff', 'Diff')}</span>
                  </div>
                  <div className="max-h-[360px] overflow-y-auto divide-y">
                    {days.map(d => {
                      const rec = cash[d.date];
                      const diff = rec ? rec.counted_cash - d.expected : null;
                      return (
                        <div key={d.date} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center px-2 py-2 text-xs">
                          <span className="font-medium">{d.date}</span>
                          <span className="text-right tabular-nums">{fmt(d.expected)}</span>
                          <Input
                            type="number" step="0.01" inputMode="decimal"
                            className="h-9 w-24 text-right"
                            defaultValue={rec ? String(rec.counted_cash) : ''}
                            placeholder="0"
                            onBlur={e => { if (e.target.value !== '' && (!rec || Number(e.target.value) !== rec.counted_cash)) saveCash(d.date, e.target.value); }}
                          />
                          <span className={`text-right tabular-nums font-semibold ${diff == null ? 'text-muted-foreground' : diff === 0 ? 'text-success' : diff > 0 ? 'text-info' : 'text-destructive'}`}>
                            {diff == null ? '—' : fmt(diff)}
                          </span>
                        </div>
                      );
                    })}
                    {days.length === 0 && <p className="p-3 text-xs text-muted-foreground">{t('audit.noDays', 'No business days in this period yet.')}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-lg border bg-muted/40">
                    <p className="text-muted-foreground">{t('audit.expectedTotal', 'Expected total')}</p>
                    <p className="font-bold tabular-nums">{fmt(totals.expected)}</p>
                  </div>
                  <div className="p-2 rounded-lg border bg-muted/40">
                    <p className="text-muted-foreground">{t('audit.cashVariance', 'Cash excess / shortage')}</p>
                    <p className={`font-bold tabular-nums ${totals.cashVariance < 0 ? 'text-destructive' : 'text-success'}`}>{fmt(totals.cashVariance)}</p>
                  </div>
                </div>

                {/* Physical stock counting */}
                <div className="rounded-lg border">
                  <button className="w-full flex items-center justify-between px-3 py-3 min-h-[44px]" onClick={() => setShowStock(s => !s)}>
                    <span className="text-sm font-semibold">📦 {t('audit.stockCount', 'Physical stock count')}</span>
                    {showStock ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {showStock && (
                    <div className="p-3 pt-0 space-y-2">
                      <p className="text-[11px] text-muted-foreground">
                        {t('audit.stockHint', 'Only items sold in this period are listed. Search to count any other item. Missing items are valued at wholesale price (retail is used when no wholesale price exists).')}
                      </p>
                      <div className="relative">
                        <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input className="pl-8 h-10" placeholder={t('audit.searchItem', 'Search an item…')} value={itemSearch} onChange={e => setItemSearch(e.target.value)} />
                      </div>
                      <div className="max-h-[360px] overflow-y-auto divide-y">
                        {displayItems.map(item => {
                          const key = item.stock_item_id || `name:${item.item_name}`;
                          const rec = counts[key];
                          const shortfall = rec ? Math.max(item.system_qty - rec.physical_qty, 0) : null;
                          return (
                            <div key={key} className="py-2 space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-medium truncate">{item.item_name}</span>
                                <span className="text-[11px] text-muted-foreground shrink-0">
                                  {t('audit.appQty', 'App')}: <span className="font-bold text-foreground">{item.system_qty}</span>
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number" step="0.01" inputMode="decimal" className="h-9 w-28"
                                  placeholder={t('audit.counted', 'Counted')}
                                  defaultValue={rec ? String(rec.physical_qty) : ''}
                                  onBlur={e => { if (e.target.value !== '' && (!rec || Number(e.target.value) !== rec.physical_qty)) saveCount(item, e.target.value); }}
                                />
                                <span className={`text-[11px] tabular-nums ${shortfall ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                                  {shortfall == null ? '—' : shortfall > 0 ? `${t('audit.missing', 'Missing')} ${shortfall} = ${fmt(shortfall * item.unit_value)}` : t('audit.matches', 'Matches')}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                        {displayItems.length === 0 && <p className="py-3 text-xs text-muted-foreground">{t('audit.noItems', 'Nothing to count yet.')}</p>}
                      </div>
                      <div className="p-2 rounded-lg bg-destructive/5 border border-destructive/20 text-xs">
                        {t('audit.shortfallValue', 'Value of missing stock')}: <span className="font-bold tabular-nums text-destructive">{fmt(totals.shortfallValue)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Reconciliation */}
                <div className="p-3 rounded-lg border-2 border-primary/30 bg-primary/5 space-y-2">
                  <h3 className="text-sm font-bold">🧮 {t('audit.reconciliation', 'Final reconciliation')}</h3>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between"><span>{t('audit.cashVariance', 'Cash excess / shortage')}</span><span className="tabular-nums font-semibold">{fmt(totals.cashVariance)}</span></div>
                    <div className="flex justify-between"><span>− {t('audit.shortfallValue', 'Value of missing stock')}</span><span className="tabular-nums font-semibold">{fmt(totals.shortfallValue)}</span></div>
                    <div className="flex justify-between border-t pt-1"><span className="font-bold">{t('audit.netBalance', 'Balance')}</span>
                      <span className={`tabular-nums font-bold ${totals.netBalance === 0 ? 'text-success' : totals.netBalance < 0 ? 'text-destructive' : 'text-info'}`}>{fmt(totals.netBalance)}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {totals.netBalance === 0
                      ? t('audit.noteZero', 'Everything was recorded correctly.')
                      : totals.netBalance < 0
                        ? t('audit.noteNegative', 'Money is missing — workers spent or sold without recording. This amount is owed to the business.')
                        : t('audit.notePositive', 'Extra money is present. Likely unrecorded services, or unrecorded items sold at retail while the audit values missing stock at wholesale. Workers cannot claim this money from the business.')}
                  </p>
                </div>

                {/* Profit / loss */}
                <div className="p-3 rounded-lg border space-y-2">
                  <Button variant="outline" className="w-full min-h-[44px]" onClick={() => setShowProfit(p => !p)}>
                    {showProfit ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                    {showProfit ? t('audit.hideProfit', 'Hide profit / loss') : t('audit.showProfit', 'Show profit / loss')}
                  </Button>
                  {showProfit && (
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between"><span>{t('audit.revenue', 'Revenue (sales + services)')}</span><span className="tabular-nums">{fmt(period.revenue)}</span></div>
                      <div className="flex justify-between"><span>− {t('audit.purchases', 'Purchases')}</span><span className="tabular-nums">{fmt(period.cogsPurchases)}</span></div>
                      <div className="flex justify-between"><span>− {t('audit.expenses', 'Expenses')}</span><span className="tabular-nums">{fmt(period.expensesTotal)}</span></div>
                      <div className="flex justify-between"><span>− {t('audit.waste', 'Waste')}</span><span className="tabular-nums">{fmt(period.wasteTotal)}</span></div>
                      <div className="flex justify-between"><span>− {t('audit.shortfallValue', 'Value of missing stock')}</span><span className="tabular-nums">{fmt(totals.shortfallValue)}</span></div>
                      <div className="flex justify-between border-t pt-1 font-bold">
                        <span>{totals.profit >= 0 ? t('audit.profit', 'Profit') : t('audit.loss', 'Loss')}</span>
                        <span className={`tabular-nums ${totals.profit >= 0 ? 'text-success' : 'text-destructive'}`}>{fmt(totals.profit)}</span>
                      </div>
                    </div>
                  )}
                </div>

                <Button onClick={closeSession} disabled={saving} className="w-full min-h-[44px]">
                  <Lock className="h-4 w-4 mr-2" />{t('audit.close', 'Close & save this audit')}
                </Button>
                <p className="text-[11px] text-muted-foreground text-center">
                  {t('audit.closeHint', 'The results are saved permanently and the next audit starts where this one ended.')}
                </p>
              </>
            )}

            {/* History */}
            {history.length > 0 && (
              <div className="rounded-lg border p-3 space-y-2">
                <h3 className="text-sm font-semibold flex items-center gap-2"><History className="h-4 w-4" /> {t('audit.history', 'Past audits')}</h3>
                {history.map(h => (
                  <div key={h.id} className="text-xs p-2 rounded-lg bg-muted/40 border">
                    <p className="font-medium">{h.start_date} → {h.end_date}</p>
                    <p className="text-muted-foreground">
                      {t('audit.netBalance', 'Balance')}: <span className="font-semibold text-foreground tabular-nums">{fmt(Number(h.net_balance))}</span>
                      {' · '}{t('audit.shortfallValue', 'Value of missing stock')}: <span className="tabular-nums">{fmt(Number(h.stock_shortfall_value))}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
