import { useState } from 'react';
import { useFactory } from '@/context/FactoryContext';
import { useCurrency } from '@/hooks/useCurrency';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, ShoppingCart, ScanLine } from 'lucide-react';
import { useBusiness } from '@/context/BusinessContext';
import BarcodeScanner from '@/components/BarcodeScanner';
import { toast } from 'sonner';
import AdSpace from '@/components/AdSpace';

import { toSentenceCase, toTitleCase } from '@/lib/utils';
const UNIT_TYPES = ['Pieces', 'Kilograms', 'Litres', 'Metres', 'Tonnes', 'Rolls'];

export default function FactoryPurchases() {
  const { rawMaterials, addRawMaterial, updateRawMaterial, refreshFactory } = useFactory();
  const { purchases, addPurchase, stock } = useBusiness();
  const { fmt } = useCurrency();

  const [items, setItems] = useState<{
    item_name: string; category: string; unit_type: string;
    quantity: number; unit_price: number;
  }[]>([]);
  const [supplier, setSupplier] = useState('');
  const [recordedBy, setRecordedBy] = useState('');
  const [form, setForm] = useState({ name: '', category: '', unit_type: 'Pieces', quantity: '1', unit_price: '' });
  const [scannerOpen, setScannerOpen] = useState(false);

  const activeRM = rawMaterials.filter(r => !r.deleted_at);
  const activeStock = stock.filter(s => !s.deleted_at);
  const suggestions = activeRM.map(r => r.name);

  function addItem() {
    if (!form.name.trim()) return;
    setItems(prev => [...prev, {
      item_name: toSentenceCase(form.name.trim()),
      category: toSentenceCase(form.category.trim()),
      unit_type: form.unit_type,
      quantity: parseFloat(form.quantity) || 1,
      unit_price: parseFloat(form.unit_price) || 0,
    }]);
    setForm({ name: '', category: '', unit_type: 'Pieces', quantity: '1', unit_price: '' });
  }

  function removeItem(idx: number) { setItems(prev => prev.filter((_, i) => i !== idx)); }
  const grandTotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  function handleBarcodeScan(code: string) {
    // Try matching against stock items with barcodes
    const match = activeStock.find(s => s.barcode && s.barcode === code);
    if (match) {
      setForm(f => ({ ...f, name: match.name, category: match.category }));
      toast.success(`Found: ${match.name}`);
    } else {
      toast.error(`No item found for barcode: ${code}`);
    }
  }

  async function handleSave() {
    if (items.length === 0) return;

    await addPurchase(
      items.map(item => ({
        item_name: item.item_name, category: item.category, quality: item.unit_type,
        quantity: item.quantity, unit_price: item.unit_price,
        subtotal: item.quantity * item.unit_price,
      })),
      grandTotal, supplier.trim() || 'Unknown', toTitleCase(recordedBy.trim()) || 'Staff'
    );

    for (const item of items) {
      const existing = activeRM.find(r =>
        r.name.toLowerCase() === item.item_name.toLowerCase() &&
        r.category.toLowerCase() === item.category.toLowerCase()
      );
      if (existing) {
        await updateRawMaterial(existing.id, {
          quantity: Number(existing.quantity) + item.quantity,
          unit_cost: item.unit_price,
        });
      } else {
        await addRawMaterial({
          name: item.item_name, category: item.category,
          unit_type: item.unit_type, quantity: item.quantity,
          unit_cost: item.unit_price, min_stock_level: 5, supplier: supplier.trim(),
        });
      }
    }

    setItems([]);
    setSupplier('');
    setRecordedBy('');
    refreshFactory();
  }

  const todayPurchases = purchases.filter(p => new Date(p.created_at).toDateString() === new Date().toDateString());
  const previousPurchases = purchases.filter(p => new Date(p.created_at).toDateString() !== new Date().toDateString());
  const [activeTab, setActiveTab] = useState<'today' | 'previous'>('today');

  return (
    <div className="space-y-6">
      <BarcodeScanner open={scannerOpen} onOpenChange={setScannerOpen} onScan={handleBarcodeScan} />
      <h1 className="text-2xl font-bold flex items-center gap-2"><ShoppingCart className="h-6 w-6" /> Purchases</h1>

      <Card className="shadow-card">
        <CardContent className="p-4 space-y-4">
          <h2 className="text-base font-semibold">Record Raw Material Purchase</h2>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Supplier</Label><Input value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="Supplier name" /></div>
            <div><Label>Recorded By</Label><Input value={recordedBy} onChange={e => setRecordedBy(e.target.value)} placeholder="Your name" /></div>
          </div>

          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[150px]">
              <Label>Material Name</Label>
              <div className="flex gap-1.5">
                <Input className="flex-1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} list="rm-suggestions" placeholder="Type or select..." />
                <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={() => setScannerOpen(true)} title="Scan barcode">
                  <ScanLine className="h-4 w-4" />
                </Button>
              </div>
              <datalist id="rm-suggestions">{suggestions.map(s => <option key={s} value={s} />)}</datalist>
            </div>
            <div className="w-28">
              <Label>Category</Label>
              <Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Category..." />
            </div>
            <div className="w-28">
              <Label>Unit Type</Label>
              <Select value={form.unit_type} onValueChange={v => setForm(f => ({ ...f, unit_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{UNIT_TYPES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="w-20"><Label>Qty</Label><Input type="number" min="0.01" step="0.01" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} /></div>
            <div className="w-24"><Label>Unit Cost</Label><Input type="number" min="0" step="0.01" value={form.unit_price} onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))} /></div>
            <Button onClick={addItem} disabled={!form.name.trim()}><Plus className="h-4 w-4 mr-1" />Add</Button>
          </div>

          {items.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead><TableHead>Category</TableHead><TableHead>Unit</TableHead>
                      <TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Cost/Unit</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead><TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{item.item_name}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell className="capitalize">{item.unit_type}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmt(item.unit_price)}</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">{fmt(item.quantity * item.unit_price)}</TableCell>
                        <TableCell><Button variant="ghost" size="icon" onClick={() => removeItem(i)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={5} className="text-right font-bold">Grand Total</TableCell>
                      <TableCell className="text-right font-bold text-lg text-success tabular-nums">{fmt(grandTotal)}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              <Button onClick={handleSave} className="w-full">
                <ShoppingCart className="h-4 w-4 mr-2" />Record Purchase — {fmt(grandTotal)}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <AdSpace variant="banner" />

      {/* History */}
      <div className="flex gap-2">
        <button onClick={() => setActiveTab('today')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'today' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
          Today ({todayPurchases.length})
        </button>
        <button onClick={() => setActiveTab('previous')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'previous' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
          Previous ({previousPurchases.length})
        </button>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-4">
          {(activeTab === 'today' ? todayPurchases : previousPurchases).length === 0 ? (
            <p className="text-sm text-muted-foreground">No purchases {activeTab === 'today' ? 'today' : 'from previous days'} yet.</p>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {(activeTab === 'today' ? todayPurchases : previousPurchases).map(p => (
                <div key={p.id} className="border rounded-lg p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-sm">{p.supplier}</span>
                    <span className="font-bold text-success bg-success/10 px-2 py-0.5 rounded-md text-sm tabular-nums">{fmt(Number(p.grand_total))}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()}</p>
                  <div className="text-sm text-muted-foreground space-y-1 mt-1 max-h-40 overflow-y-auto">
                    {p.items.map((item, i) => (
                      <div key={i} className="flex justify-between">
                        <span>{item.item_name} × {item.quantity}</span>
                        <span className="tabular-nums">{fmt(Number(item.subtotal))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
