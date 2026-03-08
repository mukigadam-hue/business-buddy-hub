import { useState } from 'react';
import { useBusiness } from '@/context/BusinessContext';
import { useCurrency } from '@/hooks/useCurrency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, TrendingUp, AlertTriangle, XCircle, DollarSign, ShoppingCart, Wrench, Camera } from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';
import QuickAddItem from '@/components/QuickAddItem';

export default function Dashboard() {
  const { currentBusiness, updateBusiness, stock, sales, services, purchases } = useBusiness();
  const { fmt } = useCurrency();

  const activeStock = stock.filter(s => !s.deleted_at);

  const todaySales = sales.filter(s => {
    const d = new Date(s.created_at);
    return d.toDateString() === new Date().toDateString();
  });
  // Stock sales revenue (exclude service items embedded in sales)
  const todayStockSalesRevenue = todaySales.reduce((sum, s) => {
    return sum + s.items.filter(i => i.price_type !== 'service').reduce((t, i) => t + Number(i.subtotal), 0);
  }, 0);

  const todayServices = services.filter(s => new Date(s.created_at).toDateString() === new Date().toDateString());
  const todayServiceRevenue = todayServices.reduce((sum, s) => sum + Number(s.cost), 0);
  // Service items embedded in sales
  const todaySaleServiceRevenue = todaySales.reduce((sum, s) => {
    return sum + s.items.filter(i => i.price_type === 'service').reduce((t, i) => t + Number(i.subtotal), 0);
  }, 0);
  const todayTotalServiceRevenue = todayServiceRevenue + todaySaleServiceRevenue;
  const todayRevenue = todayStockSalesRevenue + todayTotalServiceRevenue;

  const lowStock = activeStock.filter(item => item.quantity > 0 && item.quantity <= item.min_stock_level);
  const outOfStock = activeStock.filter(item => item.quantity === 0);

  // Debt tracking
  const salesDebts = sales.filter(s => s.payment_status !== 'paid' && Number(s.balance) > 0);
  const purchaseDebts = purchases.filter(p => p.payment_status !== 'paid' && Number(p.balance) > 0);
  const serviceDebts = services.filter(s => s.payment_status !== 'paid' && Number(s.balance) > 0);
  const totalOwedToYou = salesDebts.reduce((sum, s) => sum + Number(s.balance), 0) + serviceDebts.reduce((sum, s) => sum + Number(s.balance), 0);
  const totalYouOwe = purchaseDebts.reduce((sum, p) => sum + Number(p.balance), 0);

  // Overdue debts (older than 3 days)
  const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
  const overdueSales = salesDebts.filter(s => (Date.now() - new Date(s.created_at).getTime()) > THREE_DAYS);
  const overduePurchases = purchaseDebts.filter(p => (Date.now() - new Date(p.created_at).getTime()) > THREE_DAYS);
  const overdueServices = serviceDebts.filter(s => (Date.now() - new Date(s.created_at).getTime()) > THREE_DAYS);
  const hasOverdue = overdueSales.length > 0 || overduePurchases.length > 0 || overdueServices.length > 0;

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
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showLogoUpload, setShowLogoUpload] = useState(false);
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
      <div className="gradient-primary rounded-xl p-4 sm:p-6 text-primary-foreground">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="shrink-0">
            {currentBusiness?.logo_url ? (
              <div className="relative cursor-pointer" onClick={() => setShowLogoUpload(v => !v)}>
                <img src={currentBusiness.logo_url} alt="Logo" className="h-12 w-12 sm:h-16 sm:w-16 rounded-xl object-cover border-2 border-primary-foreground/30" />
              </div>
            ) : (
              <button onClick={() => setShowLogoUpload(v => !v)}
                className="h-12 w-12 sm:h-16 sm:w-16 rounded-xl border-2 border-dashed border-primary-foreground/40 flex items-center justify-center hover:border-primary-foreground/70 transition-colors">
                <Camera className="h-5 w-5 sm:h-6 sm:w-6 opacity-60" />
              </button>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold truncate">{currentBusiness?.name || 'My Business'}</h1>
            {currentBusiness?.business_code && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs sm:text-sm font-mono bg-primary-foreground/20 px-2 py-0.5 rounded">
                  🔗 Code: {currentBusiness.business_code}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(currentBusiness.business_code || '');
                    import('sonner').then(m => m.toast.success('Business code copied!'));
                  }}
                  className="text-xs bg-primary-foreground/20 hover:bg-primary-foreground/30 px-2 py-0.5 rounded transition-colors"
                >
                  📋 Copy
                </button>
              </div>
            )}
            <div className="flex flex-wrap gap-2 sm:gap-4 mt-1 sm:mt-2 text-xs sm:text-sm opacity-90">
              {currentBusiness?.address && <span className="truncate max-w-[150px] sm:max-w-none">📍 {currentBusiness.address}</span>}
              {currentBusiness?.contact && <span>📞 {currentBusiness.contact}</span>}
              {currentBusiness?.email && <span className="truncate max-w-[150px] sm:max-w-none">✉️ {currentBusiness.email}</span>}
            </div>
          </div>
        </div>
        {showLogoUpload && (
          <div className="mt-4 p-3 bg-background/10 rounded-lg">
            <ImageUpload
              bucket="business-logos"
              path={currentBusiness?.id || 'logo'}
              currentUrl={currentBusiness?.logo_url}
              onUploaded={(url) => { updateBusiness({ logo_url: url } as any); setShowLogoUpload(false); }}
              onRemoved={() => updateBusiness({ logo_url: '' } as any)}
              size="md"
              label="Business Logo"
            />
          </div>
        )}
      </div>

      {/* Quick Add Item with Photo */}
      <Button onClick={() => setShowQuickAdd(true)} className="w-full" variant="outline" size="lg">
        <Camera className="h-5 w-5 mr-2" /> Add Item with Photos
      </Button>
      <QuickAddItem open={showQuickAdd} onOpenChange={setShowQuickAdd} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <Card className="shadow-card">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10"><Package className="h-4 w-4 sm:h-5 sm:w-5 text-primary" /></div>
              <div><p className="text-[10px] sm:text-xs text-muted-foreground">Total Items</p><p className="text-lg sm:text-xl font-bold">{activeStock.length}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-success/10"><DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-success" /></div>
              <div className="min-w-0"><p className="text-[10px] sm:text-xs text-muted-foreground">Today's Revenue</p><p className="text-base sm:text-xl font-bold text-success truncate">{fmt(todayRevenue)}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-warning/10"><AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-warning" /></div>
              <div><p className="text-[10px] sm:text-xs text-muted-foreground">Low Stock</p><p className="text-lg sm:text-xl font-bold">{lowStock.length}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-destructive/10"><XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" /></div>
              <div><p className="text-[10px] sm:text-xs text-muted-foreground">Out of Stock</p><p className="text-lg sm:text-xl font-bold">{outOfStock.length}</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Debt Summary */}
      {(totalOwedToYou > 0 || totalYouOwe > 0) && (
        <Card className="shadow-card border-warning/30 bg-warning/5">
          <CardContent className="p-4 space-y-3">
            <h3 className="text-base font-bold flex items-center gap-2">💳 Outstanding Debts</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                <p className="text-xs text-muted-foreground">Others Owe You</p>
                <p className="text-lg font-bold text-success">{fmt(totalOwedToYou)}</p>
                <p className="text-xs text-muted-foreground">{salesDebts.length} unpaid sale(s)</p>
              </div>
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-xs text-muted-foreground">You Owe Suppliers</p>
                <p className="text-lg font-bold text-destructive">{fmt(totalYouOwe)}</p>
                <p className="text-xs text-muted-foreground">{purchaseDebts.length} unpaid purchase(s)</p>
              </div>
            </div>
            {salesDebts.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">🔴 Customers who owe you:</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {salesDebts.map(s => (
                    <div key={s.id} className="flex justify-between text-sm">
                      <span>👤 {s.customer_name}</span>
                      <span className="font-bold text-destructive tabular-nums">{fmt(Number(s.balance))}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {purchaseDebts.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">🔴 What you owe suppliers:</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {purchaseDebts.map(p => (
                    <div key={p.id} className="flex justify-between text-sm">
                      <span>🏪 {p.supplier}</span>
                      <span className="font-bold text-destructive tabular-nums">{fmt(Number(p.balance))}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
