import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { useCurrency } from '@/hooks/useCurrency';
import { toTitleCase } from '@/lib/utils';

export interface CustomerStat {
  name: string;
  count: number;
  total: number;
  owed: number;
  lastDate: string;
}

/** Build per-customer stats from any record list (sales, services, orders...). */
export function buildCustomerStats<T>(
  records: T[],
  getName: (r: T) => string,
  getTotal: (r: T) => number,
  getBalance: (r: T) => number,
  getDate: (r: T) => string,
): CustomerStat[] {
  const map = new Map<string, CustomerStat>();
  for (const r of records) {
    const raw = (getName(r) || '').trim();
    if (!raw) continue;
    const key = raw.toLowerCase();
    const existing = map.get(key);
    const date = getDate(r);
    if (existing) {
      existing.count += 1;
      existing.total += getTotal(r) || 0;
      existing.owed += getBalance(r) || 0;
      if (new Date(date) > new Date(existing.lastDate)) existing.lastDate = date;
    } else {
      map.set(key, {
        name: toTitleCase(raw),
        count: 1,
        total: getTotal(r) || 0,
        owed: getBalance(r) || 0,
        lastDate: date,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count || b.total - a.total);
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  customers: CustomerStat[];
  placeholder?: string;
  required?: boolean;
  className?: string;
}

/**
 * Customer name field with autocomplete from previous customers.
 * Shows a short interaction summary once a known customer is matched.
 */
export default function CustomerNameInput({ value, onChange, customers, placeholder, required, className }: Props) {
  const { fmt } = useCurrency();
  const [open, setOpen] = useState(false);

  const q = value.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!q) return customers.slice(0, 8);
    return customers.filter(c => c.name.toLowerCase().includes(q)).slice(0, 8);
  }, [customers, q]);

  const exact = customers.find(c => c.name.toLowerCase() === q);
  const showList = open && matches.length > 0 && !exact;

  return (
    <div className={`relative ${className || ''}`}>
      <Input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => { onChange(toTitleCase(value)); setTimeout(() => setOpen(false), 150); }}
        placeholder={placeholder}
        required={required}
      />
      {showList && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
          {matches.map(c => (
            <button
              key={c.name}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => { onChange(c.name); setOpen(false); }}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted/60 border-b border-border last:border-0 min-h-[44px]"
            >
              <span className="font-medium truncate">👤 {c.name}</span>
              <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                {c.count}× · {fmt(c.total)}{c.owed > 0 ? ` · owes ${fmt(c.owed)}` : ''}
              </span>
            </button>
          ))}
        </div>
      )}
      {exact && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          ⭐ Returning customer — {exact.count} record{exact.count > 1 ? 's' : ''}, {fmt(exact.total)} total
          {exact.owed > 0 && <span className="text-destructive font-semibold"> · owes {fmt(exact.owed)}</span>}
        </p>
      )}
    </div>
  );
}
