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
import { Plus, Trash2, ShoppingCart, Receipt as ReceiptIcon, Wrench } from 'lucide-react';
import Receipt from '@/components/Receipt';
import type { Sale } from '@/context/BusinessContext';

function toSentenceCase(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export default function SalesPage() {
  const { stock, sales, services, addSale, currentBusiness } = useBusiness();
  const { fmt } = useCurrency();

  // Stock items in the cart
  const [items, setItems] = useState<{
    stock_item_id: string; item_name: string; category: string;
    quality: string; quantity: number; price_type: string; unit_price: number;
  }[]>([]);
  // Service items in the cart
  const [serviceItems, setServiceItems] = useState<{
    service_name: string; description: string; cost: number; customer_name: string;
  }[]>([]);

  const [selectedStock, setSelectedStock] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [priceType, setPriceType] = useState<'wholesale' | 'retail'>('retail');

  // Service form
  const [svcForm, setSvcForm] = useState({ service_name: '', description: '', cost: '', customer_name: '' });

  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);

  const todaySales = sales.filter(s => new Date(s.created_at).toDateString() === new Date().toDateString());

  function addItem() {
    const stockItem = stock.find(s => s.id === selectedStock);
    if (!stockItem) return;
    const qty = parseInt(quantity) || 1;
    const unitPrice = priceType === 'wholesale' ? Number(stockItem.wholesale_price) : Number(stockItem.retail_price);
    setItems(prev => [...prev, {
      stock_item_id: stockItem.id,
      item_name: stockItem.name,
      category: stockItem.category,
      quality: stockItem.quality,
      quantity: qty,
      price_type: priceType,
      unit_price: unitPrice,
    }]);
    setSelectedStock('');
    setQuantity('1');
  }

  function addServiceItem() {
    if (!svcForm.service_name.trim()) return;
    setServiceItems(prev => [...prev, {
      service_name: toSentenceCase(svcForm.service_name.trim()),
      description: svcForm.description.trim(),
      cost: parseFloat(svcForm.cost) || 0,
      customer_name: toSentenceCase(svcForm.customer_name.trim()) || 'Walk-in',
    }]);
    setSvcForm({ service_name: '', description: '', cost: '', customer_name: '' });
  }

  function removeItem(idx: number) { setItems(prev => prev.filter((_, i) => i !== idx)); }
  function removeServiceItem(idx: number) { setServiceItems(prev => prev.filter((_, i) => i !== idx)); }

  const itemsTotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const servicesTotal = serviceItems.reduce((sum, svc) => sum + svc.cost, 0);
  const grandTotal = itemsTotal + servicesTotal;

  async function handleSave() {
    if (items.length === 0 && serviceItems.length === 0) return;

    // Build all items including services as special line items
    const allItems = [
      ...items.map(item => ({ ...item, subtotal: item.quantity * item.unit_price })),
      ...serviceItems.map(svc => ({
        stock_item_id: undefined,
        item_name: `[Service] ${svc.service_name}`,
        category: 'Service',
        quality: svc.description || '-',
        quantity: 1,
        price_type: 'service',
        unit_price: svc.cost,
        subtotal: svc.cost,
        customer_name: svc.customer_name,
      })),
    ];

    await addSale(allItems, grandTotal, 'Staff');
    setItems([]);
    setServiceItems([]);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Sales</h1>

      <Card className="shadow-card">
        <CardContent className="p-4 space-y-4">
          <h2 className="text-base font-semibold">Record New Sale</h2>

          {/* Stock Items */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">📦 Stock Items</p>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <Label>Item</Label>
                <Select value={selectedStock} onValueChange={setSelectedStock}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select item..." />
                  </SelectTrigger>
                  <SelectContent>
                    {stock.filter(s => s.quantity > 0).map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}{s.category ? ` · ${s.category}` : ''}{s.quality ? ` · ${s.quality}` : ''} (qty: {s.quantity})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-20"><Label>Qty</Label><Input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} /></div>
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
              <Button onClick={addItem} disabled={!selectedStock}><Plus className="h-4 w-4 mr-1" />Add Item</Button>
            </div>
          </div>

          {/* Service Items */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">🔧 Services (Optional)</p>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[150px]">
                <Label>Service Name</Label>
                <Input value={svcForm.service_name} onChange={e => setSvcForm(f => ({ ...f, service_name: e.target.value }))} onBlur={() => setSvcForm(f => ({ ...f, service_name: toSentenceCase(f.service_name) }))} placeholder="e.g. Repair..." />
              </div>
              <div className="w-32">
                <Label>Customer</Label>
                <Input value={svcForm.customer_name} onChange={e => setSvcForm(f => ({ ...f, customer_name: e.target.value }))} onBlur={() => setSvcForm(f => ({ ...f, customer_name: toSentenceCase(f.customer_name) }))} placeholder="Name..." />
              </div>
              <div className="flex-1 min-w-[120px]">
                <Label>Description</Label>
                <Input value={svcForm.description} onChange={e => setSvcForm(f => ({ ...f, description: e.target.value }))} placeholder="Details..." />
              </div>
              <div className="w-24">
                <Label>Cost</Label>
                <Input type="number" min="0" step="0.01" value={svcForm.cost} onChange={e => setSvcForm(f => ({ ...f, cost: e.target.value }))} placeholder="0.00" />
              </div>
              <Button onClick={addServiceItem} disabled={!svcForm.service_name.trim()} variant="outline">
                <Wrench className="h-4 w-4 mr-1" />Add Service
              </Button>
            </div>
          </div>

          {(items.length > 0 || serviceItems.length > 0) && (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead><TableHead>Category</TableHead><TableHead>Quality</TableHead>
                      <TableHead>Type</TableHead><TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead><TableHead className="text-right">Subtotal</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, i) => (
                      <TableRow key={`item-${i}`}>
                        <TableCell className="font-medium">{item.item_name}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>{item.quality}</TableCell>
                        <TableCell className="capitalize">{item.price_type}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{fmt(item.unit_price)}</TableCell>
                        <TableCell className="text-right font-semibold">{fmt(item.quantity * item.unit_price)}</TableCell>
                        <TableCell><Button variant="ghost" size="icon" onClick={() => removeItem(i)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></TableCell>
                      </TableRow>
                    ))}
                    {serviceItems.map((svc, i) => (
                      <TableRow key={`svc-${i}`} className="bg-muted/20">
                        <TableCell className="font-medium">
                          <span className="flex items-center gap-1"><Wrench className="h-3 w-3 text-muted-foreground" />{svc.service_name}</span>
                        </TableCell>
                        <TableCell>Service</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{svc.description || '-'}</TableCell>
                        <TableCell>Service</TableCell>
                        <TableCell className="text-right">1</TableCell>
                        <TableCell className="text-right">{fmt(svc.cost)}</TableCell>
                        <TableCell className="text-right font-semibold">{fmt(svc.cost)}</TableCell>
                        <TableCell><Button variant="ghost" size="icon" onClick={() => removeServiceItem(i)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={6} className="text-right font-bold">Grand Total</TableCell>
                      <TableCell className="text-right font-bold text-lg">{fmt(grandTotal)}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              <Button onClick={handleSave} className="w-full">
                <ShoppingCart className="h-4 w-4 mr-2" />Record Sale — {fmt(grandTotal)}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

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
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{new Date(sale.created_at).toLocaleString()}</span>
                      {sale.from_order_code && <span className="text-xs bg-accent/10 text-accent px-1.5 py-0.5 rounded-full">From Order {sale.from_order_code}</span>}
                    </div>
                    <span className="font-bold text-success">{fmt(Number(sale.grand_total))}</span>
                  </div>
                  <div className="text-sm space-y-1">
                    {sale.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-muted-foreground">
                        <span>
                          {item.item_name} × {item.quantity}
                          {item.category && <span className="text-xs ml-1">· {item.category}</span>}
                          {item.quality && <span className="text-xs ml-1">· {item.quality}</span>}
                          {item.price_type && item.price_type !== 'service' && <span className="text-xs ml-1">({item.price_type})</span>}
                        </span>
                        <span>{fmt(Number(item.subtotal))}</span>
                      </div>
                    ))}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setReceiptSale(sale)}>
                    <ReceiptIcon className="h-3.5 w-3.5 mr-1" />Receipt
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!receiptSale} onOpenChange={o => { if (!o) setReceiptSale(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Sale Receipt</DialogTitle></DialogHeader>
          {receiptSale && (
            <Receipt
              items={receiptSale.items.map(i => ({
                itemName: i.item_name,
                category: i.category,
                quality: i.quality,
                quantity: i.quantity,
                priceType: i.price_type,
                unitPrice: Number(i.unit_price),
                subtotal: Number(i.subtotal),
              }))}
              grandTotal={Number(receiptSale.grand_total)}
              code={receiptSale.from_order_code || undefined}
              date={receiptSale.created_at}
              type="sale"
              businessInfo={currentBusiness ? { name: currentBusiness.name, address: currentBusiness.address, contact: currentBusiness.contact, email: currentBusiness.email } : undefined}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
