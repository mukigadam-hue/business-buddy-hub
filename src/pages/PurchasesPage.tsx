import { useState } from 'react';
import { useBusiness } from '@/context/BusinessContext';
import { useCurrency } from '@/hooks/useCurrency';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Package, ScanLine, Search } from 'lucide-react';
import BarcodeScanHandler from '@/components/BarcodeScanHandler';
import { toast } from 'sonner';
import AdSpace from '@/components/AdSpace';
import { BulkPackagingFields } from '@/components/BulkPackagingInfo';

import { toSentenceCase, toTitleCase } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useSubmitLock } from '@/hooks/useSubmitLock';

const UNIT_TYPES = ['Pieces', 'Kilograms', 'Litres', 'Metres', 'Tonnes', 'Rolls', 'Bags', 'Boxes', 'Pairs', 'Sets', 'Bundles', 'Gallons'];

export default function PurchasesPage() {
  const { stock, purchases, addPurchase, updatePurchasePayment, userRole, currentBusiness } = useBusiness();
  const { user } = useAuth();
  const { fmt } = useCurrency();
  const userFullName = user?.user_metadata?.full_name || '';
  const roleLabel = userRole === 'owner' ? '(Owner)' : userRole === 'admin' ? '(Admin)' : '(Worker)';
  const [items, setItems] = useState<{
    item_name: string; category: string; quality: string; unit_type: string;
    quantity: number; unit_price: number; wholesale_price: number; retail_price: number;
    serial_numbers?: string;
  }[]>([]);
  const [supplier, setSupplier] = useState('');
  const [recordedBy, setRecordedBy] = useState(userFullName);
  const [form, setForm] = useState({
    name: '', category: '', quality: '', unit_type: 'Pieces', quantity: '1',
    unit_price: '', wholesale_price: '', retail_price: '',
    pieces_per_carton: '0', cartons_per_box: '0', boxes_per_container: '0',
    serial_numbers: '',
  });
  const [activeTab, setActiveTab] = useState<'today' | 'previous'>('today');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'partial' | 'unpaid'>('paid');
  const [amountPaid, setAmountPaid] = useState('');
  const [editPaymentPurchase, setEditPaymentPurchase] = useState<typeof purchases[0] | null>(null);
  const [editAmountPaid, setEditAmountPaid] = useState('');
  const [stockSearch, setStockSearch] = useState('');
  const [showStockPicker, setShowStockPicker] = useState(false);

  const { locked: submitLocked, withLock } = useSubmitLock();
  const [scannerOpen, setScannerOpen] = useState(false);
  const activeStock = stock.filter(s => !s.deleted_at);
  const existingCategories = [...new Set(activeStock.map(s => s.category).filter(Boolean))];

  // Filtered stock for the smart picker
  const filteredStockItems = activeStock.filter(s => {
    if (!stockSearch) return true;
    const q = stockSearch.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q) || (s.quality || '').toLowerCase().includes(q);
  });

  const todayPurchases = purchases.filter(p => new Date(p.created_at).toDateString() === new Date().toDateString());
  const previousPurchases = purchases.filter(p => new Date(p.created_at).toDateString() !== new Date().toDateString());

  function applyCase(field: 'name' | 'category' | 'quality') {
    setForm(f => ({ ...f, [field]: toSentenceCase(f[field]) }));
  }

  function selectStockItem(s: typeof activeStock[0]) {
    setForm(f => ({
      ...f,
      name: s.name,
      category: s.category,
      quality: s.quality || '',
      unit_price: String(s.buying_price || ''),
      wholesale_price: String(s.wholesale_price || ''),
      retail_price: String(s.retail_price || ''),
    }));
    setShowStockPicker(false);
    setStockSearch('');
  }

  function addItem() {
    if (!form.name.trim()) return;
    setItems(prev => [...prev, {
      item_name: toSentenceCase(form.name.trim()),
      category: toSentenceCase(form.category.trim()),
      quality: toSentenceCase(form.quality.trim()),
      unit_type: form.unit_type,
      quantity: parseFloat(form.quantity) || 1,
      unit_price: parseFloat(form.unit_price) || 0,
      wholesale_price: parseFloat(form.wholesale_price) || parseFloat(form.unit_price) || 0,
      retail_price: parseFloat(form.retail_price) || parseFloat(form.unit_price) || 0,
      serial_numbers: form.serial_numbers.trim() || undefined,
    }]);
    setForm({ name: '', category: '', quality: '', unit_type: 'Pieces', quantity: '1', unit_price: '', wholesale_price: '', retail_price: '', pieces_per_carton: '0', cartons_per_box: '0', boxes_per_container: '0', serial_numbers: '' });
  }

  function removeItem(idx: number) { setItems(prev => prev.filter((_, i) => i !== idx)); }
  const grandTotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  async function handleSave() {
    if (items.length === 0) return;
    const paidAmt = paymentStatus === 'paid' ? grandTotal : (parseFloat(amountPaid) || 0);
    await addPurchase(
      items.map(item => ({
        item_name: item.item_name, category: item.category, quality: item.quality,
        quantity: item.quantity, unit_price: item.unit_price,
        wholesale_price: item.wholesale_price, retail_price: item.retail_price,
        subtotal: item.quantity * item.unit_price,
        serial_numbers: item.serial_numbers || '',
      })),
      grandTotal, supplier.trim() || 'Unknown',
      toTitleCase(recordedBy.trim()) || 'Staff',
      paymentStatus, paidAmt
    );
    setItems([]);
    setSupplier('');
    setRecordedBy('');
    setPaymentStatus('paid');
    setAmountPaid('');
  }

  function PurchaseCard({ p }: { p: typeof purchases[0] }) {
    const isPaid = p.payment_status === 'paid';
    const isPartial = p.payment_status === 'partial';
    const isUnpaid = p.payment_status === 'unpaid';
    return (
      <div className={`border rounded-lg p-3 ${isUnpaid ? 'border-destructive/40 bg-destructive/5' : isPartial ? 'border-warning/40 bg-warning/5' : ''}`}>
        <div className="flex justify-between items-center mb-1">
          <div>
            <span className="font-medium text-sm">{p.supplier}</span>
            {p.recorded_by && <span className="text-xs text-muted-foreground ml-2">by {p.recorded_by}</span>}
          </div>
          <span className="font-bold text-success bg-success/10 px-2 py-0.5 rounded-md text-sm tabular-nums">{fmt(Number(p.grand_total))}</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${isPaid ? 'bg-success/10 text-success' : isPartial ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'}`}>
            {isPaid ? '✅ Paid' : isPartial ? `⚠️ Partial (${fmt(Number(p.amount_paid))})` : '❌ Unpaid'}
          </span>
          {!isPaid && <span className="text-xs font-semibold text-destructive">Balance: {fmt(Number(p.balance))}</span>}
        </div>
        <p className="text-xs text-muted-foreground mb-2">{new Date(p.created_at).toLocaleString()}</p>
        <div className="text-sm text-muted-foreground space-y-1 max-h-40 overflow-y-auto">
          {p.items.map((item, i) => (
            <div key={i} className="flex justify-between items-start">
              <div>
                <span className="font-medium text-foreground">{item.item_name}</span>
                {item.category && <span className="text-xs ml-1 text-muted-foreground">· {item.category}</span>}
                {item.quality && <span className="text-xs ml-1 text-muted-foreground">· {item.quality}</span>}
                <span className="ml-1">× {item.quantity}</span>
              </div>
              <span className="tabular-nums ml-2">{fmt(Number(item.subtotal))}</span>
            </div>
          ))}
        </div>
        {!isPaid && (
          <Button size="sm" variant="outline" className="mt-2" onClick={() => { setEditPaymentPurchase(p); setEditAmountPaid(String(p.amount_paid || 0)); }}>
            💰 Update Payment
          </Button>
        )}
      </div>
    );
  }

  function handleScanExistingItem(item: any, quantity: number) {
    setForm(f => ({
      ...f,
      name: item.name,
      category: item.category,
      quality: item.quality,
      unit_price: String(item.buying_price || ''),
      wholesale_price: String(item.wholesale_price || ''),
      retail_price: String(item.retail_price || ''),
      quantity: String(quantity),
    }));
    toast.success(`${item.name} loaded — adjust quantity & cost`);
  }

  function handleScanNewItem() {
    toast.success('New item added to inventory!');
  }

  return (
    <div className="space-y-6">
      <BarcodeScanHandler
        scannerOpen={scannerOpen}
        onScannerOpenChange={setScannerOpen}
        mode="purchase"
        onExistingItemFound={handleScanExistingItem}
        onNewItemCreated={handleScanNewItem}
      />
      <h1 className="text-2xl font-bold">Purchases</h1>

      <Card className="shadow-card">
        <CardContent className="p-4 space-y-4">
          <h2 className="text-base font-semibold">Record New Purchase</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Supplier</Label>
              <Input value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="Supplier name" />
            </div>
            <div>
              <Label>Recorded By {roleLabel}</Label>
              <Input value={recordedBy} onChange={e => setRecordedBy(e.target.value)} onBlur={() => setRecordedBy(toTitleCase(recordedBy))} placeholder="Your name (auto-filled)" />
              {currentBusiness && <p className="text-[10px] text-muted-foreground mt-0.5">📍 {currentBusiness.name}</p>}
            </div>
          </div>

          {/* Smart Stock Item Picker */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold flex items-center gap-1.5">
              <Search className="h-3.5 w-3.5" /> Select from Stock or Type New
            </Label>
            <div className="flex gap-1.5">
              <Input
                className="flex-1"
                value={stockSearch}
                onChange={e => { setStockSearch(e.target.value); setShowStockPicker(true); }}
                onFocus={() => setShowStockPicker(true)}
                placeholder="🔍 Search stock items by name, category, quality..."
              />
              <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={() => setScannerOpen(true)} title="Scan barcode">
                <ScanLine className="h-4 w-4" />
              </Button>
            </div>
            {showStockPicker && (
              <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-card shadow-md">
                {filteredStockItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">No matching items in stock</p>
                ) : (
                  filteredStockItems.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => selectStockItem(s)}
                      className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-muted/60 text-sm border-b border-border last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-foreground">{s.name}</span>
                        {s.category && <span className="text-xs ml-1.5 text-muted-foreground">· {s.category}</span>}
                        {s.quality && <span className="text-xs ml-1.5 px-1.5 py-0.5 rounded bg-primary/10 text-primary">{s.quality}</span>}
                      </div>
                      <span className="text-xs text-muted-foreground ml-2 whitespace-nowrap">Qty: {s.quantity}</span>
                    </button>
                  ))
                )}
                <button
                  type="button"
                  onClick={() => { setShowStockPicker(false); setForm(f => ({ ...f, name: stockSearch })); setStockSearch(''); }}
                  className="w-full px-3 py-2 text-left text-sm text-primary font-medium hover:bg-primary/5 border-t border-border"
                >
                  ➕ Add as new item: "{stockSearch || '...'}"
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[150px]">
              <Label>Item Name</Label>
              <Input className="flex-1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} onBlur={() => applyCase('name')} placeholder="Item name (auto-filled from picker)" />
            </div>
            <div className="w-28">
              <Label>Category</Label>
              <Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} onBlur={() => applyCase('category')} placeholder="Category..." list="purchase-cat-suggestions" />
              <datalist id="purchase-cat-suggestions">{existingCategories.map(c => <option key={c} value={c} />)}</datalist>
            </div>
            <div className="w-28">
              <Label>Quality</Label>
              <Input value={form.quality} onChange={e => setForm(f => ({ ...f, quality: e.target.value }))} onBlur={() => applyCase('quality')} placeholder="e.g. Grade A..." />
            </div>
            <div className="w-28">
              <Label>Unit Type</Label>
              <Select value={form.unit_type} onValueChange={v => setForm(f => ({ ...f, unit_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{UNIT_TYPES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="w-16"><Label>Qty</Label><Input type="number" min="0.01" step="0.01" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} /></div>
            <div className="w-24"><Label>Cost/Unit</Label><Input type="number" min="0" step="0.01" value={form.unit_price} onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))} placeholder="0.00" /></div>
            <div className="w-24"><Label>Wholesale</Label><Input type="number" min="0" step="0.01" value={form.wholesale_price} onChange={e => setForm(f => ({ ...f, wholesale_price: e.target.value }))} placeholder="Auto" /></div>
            <div className="w-24"><Label>Retail</Label><Input type="number" min="0" step="0.01" value={form.retail_price} onChange={e => setForm(f => ({ ...f, retail_price: e.target.value }))} placeholder="Auto" /></div>
            <Button onClick={addItem} disabled={!form.name.trim()}><Plus className="h-4 w-4 mr-1" />Add</Button>
          </div>
          <div className="mt-2">
            <Label className="text-xs text-muted-foreground">Serial Number (optional)</Label>
            <Input value={form.serial_numbers} onChange={e => setForm(f => ({ ...f, serial_numbers: e.target.value }))} placeholder="e.g. IMEI, S/N..." className="max-w-xs" />
          </div>
          <BulkPackagingFields
            piecesPerCarton={form.pieces_per_carton}
            cartonsPerBox={form.cartons_per_box}
            boxesPerContainer={form.boxes_per_container}
            onChange={(field, value) => setForm(f => ({ ...f, [field]: value }))}
          />

          {items.length > 0 && (
            <>
              <div className="overflow-x-auto max-h-60 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                       <TableHead>Item</TableHead><TableHead>Category</TableHead><TableHead>Quality</TableHead><TableHead>Unit</TableHead>
                       <TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Cost/Unit</TableHead>
                       <TableHead className="text-right">Wholesale</TableHead><TableHead className="text-right">Retail</TableHead>
                       <TableHead className="text-right">Subtotal</TableHead><TableHead></TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {items.map((item, i) => (
                       <TableRow key={i}>
                         <TableCell className="font-medium">{item.item_name}</TableCell>
                         <TableCell>{item.category}</TableCell>
                         <TableCell>{item.quality}</TableCell>
                         <TableCell className="capitalize">{item.unit_type}</TableCell>
                         <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmt(item.unit_price)}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmt(item.wholesale_price)}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmt(item.retail_price)}</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">{fmt(item.quantity * item.unit_price)}</TableCell>
                        <TableCell><Button variant="ghost" size="icon" onClick={() => removeItem(i)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={8} className="text-right font-bold">Grand Total</TableCell>
                      <TableCell className="text-right font-bold text-lg text-success tabular-nums">{fmt(grandTotal)}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              {/* Payment Status */}
              <div className="p-3 bg-muted/40 rounded-lg border space-y-2">
                <Label className="text-xs font-semibold">💰 Payment Status</Label>
                <div className="flex gap-2">
                  {(['paid', 'partial', 'unpaid'] as const).map(s => (
                    <button key={s} onClick={() => setPaymentStatus(s)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${paymentStatus === s
                        ? s === 'paid' ? 'bg-success text-success-foreground' : s === 'partial' ? 'bg-warning text-warning-foreground' : 'bg-destructive text-destructive-foreground'
                        : 'bg-muted text-muted-foreground'}`}>
                      {s === 'paid' ? '✅ Paid Full' : s === 'partial' ? '⚠️ Paid Partial' : '❌ Not Paid (Credit)'}
                    </button>
                  ))}
                </div>
                {paymentStatus !== 'paid' && (
                  <div className="flex items-center gap-2">
                    <Label className="text-xs whitespace-nowrap">Amount Paid:</Label>
                    <Input type="number" min="0" step="0.01" value={amountPaid} onChange={e => setAmountPaid(e.target.value)}
                      placeholder="0.00" className="w-32" />
                    <span className="text-xs text-muted-foreground">
                      Balance: <span className="font-bold text-destructive">{fmt(grandTotal - (parseFloat(amountPaid) || 0))}</span>
                    </span>
                  </div>
                )}
              </div>
              <Button onClick={() => withLock(handleSave)} className="w-full" disabled={submitLocked}>
                <Package className="h-4 w-4 mr-2" />{submitLocked ? 'Saving...' : `Record Purchase — ${fmt(grandTotal)}`}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <AdSpace variant="banner" />

      {/* Purchase History Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('today')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'today' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
        >
          Today's Purchases ({todayPurchases.length})
        </button>
        <button
          onClick={() => setActiveTab('previous')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'previous' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
        >
          Previous Purchases ({previousPurchases.length})
        </button>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-4">
          <h2 className="text-base font-semibold mb-3">
            {activeTab === 'today' ? "Today's Purchases" : "Previous Purchases"}
          </h2>
          {(activeTab === 'today' ? todayPurchases : previousPurchases).length === 0 ? (
            <p className="text-sm text-muted-foreground">No purchases {activeTab === 'today' ? 'today' : 'from previous days'} yet.</p>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {(activeTab === 'today' ? todayPurchases : previousPurchases).map(p => (
                <PurchaseCard key={p.id} p={p} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Update Payment Dialog */}
      <Dialog open={!!editPaymentPurchase} onOpenChange={o => { if (!o) setEditPaymentPurchase(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Update Payment — {editPaymentPurchase?.supplier}</DialogTitle></DialogHeader>
          {editPaymentPurchase && (
            <div className="space-y-3">
              <p className="text-sm">Total: <span className="font-bold">{fmt(Number(editPaymentPurchase.grand_total))}</span></p>
              <p className="text-sm">Previously Paid: <span className="font-bold">{fmt(Number(editPaymentPurchase.amount_paid))}</span></p>
              <div>
                <Label>New Total Amount Paid</Label>
                <Input type="number" min="0" step="0.01" value={editAmountPaid} onChange={e => setEditAmountPaid(e.target.value)} />
              </div>
              <p className="text-sm">New Balance: <span className="font-bold text-destructive">{fmt(Number(editPaymentPurchase.grand_total) - (parseFloat(editAmountPaid) || 0))}</span></p>
              <Button className="w-full" onClick={async () => {
                const amt = parseFloat(editAmountPaid) || 0;
                await updatePurchasePayment(editPaymentPurchase.id, amt, amt >= Number(editPaymentPurchase.grand_total) ? 'paid' : amt > 0 ? 'partial' : 'unpaid');
                setEditPaymentPurchase(null);
              }}>
                💰 Save Payment
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}