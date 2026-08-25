import { useBusiness } from '@/context/BusinessContext';
import { useCurrency } from '@/hooks/useCurrency';
import { Card, CardContent } from '@/components/ui/card';
import { ClipboardList, Globe, Contact, CalendarCheck, Plus, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import AdSpace from '@/components/AdSpace';
import BannerAd from '@/components/BannerAd';
import HelpGuide from '@/components/HelpGuide';
import PlayStoreUpdateButton from '@/components/PlayStoreUpdateButton';

export default function PersonalDashboard() {
  const { currentBusiness, orders } = useBusiness();
  const { fmt } = useCurrency();

  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'priced');
  const completedOrders = orders.filter(o => o.status === 'completed' || o.status === 'paid');
  const totalSpent = orders.reduce((sum, o) => sum + Number(o.amount_paid), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">👤 Welcome, {currentBusiness?.name}</h1>
          <p className="text-sm text-muted-foreground">Your personal dashboard</p>
        </div>
        <HelpGuide />
      </div>

      <div className="flex justify-center">
        <PlayStoreUpdateButton />
      </div>


      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="shadow-card">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{orders.length}</p>
            <p className="text-xs text-muted-foreground">Total Orders</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{pendingOrders.length}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
      </div>

      {totalSpent > 0 && (
        <Card className="shadow-card border-primary/20">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Total Spent</p>
            <p className="text-xl font-bold text-primary tabular-nums">{fmt(totalSpent)}</p>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/orders" className="p-4 rounded-xl border-2 border-border hover:border-primary/50 transition-all flex flex-col items-center gap-2 text-center">
          <ClipboardList className="h-6 w-6 text-primary" />
          <div>
            <p className="font-semibold text-sm">My Orders</p>
            <p className="text-[10px] text-muted-foreground">Order from businesses</p>
          </div>
        </Link>
        <Link to="/browse" className="p-4 rounded-xl border-2 border-border hover:border-primary/50 transition-all flex flex-col items-center gap-2 text-center">
          <CalendarCheck className="h-6 w-6 text-primary" />
          <div>
            <p className="font-semibold text-sm">Browse & Book</p>
            <p className="text-[10px] text-muted-foreground">Find properties to rent</p>
          </div>
        </Link>
        <Link to="/discover" className="p-4 rounded-xl border-2 border-border hover:border-primary/50 transition-all flex flex-col items-center gap-2 text-center">
          <Globe className="h-6 w-6 text-primary" />
          <div>
            <p className="font-semibold text-sm">Discover</p>
            <p className="text-[10px] text-muted-foreground">Find businesses & assets</p>
          </div>
        </Link>
        <Link to="/contacts" className="p-4 rounded-xl border-2 border-border hover:border-primary/50 transition-all flex flex-col items-center gap-2 text-center">
          <Contact className="h-6 w-6 text-primary" />
          <div>
            <p className="font-semibold text-sm">Contacts</p>
            <p className="text-[10px] text-muted-foreground">Partners & contacts</p>
          </div>
        </Link>
      </div>

      <AdSpace variant="inline" />

      {/* Recent Orders */}
      {orders.length > 0 && (
        <Card className="shadow-card">
          <CardContent className="p-4 space-y-3">
            <h2 className="text-sm font-semibold">Recent Orders</h2>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {orders.slice(0, 5).map(o => (
                <div key={o.id} className="flex items-center justify-between p-2 rounded-lg border bg-muted/30 text-sm">
                  <div>
                    <p className="font-medium">{o.code}</p>
                    <p className="text-xs text-muted-foreground">{o.customer_name} · {new Date(o.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold tabular-nums">{fmt(Number(o.grand_total))}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      o.status === 'completed' || o.status === 'paid' ? 'bg-success/10 text-success' :
                      o.status === 'pending' ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'
                    }`}>{o.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prompt to add business — prominent CTA for business-oriented users */}
      <Card className="shadow-card border-2 border-primary bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
        <CardContent className="p-5 text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/15 flex items-center justify-center">
            <Plus className="h-6 w-6 text-primary" />
          </div>
          <p className="text-base font-bold text-foreground">Ready to start a business?</p>
          <p className="text-xs text-muted-foreground max-w-[260px] mx-auto">
            You can register a business, factory, or property anytime and unlock the full power of BizTrack.
          </p>
          <Link
            to="/register-business"
            className="inline-flex items-center justify-center gap-1.5 text-sm font-bold text-primary-foreground bg-primary hover:bg-primary/90 px-5 py-2.5 rounded-xl shadow-md transition-all hover:shadow-lg hover:scale-[1.02] active:scale-95"
          >
            <Plus className="h-4 w-4" /> Add Business
          </Link>
        </CardContent>
      </Card>

      {/* Native AdMob banner — only shows in Despia native shell */}
      <BannerAd position="bottom" />
    </div>
  );
}
