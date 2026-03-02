import { useState, useEffect } from 'react';
import { useBusiness } from '@/context/BusinessContext';
import { useCurrency } from '@/hooks/useCurrency';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Save, DollarSign, TrendingUp, Wallet, Building2, Plus, Crown, User, ChevronRight, Receipt as ReceiptIcon, Search, ShoppingCart, Trash2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import Receipt from '@/components/Receipt';
import type { ReceiptRecord } from '@/context/BusinessContext';

function toSentenceCase(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function AddBusinessDialog({ onCreated }: { onCreated: () => void }) {
  const { createBusiness } = useBusiness();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', contact: '', email: '' });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Business name is required'); return; }
    setLoading(true);
    await createBusiness(form.name.trim(), form.address.trim(), form.contact.trim(), form.email.trim());
    setForm({ name: '', address: '', contact: '', email: '' });
    setOpen(false);
    setLoading(false);
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" className="w-full border-dashed" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" /> Add Personal Business
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" /> Create New Business
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
          <div><Label>Business Name *</Label><Input placeholder="e.g. My Wholesale Shop" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
          <div><Label>Address</Label><Input placeholder="Location" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
          <div><Label>Contact</Label><Input placeholder="Phone number" value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} /></div>
          <div><Label>Email</Label><Input type="email" placeholder="business@email.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating...' : 'Create Business'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function SettingsPage() {
  const { currentBusiness, updateBusiness, stock, sales, purchases, businesses, memberships, setCurrentBusinessId, getReceipts, restoreStockItem, permanentDeleteStockItem } = useBusiness();
  const { currency, setCurrency, fmt } = useCurrency();
  const [form, setForm] = useState({
    name: currentBusiness?.name || '',
    address: currentBusiness?.address || '',
    contact: currentBusiness?.contact || '',
    email: currentBusiness?.email || '',
  });
  const [currencyInput, setCurrencyInput] = useState(currency);
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const [receiptSearch, setReceiptSearch] = useState('');
  const [viewingReceipt, setViewingReceipt] = useState<ReceiptRecord | null>(null);
  const [receiptsLoaded, setReceiptsLoaded] = useState(false);
  const [showRecycleBin, setShowRecycleBin] = useState(false);

  const activeStock = stock.filter(s => !s.deleted_at);
  const deletedStock = stock.filter(s => s.deleted_at);

  const todayRevenue = sales
    .filter(s => new Date(s.created_at).toDateString() === new Date().toDateString())
    .reduce((sum, s) => sum + Number(s.grand_total), 0);

  const totalRevenue = sales.reduce((sum, s) => sum + Number(s.grand_total), 0);

  // Total capital = sum of (quantity × buying/shopping price)
  let buyingCapital = 0;
  let wholesaleCapital = 0;
  let retailCapital = 0;
  activeStock.forEach(item => {
    buyingCapital += item.quantity * Number(item.buying_price);
    wholesaleCapital += item.quantity * Number(item.wholesale_price);
    retailCapital += item.quantity * Number(item.retail_price);
  });

  // Total purchases
  const totalPurchases = purchases.reduce((sum, p) => sum + Number(p.grand_total), 0);

  function getRoleForBusiness(businessId: string) {
    return memberships.find(m => m.business_id === businessId)?.role || 'worker';
  }

  const ownedBusinesses = businesses.filter(b => getRoleForBusiness(b.id) === 'owner');
  const employedBusinesses = businesses.filter(b => getRoleForBusiness(b.id) !== 'owner');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await updateBusiness({
      name: form.name.trim(),
      address: form.address.trim(),
      contact: form.contact.trim(),
      email: form.email.trim(),
    });
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Financial Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10"><DollarSign className="h-5 w-5 text-success" /></div>
              <div><p className="text-xs text-muted-foreground">Today's Revenue</p><p className="text-base font-bold text-success tabular-nums">{fmt(todayRevenue)}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10"><Wallet className="h-5 w-5 text-info" /></div>
              <div><p className="text-xs text-muted-foreground">Total Capital (Shopping Price)</p><p className="text-base font-bold text-info tabular-nums">{fmt(buyingCapital)}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10"><TrendingUp className="h-5 w-5 text-accent" /></div>
              <div><p className="text-xs text-muted-foreground">Stock Value (Wholesale)</p><p className="text-base font-bold tabular-nums">{fmt(wholesaleCapital)}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10"><TrendingUp className="h-5 w-5 text-success" /></div>
              <div><p className="text-xs text-muted-foreground">Stock Value (Retail)</p><p className="text-base font-bold text-success tabular-nums">{fmt(retailCapital)}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><ShoppingCart className="h-5 w-5 text-primary" /></div>
              <div><p className="text-xs text-muted-foreground">Total Purchases</p><p className="text-base font-bold tabular-nums">{fmt(totalPurchases)}</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue summary */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <h2 className="text-base font-semibold mb-2">Revenue Overview</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-success/5 border border-success/20">
              <p className="text-xs text-muted-foreground">Total Revenue (All Time)</p>
              <p className="text-lg font-bold text-success tabular-nums">{fmt(totalRevenue)}</p>
            </div>
            <div className="p-3 rounded-lg bg-info/5 border border-info/20">
              <p className="text-xs text-muted-foreground">Expected Profit (Retail - Buying)</p>
              <p className="text-lg font-bold text-info tabular-nums">{fmt(retailCapital - buyingCapital)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

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
            {!receiptsLoaded && (
              <Button size="sm" variant="outline" onClick={loadReceipts}>Load Receipts</Button>
            )}
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
                        <Button size="sm" variant="ghost" onClick={() => setViewingReceipt(r)}>
                          <ReceiptIcon className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Recycle Bin */}
      {deletedStock.length > 0 && (
        <Card className="shadow-card border-destructive/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold flex items-center gap-2 text-destructive">
                🗑️ Recycle Bin ({deletedStock.length} stock items)
              </h2>
              <Button size="sm" variant="ghost" onClick={() => setShowRecycleBin(v => !v)}>
                {showRecycleBin ? 'Hide' : 'Show'}
              </Button>
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
                      <Button size="sm" variant="outline" onClick={() => restoreStockItem(item.id)}>
                        <RotateCcw className="h-3 w-3 mr-1" />Restore
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => permanentDeleteStockItem(item.id)}>
                        <Trash2 className="h-3 w-3 mr-1" />Delete Forever
                      </Button>
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
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4" /> My Businesses
          </h2>
          {ownedBusinesses.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">👔 Your Businesses</p>
              {ownedBusinesses.map(b => {
                const isActive = b.id === currentBusiness?.id;
                return (
                  <button key={b.id} onClick={() => setCurrentBusinessId(b.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${isActive ? 'bg-primary/10 border-2 border-primary' : 'bg-muted/30 border-2 border-transparent hover:border-primary/20'}`}>
                    <Crown className="h-4 w-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{b.name}</p>
                      <p className="text-xs text-muted-foreground">{b.address || 'No address'}</p>
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
                return (
                  <button key={b.id} onClick={() => setCurrentBusinessId(b.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${isActive ? 'bg-orange-500/10 border-2 border-orange-500' : 'bg-muted/30 border-2 border-transparent hover:border-orange-500/20'}`}>
                    <User className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0" />
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

      {/* Current Business Information */}
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
