import { useMemo, useState } from 'react';
import { useBusiness } from '@/context/BusinessContext';
import { useAuth } from '@/context/AuthContext';
import { useCurrency } from '@/hooks/useCurrency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Users, TrendingUp, ShoppingCart, Package, ClipboardList, Wrench,
  ChevronDown, ChevronUp, Trash2, Receipt as ReceiptIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { softDeleteRecord, applyStockReversal, type RecyclableTable } from '@/lib/recycleBin';
import { toTitleCase } from '@/lib/utils';

type ActivityType = 'sale' | 'purchase' | 'service' | 'expense' | 'waste';

interface Activity {
  type: ActivityType;
  table: RecyclableTable;
  recordId: string;
  worker: string;          // display name
  workerKey: string;       // normalized for grouping
  description: string;
  amount?: number;
  category?: string;
  quality?: string;
  dayKey: string;          // YYYY-MM-DD
  dayLabel: string;
  time: string;
  ts: number;
}

const WASTE_TYPES = ['Expired', 'Faulty', 'Returned', 'Damaged', 'Spoiled', 'Other', 'Waste'];

function normalizeName(n: string | null | undefined) {
  return (n || '').trim().toLowerCase().replace(/\s+/g, ' ');
}
function displayName(n: string | null | undefined) {
  const t = (n || '').trim().replace(/\s+/g, ' ');
  return t ? toTitleCase(t) : 'Unknown';
}
function dayKeyOf(d: Date) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export default function WorkerActivityTracker() {
  const { sales, purchases, services, expenses, userRole, refreshData } = useBusiness();
  const { user } = useAuth();
  const { fmt } = useCurrency();
  const [filterWorker, setFilterWorker] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [showAll, setShowAll] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const canDelete = userRole === 'owner' || userRole === 'admin';

  const activities = useMemo<Activity[]>(() => {
    const out: Activity[] = [];

    const pushFromRecord = (
      type: ActivityType,
      table: RecyclableTable,
      recordId: string,
      workerRaw: string | null | undefined,
      created_at: string,
      description: string,
      opts: { amount?: number; category?: string; quality?: string } = {}
    ) => {
      const key = normalizeName(workerRaw);
      if (!key) return;
      const d = new Date(created_at);
      out.push({
        type, table, recordId,
        worker: displayName(workerRaw),
        workerKey: key,
        description,
        amount: opts.amount,
        category: opts.category,
        quality: opts.quality,
        dayKey: dayKeyOf(d),
        dayLabel: d.toLocaleDateString(),
        time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        ts: d.getTime(),
      });
    };

    sales.forEach(s => {
      const summary = (s.items || []).map((i: any) => `${i.item_name} × ${i.quantity}`).join(', ') || 'Sale';
      pushFromRecord('sale', 'sales', s.id, s.recorded_by, s.created_at,
        `Sold ${summary}`,
        { amount: Number(s.grand_total) });
    });

    purchases.forEach(p => {
      const summary = (p.items || []).map((i: any) => `${i.item_name} × ${i.quantity}`).join(', ') || 'Purchase';
      pushFromRecord('purchase', 'purchases', p.id, p.recorded_by, p.created_at,
        `Purchased ${summary}`,
        { amount: Number(p.grand_total) });
    });

    services.forEach(s => {
      pushFromRecord('service', 'services', s.id, s.seller_name, s.created_at,
        `Service: ${s.service_name}${s.customer_name ? ` for ${s.customer_name}` : ''}`,
        { amount: Number(s.cost) });
    });

    expenses.forEach((e: any) => {
      const isWaste = WASTE_TYPES.includes(e.category);
      pushFromRecord(
        isWaste ? 'waste' : 'expense',
        'business_expenses',
        e.id,
        e.recorded_by,
        e.created_at || e.expense_date,
        `${isWaste ? 'Waste' : 'Expense'}: ${e.category}${e.description ? ` — ${e.description}` : ''}`,
        { amount: Number(e.amount) }
      );
    });

    return out.sort((a, b) => b.ts - a.ts);
  }, [sales, purchases, services, expenses]);

  const workers = useMemo(() => {
    const map = new Map<string, string>();
    activities.forEach(a => { if (!map.has(a.workerKey)) map.set(a.workerKey, a.worker); });
    return Array.from(map.entries()).map(([key, name]) => ({ key, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [activities]);

  // Group: workerKey + dayKey
  const groups = useMemo(() => {
    const filtered = activities.filter(a => {
      if (filterWorker !== 'all' && a.workerKey !== filterWorker) return false;
      if (filterType !== 'all' && a.type !== filterType) return false;
      return true;
    });
    const map = new Map<string, {
      key: string; worker: string; workerKey: string; dayKey: string; dayLabel: string;
      items: Activity[]; total: number; latestTs: number;
    }>();
    for (const a of filtered) {
      const k = `${a.workerKey}__${a.dayKey}`;
      const g = map.get(k);
      if (g) {
        g.items.push(a);
        g.total += a.amount || 0;
        if (a.ts > g.latestTs) g.latestTs = a.ts;
      } else {
        map.set(k, {
          key: k, worker: a.worker, workerKey: a.workerKey,
          dayKey: a.dayKey, dayLabel: a.dayLabel,
          items: [a], total: a.amount || 0, latestTs: a.ts,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.latestTs - a.latestTs);
  }, [activities, filterWorker, filterType]);

  const visibleGroups = showAll ? groups : groups.slice(0, 10);

  const typeIcon = (type: ActivityType) => {
    switch (type) {
      case 'sale': return <TrendingUp className="h-3.5 w-3.5 text-success" />;
      case 'purchase': return <ShoppingCart className="h-3.5 w-3.5 text-primary" />;
      case 'service': return <Wrench className="h-3.5 w-3.5 text-accent" />;
      case 'expense': return <ClipboardList className="h-3.5 w-3.5 text-warning" />;
      case 'waste': return <Package className="h-3.5 w-3.5 text-destructive" />;
      default: return null;
    }
  };

  const typeLabel = (type: ActivityType) => ({
    sale: 'Sale', purchase: 'Purchase', service: 'Service', expense: 'Expense', waste: 'Waste',
  } as any)[type] || type;

  async function deleteThread(group: typeof groups[number]) {
    if (!canDelete) return;
    const msg = `Move ALL ${group.items.length} activities by ${group.worker} on ${group.dayLabel} to Recycle Bin?\n\nThis includes sales, purchases, services and expenses recorded that day. They can be restored from Settings → Recycle Bin.`;
    if (!window.confirm(msg)) return;
    setDeletingKey(group.key);
    const actor = {
      userId: user?.id,
      userName: (user?.user_metadata as any)?.full_name || user?.email || 'Owner',
    };
    let okCount = 0, failCount = 0;
    for (const a of group.items) {
      try {
        await applyStockReversal(a.table, a.recordId);
        const ok = await softDeleteRecord(a.table, a.recordId, actor);
        if (ok) okCount++; else failCount++;
      } catch {
        failCount++;
      }
    }
    setDeletingKey(null);
    if (okCount) toast.success(`Moved ${okCount} record(s) to Recycle Bin`);
    if (failCount) toast.error(`${failCount} record(s) could not be moved`);
    await refreshData();
  }

  if (activities.length === 0) return null;

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" /> Worker Activity Log
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <Select value={filterWorker} onValueChange={setFilterWorker}>
            <SelectTrigger className="w-44 h-8 text-xs">
              <SelectValue placeholder="All Workers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Workers</SelectItem>
              {workers.map(w => (
                <SelectItem key={w.key} value={w.key}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="sale">Sales</SelectItem>
              <SelectItem value="purchase">Purchases</SelectItem>
              <SelectItem value="service">Services</SelectItem>
              <SelectItem value="expense">Expenses</SelectItem>
              <SelectItem value="waste">Waste</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Threads */}
        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
          {visibleGroups.map(g => {
            const isOpen = !!expandedGroups[g.key];
            return (
              <div key={g.key} className="rounded-lg border bg-card">
                <button
                  type="button"
                  onClick={() => setExpandedGroups(prev => ({ ...prev, [g.key]: !prev[g.key] }))}
                  className="w-full flex items-center gap-2 p-2.5 text-left hover:bg-muted/40 transition-colors"
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                    {g.worker.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-foreground truncate">{g.worker}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {g.items.length} activit{g.items.length === 1 ? 'y' : 'ies'}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{g.dayLabel}</p>
                  </div>
                  {g.total > 0 && (
                    <span className="text-xs font-semibold tabular-nums text-success whitespace-nowrap">{fmt(g.total)}</span>
                  )}
                  {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>

                {isOpen && (
                  <div className="border-t bg-muted/20 p-2 space-y-1.5">
                    {g.items.map((a, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded bg-card text-sm">
                        <div className="mt-0.5 shrink-0">{typeIcon(a.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                              a.type === 'sale' ? 'bg-success/10 text-success' :
                              a.type === 'purchase' ? 'bg-primary/10 text-primary' :
                              a.type === 'service' ? 'bg-accent/10 text-accent' :
                              a.type === 'waste' ? 'bg-destructive/10 text-destructive' :
                              'bg-warning/10 text-warning'
                            }`}>{typeLabel(a.type)}</span>
                            <span className="text-[10px] text-muted-foreground">{a.time}</span>
                          </div>
                          <p className="text-xs text-foreground mt-0.5">{a.description}</p>
                          {(a.category || a.quality) && (
                            <p className="text-[10px] text-muted-foreground">{[a.category, a.quality].filter(Boolean).join(' · ')}</p>
                          )}
                        </div>
                        {a.amount != null && a.amount > 0 && (
                          <span className="text-xs font-semibold tabular-nums text-success shrink-0">{fmt(a.amount)}</span>
                        )}
                      </div>
                    ))}

                    {canDelete && (
                      <div className="flex justify-end pt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          disabled={deletingKey === g.key}
                          onClick={() => deleteThread(g)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          {deletingKey === g.key ? 'Moving…' : `Delete this day's ${g.items.length} record(s) → Recycle Bin`}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {groups.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No activities found</p>
          )}
        </div>

        {groups.length > 10 && (
          <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setShowAll(v => !v)}>
            {showAll ? <><ChevronUp className="h-3.5 w-3.5 mr-1" /> Show Less</> : <><ChevronDown className="h-3.5 w-3.5 mr-1" /> View All ({groups.length})</>}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
