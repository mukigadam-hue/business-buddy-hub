import { useState, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, Package, TrendingUp, ShoppingCart, ClipboardList, Wrench, Settings, Users, LogOut, Building2, Crown, User, Bell, BellDot, Factory, Flame, Boxes, Menu, Contact, Globe, Home, CalendarCheck, MessageSquare, Search, AlertTriangle, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import ProofVideoButton from '@/components/ProofVideoButton';
import NetworkStatusBanner from '@/components/NetworkStatusBanner';
import { useAuth } from '@/context/AuthContext';
import { APP_VERSION } from '@/version';
import { useBusiness } from '@/context/BusinessContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

function useNavItems() {
  const { t } = useTranslation();
  
  const businessNavItems = [
    { to: '/', label: t('nav.dashboard'), icon: LayoutDashboard },
    { to: '/stock', label: t('nav.stock'), icon: Package },
    { to: '/sales', label: t('nav.sales'), icon: TrendingUp },
    { to: '/purchases', label: t('nav.purchases'), icon: ShoppingCart },
    { to: '/orders', label: t('nav.orders'), icon: ClipboardList },
    { to: '/services', label: t('nav.services'), icon: Wrench },
    { to: '/expenses', label: t('nav.expenses'), icon: Flame },
    { to: '/waste', label: 'Waste', icon: AlertTriangle },
    { to: '/contacts', label: t('nav.contacts'), icon: Contact },
    { to: '/discover', label: t('nav.discover'), icon: Globe },
    { to: '/team', label: t('nav.team'), icon: Users },
    { to: '/settings', label: t('nav.settings'), icon: Settings },
  ];

  const factoryNavItems = [
    { to: '/', label: t('nav.dashboard'), icon: LayoutDashboard },
    { to: '/input-stock', label: t('nav.inputStock'), icon: Boxes },
    { to: '/product-stock', label: t('nav.productStock'), icon: Package },
    { to: '/production', label: t('nav.production'), icon: Factory },
    { to: '/sales', label: t('nav.sales'), icon: TrendingUp },
    { to: '/purchases', label: t('nav.purchases'), icon: ShoppingCart },
    { to: '/orders', label: t('nav.orders'), icon: ClipboardList },
    { to: '/services', label: t('nav.services'), icon: Wrench },
    { to: '/expenses', label: t('nav.expenses'), icon: Flame },
    { to: '/contacts', label: t('nav.contacts'), icon: Contact },
    { to: '/discover', label: t('nav.discover'), icon: Globe },
    { to: '/team', label: t('nav.team'), icon: Users },
    { to: '/settings', label: t('nav.settings'), icon: Settings },
  ];

  const businessMobileNav = [
    { to: '/', label: t('nav.home'), icon: LayoutDashboard },
    { to: '/stock', label: t('nav.stock'), icon: Package },
    { to: '/sales', label: t('nav.sales'), icon: TrendingUp },
  ];

  const businessMoreNav = [
    { to: '/purchases', label: t('nav.purchases'), icon: ShoppingCart },
    { to: '/orders', label: t('nav.orders'), icon: ClipboardList },
    { to: '/services', label: t('nav.services'), icon: Wrench },
    { to: '/expenses', label: t('nav.expenses'), icon: Flame },
    { to: '/waste', label: 'Waste', icon: AlertTriangle },
    { to: '/contacts', label: t('nav.contacts'), icon: Contact },
    { to: '/discover', label: t('nav.discover'), icon: Globe },
    { to: '/team', label: t('nav.team'), icon: Users },
    { to: '/settings', label: t('nav.settings'), icon: Settings },
  ];

  const factoryMobileNav = [
    { to: '/', label: t('nav.home'), icon: LayoutDashboard },
    { to: '/product-stock', label: t('nav.products'), icon: Package },
    { to: '/sales', label: t('nav.sales'), icon: TrendingUp },
  ];

  const factoryMoreNav = [
    { to: '/input-stock', label: t('nav.inputStock'), icon: Boxes },
    { to: '/production', label: t('nav.production'), icon: Factory },
    { to: '/purchases', label: t('nav.purchases'), icon: ShoppingCart },
    { to: '/orders', label: t('nav.orders'), icon: ClipboardList },
    { to: '/services', label: t('nav.services'), icon: Wrench },
    { to: '/expenses', label: t('nav.expenses'), icon: Flame },
    { to: '/contacts', label: t('nav.contacts'), icon: Contact },
    { to: '/discover', label: t('nav.discover'), icon: Globe },
    { to: '/team', label: t('nav.team'), icon: Users },
    { to: '/settings', label: t('nav.settings'), icon: Settings },
  ];

  const propertyNavItems = [
    { to: '/', label: t('nav.dashboard'), icon: LayoutDashboard },
    { to: '/assets', label: t('property.assets', 'My Assets'), icon: Home },
    { to: '/bookings', label: t('property.bookings', 'Bookings'), icon: CalendarCheck },
    { to: '/browse', label: t('property.browse', 'Browse'), icon: Search },
    { to: '/contacts', label: t('nav.contacts'), icon: Contact },
    { to: '/discover', label: t('nav.discover'), icon: Globe },
    { to: '/team', label: t('nav.team'), icon: Users },
    { to: '/settings', label: t('nav.settings'), icon: Settings },
  ];

  const propertyMobileNav = [
    { to: '/', label: t('nav.home'), icon: LayoutDashboard },
    { to: '/assets', label: t('property.assets', 'Assets'), icon: Home },
    { to: '/bookings', label: t('property.bookings', 'Bookings'), icon: CalendarCheck },
  ];

  const propertyMoreNav = [
    { to: '/browse', label: t('property.browse', 'Browse'), icon: Search },
    { to: '/contacts', label: t('nav.contacts'), icon: Contact },
    { to: '/discover', label: t('nav.discover'), icon: Globe },
    { to: '/team', label: t('nav.team'), icon: Users },
    { to: '/settings', label: t('nav.settings'), icon: Settings },
  ];

  return { businessNavItems, factoryNavItems, propertyNavItems, businessMobileNav, businessMoreNav, factoryMobileNav, factoryMoreNav, propertyMobileNav, propertyMoreNav };
}

function BusinessRoleBanner({ userRole, businessName, businessType }: { userRole: string | null; businessName: string; businessType: string }) {
  const { t } = useTranslation();
  if (!userRole) return null;
  const isOwner = userRole === 'owner';
  const isAdmin = userRole === 'admin';
  const typeLabel = businessType === 'factory' ? 'Factory' : businessType === 'property' ? 'Property' : 'Business';

  return (
    <div className={`px-4 py-1.5 text-xs font-medium flex items-center gap-2 ${
      isOwner ? 'bg-primary/10 text-primary border-b border-primary/20'
        : isAdmin ? 'bg-accent/20 text-accent-foreground border-b border-accent/30'
        : 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-b border-orange-500/20'
    }`}>
      {businessType === 'factory' && <Factory className="h-3.5 w-3.5" />}
      {businessType === 'property' && <Home className="h-3.5 w-3.5" />}
      {isOwner ? (
        <><Crown className="h-3.5 w-3.5" /> 👔 {t('nav.owner')} — <span className="font-bold">{businessName}</span> <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full ml-1">{typeLabel}</span></>
      ) : (
        <><User className="h-3.5 w-3.5" /> 🏢 {t('nav.employed')} — <span className="font-bold">{businessName}</span> — {userRole} <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full ml-1">{typeLabel}</span></>
      )}
    </div>
  );
}

function getNotificationRoute(type: string): string {
  switch (type) {
    case 'new_order': return '/orders';
    case 'order_priced': return '/orders';
    case 'order_confirmed': return '/orders';
    case 'order_rejected': return '/orders';
    case 'order_completed': return '/orders';
    case 'new_purchase': return '/purchases';
    case 'payment_submitted': return '/orders';
    case 'payment_confirmed': return '/checkout';
    case 'booking_confirmed': return '/bookings';
    case 'booking_completed': return '/bookings';
    case 'poke': return '/contacts';
    case 'low_stock': return '/stock';
    case 'empty_stock': return '/stock';
    case 'new_sale': return '/sales';
    case 'new_expense': return '/expenses';
    case 'new_service': return '/services';
    case 'complaint': return '/bookings';
    case 'team': return '/team';
    default: return '/';
  }
}

function NotificationsPanel({ onNavigate, variant = 'desktop' }: { onNavigate?: () => void; variant?: 'desktop' | 'mobile' }) {
  const { t } = useTranslation();
  const { notifications, markNotificationRead, markAllNotificationsRead } = useBusiness();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const unread = notifications.filter(n => !n.is_read).length;

  function handleNotificationClick(n: { id: string; type: string; is_read: boolean; title: string; message: string }) {
    if (!n.is_read) markNotificationRead(n.id);
    const route = getNotificationRoute(n.type);
    setOpen(false);
    onNavigate?.();
    // Deep-link with highlight: pass notification id as URL param
    navigate(`${route}?highlight_notification=${n.id}`);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {variant === 'mobile' ? (
          <button className="relative flex flex-col items-center justify-center gap-0.5 text-[11px] text-muted-foreground min-h-[44px] min-w-[44px]">
            {unread > 0 ? <BellDot className="h-5 w-5 text-warning" /> : <Bell className="h-5 w-5" />}
            <span>{t('nav.alerts')}</span>
            {unread > 0 && (
              <span className="absolute top-0 right-0 h-3.5 w-3.5 rounded-full bg-warning text-warning-foreground text-[9px] flex items-center justify-center font-bold">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
        ) : (
          <button className="relative p-2 rounded-lg hover:bg-sidebar-accent/50 transition-colors">
            {unread > 0 ? <BellDot className="h-5 w-5 text-warning" /> : <Bell className="h-5 w-5 text-sidebar-foreground" />}
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-warning text-warning-foreground text-[10px] flex items-center justify-center font-bold">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
        )}
      </SheetTrigger>
      <SheetContent side={variant === 'mobile' ? 'bottom' : 'right'} className={variant === 'mobile' ? 'rounded-t-2xl max-h-[70vh] overflow-y-auto' : 'w-80 max-h-screen overflow-y-auto'}>
        <SheetHeader className="flex flex-row items-center justify-between">
          <SheetTitle>{t('common.notifications')} {unread > 0 && `(${unread} ${t('common.new').toLowerCase()})`}</SheetTitle>
          {unread > 0 && <Button size="sm" variant="ghost" onClick={markAllNotificationsRead} className="text-xs">{t('common.markAllRead')}</Button>}
        </SheetHeader>
        <div className="mt-4 space-y-2">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t('common.noNotifications')}</p>
          ) : (
            notifications.map(n => (
              <button key={n.id} onClick={() => handleNotificationClick(n)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${n.is_read ? 'bg-muted/30 border-border' : 'bg-warning/5 border-warning/30'}`}>
                <p className={`text-sm font-medium ${n.is_read ? 'text-muted-foreground' : 'text-foreground'}`}>{n.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
                  <span className="text-[10px] text-primary underline">{t('common.view')}</span>
                </div>
                {!n.is_read && <span className="inline-block mt-1 text-[10px] bg-warning text-warning-foreground px-1.5 py-0.5 rounded-full">{t('common.new')}</span>}
              </button>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { businesses, currentBusiness, setCurrentBusinessId, userRole, memberships, notifications } = useBusiness();
  const [sheetOpen, setSheetOpen] = useState(false);

  const isFactory = (currentBusiness as any)?.business_type === 'factory';
  const isProperty = (currentBusiness as any)?.business_type === 'property';
  const { businessNavItems, factoryNavItems, propertyNavItems, businessMobileNav, factoryMobileNav, propertyMobileNav, businessMoreNav, factoryMoreNav, propertyMoreNav } = useNavItems();
  const navItems = isProperty ? propertyNavItems : isFactory ? factoryNavItems : businessNavItems;
  const mobileMainNav = isProperty ? propertyMobileNav : isFactory ? factoryMobileNav : businessMobileNav;
  const mobileMoreNav = isProperty ? propertyMoreNav : isFactory ? factoryMoreNav : businessMoreNav;
  const unreadCount = notifications.filter(n => !n.is_read).length;
  const [moreOpen, setMoreOpen] = useState(false);

  function getRoleForBusiness(businessId: string) {
    return memberships.find(m => m.business_id === businessId)?.role || 'worker';
  }

  function getBusinessType(b: any) {
    return b.business_type === 'factory' ? '🏭' : b.business_type === 'property' ? '🏠' : '🏪';
  }

  function getRoleBadge(role: string) {
    if (role === 'owner') return '👔';
    if (role === 'admin') return '🛡️';
    return '👷';
  }

  function getRoleLabel(role: string) {
    if (role === 'owner') return t('nav.owner');
    if (role === 'admin') return t('nav.admin');
    return t('nav.employed');
  }

function DesktopPageNav({ navItems, pathname }: { navItems: { to: string; label: string; icon: any }[]; pathname: string }) {
  const navigate = useNavigate();
  const currentIndex = navItems.findIndex(n => n.to === pathname);
  const prev = currentIndex > 0 ? navItems[currentIndex - 1] : null;
  const next = currentIndex < navItems.length - 1 ? navItems[currentIndex + 1] : null;
  if (!prev && !next) return null;
  return (
    <div className="hidden md:flex items-center justify-between px-6 py-3 border-t border-border bg-muted/30 sticky bottom-0">
      {prev ? (
        <Button variant="ghost" size="sm" onClick={() => navigate(prev.to)} className="gap-1.5 text-xs">
          <ChevronLeft className="h-3.5 w-3.5" /> {prev.label}
        </Button>
      ) : <span />}
      <span className="text-[10px] text-muted-foreground">{currentIndex + 1} / {navItems.length}</span>
      {next ? (
        <Button variant="ghost" size="sm" onClick={() => navigate(next.to)} className="gap-1.5 text-xs">
          {next.label} <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      ) : <span />}
    </div>
  );
}

  return (
    <div className="flex h-screen overflow-hidden flex-col">
      {currentBusiness && <BusinessRoleBanner userRole={userRole!} businessName={currentBusiness.name} businessType={(currentBusiness as any).business_type || 'business'} />}

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
          <div className="p-5 border-b border-sidebar-border flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-sidebar-accent-foreground tracking-tight">
                {isProperty ? '🏠 FlexRent' : isFactory ? '🏭 BizTrack' : '📦 BizTrack'}
              </h1>
              <p className="text-xs text-sidebar-muted mt-1">{isProperty ? t('nav.propertyManager', 'Property Manager') : isFactory ? t('nav.factoryManager') : t('nav.businessManager')}</p>
            </div>
            <NotificationsPanel />
          </div>

          <div className="px-3 pt-3 space-y-2">
            {/* 3-Entity Quick Switch */}
            <div className="flex gap-1">
              {(['business', 'factory', 'property'] as const).map(type => {
                const typeBusinesses = businesses.filter(b => (b as any).business_type === type);
                const icon = type === 'factory' ? '🏭' : type === 'property' ? '🏠' : '🏪';
                const label = type === 'factory' ? 'Factory' : type === 'property' ? 'FlexRent' : 'Business';
                const isActive = (currentBusiness as any)?.business_type === type;
                return (
                  <button key={type} disabled={typeBusinesses.length === 0}
                    onClick={() => { if (typeBusinesses.length > 0) { navigate('/'); setCurrentBusinessId(typeBusinesses[0].id); } }}
                    className={`flex-1 flex flex-col items-center gap-0.5 p-1.5 rounded-lg text-[10px] font-medium transition-all ${
                      isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : typeBusinesses.length === 0 ? 'opacity-30' : 'hover:bg-sidebar-accent/50 text-sidebar-foreground'
                    }`}>
                    <span>{icon}</span>
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            <Select value={currentBusiness?.id || ''} onValueChange={v => { navigate('/'); setCurrentBusinessId(v); }}>
              <SelectTrigger className="w-full bg-sidebar-accent/30 border-sidebar-border text-sidebar-foreground text-xs h-9">
                <Building2 className="h-3 w-3 mr-1" />
                <SelectValue placeholder={t('nav.switchBusiness')} />
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
            {/* Register Personal Business for any user */}
            <Link to="/register-business"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-sidebar-foreground hover:bg-sidebar-accent/50">
              <Plus className="h-4 w-4 shrink-0" /> Add Business
            </Link>
          </nav>

          <div className="p-3 border-t border-sidebar-border space-y-2">
            {/* Support */}
            <div className="bg-sidebar-accent/20 rounded-lg p-2.5 space-y-1.5">
              <p className="text-[10px] font-semibold text-sidebar-foreground uppercase tracking-wider">📞 Support</p>
              <a href="mailto:ndamson8@gmail.com" className="flex items-center gap-2 text-[11px] text-sidebar-foreground hover:text-primary transition-colors">
                📧 <span className="truncate">ndamson8@gmail.com</span>
              </a>
              <a href="https://x.com/CurrentVIBE" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[11px] text-sidebar-foreground hover:text-primary transition-colors">
                𝕏 <span>Current VIBE</span>
              </a>
              <a href="https://facebook.com/CurrentVIBE" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[11px] text-sidebar-foreground hover:text-primary transition-colors">
                📘 <span>Current VIBE</span>
              </a>
            </div>
            <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground text-xs h-8" onClick={signOut}>
              <LogOut className="h-3.5 w-3.5 mr-1.5" />{t('nav.signOut')}
            </Button>
            <p className="text-[10px] text-sidebar-muted text-center">v{APP_VERSION}</p>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto pb-20 md:pb-10">
          <div className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto animate-fade-in">{children}</div>
          {/* Desktop prev/next page nav */}
          <DesktopPageNav navItems={navItems} pathname={pathname} />
        </main>
      </div>

      {/* Proof Video Floating Button - visible on all screens */}
      <ProofVideoButton />

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border flex justify-around items-center py-1.5 pb-safe">
        {mobileMainNav.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <Link key={to} to={to} className={`flex flex-col items-center justify-center gap-0.5 text-[11px] min-h-[44px] min-w-[44px] transition-colors ${active ? 'text-primary' : 'text-muted-foreground'}`}>
              <Icon className="h-5 w-5" />{label}
            </Link>
          );
        })}

        <NotificationsPanel variant="mobile" />

        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center justify-center gap-0.5 text-[11px] text-muted-foreground min-h-[44px] min-w-[44px] transition-colors">
              <Menu className="h-5 w-5" />
              <span>{t('nav.more')}</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="text-left">{t('nav.menu')}</SheetTitle>
            </SheetHeader>

            {/* 3-Entity Quick Switch */}
            <div className="mb-3">
              <p className="text-xs text-muted-foreground font-medium mb-2 px-1">Quick Switch</p>
              <div className="grid grid-cols-3 gap-2">
                {(['business', 'factory', 'property'] as const).map(type => {
                  const typeBusinesses = businesses.filter(b => (b as any).business_type === type);
                  const icon = type === 'factory' ? '🏭' : type === 'property' ? '🏠' : '🏪';
                  const label = type === 'factory' ? 'Factory' : type === 'property' ? 'FlexRent' : 'Business';
                  const isActive = (currentBusiness as any)?.business_type === type;
                  return (
                    <button key={type} disabled={typeBusinesses.length === 0}
                      onClick={() => {
                        if (typeBusinesses.length > 0) { navigate('/'); setCurrentBusinessId(typeBusinesses[0].id); setMoreOpen(false); }
                      }}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-xl text-xs font-medium transition-all ${
                        isActive ? 'bg-primary/10 text-primary border border-primary/30' : typeBusinesses.length === 0 ? 'bg-muted/30 text-muted-foreground/40' : 'bg-muted/50 hover:bg-muted'
                      }`}>
                      <span className="text-lg">{icon}</span>
                      <span>{label}</span>
                      <span className="text-[10px] text-muted-foreground">{typeBusinesses.length}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-2">
              <p className="text-xs text-muted-foreground font-medium mb-2 px-1">{t('nav.switchBusiness')}</p>
              <div className="max-h-40 overflow-y-auto space-y-1.5 rounded-lg border border-border p-1.5">
                {businesses.map(b => {
                  const role = getRoleForBusiness(b.id);
                  const isActive = b.id === currentBusiness?.id;
                  return (
                    <button key={b.id} onClick={() => { navigate('/'); setCurrentBusinessId(b.id); setMoreOpen(false); }}
                      className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg text-left transition-all ${
                        isActive ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/60'
                      }`}>
                      <span className="text-lg">{getBusinessType(b)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{b.name}</p>
                        <p className="text-[11px] text-muted-foreground">{getRoleBadge(role)} {getRoleLabel(role)}</p>
                      </div>
                      {isActive && <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full shrink-0">{t('nav.active')}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3">
              {mobileMoreNav.map(({ to, label, icon: Icon }) => {
                const active = pathname === to;
                return (
                  <Link key={to} to={to} onClick={() => setMoreOpen(false)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-medium transition-colors ${
                      active ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-muted/50 text-foreground hover:bg-muted'
                    }`}>
                    <Icon className="h-5 w-5" />
                    <span className="text-center leading-tight">{label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t space-y-2">
              {/* Support */}
              <div className="bg-muted/50 rounded-lg p-2.5 space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">📞 Support</p>
                <a href="mailto:ndamson8@gmail.com" className="flex items-center gap-2 text-[11px] text-foreground hover:text-primary transition-colors">
                  📧 <span className="truncate">ndamson8@gmail.com</span>
                </a>
                <div className="flex gap-3">
                  <a href="https://x.com/CurrentVIBE" target="_blank" rel="noopener noreferrer" className="text-[11px] text-foreground hover:text-primary transition-colors">
                    𝕏 Current VIBE
                  </a>
                  <a href="https://facebook.com/CurrentVIBE" target="_blank" rel="noopener noreferrer" className="text-[11px] text-foreground hover:text-primary transition-colors">
                    📘 Facebook
                  </a>
            </div>

            {/* Add Business button in mobile */}
            <Link to="/register-business" onClick={() => setMoreOpen(false)}
              className="mt-2 flex items-center justify-center gap-2 p-3 rounded-xl text-xs font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors">
              <Plus className="h-4 w-4" /> Add New Business / Factory / Property
            </Link>
              </div>
              <Button variant="ghost" size="sm" className="w-full justify-start text-destructive text-xs h-8" onClick={signOut}>
                <LogOut className="h-3.5 w-3.5 mr-1.5" /> {t('nav.signOut')}
              </Button>
              <p className="text-[10px] text-muted-foreground text-center">v{APP_VERSION}</p>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </div>
  );
}
