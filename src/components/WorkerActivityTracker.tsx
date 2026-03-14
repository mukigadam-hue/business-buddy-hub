import { useState, useEffect } from 'react';
import { useBusiness } from '@/context/BusinessContext';
import { useCurrency } from '@/hooks/useCurrency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, TrendingUp, ShoppingCart, Package, ClipboardList, Wrench, ChevronDown, ChevronUp } from 'lucide-react';

interface Activity {
  type: 'sale' | 'purchase' | 'order' | 'stock';
  worker: string;
  description: string;
  amount?: number;
  category?: string;
  quality?: string;
  date: string;
  time: string;
}

export default function WorkerActivityTracker() {
  const { sales, purchases, orders, stock } = useBusiness();
  const { fmt } = useCurrency();
  const [expanded, setExpanded] = useState(false);
  const [filterWorker, setFilterWorker] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  // Collect all activities
  const activities: Activity[] = [];

  // Sales activities
  sales.forEach(sale => {
    if (!sale.recorded_by) return;
    sale.items.forEach(item => {
      activities.push({
        type: 'sale',
        worker: sale.recorded_by,
        description: `Sold ${item.item_name} × ${item.quantity}`,
        amount: Number(item.subtotal),
        category: item.category,
        quality: item.quality,
        date: new Date(sale.created_at).toLocaleDateString(),
        time: new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    });
  });

  // Purchases
  purchases.forEach(p => {
    if (!p.recorded_by) return;
    p.items.forEach(item => {
      activities.push({
        type: 'purchase',
        worker: p.recorded_by,
        description: `Purchased ${item.item_name} × ${item.quantity}`,
        amount: Number(item.subtotal),
        category: item.category,
        quality: item.quality,
        date: new Date(p.created_at).toLocaleDateString(),
        time: new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    });
  });

  // Orders
  orders.forEach(o => {
    if (!o.customer_name) return;
    activities.push({
      type: 'order',
      worker: o.customer_name,
      description: `${o.type === 'my_order' ? 'Created order' : o.type === 'request' ? 'Sent order to supplier' : 'Received order'} (${o.items.length} items)`,
      amount: Number(o.grand_total),
      date: new Date(o.created_at).toLocaleDateString(),
      time: new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
  });

  // Sort by date descending
  activities.sort((a, b) => {
    const da = new Date(`${a.date} ${a.time}`).getTime();
    const db = new Date(`${b.date} ${b.time}`).getTime();
    return db - da;
  });

  // Get unique workers
  const workers = [...new Set(activities.map(a => a.worker))].filter(Boolean);

  // Filter
  const filtered = activities.filter(a => {
    if (filterWorker !== 'all' && a.worker !== filterWorker) return false;
    if (filterType !== 'all' && a.type !== filterType) return false;
    return true;
  });

  const visible = expanded ? filtered : filtered.slice(0, 10);

  const typeIcon = (type: string) => {
    switch (type) {
      case 'sale': return <TrendingUp className="h-3.5 w-3.5 text-success" />;
      case 'purchase': return <ShoppingCart className="h-3.5 w-3.5 text-primary" />;
      case 'order': return <ClipboardList className="h-3.5 w-3.5 text-accent" />;
      case 'stock': return <Package className="h-3.5 w-3.5 text-warning" />;
      default: return null;
    }
  };

  const typeLabel = (type: string) => {
    switch (type) {
      case 'sale': return 'Sale';
      case 'purchase': return 'Purchase';
      case 'order': return 'Order';
      case 'stock': return 'Stock';
      default: return type;
    }
  };

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
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue placeholder="All Workers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Workers</SelectItem>
              {workers.map(w => (
                <SelectItem key={w} value={w}>{w}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="sale">Sales</SelectItem>
              <SelectItem value="purchase">Purchases</SelectItem>
              <SelectItem value="order">Orders</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Activity list */}
        <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
          {visible.map((a, i) => (
            <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-sm">
              <div className="mt-0.5 shrink-0">{typeIcon(a.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-foreground">{a.worker}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    a.type === 'sale' ? 'bg-success/10 text-success' :
                    a.type === 'purchase' ? 'bg-primary/10 text-primary' :
                    'bg-accent/10 text-accent'
                  }`}>{typeLabel(a.type)}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{a.description}</p>
                {(a.category || a.quality) && (
                  <p className="text-[10px] text-muted-foreground">{[a.category, a.quality].filter(Boolean).join(' · ')}</p>
                )}
              </div>
              <div className="text-right shrink-0">
                {a.amount != null && a.amount > 0 && (
                  <p className="text-xs font-semibold tabular-nums text-success">{fmt(a.amount)}</p>
                )}
                <p className="text-[10px] text-muted-foreground whitespace-nowrap">{a.date}</p>
                <p className="text-[10px] text-muted-foreground">{a.time}</p>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No activities found</p>
          )}
        </div>

        {filtered.length > 10 && (
          <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setExpanded(v => !v)}>
            {expanded ? <><ChevronUp className="h-3.5 w-3.5 mr-1" /> Show Less</> : <><ChevronDown className="h-3.5 w-3.5 mr-1" /> View All ({filtered.length})</>}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
