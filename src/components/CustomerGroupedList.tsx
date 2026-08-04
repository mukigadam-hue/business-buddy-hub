import { ReactNode, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';
import { toTitleCase } from '@/lib/utils';

interface Props<T> {
  records: T[];
  getName: (r: T) => string;
  getDate: (r: T) => string;
  getTotal: (r: T) => number;
  getBalance: (r: T) => number;
  renderRecord: (r: T) => ReactNode;
  /** Expand all groups by default (useful for the small "Today" list). */
  defaultExpanded?: boolean;
}

/**
 * Groups transaction records by customer so each customer appears ONCE.
 * Expanding a customer reveals every one of their records (dates, items,
 * debts, receipts) rendered by the caller's existing card component.
 */
export default function CustomerGroupedList<T extends { id: string }>({
  records, getName, getDate, getTotal, getBalance, renderRecord, defaultExpanded,
}: Props<T>) {
  const { fmt } = useCurrency();
  const [openKeys, setOpenKeys] = useState<Record<string, boolean>>({});

  const groups = useMemo(() => {
    const map = new Map<string, { key: string; name: string; items: T[]; total: number; owed: number; last: string }>();
    for (const r of records) {
      const raw = (getName(r) || '').trim() || 'Walk-in';
      const key = raw.toLowerCase();
      let g = map.get(key);
      if (!g) {
        g = { key, name: toTitleCase(raw), items: [], total: 0, owed: 0, last: getDate(r) };
        map.set(key, g);
      }
      g.items.push(r);
      g.total += Number(getTotal(r)) || 0;
      g.owed += Number(getBalance(r)) || 0;
      if (new Date(getDate(r)) > new Date(g.last)) g.last = getDate(r);
    }
    const list = Array.from(map.values());
    list.forEach(g => g.items.sort((a, b) => new Date(getDate(b)).getTime() - new Date(getDate(a)).getTime()));
    // Best customers first (most records, then highest spend)
    return list.sort((a, b) => b.items.length - a.items.length || b.total - a.total);
  }, [records, getName, getDate, getTotal, getBalance]);

  return (
    <div className="space-y-2">
      {groups.map(g => {
        const isOpen = openKeys[g.key] ?? (defaultExpanded || groups.length === 1);
        return (
          <div key={g.key} className="rounded-lg border overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenKeys(p => ({ ...p, [g.key]: !isOpen }))}
              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-muted/40 hover:bg-muted/60 text-left min-h-[44px]"
            >
              <span className="flex items-center gap-1.5 min-w-0">
                {isOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                <span className="font-semibold text-sm truncate">👤 {g.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">{g.items.length}</span>
              </span>
              <span className="text-right shrink-0">
                <span className="block text-xs font-bold tabular-nums text-success">{fmt(g.total)}</span>
                {g.owed > 0
                  ? <span className="block text-[10px] font-semibold text-destructive tabular-nums">owes {fmt(g.owed)}</span>
                  : <span className="block text-[10px] text-muted-foreground">cleared</span>}
              </span>
            </button>
            {isOpen && (
              <div className="p-2 space-y-2 bg-background">
                {g.items.map(r => (
                  <div key={r.id}>{renderRecord(r)}</div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
