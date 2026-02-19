import { useState } from 'react';
import { useBusiness } from '@/context/BusinessContext';
import { useCurrency } from '@/hooks/useCurrency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, TrendingUp, AlertTriangle, XCircle, DollarSign, ShoppingCart, Wrench } from 'lucide-react';

export default function Dashboard() {
  const { currentBusiness, stock, sales, services } = useBusiness();
  const { fmt } = useCurrency();

  const activeStock = stock.filter(s => !s.deleted_at);

  const todaySales = sales.filter(s => {
    const d = new Date(s.created_at);
    return d.toDateString() === new Date().toDateString();
  });
  const todayRevenue = todaySales.reduce((sum, s) => sum + Number(s.grand_total), 0);

  const todayServices = services.filter(s => new Date(s.created_at).toDateString() === new Date().toDateString());
  const todayServiceRevenue = todayServices.reduce((sum, s) => sum + Number(s.cost), 0);

  const lowStock = activeStock.filter(item => item.quantity > 0 && item.quantity <= item.min_stock_level);
  const outOfStock = activeStock.filter(item => item.quantity === 0);

  // Top selling — combine same name+category+quality
  const itemCounts: Record<string, { name: string; category: string; quality: string; totalSold: number }> = {};
  sales.forEach(sale => {
    sale.items.forEach(item => {
      if (item.price_type === 'service') return;
      const key = `${item.item_name.toLowerCase()}||${(item.category || '').toLowerCase()}||${(item.quality || '').toLowerCase()}`;
      if (!itemCounts[key]) itemCounts[key] = { name: item.item_name, category: item.category, quality: item.quality, totalSold: 0 };
      itemCounts[key].totalSold += item.quantity;
    });
  });
  const topSelling = Object.values(itemCounts).sort((a, b) => b.totalSold - a.totalSold);

  const [showAllTop, setShowAllTop] = useState(false);
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const [showAllSales, setShowAllSales] = useState(false);
  const [showAllServices, setShowAllServices] = useState(false);

  const visibleTop = showAllTop ? topSelling : topSelling.slice(0, 5);
  const allAlerts = [...outOfStock, ...lowStock];
  const visibleAlerts = showAllAlerts ? allAlerts : allAlerts.slice(0, 5);
  const visibleSales = showAllSales ? sales : sales.slice(0, 5);
  const visibleServices = showAllServices ? services : services.slice(0, 5);

  function MoneyBadge({ value }: { value: number }) {
    return (
      <span className="font-bold tabular-nums text-success bg-success/10 px-2 py-0.5 rounded-md text-sm">
        {fmt(value)}
      </span>
    );
  }

  return (
    <div className="space-y-6">
      <div className="gradient-primary rounded-xl p-6 text-primary-foreground">
        <h1 className="text-2xl font-bold">{currentBusiness?.name || 'My Business'}</h1>
        <div className="flex flex-wrap gap-4 mt-2 text-sm opacity-90">
          {currentBusiness?.address && <span>📍 {currentBusiness.address}</span>}
          {currentBusiness?.contact && <span>📞 {currentBusiness.contact}</span>}
          {currentBusiness?.email && <span>✉️ {currentBusiness.email}</span>}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Package className="h-5 w-5 text-primary" /></div>
              <div><p className="text-xs text-muted-foreground">Total Items</p><p className="text-xl font-bold">{activeStock.length}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10"><DollarSign className="h-5 w-5 text-success" /></div>
              <div><p className="text-xs text-muted-foreground">Today's Revenue</p><p className="text-xl font-bold text-success">{fmt(todayRevenue + todayServiceRevenue)}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10"><AlertTriangle className="h-5 w-5 text-warning" /></div>
              <div><p className="text-xs text-muted-foreground">Low Stock</p><p className="text-xl font-bold">{lowStock.length}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10"><XCircle className="h-5 w-5 text-destructive" /></div>
              <div><p className="text-xs text-muted-foreground">Out of Stock</p><p className="text-xl font-bold">{outOfStock.length}</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Selling */}
        <Card className="shadow-card">
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-success" />Top Selling Items</CardTitle></CardHeader>
          <CardContent>
            {topSelling.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sales recorded yet.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {visibleTop.map((item, i) => (
                  <div key={`${item.name}-${item.category}-${item.quality}`} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                      <div>
                        <p className="text-sm font-medium">{item.name}</p>
                        {(item.category || item.quality) && (
                          <p className="text-xs text-muted-foreground">{[item.category, item.quality].filter(Boolean).join(' · ')}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md">{item.totalSold} sold</span>
                  </div>
                ))}
              </div>
            )}
            {topSelling.length > 5 && (
              <button className="text-xs text-primary mt-2 hover:underline" onClick={() => setShowAllTop(v => !v)}>
                {showAllTop ? 'Show less' : `Show all ${topSelling.length}`}
              </button>
            )}
          </CardContent>
        </Card>

        {/* Stock Alerts */}
        <Card className="shadow-card">
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" />Stock Alerts</CardTitle></CardHeader>
          <CardContent>
            {allAlerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">All stock levels are healthy.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {visibleAlerts.map(item => {
                  const isOut = item.quantity === 0;
                  return (
                    <div key={item.id} className={`flex items-center justify-between p-2 rounded-lg ${isOut ? 'bg-destructive/5' : 'bg-warning/5'}`}>
                      <div>
                        <p className="text-sm font-medium">{item.name}</p>
                        {(item.category || item.quality) && <p className="text-xs text-muted-foreground">{[item.category, item.quality].filter(Boolean).join(' · ')}</p>}
                      </div>
                      {isOut
                        ? <span className="text-xs font-semibold text-destructive px-2 py-0.5 rounded-full bg-destructive/10">OUT</span>
                        : <span className="text-xs font-semibold text-warning px-2 py-0.5 rounded-full bg-warning/10">{item.quantity} left</span>
                      }
                    </div>
                  );
                })}
              </div>
            )}
            {allAlerts.length > 5 && (
              <button className="text-xs text-primary mt-2 hover:underline" onClick={() => setShowAllAlerts(v => !v)}>
                {showAllAlerts ? 'Show less' : `Show all ${allAlerts.length}`}
              </button>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <Card className="shadow-card">
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-primary" />Recent Sales</CardTitle></CardHeader>
          <CardContent>
            {sales.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sales recorded yet.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {visibleSales.map(sale => (
                  <div key={sale.id} className="flex items-start justify-between p-2 rounded-lg bg-muted/50">
                    <div className="flex-1 min-w-0">
                      {sale.customer_name && <p className="text-xs font-medium text-foreground">👤 {sale.customer_name}</p>}
                      {sale.items.slice(0, 2).map((item, i) => (
                        <p key={i} className="text-sm font-medium truncate">
                          {item.item_name}
                          {(item.category || item.quality) && <span className="text-xs text-muted-foreground ml-1">· {[item.category, item.quality].filter(Boolean).join(' · ')}</span>}
                        </p>
                      ))}
                      {sale.items.length > 2 && <p className="text-xs text-muted-foreground">+{sale.items.length - 2} more</p>}
                      <p className="text-xs text-muted-foreground">{new Date(sale.created_at).toLocaleString()}</p>
                    </div>
                    <MoneyBadge value={Number(sale.grand_total)} />
                  </div>
                ))}
              </div>
            )}
            {sales.length > 5 && (
              <button className="text-xs text-primary mt-2 hover:underline" onClick={() => setShowAllSales(v => !v)}>
                {showAllSales ? 'Show less' : `Show all ${sales.length}`}
              </button>
            )}
          </CardContent>
        </Card>

        {/* Recent Services */}
        <Card className="shadow-card">
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Wrench className="h-4 w-4 text-accent" />Recent Services</CardTitle></CardHeader>
          <CardContent>
            {services.length === 0 ? (
              <p className="text-sm text-muted-foreground">No services recorded yet.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {visibleServices.map(s => (
                  <div key={s.id} className="flex items-start justify-between p-2 rounded-lg bg-muted/50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{s.service_name}</p>
                      <p className="text-xs text-muted-foreground">
                        👤 {s.customer_name}
                        {s.seller_name && ` · Seller: ${s.seller_name}`}
                      </p>
                      <p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</p>
                    </div>
                    <span className="font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-md text-sm tabular-nums">{fmt(Number(s.cost))}</span>
                  </div>
                ))}
              </div>
            )}
            {services.length > 5 && (
              <button className="text-xs text-primary mt-2 hover:underline" onClick={() => setShowAllServices(v => !v)}>
                {showAllServices ? 'Show less' : `Show all ${services.length}`}
              </button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
