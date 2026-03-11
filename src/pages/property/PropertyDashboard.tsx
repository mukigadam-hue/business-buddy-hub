import { useTranslation } from 'react-i18next';
import { useBusiness } from '@/context/BusinessContext';
import { useProperty } from '@/context/PropertyContext';
import { useCurrency } from '@/hooks/useCurrency';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Home, CalendarCheck, MessageSquare, TrendingUp, Plus, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { APP_VERSION } from '@/version';
import LanguageSelector from '@/components/LanguageSelector';

export default function PropertyDashboard() {
  const { t } = useTranslation();
  const { currentBusiness } = useBusiness();
  const { assets, bookings } = useProperty();
  const { currency } = useCurrency();
  const navigate = useNavigate();

  const activeAssets = assets.filter(a => !a.deleted_at);
  const availableAssets = activeAssets.filter(a => a.is_available);
  const activeBookings = bookings.filter(b => b.status === 'active' || b.status === 'confirmed');
  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const totalRevenue = bookings.filter(b => b.payment_status === 'paid').reduce((s, b) => s + b.total_price, 0);

  const categoryBreakdown = activeAssets.reduce((acc, a) => {
    acc[a.category] = (acc[a.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground font-mono">v{APP_VERSION}</span>
        <LanguageSelector variant="compact" />
      </div>

      <div>
        <h1 className="text-xl sm:text-2xl font-bold">🏠 {currentBusiness?.name}</h1>
        <p className="text-xs text-muted-foreground">{t('property.dashboard', 'Property Dashboard')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10"><Home className="h-4 w-4 text-primary" /></div>
              <div>
                <p className="text-[10px] text-muted-foreground">{t('property.totalAssets', 'Total Assets')}</p>
                <p className="text-lg font-bold">{activeAssets.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-green-500/10"><CalendarCheck className="h-4 w-4 text-green-600" /></div>
              <div>
                <p className="text-[10px] text-muted-foreground">{t('property.activeBookings', 'Active Bookings')}</p>
                <p className="text-lg font-bold">{activeBookings.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/10"><AlertTriangle className="h-4 w-4 text-amber-600" /></div>
              <div>
                <p className="text-[10px] text-muted-foreground">{t('property.pending', 'Pending')}</p>
                <p className="text-lg font-bold">{pendingBookings.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/10"><TrendingUp className="h-4 w-4 text-blue-600" /></div>
              <div>
                <p className="text-[10px] text-muted-foreground">{t('property.available', 'Available')}</p>
                <p className="text-lg font-bold">{availableAssets.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <Button variant="outline" className="h-auto py-3 flex flex-col gap-1" onClick={() => navigate('/assets')}>
          <Plus className="h-5 w-5" />
          <span className="text-xs">{t('property.listAsset', 'List New Asset')}</span>
        </Button>
        <Button variant="outline" className="h-auto py-3 flex flex-col gap-1" onClick={() => navigate('/bookings')}>
          <CalendarCheck className="h-5 w-5" />
          <span className="text-xs">{t('property.viewBookings', 'View Bookings')}</span>
        </Button>
        <Button variant="outline" className="h-auto py-3 flex flex-col gap-1" onClick={() => navigate('/messages')}>
          <MessageSquare className="h-5 w-5" />
          <span className="text-xs">{t('property.messages', 'Messages')}</span>
        </Button>
      </div>

      {/* Category Breakdown */}
      {Object.keys(categoryBreakdown).length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">{t('property.assetCategories', 'Asset Categories')}</h3>
            <div className="space-y-2">
              {Object.entries(categoryBreakdown).map(([cat, count]) => (
                <div key={cat} className="flex items-center justify-between">
                  <span className="text-sm capitalize flex items-center gap-2">
                    {cat === 'land' ? '🏞️' : cat === 'vehicle' ? '🚗' : '🚢'} {cat}
                  </span>
                  <span className="text-sm font-medium">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Bookings Preview */}
      {pendingBookings.length > 0 && (
        <Card className="border-amber-500/30">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              {t('property.pendingBookings', 'Pending Booking Requests')}
            </h3>
            <div className="space-y-2">
              {pendingBookings.slice(0, 5).map(b => {
                const asset = assets.find(a => a.id === b.asset_id);
                return (
                  <div key={b.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">{asset?.name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{b.renter_name} · {new Date(b.start_date).toLocaleDateString()}</p>
                    </div>
                    <span className="text-xs font-medium text-amber-600"><span className="text-xs font-medium text-amber-600">{currency}{b.total_price.toLocaleString()}</span></span>
                  </div>
                );
              })}
            </div>
            <Button variant="link" size="sm" className="mt-2 p-0" onClick={() => navigate('/bookings')}>
              {t('dashboard.viewAll', 'View All')} →
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
