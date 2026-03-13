import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBusiness } from '@/context/BusinessContext';
import { useProperty } from '@/context/PropertyContext';
import { useCurrency } from '@/hooks/useCurrency';
import { getCountryFlag } from '@/lib/countries';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Home, CalendarCheck, TrendingUp, Plus, AlertTriangle, Search, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { APP_VERSION } from '@/version';
import LanguageSelector from '@/components/LanguageSelector';
import ImageUpload from '@/components/ImageUpload';
import AdSpace from '@/components/AdSpace';

export default function PropertyDashboard() {
  const { t } = useTranslation();
  const { currentBusiness, updateBusiness } = useBusiness();
  const { assets, bookings } = useProperty();
  const { currency, fmt } = useCurrency();
  const navigate = useNavigate();
  const [showLogoUpload, setShowLogoUpload] = useState(false);

  const activeAssets = assets.filter(a => !a.deleted_at);
  const availableAssets = activeAssets.filter(a => a.is_available);
  const activeBookings = bookings.filter(b => b.status === 'active' || b.status === 'confirmed');
  const pendingBookings = bookings.filter(b => b.status === 'pending');

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

      {/* Header with Logo - same pattern as Business Dashboard */}
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
            <h1 className="text-lg sm:text-2xl font-bold truncate">🏠 {currentBusiness?.name}</h1>
            {currentBusiness?.business_code && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs sm:text-sm font-mono bg-primary-foreground/20 px-2 py-0.5 rounded">
                  {(currentBusiness as any)?.country_code ? getCountryFlag((currentBusiness as any).country_code) : '🔗'} Code: {currentBusiness.business_code}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(currentBusiness.business_code || '');
                    import('sonner').then(m => m.toast.success('Code copied!'));
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
              label="Property Logo"
            />
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10"><Home className="h-4 w-4 text-primary" /></div>
              <div>
                <p className="text-[10px] text-muted-foreground">Total Assets</p>
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
                <p className="text-[10px] text-muted-foreground">Active Bookings</p>
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
                <p className="text-[10px] text-muted-foreground">Pending</p>
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
                <p className="text-[10px] text-muted-foreground">Available</p>
                <p className="text-lg font-bold">{availableAssets.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <AdSpace variant="banner" />

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <Button variant="outline" className="h-auto py-3 flex flex-col gap-1" onClick={() => navigate('/assets')}>
          <Plus className="h-5 w-5" />
          <span className="text-xs">List New Asset</span>
        </Button>
        <Button variant="outline" className="h-auto py-3 flex flex-col gap-1" onClick={() => navigate('/bookings')}>
          <CalendarCheck className="h-5 w-5" />
          <span className="text-xs">View Bookings</span>
        </Button>
        <Button variant="outline" className="h-auto py-3 flex flex-col gap-1" onClick={() => navigate('/browse')}>
          <Search className="h-5 w-5" />
          <span className="text-xs">Browse Rentals</span>
        </Button>
      </div>

      {/* Category Breakdown */}
      {Object.keys(categoryBreakdown).length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">Asset Categories</h3>
            <div className="space-y-2">
              {Object.entries(categoryBreakdown).map(([cat, count]) => (
                <div key={cat} className="flex items-center justify-between">
                  <span className="text-sm capitalize flex items-center gap-2">
                    {cat === 'house' ? '🏠' : cat === 'land' ? '🏞️' : cat === 'vehicle' ? '🚗' : '🚢'} {cat}
                  </span>
                  <span className="text-sm font-medium">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <AdSpace variant="inline" />

      {/* Pending Bookings Preview */}
      {pendingBookings.length > 0 && (
        <Card className="border-amber-500/30">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Pending Booking Requests
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
                    <span className="text-xs font-medium text-amber-600">{fmt(Number(b.total_price))}</span>
                  </div>
                );
              })}
            </div>
            <Button variant="link" size="sm" className="mt-2 p-0" onClick={() => navigate('/bookings')}>
              View All →
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
