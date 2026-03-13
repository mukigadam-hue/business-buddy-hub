import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusiness } from '@/context/BusinessContext';
import { useProperty } from '@/context/PropertyContext';
import { useCurrency } from '@/hooks/useCurrency';
import { countries, getCountryByCode } from '@/lib/countries';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Save, Building2, Plus, ChevronRight, Lock, Copy, KeyRound, Eye, EyeOff, ShieldBan, X, Home, Trash2, Factory, CalendarCheck, TrendingUp, DollarSign, Wallet, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import AdSpace from '@/components/AdSpace';
import LanguageSelector from '@/components/LanguageSelector';
import Receipt from '@/components/Receipt';

function ReceiptArchive({ businessId }: { businessId: string }) {
  const [receipts, setReceipts] = useState<any[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const { fmt } = useCurrency();

  useEffect(() => {
    if (!businessId) return;
    supabase.from('receipts').select('*').eq('business_id', businessId).order('created_at', { ascending: false })
      .then(({ data }) => setReceipts(data || []));
  }, [businessId]);

  if (receipts.length === 0) return null;

  return (
    <>
      <Card className="shadow-card">
        <CardContent className="p-4 space-y-3">
          <h2 className="text-base font-semibold flex items-center gap-2"><FileText className="h-4 w-4" /> Receipt Archive</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {receipts.map(r => (
              <button key={r.id} onClick={() => setSelectedReceipt(r)}
                className="w-full text-left p-3 rounded-lg border hover:border-primary/50 hover:bg-primary/5 transition-colors">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">{r.buyer_name || 'Customer'}</p>
                    <p className="text-xs text-muted-foreground">{r.receipt_type} · {new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className="text-sm font-bold text-success">{fmt(Number(r.grand_total))}</span>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedReceipt && (
        <Dialog open={!!selectedReceipt} onOpenChange={() => setSelectedReceipt(null)}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>📄 Receipt</DialogTitle></DialogHeader>
            <Receipt
              items={Array.isArray(selectedReceipt.items) ? selectedReceipt.items : []}
              grandTotal={Number(selectedReceipt.grand_total)}
              buyerName={selectedReceipt.buyer_name}
              sellerName={selectedReceipt.seller_name}
              date={selectedReceipt.created_at}
              type="sale"
              businessInfo={selectedReceipt.business_info || undefined}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
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
    toast.success(checked ? 'Visible in Discover' : 'Hidden from Discover');
  }

  async function addBlock() {
    if (!blockCode.trim()) return;
    setLoading(true);
    try {
      const { data } = await supabase.rpc('lookup_business_by_code', { _code: blockCode.trim() });
      if (!data || data.length === 0) { toast.error('Business not found'); return; }
      const target = data[0];
      if (target.id === businessId) { toast.error("You can't block yourself"); return; }
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
        <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
          <div>
            <p className="text-sm font-medium">Visible in Discover</p>
            <p className="text-xs text-muted-foreground">
              {isDiscoverable ? 'Others can find your properties' : 'Your listings are hidden'}
            </p>
          </div>
          <Switch checked={isDiscoverable} onCheckedChange={toggleDiscoverable} />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium flex items-center gap-1.5">
            <ShieldBan className="h-3.5 w-3.5" /> Block Specific Businesses
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

function AddBusinessDialog({ onCreated }: { onCreated: () => void }) {
  const { createBusiness, currentBusiness } = useBusiness();
  const [open, setOpen] = useState(false);
  const [businessType, setBusinessType] = useState<'business' | 'factory' | 'property'>('business');
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

export default function PropertySettings() {
  const navigate = useNavigate();
  const { currentBusiness, updateBusiness, businesses, memberships, setCurrentBusinessId, userRole, deleteBusiness } = useBusiness();
  const { assets, bookings } = useProperty();
  const { currency, setCurrency, fmt } = useCurrency();
  const isOwnerOrAdmin = userRole === 'owner' || userRole === 'admin';

  // Password gate
  const [unlocked, setUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const hasPassword = currentBusiness?.settings_password && currentBusiness.settings_password.length > 0;

  useEffect(() => {
    if (isOwnerOrAdmin && !hasPassword) setUnlocked(true);
    else if (!isOwnerOrAdmin) setUnlocked(false);
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

  // ===== PROPERTY FINANCIAL SUMMARY =====
  const activeAssets = assets.filter(a => !a.deleted_at);
  const availableAssets = activeAssets.filter(a => a.is_available);
  const activeBookings = bookings.filter(b => b.status === 'active' || b.status === 'confirmed');
  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const completedBookings = bookings.filter(b => b.status === 'completed');

  const totalBookingRevenue = bookings.filter(b => b.payment_status === 'paid').reduce((s, b) => s + Number(b.total_price), 0);
  const totalCashCollected = bookings.reduce((s, b) => s + Number(b.amount_paid), 0);
  const totalOutstanding = bookings.filter(b => b.payment_status !== 'paid').reduce((s, b) => s + (Number(b.total_price) - Number(b.amount_paid)), 0);

  const today = new Date().toDateString();
  const todayBookings = bookings.filter(b => new Date(b.created_at).toDateString() === today);
  const todayRevenue = todayBookings.reduce((s, b) => s + Number(b.amount_paid), 0);

  const occupancyRate = activeAssets.length > 0
    ? Math.round((activeAssets.filter(a => !a.is_available).length / activeAssets.length) * 100)
    : 0;

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

  // Password gate for workers
  if (!isOwnerOrAdmin) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">🏠 Settings</h1>
        <Card className="shadow-card">
          <CardContent className="p-6 text-center space-y-4">
            <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
            <h2 className="text-lg font-semibold">Access Restricted</h2>
            <p className="text-sm text-muted-foreground">Settings are only accessible to the property owner or admin.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (hasPassword && !unlocked) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">🏠 Settings</h1>
        <Card className="shadow-card">
          <CardContent className="p-6 space-y-4 max-w-sm mx-auto">
            <div className="text-center">
              <Lock className="h-12 w-12 mx-auto text-primary mb-3" />
              <h2 className="text-lg font-semibold">Enter Settings Password</h2>
            </div>
            <Input type="password" placeholder="Enter password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleUnlock()} />
            <Button onClick={handleUnlock} className="w-full"><Lock className="h-4 w-4 mr-2" />Unlock</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">🏠 FlexRent Settings</h1>

      {/* Property Code */}
      <Card className="shadow-card border-primary/20">
        <CardContent className="p-4">
          <h2 className="text-base font-semibold flex items-center gap-2 mb-2">
            <KeyRound className="h-4 w-4" /> Your Property Code
          </h2>
          <p className="text-xs text-muted-foreground mb-3">Share this code so renters can find and contact you.</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 rounded-lg p-3 text-center bg-primary/5 border border-primary/20">
              <span className="text-2xl font-mono font-bold tracking-widest">{(currentBusiness as any)?.business_code || '...'}</span>
            </div>
            <Button variant="outline" size="icon" onClick={() => {
              navigator.clipboard.writeText((currentBusiness as any)?.business_code || '');
              toast.success('Property code copied!');
            }}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Language */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <LanguageSelector variant="full" />
        </CardContent>
      </Card>

      <AdSpace variant="inline" />

      {/* ===== RECEIPT ARCHIVE ===== */}
      <ReceiptArchive businessId={currentBusiness?.id || ''} />

      {/* ===== PROPERTY FINANCIAL SUMMARY ===== */}
      {(() => {
        // Total expected monthly revenue if ALL assets rented
        const totalExpectedRevenue = activeAssets.reduce((s, a) => s + (a.monthly_price > 0 ? a.monthly_price : a.daily_price * 30), 0);
        // Revenue from occupied assets
        const occupiedRevenue = activeAssets.filter(a => !a.is_available).reduce((s, a) => s + (a.monthly_price > 0 ? a.monthly_price : a.daily_price * 30), 0);
        // Expected from unoccupied
        const unoccupiedExpected = totalExpectedRevenue - occupiedRevenue;

        return (
          <Card className="shadow-card border-primary/20">
            <CardContent className="p-4 space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2">📊 Property Financial Summary</h2>

              {/* Portfolio Overview */}
              <div className="p-3 rounded-lg bg-info/5 border border-info/20">
                <div className="flex items-center gap-2 mb-1"><Home className="h-4 w-4 text-info" /><p className="text-sm font-semibold">Portfolio Overview</p></div>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Assets</p>
                    <p className="text-xl font-bold tabular-nums">{activeAssets.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Available</p>
                    <p className="text-xl font-bold text-success tabular-nums">{availableAssets.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Occupancy</p>
                    <p className="text-xl font-bold tabular-nums">{occupancyRate}%</p>
                  </div>
                </div>
              </div>

              {/* Total Expected Revenue */}
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2 mb-1"><TrendingUp className="h-4 w-4 text-primary" /><p className="text-sm font-semibold">Expected Monthly Revenue (If All Rented)</p></div>
                <p className="text-2xl font-bold text-primary tabular-nums">{fmt(totalExpectedRevenue)}</p>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <p className="text-xs text-muted-foreground">From Occupied ({activeAssets.length - availableAssets.length})</p>
                    <p className="text-lg font-bold text-success tabular-nums">{fmt(occupiedRevenue)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Potential from Vacant ({availableAssets.length})</p>
                    <p className="text-lg font-bold text-warning tabular-nums">{fmt(unoccupiedExpected)}</p>
                  </div>
                </div>
              </div>

              {/* Per-Asset Revenue Breakdown */}
              {activeAssets.length > 0 && (
                <div className="p-3 rounded-lg bg-muted/30 border">
                  <p className="text-sm font-semibold mb-2">💰 Per-Asset Revenue</p>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {activeAssets.map(a => {
                      const monthlyRate = a.monthly_price > 0 ? a.monthly_price : a.daily_price * 30;
                      const isOccupied = !a.is_available;
                      const assetBookings = bookings.filter(b => b.asset_id === a.id);
                      const assetCollected = assetBookings.reduce((s, b) => s + Number(b.amount_paid), 0);
                      return (
                        <div key={a.id} className="flex items-center justify-between text-xs p-1.5 rounded bg-background border">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span>{a.category === 'house' ? '🏠' : a.category === 'land' ? '🏞️' : a.category === 'vehicle' ? '🚗' : '🚢'}</span>
                            <span className="font-medium truncate">{a.name}</span>
                            <Badge variant={isOccupied ? 'destructive' : 'default'} className="text-[8px] shrink-0">{isOccupied ? 'Occupied' : 'Vacant'}</Badge>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <p className="font-semibold tabular-nums">{fmt(monthlyRate)}/mo</p>
                            {assetCollected > 0 && <p className="text-[10px] text-success">Collected: {fmt(assetCollected)}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Booking Summary */}
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2 mb-1"><CalendarCheck className="h-4 w-4 text-primary" /><p className="text-sm font-semibold">Bookings</p></div>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  <div><p className="text-xs text-muted-foreground">Active</p><p className="text-lg font-bold tabular-nums">{activeBookings.length}</p></div>
                  <div><p className="text-xs text-muted-foreground">Pending</p><p className="text-lg font-bold text-warning tabular-nums">{pendingBookings.length}</p></div>
                  <div><p className="text-xs text-muted-foreground">Completed</p><p className="text-lg font-bold tabular-nums">{completedBookings.length}</p></div>
                </div>
              </div>

              {/* Revenue Collected */}
              <div className="p-3 rounded-lg bg-success/5 border border-success/20">
                <div className="flex items-center gap-2 mb-1"><DollarSign className="h-4 w-4 text-success" /><p className="text-sm font-semibold">Revenue Collected</p></div>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Today's Collections</p>
                    <p className="text-lg font-bold text-success tabular-nums">{fmt(todayRevenue)}</p>
                    <p className="text-[10px] text-muted-foreground">{todayBookings.length} booking(s)</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Collected</p>
                    <p className="text-lg font-bold text-success tabular-nums">{fmt(totalCashCollected)}</p>
                  </div>
                </div>
              </div>

              {/* Outstanding */}
              {totalOutstanding > 0 && (
                <div className="p-3 rounded-lg bg-warning/5 border border-warning/20">
                  <div className="flex items-center gap-2 mb-1"><Wallet className="h-4 w-4 text-warning" /><p className="text-sm font-semibold">Outstanding Payments</p></div>
                  <p className="text-2xl font-bold text-warning tabular-nums">{fmt(totalOutstanding)}</p>
                  <p className="text-xs text-muted-foreground">
                    {bookings.filter(b => b.payment_status !== 'paid' && (Number(b.total_price) - Number(b.amount_paid)) > 0).length} booking(s) with pending payment
                  </p>
                </div>
              )}

              {/* Category breakdown */}
              {(() => {
                const cats = activeAssets.reduce((acc, a) => {
                  acc[a.category] = (acc[a.category] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>);
                if (Object.keys(cats).length === 0) return null;
                return (
                  <div className="p-3 rounded-lg bg-muted/30 border">
                    <p className="text-sm font-semibold mb-2">🏷️ Asset Categories</p>
                    <div className="space-y-1">
                      {Object.entries(cats).map(([cat, count]) => (
                        <div key={cat} className="flex items-center justify-between text-sm">
                          <span className="capitalize flex items-center gap-2">
                            {cat === 'land' ? '🏞️' : cat === 'vehicle' ? '🚗' : cat === 'vessel' ? '🚢' : '🏠'} {cat}
                          </span>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        );
      })()}

      {/* Settings Password */}
      <Card className="shadow-card">
        <CardContent className="p-4 space-y-3">
          <h2 className="text-base font-semibold flex items-center gap-2"><Lock className="h-4 w-4" /> Settings Password</h2>
          <p className="text-xs text-muted-foreground">Protect settings from unauthorized access.</p>
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
          <p className="text-xs text-muted-foreground">Set the currency symbol used throughout the app</p>
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

      <AdSpace variant="banner" />

      {/* My Businesses Section */}
      <Card className="shadow-card">
        <CardContent className="p-4 space-y-4">
          <h2 className="text-base font-semibold flex items-center gap-2"><Building2 className="h-4 w-4" /> My Businesses & Properties</h2>
          {ownedBusinesses.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">👔 Your Entities</p>
              {ownedBusinesses.map(b => {
                const isActive = b.id === currentBusiness?.id;
                const bType = (b as any).business_type;
                const icon = bType === 'factory' ? '🏭' : bType === 'property' ? '🏠' : '🏪';
                const label = bType === 'factory' ? 'Factory' : bType === 'property' ? 'Property' : 'Business';
                return (
                  <button key={b.id} onClick={() => { navigate('/'); setCurrentBusinessId(b.id); }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${isActive ? 'bg-primary/10 border-2 border-primary' : 'bg-muted/30 border-2 border-transparent hover:border-primary/20'}`}>
                    <span className="text-xl">{icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{b.name}</p>
                      <p className="text-xs text-muted-foreground">{b.address || 'No address'} · {label}</p>
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
                const bType = (b as any).business_type;
                const icon = bType === 'factory' ? '🏭' : bType === 'property' ? '🏠' : '🏪';
                return (
                  <button key={b.id} onClick={() => { navigate('/'); setCurrentBusinessId(b.id); }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${isActive ? 'bg-orange-500/10 border-2 border-orange-500' : 'bg-muted/30 border-2 border-transparent hover:border-orange-500/20'}`}>
                    <span className="text-xl">{icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{b.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{role}</p>
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

      {/* Property Information */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <h2 className="text-base font-semibold mb-3">Property Information — {currentBusiness?.name}</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div><Label>Property / Agency Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
            <div><Label>Address</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
            <div><Label>Contact</Label><Input value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <Button type="submit" className="w-full"><Save className="h-4 w-4 mr-2" />Save Changes</Button>
          </form>
        </CardContent>
      </Card>

      {/* Delete Property */}
      {userRole === 'owner' && (() => {
        const owned = businesses.filter(b => memberships.find(m => m.business_id === b.id && m.role === 'owner'));
        const isLast = owned.length <= 1;
        return (
          <Card className="shadow-card border-destructive/30">
            <CardContent className="p-4 space-y-3">
              <h2 className="text-base font-semibold text-destructive flex items-center gap-2">
                <Trash2 className="h-4 w-4" /> Delete Property
              </h2>
              {isLast ? (
                <p className="text-xs text-muted-foreground bg-destructive/5 border border-destructive/20 rounded-lg p-3">
                  ⚠️ This is your only entity. Create another first before deleting.
                </p>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    Permanently delete <strong>{currentBusiness?.name}</strong> and all its data.
                  </p>
                  <Button variant="destructive" className="w-full" onClick={() => setShowDeleteDialog(true)}>
                    <Trash2 className="h-4 w-4 mr-2" /> Delete This Property
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={o => { if (!o) { setDeleteReason(''); setDeleteConfirmName(''); } setShowDeleteDialog(o); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Delete Property
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              Permanently delete <strong>{currentBusiness?.name}</strong>. All assets, bookings, and messages will be lost.
            </p>
            <div>
              <Label>Reason *</Label>
              <textarea
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] mt-1"
                placeholder="e.g. No longer managing properties..."
                value={deleteReason}
                onChange={e => setDeleteReason(e.target.value)}
              />
            </div>
            <div>
              <Label>Type <strong>{currentBusiness?.name}</strong> to confirm</Label>
              <Input className="mt-1" placeholder="Type name to confirm" value={deleteConfirmName}
                onChange={e => setDeleteConfirmName(e.target.value)} />
            </div>
            <Button variant="destructive" className="w-full"
              disabled={deleting || !deleteReason.trim() || deleteConfirmName !== currentBusiness?.name}
              onClick={async () => {
                setDeleting(true);
                const success = await deleteBusiness(currentBusiness!.id, deleteReason.trim());
                setDeleting(false);
                if (success) { setShowDeleteDialog(false); window.location.reload(); }
              }}>
              <Trash2 className="h-4 w-4 mr-2" />
              {deleting ? 'Deleting...' : 'Permanently Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
