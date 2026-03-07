import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, TrendingUp, ShoppingCart, ClipboardList, Wrench, Settings, Users, LogOut, Building2, Crown, User, Bell, BellDot, Factory, Flame, Boxes, ShoppingBag, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useBusiness } from '@/context/BusinessContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

const businessNavItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/stock', label: 'My Stock', icon: Package },
  { to: '/sales', label: 'Sales', icon: TrendingUp },
  { to: '/purchases', label: 'Purchases', icon: ShoppingCart },
  { to: '/orders', label: 'Orders', icon: ClipboardList },
  { to: '/services', label: 'Services', icon: Wrench },
  { to: '/team', label: 'Team', icon: Users },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const factoryNavItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/input-stock', label: 'Input Stock', icon: Boxes },
  { to: '/product-stock', label: 'Product Stock', icon: Package },
  { to: '/production', label: 'Production', icon: Factory },
  { to: '/sales', label: 'Sales', icon: TrendingUp },
  { to: '/purchases', label: 'Purchases', icon: ShoppingCart },
  { to: '/orders', label: 'Orders', icon: ClipboardList },
  { to: '/services', label: 'Services', icon: Wrench },
  { to: '/expenses', label: 'Expenses', icon: Flame },
  { to: '/team', label: 'Team', icon: Users },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const businessMobileNav = [
  { to: '/', label: 'Home', icon: LayoutDashboard },
  { to: '/stock', label: 'Stock', icon: Package },
  { to: '/sales', label: 'Sales', icon: TrendingUp },
  { to: '/orders', label: 'Orders', icon: ClipboardList },
];

const factoryMobileNav = [
  { to: '/', label: 'Home', icon: LayoutDashboard },
  { to: '/input-stock', label: 'Inputs', icon: Boxes },
  { to: '/product-stock', label: 'Products', icon: Package },
  { to: '/sales', label: 'Sales', icon: TrendingUp },
];

function BusinessRoleBanner({ userRole, businessName, isFactory }: { userRole: string | null; businessName: string; isFactory: boolean }) {
  if (!userRole) return null;
  const isOwner = userRole === 'owner';
  const isAdmin = userRole === 'admin';
  const typeLabel = isFactory ? 'Factory' : 'Business';

  return (
    <div className={`px-4 py-1.5 text-xs font-medium flex items-center gap-2 ${
      isOwner ? 'bg-primary/10 text-primary border-b border-primary/20'
        : isAdmin ? 'bg-accent/20 text-accent-foreground border-b border-accent/30'
        : 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-b border-orange-500/20'
    }`}>
      {isFactory && <Factory className="h-3.5 w-3.5" />}
      {isOwner ? (
        <><Crown className="h-3.5 w-3.5" /> 👔 You own <span className="font-bold">{businessName}</span> <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full ml-1">{typeLabel}</span></>
      ) : (
        <><User className="h-3.5 w-3.5" /> 🏢 Employed at <span className="font-bold">{businessName}</span> — {userRole} <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full ml-1">{typeLabel}</span></>
      )}
    </div>
  );
}

function NotificationsPanel() {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useBusiness();
  const [open, setOpen] = useState(false);
  const unread = notifications.filter(n => !n.is_read).length;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="relative p-2 rounded-lg hover:bg-sidebar-accent/50 transition-colors">
          {unread > 0 ? <BellDot className="h-5 w-5 text-warning" /> : <Bell className="h-5 w-5 text-sidebar-foreground" />}
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-warning text-warning-foreground text-[10px] flex items-center justify-center font-bold">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80 max-h-screen overflow-y-auto">
        <SheetHeader className="flex flex-row items-center justify-between">
          <SheetTitle>Notifications {unread > 0 && `(${unread} new)`}</SheetTitle>
          {unread > 0 && <Button size="sm" variant="ghost" onClick={markAllNotificationsRead} className="text-xs">Mark all read</Button>}
        </SheetHeader>
        <div className="mt-4 space-y-2">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No notifications yet.</p>
          ) : (
            notifications.map(n => (
              <button key={n.id} onClick={() => markNotificationRead(n.id)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${n.is_read ? 'bg-muted/30 border-border' : 'bg-warning/5 border-warning/30'}`}>
                <p className={`text-sm font-medium ${n.is_read ? 'text-muted-foreground' : 'text-foreground'}`}>{n.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                <p className="text-xs text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</p>
                {!n.is_read && <span className="inline-block mt-1 text-[10px] bg-warning text-warning-foreground px-1.5 py-0.5 rounded-full">NEW</span>}
              </button>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { signOut } = useAuth();
  const { businesses, currentBusiness, setCurrentBusinessId, userRole, memberships, notifications } = useBusiness();
  const [sheetOpen, setSheetOpen] = useState(false);

  const isFactory = (currentBusiness as any)?.business_type === 'factory';
  const navItems = isFactory ? factoryNavItems : businessNavItems;
  const mobileMainNav = isFactory ? factoryMobileNav : businessMobileNav;
  const unreadCount = notifications.filter(n => !n.is_read).length;

  function getRoleForBusiness(businessId: string) {
    return memberships.find(m => m.business_id === businessId)?.role || 'worker';
  }

  function getBusinessType(b: any) {
    return b.business_type === 'factory' ? '🏭' : '🏪';
  }

  function getRoleBadge(role: string) {
    if (role === 'owner') return '👔';
    if (role === 'admin') return '🛡️';
    return '👷';
  }

  function getRoleLabel(role: string) {
    if (role === 'owner') return 'Owner';
    if (role === 'admin') return 'Admin';
    return 'Employed';
  }

  return (
    <div className="flex h-screen overflow-hidden flex-col">
      {currentBusiness && <BusinessRoleBanner userRole={userRole} businessName={currentBusiness.name} isFactory={isFactory} />}

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
          <div className="p-5 border-b border-sidebar-border flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-sidebar-accent-foreground tracking-tight">
                {isFactory ? '🏭 BizTrack' : '📦 BizTrack'}
              </h1>
              <p className="text-xs text-sidebar-muted mt-1">{isFactory ? 'Factory Manager' : 'Business Manager'}</p>
            </div>
            <NotificationsPanel />
          </div>

          {/* Business Switcher */}
          <div className="px-3 pt-3">
            <Select value={currentBusiness?.id || ''} onValueChange={setCurrentBusinessId}>
              <SelectTrigger className="w-full bg-sidebar-accent/30 border-sidebar-border text-sidebar-foreground text-xs h-9">
                <Building2 className="h-3 w-3 mr-1" />
                <SelectValue placeholder="Select business" />
              </SelectTrigger>
              <SelectContent>
                {businesses.map(b => {
                  const role = getRoleForBusiness(b.id);
                  return (
                    <SelectItem key={b.id} value={b.id}>
                      <span className="flex items-center gap-2">
                        <span>{getBusinessType(b)}</span>
                        <span>{b.name}</span>
                        <span className="text-[10px] text-muted-foreground ml-1">({getRoleLabel(role)})</span>
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems.map(({ to, label, icon: Icon }) => {
              const active = pathname === to;
              return (
                <Link key={to} to={to}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                  }`}>
                  <Icon className="h-4 w-4 shrink-0" />{label}
                </Link>
              );
            })}
          </nav>

          <div className="p-3 border-t border-sidebar-border">
            <Button variant="ghost" className="w-full justify-start text-sidebar-foreground text-sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />Sign Out
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="p-4 md:p-6 max-w-7xl mx-auto animate-fade-in">{children}</div>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border flex justify-around items-center py-2">
        {mobileMainNav.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <Link key={to} to={to} className={`flex flex-col items-center gap-0.5 text-xs transition-colors ${active ? 'text-primary' : 'text-muted-foreground'}`}>
              <Icon className="h-5 w-5" />{label}
            </Link>
          );
        })}

        <Sheet>
          <SheetTrigger asChild>
            <button className="relative flex flex-col items-center gap-0.5 text-xs text-muted-foreground">
              {unreadCount > 0 ? <BellDot className="h-5 w-5 text-warning" /> : <Bell className="h-5 w-5" />}
              <span>Alerts</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 right-1 h-3.5 w-3.5 rounded-full bg-warning text-warning-foreground text-[9px] flex items-center justify-center font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh] overflow-y-auto">
            <SheetHeader><SheetTitle>Notifications</SheetTitle></SheetHeader>
            <NotificationsPanel />
          </SheetContent>
        </Sheet>

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center gap-0.5 text-xs text-muted-foreground transition-colors">
              <Building2 className="h-5 w-5" />
              <span className="truncate max-w-[56px]">Switch</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="text-left flex items-center gap-2"><Building2 className="h-5 w-5" /> My Businesses & Factories</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-2">
              {businesses.map(b => {
                const role = getRoleForBusiness(b.id);
                const isActive = b.id === currentBusiness?.id;
                const isFact = (b as any).business_type === 'factory';
                return (
                  <button key={b.id} onClick={() => { setCurrentBusinessId(b.id); setSheetOpen(false); }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                      isActive ? 'bg-primary/10 border-2 border-primary' : 'bg-muted/50 border-2 border-transparent hover:border-muted-foreground/20'
                    }`}>
                    <span className="text-2xl">{isFact ? '🏭' : '🏪'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{b.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {getRoleBadge(role)} {getRoleLabel(role)} · {isFact ? 'Factory' : 'Business'}
                      </p>
                    </div>
                    {isActive && <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Active</span>}
                  </button>
                );
              })}
              <div className="pt-3 border-t space-y-1">
                <Link to="/settings" onClick={() => setSheetOpen(false)} className="flex items-center gap-3 p-3 rounded-xl text-sm text-muted-foreground hover:bg-muted/50">
                  <Settings className="h-4 w-4" /> Settings & Add Business
                </Link>
                <Link to="/team" onClick={() => setSheetOpen(false)} className="flex items-center gap-3 p-3 rounded-xl text-sm text-muted-foreground hover:bg-muted/50">
                  <Users className="h-4 w-4" /> Team
                </Link>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </div>
  );
}
