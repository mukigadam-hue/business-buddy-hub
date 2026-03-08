import { useState } from 'react';
import { useBusiness } from '@/context/BusinessContext';
import { useCurrency } from '@/hooks/useCurrency';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Package, ScanLine } from 'lucide-react';
import BarcodeScanner from '@/components/BarcodeScanner';
import { toast } from 'sonner';

function toSentenceCase(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export default function PurchasesPage() {
  const { stock, purchases, addPurchase } = useBusiness();
  const { fmt } = useCurrency();
  const [items, setItems] = useState<{
    item_name: string; category: string; quality: string;
    quantity: number; unit_price: number; wholesale_price: number; retail_price: number;
  }[]>([]);
  const [supplier, setSupplier] = useState('');
  const [recordedBy, setRecordedBy] = useState('');
  const [form, setForm] = useState({
    name: '', category: '', quality: '', quantity: '1',
    unit_price: '', wholesale_price: '', retail_price: '',
  });
  const [activeTab, setActiveTab] = useState<'today' | 'previous'>('today');

  const [scannerOpen, setScannerOpen] = useState(false);
  const activeStock = stock.filter(s => !s.deleted_at);
  const suggestions = activeStock.map(s => s.name);
  const existingCategories = [...new Set(activeStock.map(s => s.category).filter(Boolean))];

  const todayPurchases = purchases.filter(p => new Date(p.created_at).toDateString() === new Date().toDateString());
  const previousPurchases = purchases.filter(p => new Date(p.created_at).toDateString() !== new Date().toDateString());

  function applyCase(field: 'name' | 'category' | 'quality') {
    setForm(f => ({ ...f, [field]: toSentenceCase(f[field]) }));
  }

  function addItem() {
    if (!form.name.trim()) return;
    setItems(prev => [...prev, {
      item_name: toSentenceCase(form.name.trim()),
      category: toSentenceCase(form.category.trim()),
      quality: toSentenceCase(form.quality.trim()),
      quantity: parseInt(form.quantity) || 1,
      unit_price: parseFloat(form.unit_price) || 0,
      wholesale_price: parseFloat(form.wholesale_price) || parseFloat(form.unit_price) || 0,
      retail_price: parseFloat(form.retail_price) || parseFloat(form.unit_price) || 0,
    }]);
    setForm({ name: '', category: '', quality: '', quantity: '1', unit_price: '', wholesale_price: '', retail_price: '' });
  }

  function removeItem(idx: number) { setItems(prev => prev.filter((_, i) => i !== idx)); }
  const grandTotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  async function handleSave() {
    if (items.length === 0) return;
    await addPurchase(
      items.map(item => ({
        item_name: item.item_name, category: item.category, quality: item.quality,
        quantity: item.quantity, unit_price: item.unit_price,
        wholesale_price: item.wholesale_price, retail_price: item.retail_price,
        subtotal: item.quantity * item.unit_price,
      })),
      grandTotal, supplier.trim() || 'Unknown',
      toSentenceCase(recordedBy.trim()) || 'Staff'
    );
    setItems([]);
    setSupplier('');
    setRecordedBy('');
  }

  function PurchaseCard({ p }: { p: typeof purchases[0] }) {
    return (
      <div className="border rounded-lg p-3">
        <div className="flex justify-between items-center mb-1">
          <div>
            <span className="font-medium text-sm">{p.supplier}</span>
            {p.recorded_by && <span className="text-xs text-muted-foreground ml-2">by {p.recorded_by}</span>}
          </div>
          <span className="font-bold text-success bg-success/10 px-2 py-0.5 rounded-md text-sm tabular-nums">{fmt(Number(p.grand_total))}</span>
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
      </div>
    );
  }

  function handleBarcodeScan(code: string) {
    const match = activeStock.find(s => s.barcode && s.barcode === code);
    if (match) {
      setForm(f => ({ ...f, name: match.name, category: match.category, quality: match.quality }));
      toast.success(`Found: ${match.name}`);
    } else {
      toast.error(`No stock item found for barcode: ${code}`);
    }
  }

  return (
    <div className="space-y-6">
      <BarcodeScanner open={scannerOpen} onOpenChange={setScannerOpen} onScan={handleBarcodeScan} />
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
              <Label>Recorded By</Label>
              <Input value={recordedBy} onChange={e => setRecordedBy(e.target.value)} onBlur={() => setRecordedBy(toSentenceCase(recordedBy))} placeholder="Your name" />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[150px]">
              <Label>Item Name</Label>
              <div className="flex gap-1.5">
                <Input className="flex-1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} onBlur={() => applyCase('name')} list="stock-suggestions" placeholder="Type or select..." />
                <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={() => setScannerOpen(true)} title="Scan barcode">
                  <ScanLine className="h-4 w-4" />
                </Button>
              </div>
              <datalist id="stock-suggestions">{suggestions.map(s => <option key={s} value={s} />)}</datalist>
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
            <div className="w-16"><Label>Qty</Label><Input type="number" min="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} /></div>
            <div className="w-24"><Label>Cost/Unit</Label><Input type="number" min="0" step="0.01" value={form.unit_price} onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))} placeholder="0.00" /></div>
            <div className="w-24"><Label>Wholesale</Label><Input type="number" min="0" step="0.01" value={form.wholesale_price} onChange={e => setForm(f => ({ ...f, wholesale_price: e.target.value }))} placeholder="Auto" /></div>
            <div className="w-24"><Label>Retail</Label><Input type="number" min="0" step="0.01" value={form.retail_price} onChange={e => setForm(f => ({ ...f, retail_price: e.target.value }))} placeholder="Auto" /></div>
            <Button onClick={addItem} disabled={!form.name.trim()}><Plus className="h-4 w-4 mr-1" />Add</Button>
          </div>

          {items.length > 0 && (
            <>
              <div className="overflow-x-auto max-h-60 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead><TableHead>Category</TableHead><TableHead>Quality</TableHead>
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
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmt(item.unit_price)}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmt(item.wholesale_price)}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmt(item.retail_price)}</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">{fmt(item.quantity * item.unit_price)}</TableCell>
                        <TableCell><Button variant="ghost" size="icon" onClick={() => removeItem(i)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={7} className="text-right font-bold">Grand Total</TableCell>
                      <TableCell className="text-right font-bold text-lg text-success tabular-nums">{fmt(grandTotal)}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              <Button onClick={handleSave} className="w-full">
                <Package className="h-4 w-4 mr-2" />Record Purchase — {fmt(grandTotal)}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

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
    </div>
  );
}
