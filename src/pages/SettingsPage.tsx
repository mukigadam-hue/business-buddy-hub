import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusiness } from '@/context/BusinessContext';
import { useCurrency } from '@/hooks/useCurrency';
import { countries, getCountryByCode } from '@/lib/countries';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Save, DollarSign, TrendingUp, Wallet, Building2, Plus, Crown, User, ChevronRight, Receipt as ReceiptIcon, Search, ShoppingCart, Trash2, RotateCcw, Wrench, Lock, Copy, Factory, KeyRound, Eye, EyeOff, ShieldBan, X, Flame, Home, Mail, UserX, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import Receipt from '@/components/Receipt';
import type { ReceiptRecord } from '@/context/BusinessContext';
import { supabase } from '@/integrations/supabase/client';
import AdSpace from '@/components/AdSpace';
import LanguageSelector from '@/components/LanguageSelector';

import { toSentenceCase } from '@/lib/utils';
import PaymentMethodsManager from '@/components/PaymentMethodsManager';

function AddBusinessDialog({ onCreated, defaultType = 'business' }: { onCreated: () => void; defaultType?: 'business' | 'factory' | 'property' }) {
  const { createBusiness, currentBusiness } = useBusiness();
  const [open, setOpen] = useState(false);
  const [businessType, setBusinessType] = useState<'business' | 'factory' | 'property'>(defaultType);
  const [form, setForm] = useState({ name: '', address: '', contact: '', email: '' });
  const [countryCode, setCountryCode] = useState('');
  const [countrySearch, setCountrySearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && (currentBusiness as any)?.country_code) {
      setCountryCode((currentBusiness as any).country_code);
    }
  }, [open, currentBusiness]);

  const filteredCountries = countrySearch
    ? countries.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase()))
    : countries;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (!countryCode) { toast.error('Please select a country'); return; }
    setLoading(true);
    await createBusiness(form.name.trim(), form.address.trim(), form.contact.trim(), form.email.trim(), countryCode);
    if (businessType !== 'business') {
      const { data } = await supabase.from('businesses').select('id').order('created_at', { ascending: false }).limit(1).single();
      if (data) {
        await supabase.from('businesses').update({ business_type: businessType } as any).eq('id', data.id);
      }
    }
    setForm({ name: '', address: '', contact: '', email: '' });
    setOpen(false);
    setLoading(false);
    onCreated();
    if (businessType !== 'business') window.location.reload();
  }

  const selectedCountry = getCountryByCode(countryCode);

  const nameLabel = businessType === 'factory' ? 'Factory Name' : businessType === 'property' ? 'Property / Agency Name' : 'Business Name';
  const namePlaceholder = businessType === 'factory' ? 'My Factory' : businessType === 'property' ? 'My Rentals' : 'My Shop';
  const typeIcon = businessType === 'factory' ? <Factory className="h-4 w-4 mr-2" /> : businessType === 'property' ? <Home className="h-4 w-4 mr-2" /> : <Building2 className="h-4 w-4 mr-2" />;
  const typeLabel = businessType === 'factory' ? 'Factory' : businessType === 'property' ? 'Property' : 'Business';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" className="w-full border-dashed" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" /> Add Business, Factory or Property
      </Button>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" /> Create New
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
          <div>
            <Label className="text-xs font-semibold">Country *</Label>
            {selectedCountry ? (
              <button type="button" onClick={() => setCountryCode('')}
                className="w-full mt-1 flex items-center gap-2 p-2 rounded-lg border-2 border-primary bg-primary/5 text-left text-sm">
                <span>{selectedCountry.flag}</span>
                <span className="font-medium">{selectedCountry.name}</span>
                <span className="text-xs text-muted-foreground ml-auto">{selectedCountry.currencySymbol}</span>
              </button>
            ) : (
              <div className="mt-1 space-y-1">
                <Input placeholder="Search country..." value={countrySearch} onChange={e => setCountrySearch(e.target.value)} className="h-8 text-xs" />
                <div className="max-h-32 overflow-y-auto rounded-lg border border-border">
                  {filteredCountries.map(c => (
                    <button key={c.code} type="button" onClick={() => { setCountryCode(c.code); setCountrySearch(''); }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-muted/60 text-xs border-b border-border last:border-0">
                      <span>{c.flag}</span><span>{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button type="button" onClick={() => setBusinessType('business')}
              className={`p-3 rounded-xl border-2 text-center transition-all ${businessType === 'business' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
              <span className="text-2xl">🏪</span>
              <p className="text-xs font-semibold mt-1">Business</p>
            </button>
            <button type="button" onClick={() => setBusinessType('factory')}
              className={`p-3 rounded-xl border-2 text-center transition-all ${businessType === 'factory' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
              <span className="text-2xl">🏭</span>
              <p className="text-xs font-semibold mt-1">Factory</p>
            </button>
            <button type="button" onClick={() => setBusinessType('property')}
              className={`p-3 rounded-xl border-2 text-center transition-all ${businessType === 'property' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
              <span className="text-2xl">🏠</span>
              <p className="text-xs font-semibold mt-1">FlexRent</p>
            </button>
          </div>
          <div><Label>{nameLabel} *</Label><Input placeholder={namePlaceholder} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
          <div><Label>Address</Label><Input placeholder="Location" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
          <div><Label>Contact</Label><Input placeholder={selectedCountry ? `${selectedCountry.phonePrefix} ...` : 'Phone number'} value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} /></div>
          <div><Label>Email</Label><Input type="email" placeholder="email@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
          <Button type="submit" className="w-full" disabled={loading}>
            {typeIcon}
            Create {typeLabel}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DiscoverVisibilityCard({ businessId }: { businessId: string }) {
  const [isDiscoverable, setIsDiscoverable] = useState(true);
  const [blocks, setBlocks] = useState<{ id: string; blocked_business_id: string; name: string }[]>([]);
  const [blockCode, setBlockCode] = useState('');
  const [loading, setLoading] = useState(false);

  const loadSettings = useCallback(async () => {
    if (!businessId) return;
    const { data: biz } = await supabase.from('businesses').select('is_discoverable').eq('id', businessId).single();
    if (biz) setIsDiscoverable((biz as any).is_discoverable ?? true);

    const { data: blockData } = await supabase.from('business_blocks').select('id, blocked_business_id').eq('business_id', businessId);
    if (blockData && blockData.length > 0) {
      const ids = blockData.map(b => b.blocked_business_id);
      const { data: names } = await supabase.rpc('search_businesses', { _query: '', _limit: 100, _offset: 0 });
      // Fetch names via direct query through the function or just show codes
      const blocksWithNames = await Promise.all(blockData.map(async (b) => {
        const { data: bizInfo } = await supabase.from('businesses').select('name').eq('id', b.blocked_business_id).single();
        return { ...b, name: bizInfo?.name || 'Unknown' };
      }));
      setBlocks(blocksWithNames);
    } else {
      setBlocks([]);
    }
  }, [businessId]);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  async function toggleDiscoverable(checked: boolean) {
    setIsDiscoverable(checked);
    await supabase.from('businesses').update({ is_discoverable: checked } as any).eq('id', businessId);
    toast.success(checked ? 'Business is now visible in Discover' : 'Business hidden from Discover');
  }

  async function addBlock() {
    if (!blockCode.trim()) return;
    setLoading(true);
    try {
      const { data } = await supabase.rpc('lookup_business_by_code', { _code: blockCode.trim() });
      if (!data || data.length === 0) { toast.error('Business not found'); return; }
      const target = data[0];
      if (target.id === businessId) { toast.error("You can't block your own business"); return; }
      const { error } = await supabase.from('business_blocks').insert({ business_id: businessId, blocked_business_id: target.id });
      if (error) {
        if (error.code === '23505') toast.error('Already blocked');
        else throw error;
        return;
      }
      toast.success(`Blocked ${target.name}`);
      setBlockCode('');
      loadSettings();
    } catch { toast.error('Failed to block'); } finally { setLoading(false); }
  }

  async function removeBlock(blockId: string) {
    await supabase.from('business_blocks').delete().eq('id', blockId);
    toast.success('Unblocked');
    loadSettings();
  }

  return (
    <Card className="shadow-card">
      <CardContent className="p-4 space-y-4">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Eye className="h-4 w-4" /> Discovery Visibility
        </h2>

        {/* Toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
          <div>
            <p className="text-sm font-medium">Visible in Discover</p>
            <p className="text-xs text-muted-foreground">
              {isDiscoverable ? 'Other businesses can find you' : 'Your business is hidden from search'}
            </p>
          </div>
          <Switch checked={isDiscoverable} onCheckedChange={toggleDiscoverable} />
        </div>

        {/* Blocklist */}
        <div className="space-y-2">
          <p className="text-sm font-medium flex items-center gap-1.5">
            <ShieldBan className="h-3.5 w-3.5" /> Block Specific Businesses
          </p>
          <p className="text-xs text-muted-foreground">
            Blocked businesses won't see your business in Discover even when you're visible.
          </p>
          <div className="flex gap-2">
            <Input placeholder="Enter business code..." value={blockCode} onChange={e => setBlockCode(e.target.value.toUpperCase())}
              className="font-mono text-sm" maxLength={14}
              onKeyDown={e => e.key === 'Enter' && addBlock()} />
            <Button size="sm" onClick={addBlock} disabled={loading || !blockCode.trim()}>
              <ShieldBan className="h-3.5 w-3.5 mr-1" />Block
            </Button>
          </div>

          {blocks.length > 0 && (
            <div className="space-y-1.5 mt-2">
              {blocks.map(b => (
                <div key={b.id} className="flex items-center justify-between p-2 rounded-lg border bg-card text-sm">
                  <span className="truncate">{b.name}</span>
                  <Button size="sm" variant="ghost" className="shrink-0 h-7 text-xs text-destructive hover:text-destructive" onClick={() => removeBlock(b.id)}>
                    <X className="h-3 w-3 mr-1" />Unblock
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { currentBusiness, updateBusiness, stock, sales, purchases, services, expenses, orders, businesses, memberships, setCurrentBusinessId, userRole, getReceipts, restoreStockItem, permanentDeleteStockItem, deleteBusiness } = useBusiness();
  const { currency, setCurrency, fmt } = useCurrency();
  const isOwnerOrAdmin = userRole === 'owner' || userRole === 'admin';

  // Password gate
  const [unlocked, setUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const hasPassword = currentBusiness?.settings_password && currentBusiness.settings_password.length > 0;

  // If owner/admin and no password set, auto-unlock
  useEffect(() => {
    if (isOwnerOrAdmin && !hasPassword) setUnlocked(true);
    else if (!isOwnerOrAdmin) setUnlocked(false); // workers can never unlock
  }, [isOwnerOrAdmin, hasPassword, currentBusiness?.id]);

  function handleUnlock() {
    if (passwordInput === currentBusiness?.settings_password) {
      setUnlocked(true);
      setPasswordInput('');
    } else {
      toast.error('Incorrect settings password');
    }
  }

  const [form, setForm] = useState({
    name: currentBusiness?.name || '',
    address: currentBusiness?.address || '',
    contact: currentBusiness?.contact || '',
    email: currentBusiness?.email || '',
  });
  const [settingsPassword, setSettingsPassword] = useState(currentBusiness?.settings_password || '');
  const [currencyInput, setCurrencyInput] = useState(currency);
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const [receiptSearch, setReceiptSearch] = useState('');
  const [viewingReceipt, setViewingReceipt] = useState<ReceiptRecord | null>(null);
  const [receiptsLoaded, setReceiptsLoaded] = useState(false);
  const [showRecycleBin, setShowRecycleBin] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setForm({
      name: currentBusiness?.name || '',
      address: currentBusiness?.address || '',
      contact: currentBusiness?.contact || '',
      email: currentBusiness?.email || '',
    });
    setSettingsPassword(currentBusiness?.settings_password || '');
  }, [currentBusiness?.id]);

  const activeStock = stock.filter(s => !s.deleted_at);
  const deletedStock = stock.filter(s => s.deleted_at);
  const today = new Date().toDateString();

  // ====== 1. TOTAL CAPITAL (Shopping/Buying Price of all stock) ======
  let buyingCapital = 0, wholesaleCapital = 0, retailCapital = 0;
  activeStock.forEach(item => {
    buyingCapital += item.quantity * Number(item.buying_price);
    wholesaleCapital += item.quantity * Number(item.wholesale_price);
    retailCapital += item.quantity * Number(item.retail_price);
  });

  // ====== 2. PURCHASES ======
  const todayPurchases = purchases.filter(p => new Date(p.created_at).toDateString() === today);
  const todayPurchaseTotal = todayPurchases.reduce((sum, p) => sum + Number(p.grand_total), 0);
  const totalPurchases = purchases.reduce((sum, p) => sum + Number(p.grand_total), 0);

  // ====== 3 & 4. STOCK VALUE (Wholesale & Retail) - calculated above ======

  // ====== 5. TODAY'S REVENUE (Sales + Orders paid/partial/credit) ======
  const todaySales = sales.filter(s => new Date(s.created_at).toDateString() === today);
  const todaySalesFull = todaySales.filter(s => s.payment_status === 'paid');
  const todaySalesPartial = todaySales.filter(s => s.payment_status === 'partial');
  const todaySalesCredit = todaySales.filter(s => s.payment_status === 'credit');

  const todaySalesFullTotal = todaySalesFull.reduce((sum, s) => sum + Number(s.grand_total), 0);
  const todaySalesPartialTotal = todaySalesPartial.reduce((sum, s) => sum + Number(s.grand_total), 0);
  const todaySalesPartialPaid = todaySalesPartial.reduce((sum, s) => sum + Number(s.amount_paid), 0);
  const todaySalesCreditTotal = todaySalesCredit.reduce((sum, s) => sum + Number(s.grand_total), 0);
  const todaySalesGrandTotal = todaySales.reduce((sum, s) => sum + Number(s.grand_total), 0);
  const todaySalesCashCollected = todaySales.reduce((sum, s) => sum + Number(s.amount_paid), 0);

  // Orders completed today (paid)
  const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === today);
  const todayOrdersPaid = todayOrders.filter(o => o.status === 'paid' || o.status === 'completed');
  const todayOrdersTotal = todayOrders.reduce((sum, o) => sum + Number(o.grand_total), 0);

  // Stock sales revenue from sale items (excluding service items)
  const todayStockSalesRevenue = todaySales.reduce((sum, s) => {
    return sum + s.items.filter(i => i.price_type !== 'service').reduce((t, i) => t + Number(i.subtotal), 0);
  }, 0);

  // ====== 6. SERVICE FEE (service cost minus parts from stock) ======
  const todayServices = services.filter(s => new Date(s.created_at).toDateString() === today);
  const todayServiceFeeTotal = todayServices.reduce((sum, s) => sum + Number(s.cost), 0);
  // Parts used in services (from sale items with price_type 'service' in sales - these are service fees added to sales)
  const todaySaleServiceFees = todaySales.reduce((sum, s) => {
    return sum + s.items.filter(i => i.price_type === 'service').reduce((t, i) => t + Number(i.subtotal), 0);
  }, 0);
  const todayTotalServiceFees = todayServiceFeeTotal + todaySaleServiceFees;
  // Service items used from stock (parts) - these are tracked in service_items table
  // For display, we show the service fee (labor) separately
  const todayServiceCashCollected = todayServices.reduce((sum, s) => sum + Number(s.amount_paid), 0);

  // All-time service revenue
  const totalServiceFeeRevenue = services.reduce((sum, s) => sum + Number(s.cost), 0);
  const totalSaleServiceFees = sales.reduce((sum, s) => {
    return sum + s.items.filter(i => i.price_type === 'service').reduce((t, i) => t + Number(i.subtotal), 0);
  }, 0);
  const totalServiceRevenue = totalServiceFeeRevenue + totalSaleServiceFees;

  // All-time stock sales
  const totalStockSalesRevenue = sales.reduce((sum, s) => {
    return sum + s.items.filter(i => i.price_type !== 'service').reduce((t, i) => t + Number(i.subtotal), 0);
  }, 0);
  const totalRevenue = totalStockSalesRevenue + totalServiceRevenue;

  // ====== 7. EXPENSES ======
  const todayExpenses = expenses.filter(e => new Date(e.created_at).toDateString() === today);
  const todayExpenseTotal = todayExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  // Today's total cash collected
  const todayTotalCashCollected = todaySalesCashCollected + todayServiceCashCollected;
  // Today's total revenue (grand totals regardless of payment)
  const todayTotalRevenue = todaySalesGrandTotal + todayServiceFeeTotal + todaySaleServiceFees;

  // Net position today
  const todayNetPosition = todayTotalCashCollected - todayExpenseTotal - todayPurchaseTotal;

  function getRoleForBusiness(businessId: string) {
    return memberships.find(m => m.business_id === businessId)?.role || null;
  }
  const ownedBusinesses = businesses.filter(b => getRoleForBusiness(b.id) === 'owner');
  const employedBusinesses = businesses.filter(b => {
    const role = getRoleForBusiness(b.id);
    return role !== null && role !== 'owner';
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await updateBusiness({ name: form.name.trim(), address: form.address.trim(), contact: form.contact.trim(), email: form.email.trim() });
  }

  async function handleSavePassword() {
    await updateBusiness({ settings_password: settingsPassword } as any);
    toast.success('Settings password updated!');
  }

  function handleSaveCurrency() {
    const sym = currencyInput.trim() || 'KSh';
    setCurrency(sym);
    toast.success(`Currency set to: ${sym}`);
  }

  async function loadReceipts() {
    const data = await getReceipts();
    setReceipts(data);
    setReceiptsLoaded(true);
  }

  const filteredReceipts = receipts.filter(r =>
    r.buyer_name.toLowerCase().includes(receiptSearch.toLowerCase()) ||
    r.seller_name.toLowerCase().includes(receiptSearch.toLowerCase()) ||
    r.receipt_type.toLowerCase().includes(receiptSearch.toLowerCase()) ||
    (r.code && r.code.toLowerCase().includes(receiptSearch.toLowerCase()))
  );

  // Password gate for workers or when password is set
  if (!isOwnerOrAdmin) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <Card className="shadow-card">
          <CardContent className="p-6 text-center space-y-4">
            <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
            <h2 className="text-lg font-semibold">Access Restricted</h2>
            <p className="text-sm text-muted-foreground">Settings are only accessible to the business owner or admin.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (hasPassword && !unlocked) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <Card className="shadow-card">
          <CardContent className="p-6 space-y-4 max-w-sm mx-auto">
            <div className="text-center">
              <Lock className="h-12 w-12 mx-auto text-primary mb-3" />
              <h2 className="text-lg font-semibold">Enter Settings Password</h2>
              <p className="text-sm text-muted-foreground">This section is password protected.</p>
            </div>
            <div>
              <Input type="password" placeholder="Enter password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleUnlock()} />
            </div>
            <Button onClick={handleUnlock} className="w-full"><Lock className="h-4 w-4 mr-2" />Unlock</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Business Code */}
      <Card className="shadow-card border-primary/20">
        <CardContent className="p-4">
          <h2 className="text-base font-semibold flex items-center gap-2 mb-2">
            <KeyRound className="h-4 w-4" /> Your Business Code
          </h2>
          <p className="text-xs text-muted-foreground mb-3">Share this code with other BizTrack users so they can send you orders. This is your unique identifier.</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 rounded-lg p-3 text-center bg-primary/5 border border-primary/20">
              <span className="text-2xl font-mono font-bold tracking-widest">{(currentBusiness as any)?.business_code || '...'}</span>
            </div>
            <Button variant="outline" size="icon" onClick={() => {
              navigator.clipboard.writeText((currentBusiness as any)?.business_code || '');
              toast.success('Business code copied!');
            }}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Language Settings */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <LanguageSelector variant="full" />
        </CardContent>
      </Card>

      <AdSpace variant="inline" />

      {/* ===== COMPREHENSIVE FINANCIAL SUMMARY ===== */}
      <Card className="shadow-card border-primary/20">
        <CardContent className="p-4 space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2">📊 Financial Summary</h2>

          {/* 1. Total Capital */}
          <div className="p-3 rounded-lg bg-info/5 border border-info/20">
            <div className="flex items-center gap-2 mb-1"><Wallet className="h-4 w-4 text-info" /><p className="text-sm font-semibold">1. Total Capital (Shopping Price)</p></div>
            <p className="text-xs text-muted-foreground mb-1">Sum of (Buying Price × Quantity) for all active stock items</p>
            <p className="text-2xl font-bold text-info tabular-nums">{fmt(buyingCapital)}</p>
            <p className="text-xs text-muted-foreground">{activeStock.length} items in stock</p>
          </div>

          {/* 2. Purchases */}
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2 mb-1"><ShoppingCart className="h-4 w-4 text-primary" /><p className="text-sm font-semibold">2. Purchases</p></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Today's Purchases</p>
                <p className="text-lg font-bold tabular-nums">{fmt(todayPurchaseTotal)}</p>
                <p className="text-[10px] text-muted-foreground">{todayPurchases.length} purchase(s)</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">All-Time Purchases</p>
                <p className="text-lg font-bold tabular-nums">{fmt(totalPurchases)}</p>
                <p className="text-[10px] text-muted-foreground">{purchases.length} total</p>
              </div>
            </div>
          </div>

          {/* 3. Stock Value (Wholesale) */}
          <div className="p-3 rounded-lg bg-accent/5 border border-accent/20">
            <div className="flex items-center gap-2 mb-1"><TrendingUp className="h-4 w-4 text-accent" /><p className="text-sm font-semibold">3. Expected Stock Value (Wholesale)</p></div>
            <p className="text-xs text-muted-foreground mb-1">Sum of (Wholesale Price × Quantity) for all active stock</p>
            <p className="text-2xl font-bold tabular-nums">{fmt(wholesaleCapital)}</p>
          </div>

          {/* 4. Stock Value (Retail) */}
          <div className="p-3 rounded-lg bg-success/5 border border-success/20">
            <div className="flex items-center gap-2 mb-1"><TrendingUp className="h-4 w-4 text-success" /><p className="text-sm font-semibold">4. Expected Stock Value (Retail)</p></div>
            <p className="text-xs text-muted-foreground mb-1">Sum of (Retail Price × Quantity) for all active stock</p>
            <p className="text-2xl font-bold text-success tabular-nums">{fmt(retailCapital)}</p>
            <p className="text-xs text-muted-foreground">Expected Profit (Retail − Buying): <span className="font-bold text-success">{fmt(retailCapital - buyingCapital)}</span></p>
          </div>

          {/* 5. Today's Revenue */}
          <div className="p-3 rounded-lg bg-success/5 border border-success/20">
            <div className="flex items-center gap-2 mb-1"><DollarSign className="h-4 w-4 text-success" /><p className="text-sm font-semibold">5. Today's Revenue</p></div>
            <p className="text-2xl font-bold text-success tabular-nums">{fmt(todayTotalRevenue)}</p>
            <p className="text-xs text-muted-foreground mb-2">Cash collected today: <span className="font-bold text-success">{fmt(todayTotalCashCollected)}</span></p>

            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between items-center p-2 rounded bg-background/80">
                <span className="text-xs">📦 Stock Sales ({todaySales.length})</span>
                <span className="font-bold tabular-nums">{fmt(todayStockSalesRevenue)}</span>
              </div>
              {todaySalesFull.length > 0 && (
                <div className="flex justify-between items-center p-1.5 rounded bg-success/5 ml-4">
                  <span className="text-xs text-success">✅ Paid Full ({todaySalesFull.length})</span>
                  <span className="font-semibold tabular-nums text-success">{fmt(todaySalesFullTotal)}</span>
                </div>
              )}
              {todaySalesPartial.length > 0 && (
                <div className="flex justify-between items-center p-1.5 rounded bg-warning/5 ml-4">
                  <span className="text-xs text-warning">⚠️ Partial ({todaySalesPartial.length}) — Paid: {fmt(todaySalesPartialPaid)}</span>
                  <span className="font-semibold tabular-nums">{fmt(todaySalesPartialTotal)}</span>
                </div>
              )}
              {todaySalesCredit.length > 0 && (
                <div className="flex justify-between items-center p-1.5 rounded bg-destructive/5 ml-4">
                  <span className="text-xs text-destructive">🔴 Credit ({todaySalesCredit.length})</span>
                  <span className="font-semibold tabular-nums text-destructive">{fmt(todaySalesCreditTotal)}</span>
                </div>
              )}
              {todayOrders.length > 0 && (
                <div className="flex justify-between items-center p-2 rounded bg-background/80">
                  <span className="text-xs">📋 Orders ({todayOrders.length})</span>
                  <span className="font-bold tabular-nums">{fmt(todayOrdersTotal)}</span>
                </div>
              )}
            </div>
          </div>

          {/* 6. Service Fee Revenue */}
          <div className="p-3 rounded-lg bg-accent/5 border border-accent/20">
            <div className="flex items-center gap-2 mb-1"><Wrench className="h-4 w-4 text-accent" /><p className="text-sm font-semibold">6. Service Fee Revenue</p></div>
            <p className="text-xs text-muted-foreground mb-1">Service labor fees only (parts used from stock are NOT included here)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Today's Service Fees</p>
                <p className="text-lg font-bold tabular-nums">{fmt(todayTotalServiceFees)}</p>
                <p className="text-[10px] text-muted-foreground">{todayServices.length} service(s) · Cash: {fmt(todayServiceCashCollected)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">All-Time Service Fees</p>
                <p className="text-lg font-bold tabular-nums">{fmt(totalServiceRevenue)}</p>
                <p className="text-[10px] text-muted-foreground">{services.length} total services</p>
              </div>
            </div>
          </div>

          {/* 7. Expenses */}
          <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
            <div className="flex items-center gap-2 mb-1"><Flame className="h-4 w-4 text-destructive" /><p className="text-sm font-semibold">7. Non-Production Expenses</p></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Today's Expenses</p>
                <p className="text-lg font-bold text-destructive tabular-nums">{fmt(todayExpenseTotal)}</p>
                <p className="text-[10px] text-muted-foreground">{todayExpenses.length} expense(s)</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">All-Time Expenses</p>
                <p className="text-lg font-bold text-destructive tabular-nums">{fmt(totalExpenses)}</p>
                <p className="text-[10px] text-muted-foreground">{expenses.length} total</p>
              </div>
            </div>
          </div>

          {/* Net Position Today */}
          <div className={`p-3 rounded-lg border ${todayNetPosition >= 0 ? 'bg-success/5 border-success/20' : 'bg-destructive/5 border-destructive/20'}`}>
            <p className="text-sm font-semibold mb-1">📈 Today's Net Position</p>
            <p className="text-xs text-muted-foreground">Cash Collected − Expenses − Purchases</p>
            <p className={`text-2xl font-bold tabular-nums ${todayNetPosition >= 0 ? 'text-success' : 'text-destructive'}`}>{fmt(todayNetPosition)}</p>
            <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
              <p>+ Cash Collected: {fmt(todayTotalCashCollected)}</p>
              <p>− Expenses: {fmt(todayExpenseTotal)}</p>
              <p>− Purchases: {fmt(todayPurchaseTotal)}</p>
            </div>
          </div>

          {/* All-time Revenue Overview */}
          <div className="p-3 rounded-lg bg-muted/30 border">
            <p className="text-sm font-semibold mb-2">📊 All-Time Revenue Overview</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Total Revenue</p>
                <p className="text-lg font-bold text-success tabular-nums">{fmt(totalRevenue)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Stock Sales</p>
                <p className="text-lg font-bold tabular-nums">{fmt(totalStockSalesRevenue)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Service Fees</p>
                <p className="text-lg font-bold tabular-nums">{fmt(totalServiceRevenue)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Expenses</p>
                <p className="text-lg font-bold text-destructive tabular-nums">{fmt(totalExpenses)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===== DEBT TRACKING SECTION ===== */}
      {(() => {
        const salesDebts = sales.filter(s => s.payment_status !== 'paid' && Number(s.balance) > 0);
        const serviceDebts = services.filter(s => s.payment_status !== 'paid' && Number(s.balance) > 0);
        const purchaseDebts = purchases.filter(p => p.payment_status !== 'paid' && Number(p.balance) > 0);
        const totalOwedToYou = salesDebts.reduce((sum, s) => sum + Number(s.balance), 0) + serviceDebts.reduce((sum, s) => sum + Number(s.balance), 0);
        const totalYouOwe = purchaseDebts.reduce((sum, p) => sum + Number(p.balance), 0);
        const totalDebt = totalOwedToYou + totalYouOwe;

        const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
        const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
        const overdueSales = salesDebts.filter(s => (Date.now() - new Date(s.created_at).getTime()) > THREE_DAYS);
        const overdueServices = serviceDebts.filter(s => (Date.now() - new Date(s.created_at).getTime()) > THREE_DAYS);
        const overduePurchases = purchaseDebts.filter(p => (Date.now() - new Date(p.created_at).getTime()) > THREE_DAYS);
        const criticalSales = salesDebts.filter(s => (Date.now() - new Date(s.created_at).getTime()) > SEVEN_DAYS);
        const criticalServices = serviceDebts.filter(s => (Date.now() - new Date(s.created_at).getTime()) > SEVEN_DAYS);
        const criticalPurchases = purchaseDebts.filter(p => (Date.now() - new Date(p.created_at).getTime()) > SEVEN_DAYS);

        const hasCritical = criticalSales.length > 0 || criticalServices.length > 0 || criticalPurchases.length > 0;
        const hasOverdue = overdueSales.length > 0 || overdueServices.length > 0 || overduePurchases.length > 0;

        if (totalDebt === 0 && salesDebts.length === 0 && purchaseDebts.length === 0 && serviceDebts.length === 0) return null;

        return (
          <Card className={`shadow-card border-2 ${hasCritical ? 'border-destructive bg-destructive/5 animate-pulse' : hasOverdue ? 'border-warning bg-warning/5' : 'border-orange-300 bg-orange-50/50 dark:bg-orange-950/20'}`}>
            <CardContent className="p-4 space-y-4">
              <h2 className={`text-lg font-bold flex items-center gap-2 ${hasCritical ? 'text-destructive' : hasOverdue ? 'text-warning' : 'text-orange-600 dark:text-orange-400'}`}>
                {hasCritical ? '🚨' : hasOverdue ? '⚠️' : '💳'} Outstanding Debts
                {hasCritical && <span className="text-xs font-normal bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full ml-2">CRITICAL</span>}
              </h2>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className={`p-3 rounded-lg border-2 ${totalOwedToYou > 0 ? 'bg-success/10 border-success/30' : 'bg-muted/30 border-border'}`}>
                  <p className="text-xs text-muted-foreground font-semibold uppercase">Owed TO You</p>
                  <p className={`text-xl font-bold tabular-nums ${totalOwedToYou > 0 ? 'text-success' : ''}`}>{fmt(totalOwedToYou)}</p>
                  <p className="text-[10px] text-muted-foreground">{salesDebts.length} sale(s), {serviceDebts.length} service(s)</p>
                </div>
                <div className={`p-3 rounded-lg border-2 ${totalYouOwe > 0 ? 'bg-destructive/10 border-destructive/30' : 'bg-muted/30 border-border'}`}>
                  <p className="text-xs text-muted-foreground font-semibold uppercase">You OWE Others</p>
                  <p className={`text-xl font-bold tabular-nums ${totalYouOwe > 0 ? 'text-destructive' : ''}`}>{fmt(totalYouOwe)}</p>
                  <p className="text-[10px] text-muted-foreground">{purchaseDebts.length} purchase(s)</p>
                </div>
              </div>

              {/* Critical Debts (7+ days) */}
              {hasCritical && (
                <div className="p-3 rounded-lg bg-destructive/10 border-2 border-destructive/40 space-y-2">
                  <p className="text-sm font-bold text-destructive flex items-center gap-1.5">🚨 CRITICAL — Over 7 Days Unpaid</p>
                  <p className="text-xs text-destructive/80">These debts are severely overdue. Immediate action required!</p>
                  {criticalSales.map(s => (
                    <div key={s.id} className="flex justify-between items-center text-sm p-2 rounded bg-destructive/5">
                      <div>
                        <span className="font-medium">👤 {s.customer_name || 'Unknown'}</span>
                        <span className="text-xs text-muted-foreground ml-2">(Sale · {new Date(s.created_at).toLocaleDateString()})</span>
                      </div>
                      <span className="font-bold text-destructive tabular-nums">{fmt(Number(s.balance))}</span>
                    </div>
                  ))}
                  {criticalServices.map(s => (
                    <div key={s.id} className="flex justify-between items-center text-sm p-2 rounded bg-destructive/5">
                      <div>
                        <span className="font-medium">👤 {s.customer_name || 'Unknown'}</span>
                        <span className="text-xs text-muted-foreground ml-2">(Service: {s.service_name} · {new Date(s.created_at).toLocaleDateString()})</span>
                      </div>
                      <span className="font-bold text-destructive tabular-nums">{fmt(Number(s.balance))}</span>
                    </div>
                  ))}
                  {criticalPurchases.map(p => (
                    <div key={p.id} className="flex justify-between items-center text-sm p-2 rounded bg-destructive/5">
                      <div>
                        <span className="font-medium">🏪 {p.supplier || 'Unknown'}</span>
                        <span className="text-xs text-muted-foreground ml-2">(Purchase · {new Date(p.created_at).toLocaleDateString()})</span>
                      </div>
                      <span className="font-bold text-destructive tabular-nums">{fmt(Number(p.balance))}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Overdue Debts (3-7 days) */}
              {(() => {
                const warnSales = overdueSales.filter(s => (Date.now() - new Date(s.created_at).getTime()) <= SEVEN_DAYS);
                const warnServices = overdueServices.filter(s => (Date.now() - new Date(s.created_at).getTime()) <= SEVEN_DAYS);
                const warnPurchases = overduePurchases.filter(p => (Date.now() - new Date(p.created_at).getTime()) <= SEVEN_DAYS);
                if (warnSales.length === 0 && warnServices.length === 0 && warnPurchases.length === 0) return null;
                return (
                  <div className="p-3 rounded-lg bg-warning/10 border-2 border-warning/30 space-y-2">
                    <p className="text-sm font-bold text-warning flex items-center gap-1.5">⚠️ OVERDUE — 3-7 Days Unpaid</p>
                    {warnSales.map(s => (
                      <div key={s.id} className="flex justify-between items-center text-sm p-2 rounded bg-warning/5">
                        <div>
                          <span className="font-medium">👤 {s.customer_name || 'Unknown'}</span>
                          <span className="text-xs text-muted-foreground ml-2">(Sale · {new Date(s.created_at).toLocaleDateString()})</span>
                        </div>
                        <span className="font-bold text-warning tabular-nums">{fmt(Number(s.balance))}</span>
                      </div>
                    ))}
                    {warnServices.map(s => (
                      <div key={s.id} className="flex justify-between items-center text-sm p-2 rounded bg-warning/5">
                        <div>
                          <span className="font-medium">👤 {s.customer_name || 'Unknown'}</span>
                          <span className="text-xs text-muted-foreground ml-2">(Service: {s.service_name} · {new Date(s.created_at).toLocaleDateString()})</span>
                        </div>
                        <span className="font-bold text-warning tabular-nums">{fmt(Number(s.balance))}</span>
                      </div>
                    ))}
                    {warnPurchases.map(p => (
                      <div key={p.id} className="flex justify-between items-center text-sm p-2 rounded bg-warning/5">
                        <div>
                          <span className="font-medium">🏪 {p.supplier || 'Unknown'}</span>
                          <span className="text-xs text-muted-foreground ml-2">(Purchase · {new Date(p.created_at).toLocaleDateString()})</span>
                        </div>
                        <span className="font-bold text-warning tabular-nums">{fmt(Number(p.balance))}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Recent/Normal Debts (under 3 days) */}
              {(() => {
                const recentSales = salesDebts.filter(s => (Date.now() - new Date(s.created_at).getTime()) <= THREE_DAYS);
                const recentServices = serviceDebts.filter(s => (Date.now() - new Date(s.created_at).getTime()) <= THREE_DAYS);
                const recentPurchases = purchaseDebts.filter(p => (Date.now() - new Date(p.created_at).getTime()) <= THREE_DAYS);
                if (recentSales.length === 0 && recentServices.length === 0 && recentPurchases.length === 0) return null;
                return (
                  <div className="p-3 rounded-lg bg-muted/30 border space-y-2">
                    <p className="text-sm font-bold flex items-center gap-1.5">💳 Recent (Under 3 Days)</p>
                    {recentSales.map(s => (
                      <div key={s.id} className="flex justify-between items-center text-sm p-2 rounded bg-background/80">
                        <div>
                          <span className="font-medium">👤 {s.customer_name || 'Unknown'}</span>
                          <span className="text-xs text-muted-foreground ml-2">(Sale · {new Date(s.created_at).toLocaleDateString()})</span>
                        </div>
                        <span className="font-bold tabular-nums">{fmt(Number(s.balance))}</span>
                      </div>
                    ))}
                    {recentServices.map(s => (
                      <div key={s.id} className="flex justify-between items-center text-sm p-2 rounded bg-background/80">
                        <div>
                          <span className="font-medium">👤 {s.customer_name || 'Unknown'}</span>
                          <span className="text-xs text-muted-foreground ml-2">(Service: {s.service_name} · {new Date(s.created_at).toLocaleDateString()})</span>
                        </div>
                        <span className="font-bold tabular-nums">{fmt(Number(s.balance))}</span>
                      </div>
                    ))}
                    {recentPurchases.map(p => (
                      <div key={p.id} className="flex justify-between items-center text-sm p-2 rounded bg-background/80">
                        <div>
                          <span className="font-medium">🏪 {p.supplier || 'Unknown'}</span>
                          <span className="text-xs text-muted-foreground ml-2">(Purchase · {new Date(p.created_at).toLocaleDateString()})</span>
                        </div>
                        <span className="font-bold tabular-nums">{fmt(Number(p.balance))}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}

              <p className="text-[10px] text-muted-foreground text-center italic">
                💡 Figures update automatically when payments are recorded in Sales, Services, or Purchases pages.
              </p>
            </CardContent>
          </Card>
        );
      })()}

      {/* Settings Password */}
      <Card className="shadow-card">
        <CardContent className="p-4 space-y-3">
          <h2 className="text-base font-semibold flex items-center gap-2"><Lock className="h-4 w-4" /> Settings Password</h2>
          <p className="text-xs text-muted-foreground">Set a password to protect settings from unauthorized access. Only you (the boss) will be able to open this page.</p>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Label>Password</Label>
              <Input type="password" value={settingsPassword} onChange={e => setSettingsPassword(e.target.value)} placeholder="Leave empty to disable" />
            </div>
            <Button onClick={handleSavePassword}><Save className="h-4 w-4 mr-2" />Save</Button>
          </div>
        </CardContent>
      </Card>

      {/* Discovery Visibility */}
      <DiscoverVisibilityCard businessId={currentBusiness?.id || ''} />

      {/* Payment Methods - TOP PRIORITY */}
      {currentBusiness && <PaymentMethodsManager businessId={currentBusiness.id} />}

      {/* Currency Setting */}
      <Card className="shadow-card">
        <CardContent className="p-4 space-y-3">
          <h2 className="text-base font-semibold">Currency Symbol</h2>
          <p className="text-xs text-muted-foreground">Set the currency symbol used throughout the app (e.g. KSh, $, £, €, UGX)</p>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Label>Currency Symbol</Label>
              <Input value={currencyInput} onChange={e => setCurrencyInput(e.target.value)} placeholder="KSh" maxLength={6} />
            </div>
            <Button onClick={handleSaveCurrency}><Save className="h-4 w-4 mr-2" />Save</Button>
          </div>
          <p className="text-xs text-muted-foreground">Preview: <span className="font-semibold text-success">{currencyInput || 'KSh'} 1,000.00</span></p>
        </CardContent>
      </Card>

      {/* Receipts Archive */}
      <Card className="shadow-card">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold flex items-center gap-2"><ReceiptIcon className="h-4 w-4" /> Receipt Archive</h2>
            {!receiptsLoaded && <Button size="sm" variant="outline" onClick={loadReceipts}>Load Receipts</Button>}
          </div>
          {receiptsLoaded && (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by buyer, seller, type..." className="pl-9" value={receiptSearch} onChange={e => setReceiptSearch(e.target.value)} />
              </div>
              {filteredReceipts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No receipts found.</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {filteredReceipts.map(r => (
                    <div key={r.id} className="border rounded-lg p-3 flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold capitalize bg-muted px-2 py-0.5 rounded-full">{r.receipt_type}</span>
                          {r.code && <span className="text-xs text-muted-foreground">{r.code}</span>}
                        </div>
                        <p className="text-sm font-medium mt-0.5">👤 {r.buyer_name} · Seller: {r.seller_name}</p>
                        <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-success tabular-nums text-sm">{fmt(Number(r.grand_total))}</span>
                        <Button size="sm" variant="ghost" onClick={() => setViewingReceipt(r)}><ReceiptIcon className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <AdSpace variant="banner" />

      {/* Recycle Bin */}
      {deletedStock.length > 0 && (
        <Card className="shadow-card border-destructive/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold flex items-center gap-2 text-destructive">🗑️ Recycle Bin ({deletedStock.length})</h2>
              <Button size="sm" variant="ghost" onClick={() => setShowRecycleBin(v => !v)}>{showRecycleBin ? 'Hide' : 'Show'}</Button>
            </div>
            {showRecycleBin && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {deletedStock.map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 border border-destructive/10">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-through text-muted-foreground">{item.name}</p>
                      {(item.category || item.quality) && <p className="text-xs text-muted-foreground">{[item.category, item.quality].filter(Boolean).join(' · ')}</p>}
                      <p className="text-xs text-muted-foreground">Deleted: {new Date(item.deleted_at!).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => restoreStockItem(item.id)}><RotateCcw className="h-3 w-3 mr-1" />Restore</Button>
                      <Button size="sm" variant="destructive" onClick={() => permanentDeleteStockItem(item.id)}><Trash2 className="h-3 w-3 mr-1" />Delete Forever</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* My Businesses Section */}
      <Card className="shadow-card">
        <CardContent className="p-4 space-y-4">
          <h2 className="text-base font-semibold flex items-center gap-2"><Building2 className="h-4 w-4" /> My Businesses & Factories</h2>
          {ownedBusinesses.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">👔 Your Businesses</p>
              {ownedBusinesses.map(b => {
                const isActive = b.id === currentBusiness?.id;
                const isFact = (b as any).business_type === 'factory';
                return (
                  <button key={b.id} onClick={() => { navigate('/'); setCurrentBusinessId(b.id); }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${isActive ? 'bg-primary/10 border-2 border-primary' : 'bg-muted/30 border-2 border-transparent hover:border-primary/20'}`}>
                    <span className="text-xl">{isFact ? '🏭' : '🏪'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{b.name}</p>
                      <p className="text-xs text-muted-foreground">{b.address || 'No address'} · {isFact ? 'Factory' : 'Business'}</p>
                    </div>
                    {isActive ? (
                      <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full shrink-0">Active</span>
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
          {employedBusinesses.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">🏢 Employed At</p>
              {employedBusinesses.map(b => {
                const isActive = b.id === currentBusiness?.id;
                const role = getRoleForBusiness(b.id);
                const isFact = (b as any).business_type === 'factory';
                return (
                  <button key={b.id} onClick={() => { navigate('/'); setCurrentBusinessId(b.id); }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${isActive ? 'bg-orange-500/10 border-2 border-orange-500' : 'bg-muted/30 border-2 border-transparent hover:border-orange-500/20'}`}>
                    <span className="text-xl">{isFact ? '🏭' : '🏪'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{b.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{role} · {isFact ? 'Factory' : 'Business'}</p>
                    </div>
                    {isActive ? (
                      <span className="text-[10px] bg-orange-500 text-white px-2 py-0.5 rounded-full shrink-0">Active</span>
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
          <AddBusinessDialog onCreated={() => {}} />
        </CardContent>
      </Card>

      {/* Business Information */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <h2 className="text-base font-semibold mb-3">Business Information — {currentBusiness?.name}</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div><Label>Business Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
            <div><Label>Address</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
            <div><Label>Contact</Label><Input value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <Button type="submit" className="w-full"><Save className="h-4 w-4 mr-2" />Save Changes</Button>
          </form>
        </CardContent>
      </Card>

      {/* Delete Business */}
      {userRole === 'owner' && (() => {
        const ownedBusinesses = businesses.filter(b => memberships.find(m => m.business_id === b.id && m.role === 'owner'));
        const isLastOwned = ownedBusinesses.length <= 1;
        return (
          <Card className="shadow-card border-destructive/30">
            <CardContent className="p-4 space-y-3">
              <h2 className="text-base font-semibold text-destructive flex items-center gap-2">
                <Trash2 className="h-4 w-4" /> Delete Business
              </h2>
              {isLastOwned ? (
                <p className="text-xs text-muted-foreground bg-destructive/5 border border-destructive/20 rounded-lg p-3">
                  ⚠️ This is your only business. You must have at least one business to use BizTrack. Create another business first before deleting this one.
                </p>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    Permanently delete <strong>{currentBusiness?.name}</strong> and all its data. This action cannot be undone.
                  </p>
                  <Button variant="destructive" className="w-full" onClick={() => setShowDeleteDialog(true)}>
                    <Trash2 className="h-4 w-4 mr-2" /> Delete This Business
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* Delete Business Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={o => { if (!o) { setDeleteReason(''); setDeleteConfirmName(''); } setShowDeleteDialog(o); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Delete Business
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              You are about to permanently delete <strong>{currentBusiness?.name}</strong>. All stock, sales, purchases, orders, services, expenses, and team data will be lost forever.
            </p>
            <div>
              <Label>Reason for deletion *</Label>
              <textarea
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[80px] mt-1"
                placeholder="e.g. Business collapsed, relocating, switching platforms..."
                value={deleteReason}
                onChange={e => setDeleteReason(e.target.value)}
              />
            </div>
            <div>
              <Label>Type <strong>{currentBusiness?.name}</strong> to confirm</Label>
              <Input
                className="mt-1"
                placeholder="Type business name to confirm"
                value={deleteConfirmName}
                onChange={e => setDeleteConfirmName(e.target.value)}
              />
            </div>
            <Button
              variant="destructive"
              className="w-full"
              disabled={deleting || !deleteReason.trim() || deleteConfirmName !== currentBusiness?.name}
              onClick={async () => {
                setDeleting(true);
                const success = await deleteBusiness(currentBusiness!.id, deleteReason.trim());
                setDeleting(false);
                if (success) {
                  setShowDeleteDialog(false);
                  setDeleteReason('');
                  setDeleteConfirmName('');
                  window.location.reload();
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {deleting ? 'Deleting...' : 'Permanently Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt View Dialog */}
      <Dialog open={!!viewingReceipt} onOpenChange={o => { if (!o) setViewingReceipt(null); }}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Receipt</DialogTitle></DialogHeader>
          {viewingReceipt && (
            <Receipt
              items={(viewingReceipt.items as any[]).map(i => ({
                itemName: i.itemName, category: i.category, quality: i.quality,
                quantity: i.quantity, priceType: i.priceType, unitPrice: i.unitPrice, subtotal: i.subtotal,
              }))}
              grandTotal={Number(viewingReceipt.grand_total)}
              buyerName={viewingReceipt.buyer_name}
              sellerName={viewingReceipt.seller_name}
              code={viewingReceipt.code || undefined}
              date={viewingReceipt.created_at}
              type={viewingReceipt.receipt_type as any}
              businessInfo={viewingReceipt.business_info as any}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
