import { useState } from 'react';
import { useBusiness } from '@/context/BusinessContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, ShoppingCart } from 'lucide-react';
import type { SaleItem } from '@/types/business';

export default function SalesPage() {
  const { data, addSale } = useBusiness();
  const [items, setItems] = useState<Omit<SaleItem, 'id' | 'subtotal'>[]>([]);
  const [selectedStock, setSelectedStock] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [priceType, setPriceType] = useState<'wholesale' | 'retail'>('retail');

  const todaySales = data.sales.filter(s => new Date(s.timestamp).toDateString() === new Date().toDateString());

  function addItem() {
    const stockItem = data.stock.find(s => s.id === selectedStock);
    if (!stockItem) return;
    const qty = parseInt(quantity) || 1;
    const unitPrice = priceType === 'wholesale' ? stockItem.wholesalePrice : stockItem.retailPrice;
    setItems(prev => [...prev, {
      stockItemId: stockItem.id,
      itemName: stockItem.name,
      category: stockItem.category,
      quality: stockItem.quality,
      quantity: qty,
      priceType,
      unitPrice,
      timestamp: '',
    }]);
    setSelectedStock('');
    setQuantity('1');
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx));
  }

  const grandTotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  function handleSave() {
    if (items.length === 0) return;
    addSale({
      items: items.map(item => ({
        ...item,
        id: '',
        subtotal: item.quantity * item.unitPrice,
        timestamp: new Date().toISOString(),
      })),
      grandTotal,
      recordedBy: 'User',
    });
    setItems([]);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Sales</h1>

      {/* New Sale Form */}
      <Card className="shadow-card">
        <CardContent className="p-4 space-y-4">
          <h2 className="text-base font-semibold">Record New Sale</h2>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label>Item</Label>
              <Select value={selectedStock} onValueChange={setSelectedStock}>
                <SelectTrigger><SelectValue placeholder="Select item..." /></SelectTrigger>
                <SelectContent>
                  {data.stock.filter(s => s.quantity > 0).map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name} (qty: {s.quantity})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-24">
              <Label>Qty</Label>
              <Input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} />
            </div>
            <div className="w-32">
              <Label>Price Type</Label>
              <Select value={priceType} onValueChange={v => setPriceType(v as 'wholesale' | 'retail')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="wholesale">Wholesale</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={addItem} disabled={!selectedStock}><Plus className="h-4 w-4 mr-1" />Add</Button>
          </div>

          {items.length > 0 && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Type</TableHead>
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
                      <TableCell className="capitalize">{item.priceType}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">${item.unitPrice.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-semibold">${(item.quantity * item.unitPrice).toFixed(2)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeItem(i)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={4} className="text-right font-bold">Grand Total</TableCell>
                    <TableCell className="text-right font-bold text-lg">${grandTotal.toFixed(2)}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <Button onClick={handleSave} className="w-full">
                <ShoppingCart className="h-4 w-4 mr-2" />Record Sale — ${grandTotal.toFixed(2)}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Today's Sales */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <h2 className="text-base font-semibold mb-3">Today's Sales ({todaySales.length})</h2>
          {todaySales.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sales today yet.</p>
          ) : (
            <div className="space-y-3">
              {todaySales.map(sale => (
                <div key={sale.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">{new Date(sale.timestamp).toLocaleTimeString()}</span>
                    <span className="font-bold text-success">${sale.grandTotal.toFixed(2)}</span>
                  </div>
                  <div className="text-sm space-y-1">
                    {sale.items.map(item => (
                      <div key={item.id} className="flex justify-between text-muted-foreground">
                        <span>{item.itemName} × {item.quantity} ({item.priceType})</span>
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
