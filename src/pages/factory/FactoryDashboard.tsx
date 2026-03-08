import { useState } from 'react';
import { useBusiness } from '@/context/BusinessContext';
import { useFactory } from '@/context/FactoryContext';
import { useCurrency } from '@/hooks/useCurrency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, TrendingUp, AlertTriangle, XCircle, DollarSign, Factory, Wrench, Camera, Users, Flame } from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';
import QuickAddItem from '@/components/QuickAddItem';
import AdSpace from '@/components/AdSpace';

export default function FactoryDashboard() {
  const { currentBusiness, updateBusiness, stock, sales, services } = useBusiness();
  const { rawMaterials, expenses, teamMembers, production } = useFactory();
  const { fmt } = useCurrency();

  const activeProducts = stock.filter(s => !s.deleted_at);
  const activeRawMaterials = rawMaterials.filter(r => !r.deleted_at);

  // Revenue
  const todaySales = sales.filter(s => new Date(s.created_at).toDateString() === new Date().toDateString());
  const todayRevenue = todaySales.reduce((sum, s) => sum + Number(s.grand_total), 0);

  // Stock alerts
  const lowProducts = activeProducts.filter(i => i.quantity > 0 && i.quantity <= i.min_stock_level);
  const outProducts = activeProducts.filter(i => i.quantity === 0);
  const lowMaterials = activeRawMaterials.filter(r => Number(r.quantity) > 0 && Number(r.quantity) <= Number(r.min_stock_level));
  const outMaterials = activeRawMaterials.filter(r => Number(r.quantity) === 0);

  // Today's expenses
  const todayExpenses = expenses.filter(e => new Date(e.created_at).toDateString() === new Date().toDateString());
  const todayExpenseTotal = todayExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  // Today's production
  const todayProduction = production.filter(p => new Date(p.created_at).toDateString() === new Date().toDateString());
  const todayWaste = todayProduction.reduce((sum, p) => sum + Number(p.waste_quantity), 0);

  // Total salary bill
  const totalSalaryBill = teamMembers.filter(t => t.is_active).reduce((sum, t) => sum + Number(t.salary), 0);

  const [showLogoUpload, setShowLogoUpload] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
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
            <div className="flex items-center gap-2">
              <Factory className="h-5 w-5 sm:h-6 sm:w-6" />
              <h1 className="text-lg sm:text-2xl font-bold truncate">{currentBusiness?.name || 'My Factory'}</h1>
            </div>
            <p className="text-xs sm:text-sm opacity-80 mt-1">Factory Manager</p>
            {currentBusiness?.business_code && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs sm:text-sm font-mono bg-primary-foreground/20 px-2 py-0.5 rounded">
                  🔗 Code: {(currentBusiness as any).business_code}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText((currentBusiness as any).business_code || '');
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
            </div>
          </div>
        </div>
        {showLogoUpload && (
          <div className="mt-4 p-3 bg-background/10 rounded-lg">
            <ImageUpload bucket="business-logos" path={currentBusiness?.id || 'logo'}
              currentUrl={currentBusiness?.logo_url}
              onUploaded={(url) => { updateBusiness({ logo_url: url } as any); setShowLogoUpload(false); }}
              onRemoved={() => updateBusiness({ logo_url: '' } as any)} size="md" label="Factory Logo" />
          </div>
        )}
      </div>

      <Button onClick={() => setShowQuickAdd(true)} className="w-full" variant="outline" size="lg">
        <Camera className="h-5 w-5 mr-2" /> Add Product with Photos
      </Button>
      <QuickAddItem open={showQuickAdd} onOpenChange={setShowQuickAdd} />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <Card className="shadow-card">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10"><Package className="h-4 w-4 sm:h-5 sm:w-5 text-primary" /></div>
              <div><p className="text-[10px] sm:text-xs text-muted-foreground">Raw Materials</p><p className="text-lg sm:text-xl font-bold">{activeRawMaterials.length}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-accent/10"><Package className="h-4 w-4 sm:h-5 sm:w-5 text-accent" /></div>
              <div><p className="text-[10px] sm:text-xs text-muted-foreground">Products</p><p className="text-lg sm:text-xl font-bold">{activeProducts.length}</p></div>
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
              <div className="p-1.5 sm:p-2 rounded-lg bg-destructive/10"><Flame className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" /></div>
              <div className="min-w-0"><p className="text-[10px] sm:text-xs text-muted-foreground">Today's Expenses</p><p className="text-base sm:text-xl font-bold text-destructive truncate">{fmt(todayExpenseTotal)}</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10"><Users className="h-5 w-5 text-warning" /></div>
              <div><p className="text-xs text-muted-foreground">Active Workers</p><p className="text-xl font-bold">{teamMembers.filter(t => t.is_active).length}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10"><DollarSign className="h-5 w-5 text-info" /></div>
              <div><p className="text-xs text-muted-foreground">Monthly Salary Bill</p><p className="text-lg font-bold text-info">{fmt(totalSalaryBill)}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10"><AlertTriangle className="h-5 w-5 text-destructive" /></div>
              <div><p className="text-xs text-muted-foreground">Today's Waste</p><p className="text-xl font-bold">{todayWaste}</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="shadow-card">
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" />Material Alerts</CardTitle></CardHeader>
          <CardContent>
            {lowMaterials.length === 0 && outMaterials.length === 0 ? (
              <p className="text-sm text-muted-foreground">All material levels are healthy.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {outMaterials.map(r => (
                  <div key={r.id} className="flex items-center justify-between p-2 rounded-lg bg-destructive/5">
                    <div>
                      <p className="text-sm font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.category} · {r.unit_type}</p>
                    </div>
                    <span className="text-xs font-semibold text-destructive px-2 py-0.5 rounded-full bg-destructive/10">OUT</span>
                  </div>
                ))}
                {lowMaterials.map(r => (
                  <div key={r.id} className="flex items-center justify-between p-2 rounded-lg bg-warning/5">
                    <div>
                      <p className="text-sm font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.category} · {r.unit_type}</p>
                    </div>
                    <span className="text-xs font-semibold text-warning px-2 py-0.5 rounded-full bg-warning/10">{r.quantity} left</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" />Product Alerts</CardTitle></CardHeader>
          <CardContent>
            {lowProducts.length === 0 && outProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">All product levels are healthy.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {outProducts.map(i => (
                  <div key={i.id} className="flex items-center justify-between p-2 rounded-lg bg-destructive/5">
                    <div><p className="text-sm font-medium">{i.name}</p><p className="text-xs text-muted-foreground">{[i.category, i.quality].filter(Boolean).join(' · ')}</p></div>
                    <span className="text-xs font-semibold text-destructive px-2 py-0.5 rounded-full bg-destructive/10">OUT</span>
                  </div>
                ))}
                {lowProducts.map(i => (
                  <div key={i.id} className="flex items-center justify-between p-2 rounded-lg bg-warning/5">
                    <div><p className="text-sm font-medium">{i.name}</p><p className="text-xs text-muted-foreground">{[i.category, i.quality].filter(Boolean).join(' · ')}</p></div>
                    <span className="text-xs font-semibold text-warning px-2 py-0.5 rounded-full bg-warning/10">{i.quantity} left</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Production */}
      <Card className="shadow-card">
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />Recent Production</CardTitle></CardHeader>
        <CardContent>
          {production.length === 0 ? (
            <p className="text-sm text-muted-foreground">No production records yet.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {production.slice(0, 10).map(p => (
                <div key={p.id} className="flex items-start justify-between p-2 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">{p.product_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Produced: {p.quantity_produced} · Waste: {p.waste_quantity} {p.waste_unit}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      📅 {new Date(p.production_date).toLocaleDateString()}
                      {p.expiry_date && ` · Expires: ${new Date(p.expiry_date).toLocaleDateString()}`}
                    </p>
                  </div>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-md font-medium">{p.quantity_produced} units</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AdSpace variant="banner" />
    </div>
  );
}
