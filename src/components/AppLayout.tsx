import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, TrendingUp, ShoppingCart, ClipboardList, Wrench, Settings, Users, LogOut, Building2, ChevronDown, Crown, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useBusiness } from '@/context/BusinessContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/stock', label: 'My Stock', icon: Package },
  { to: '/sales', label: 'Sales', icon: TrendingUp },
  { to: '/purchases', label: 'Purchases', icon: ShoppingCart },
  { to: '/orders', label: 'Orders', icon: ClipboardList },
  { to: '/services', label: 'Services', icon: Wrench },
  { to: '/team', label: 'Team', icon: Users },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const mobileMainNav = [
  { to: '/', label: 'Home', icon: LayoutDashboard },
  { to: '/stock', label: 'Stock', icon: Package },
  { to: '/sales', label: 'Sales', icon: TrendingUp },
  { to: '/orders', label: 'Orders', icon: ClipboardList },
];

function BusinessRoleBanner({ userRole, businessName }: { userRole: string | null; businessName: string }) {
  if (!userRole) return null;
  const isOwner = userRole === 'owner';
  const isAdmin = userRole === 'admin';

  return (
    <div className={`px-4 py-2 text-xs font-medium flex items-center gap-2 ${
      isOwner
        ? 'bg-primary/10 text-primary border-b border-primary/20'
        : isAdmin
        ? 'bg-accent/20 text-accent-foreground border-b border-accent/30'
        : 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-b border-orange-500/20'
    }`}>
      {isOwner ? (
        <><Crown className="h-3.5 w-3.5" /> 👔 You own <span className="font-bold">{businessName}</span></>
      ) : (
        <><User className="h-3.5 w-3.5" /> 🏢 Employed at <span className="font-bold">{businessName}</span> — You are a {userRole}</>
      )}
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { signOut } = useAuth();
  const { businesses, currentBusiness, setCurrentBusinessId, userRole, memberships } = useBusiness();
  const [sheetOpen, setSheetOpen] = useState(false);

  function getRoleForBusiness(businessId: string) {
    return memberships.find(m => m.business_id === businessId)?.role || 'worker';
  }

  function getRoleBadge(role: string) {
    if (role === 'owner') return '👔';
    if (role === 'admin') return '🛡️';
    return '👷';
  }

  function getRoleLabel(role: string) {
    if (role === 'owner') return 'Your Business';
    if (role === 'admin') return 'Admin';
    return 'Employed';
  }

  return (
    <div className="flex h-screen overflow-hidden flex-col">
      {/* Role Banner */}
      {currentBusiness && (
        <BusinessRoleBanner userRole={userRole} businessName={currentBusiness.name} />
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
          <div className="p-5 border-b border-sidebar-border">
            <h1 className="text-xl font-bold text-sidebar-accent-foreground tracking-tight">📦 BizTrack</h1>
            <p className="text-xs text-sidebar-muted mt-1">Business Manager</p>
          </div>
          
          {/* Desktop Business Switcher */}
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
                        <span>{getRoleBadge(role)}</span>
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
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="p-3 border-t border-sidebar-border">
            <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:text-sidebar-accent-foreground text-sm" onClick={signOut}>
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

        {/* Business Switcher in bottom nav */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center gap-0.5 text-xs text-muted-foreground transition-colors">
              <Building2 className="h-5 w-5" />
              <span className="truncate max-w-[56px]">Switch</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh]">
            <SheetHeader>
              <SheetTitle className="text-left flex items-center gap-2">
                <Building2 className="h-5 w-5" /> My Businesses
              </SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-2 overflow-y-auto">
              {businesses.map(b => {
                const role = getRoleForBusiness(b.id);
                const isActive = b.id === currentBusiness?.id;
                return (
                  <button
                    key={b.id}
                    onClick={() => { setCurrentBusinessId(b.id); setSheetOpen(false); }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                      isActive
                        ? 'bg-primary/10 border-2 border-primary'
                        : 'bg-muted/50 border-2 border-transparent hover:border-muted-foreground/20'
                    }`}
                  >
                    <span className="text-2xl">{getRoleBadge(role)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{b.name}</p>
                      <p className={`text-xs ${role === 'owner' ? 'text-primary' : 'text-orange-600 dark:text-orange-400'}`}>
                        {getRoleLabel(role)}
                      </p>
                    </div>
                    {isActive && (
                      <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Active</span>
                    )}
                  </button>
                );
              })}

              {/* Quick links */}
              <div className="pt-3 border-t space-y-1">
                <Link to="/settings" onClick={() => setSheetOpen(false)} className="flex items-center gap-3 p-3 rounded-xl text-sm text-muted-foreground hover:bg-muted/50 transition-colors">
                  <Settings className="h-4 w-4" /> Settings & Add Business
                </Link>
                <Link to="/team" onClick={() => setSheetOpen(false)} className="flex items-center gap-3 p-3 rounded-xl text-sm text-muted-foreground hover:bg-muted/50 transition-colors">
                  <Users className="h-4 w-4" /> Team & Customers
                </Link>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </div>
  );
}
