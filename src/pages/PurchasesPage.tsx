import { useState } from 'react';
import { useBusiness } from '@/context/BusinessContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Package } from 'lucide-react';
import type { PurchaseItem } from '@/types/business';

export default function PurchasesPage() {
  const { data, addPurchase } = useBusiness();
  const [items, setItems] = useState<Omit<PurchaseItem, 'id' | 'subtotal'>[]>([]);
  const [supplier, setSupplier] = useState('');
  const [form, setForm] = useState({ name: '', category: '', quality: '', quantity: '1', unitPrice: '' });

  const suggestions = data.stock.map(s => s.name);
  const existingCategories = [...new Set(data.stock.map(s => s.category).filter(Boolean))];

  function addItem() {
    if (!form.name.trim()) return;
    setItems(prev => [...prev, {
      itemName: form.name.trim(),
      category: form.category.trim(),
      quality: form.quality.trim(),
      quantity: parseInt(form.quantity) || 1,
      unitPrice: parseFloat(form.unitPrice) || 0,
    }]);
    setForm({ name: '', category: '', quality: '', quantity: '1', unitPrice: '' });
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx));
  }

  const grandTotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  function handleSave() {
    if (items.length === 0) return;
    addPurchase({
      items: items.map(item => ({ ...item, id: '', subtotal: item.quantity * item.unitPrice })),
      grandTotal,
      supplier: supplier.trim() || 'Unknown',
      recordedBy: 'User',
    });
    setItems([]);
    setSupplier('');
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Purchases</h1>

      <Card className="shadow-card">
        <CardContent className="p-4 space-y-4">
          <h2 className="text-base font-semibold">Record New Purchase</h2>
          <div>
            <Label>Supplier</Label>
            <Input value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="Supplier name" />
          </div>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[150px]">
              <Label>Item Name</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                list="stock-suggestions"
                placeholder="Type or select..."
              />
              <datalist id="stock-suggestions">
                {suggestions.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
            <div className="w-28">
              <Label>Category</Label>
              <Input
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                placeholder="Type category..."
                list="purchase-cat-suggestions"
              />
              <datalist id="purchase-cat-suggestions">
                {existingCategories.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div className="w-28">
              <Label>Quality</Label>
              <Input
                value={form.quality}
                onChange={e => setForm(f => ({ ...f, quality: e.target.value }))}
                placeholder="e.g. New..."
              />
            </div>
            <div className="w-20">
              <Label>Qty</Label>
              <Input type="number" min="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div className="w-24">
              <Label>Price</Label>
              <Input type="number" min="0" step="0.01" value={form.unitPrice} onChange={e => setForm(f => ({ ...f, unitPrice: e.target.value }))} />
            </div>
            <Button onClick={addItem} disabled={!form.name.trim()}><Plus className="h-4 w-4 mr-1" />Add</Button>
          </div>

          {items.length > 0 && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Quality</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{item.itemName}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>{item.quality}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">${item.unitPrice.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-semibold">${(item.quantity * item.unitPrice).toFixed(2)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeItem(i)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={5} className="text-right font-bold">Grand Total</TableCell>
                    <TableCell className="text-right font-bold text-lg">${grandTotal.toFixed(2)}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <Button onClick={handleSave} className="w-full">
                <Package className="h-4 w-4 mr-2" />Record Purchase — ${grandTotal.toFixed(2)}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Recent Purchases */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <h2 className="text-base font-semibold mb-3">Recent Purchases</h2>
          {data.purchases.length === 0 ? (
            <p className="text-sm text-muted-foreground">No purchases recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {data.purchases.slice(-5).reverse().map(p => (
                <div key={p.id} className="border rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <span className="font-medium text-sm">{p.supplier}</span>
                      <span className="text-xs text-muted-foreground ml-2">{new Date(p.timestamp).toLocaleDateString()}</span>
                    </div>
                    <span className="font-bold">${p.grandTotal.toFixed(2)}</span>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-0.5">
                    {p.items.map((item, i) => (
                      <div key={i} className="flex justify-between">
                        <span>{item.itemName} × {item.quantity}</span>
                        <span>${item.subtotal.toFixed(2)}</span>
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
