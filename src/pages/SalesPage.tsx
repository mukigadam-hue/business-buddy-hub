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
  const { stock, sales, addSale, saveReceipt, currentBusiness } = useBusiness();
  const { fmt } = useCurrency();

  const [items, setItems] = useState<{
    stock_item_id: string; item_name: string; category: string;
    quality: string; quantity: number; price_type: string; unit_price: number;
  }[]>([]);
  const [serviceItems, setServiceItems] = useState<{
    service_name: string; description: string; cost: number;
  }[]>([]);

  const [selectedStock, setSelectedStock] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [priceType, setPriceType] = useState<'wholesale' | 'retail'>('retail');
  const [svcForm, setSvcForm] = useState({ service_name: '', description: '', cost: '' });
  const [buyerName, setBuyerName] = useState('');
  const [sellerName, setSellerName] = useState('');
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);
  const [activeTab, setActiveTab] = useState<'today' | 'previous'>('today');

  const activeStock = stock.filter(s => !s.deleted_at);
  const todaySales = sales.filter(s => new Date(s.created_at).toDateString() === new Date().toDateString());
  const previousSales = sales.filter(s => new Date(s.created_at).toDateString() !== new Date().toDateString());

  function addItem() {
    const stockItem = activeStock.find(s => s.id === selectedStock);
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
    }]);
    setSvcForm({ service_name: '', description: '', cost: '' });
  }

  function removeItem(idx: number) { setItems(prev => prev.filter((_, i) => i !== idx)); }
  function removeServiceItem(idx: number) { setServiceItems(prev => prev.filter((_, i) => i !== idx)); }

  const itemsTotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const servicesTotal = serviceItems.reduce((sum, svc) => sum + svc.cost, 0);
  const grandTotal = itemsTotal + servicesTotal;

  const canSave = (items.length > 0 || serviceItems.length > 0) && buyerName.trim() && sellerName.trim();

  async function handleSave() {
    if (!canSave) return;

    const allItems = [
      ...items.map(item => ({ ...item, subtotal: item.quantity * item.unit_price })),
      ...serviceItems.map(svc => ({
        stock_item_id: undefined as any,
        item_name: `[Service] ${svc.service_name}`,
        category: 'Service',
        quality: svc.description || '-',
        quantity: 1,
        price_type: 'service',
        unit_price: svc.cost,
        subtotal: svc.cost,
      })),
    ];

    const newSale = await addSale(allItems, grandTotal, toSentenceCase(sellerName.trim()), toSentenceCase(buyerName.trim()));
    
    // Auto-save receipt
    if (newSale && currentBusiness) {
      await saveReceipt({
        business_id: currentBusiness.id,
        receipt_type: 'sale',
        transaction_id: newSale.id,
        buyer_name: toSentenceCase(buyerName.trim()),
        seller_name: toSentenceCase(sellerName.trim()),
        grand_total: grandTotal,
        items: allItems.map(i => ({
          itemName: i.item_name, category: i.category, quality: i.quality,
          quantity: i.quantity, priceType: i.price_type, unitPrice: i.unit_price, subtotal: i.subtotal,
        })),
        business_info: { name: currentBusiness.name, address: currentBusiness.address, contact: currentBusiness.contact, email: currentBusiness.email },
        code: null,
      });
      setReceiptSale(newSale);
    }

    setItems([]);
    setServiceItems([]);
    setBuyerName('');
    setSellerName('');
  }

  function MoneyBadge({ value, className = 'text-success' }: { value: number; className?: string }) {
    return (
      <span className={`font-bold tabular-nums ${className} bg-success/10 px-2 py-0.5 rounded-md text-sm`}>
        {fmt(value)}
      </span>
    );
  }

  function SaleCard({ sale }: { sale: Sale }) {
    return (
      <div className="border rounded-lg p-3 space-y-2">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {sale.customer_name && <span className="text-sm font-medium">👤 {sale.customer_name}</span>}
              {sale.from_order_code && <span className="text-xs bg-accent/10 text-accent px-1.5 py-0.5 rounded-full">From Order {sale.from_order_code}</span>}
            </div>
            {sale.recorded_by && <p className="text-xs text-muted-foreground">Seller: {sale.recorded_by}</p>}
            <p className="text-xs text-muted-foreground">{new Date(sale.created_at).toLocaleString()}</p>
          </div>
          <MoneyBadge value={Number(sale.grand_total)} />
        </div>
        <div className="text-sm space-y-1 max-h-32 overflow-y-auto">
          {sale.items.map((item, i) => (
            <div key={i} className="flex justify-between text-muted-foreground">
              <span className="flex-1">
                {item.item_name} × {item.quantity}
                {item.category && item.category !== 'Service' && <span className="text-xs ml-1">· {item.category}</span>}
                {item.quality && item.quality !== '-' && <span className="text-xs ml-1">· {item.quality}</span>}
                {item.price_type && item.price_type !== 'service' && <span className="text-xs ml-1 text-muted-foreground">({item.price_type})</span>}
              </span>
              <span className="tabular-nums ml-2">{fmt(Number(item.subtotal))}</span>
            </div>
          ))}
        </div>
        <Button size="sm" variant="ghost" onClick={() => setReceiptSale(sale)}>
          <ReceiptIcon className="h-3.5 w-3.5 mr-1" />Receipt
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Sales</h1>

      <Card className="shadow-card">
        <CardContent className="p-4 space-y-4">
          <h2 className="text-base font-semibold">Record New Sale</h2>

          {/* Buyer & Seller names — required */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-muted/40 rounded-lg border">
            <div>
              <Label className="text-xs font-semibold text-destructive">Buyer Name *</Label>
              <Input value={buyerName} onChange={e => setBuyerName(e.target.value)} onBlur={() => setBuyerName(toSentenceCase(buyerName))} placeholder="Customer name (required)" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-destructive">Seller Name *</Label>
              <Input value={sellerName} onChange={e => setSellerName(e.target.value)} onBlur={() => setSellerName(toSentenceCase(sellerName))} placeholder="Your name (required)" />
            </div>
          </div>

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
                    {activeStock.filter(s => s.quantity > 0).map(s => (
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
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
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
                        <TableCell className="text-right tabular-nums">{fmt(item.unit_price)}</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">{fmt(item.quantity * item.unit_price)}</TableCell>
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
                        <TableCell className="text-right tabular-nums">{fmt(svc.cost)}</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">{fmt(svc.cost)}</TableCell>
                        <TableCell><Button variant="ghost" size="icon" onClick={() => removeServiceItem(i)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={6} className="text-right font-bold">Grand Total</TableCell>
                      <TableCell className="text-right font-bold text-lg text-success tabular-nums">{fmt(grandTotal)}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              {!buyerName.trim() || !sellerName.trim() ? (
                <p className="text-xs text-destructive text-center">⚠️ Buyer name and Seller name are required before saving.</p>
              ) : null}
              <Button onClick={handleSave} className="w-full" disabled={!canSave}>
                <ShoppingCart className="h-4 w-4 mr-2" />Record Sale — {fmt(grandTotal)}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Sales History Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('today')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'today' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
        >
          Today's Sales ({todaySales.length})
        </button>
        <button
          onClick={() => setActiveTab('previous')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'previous' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
        >
          Previous Sales ({previousSales.length})
        </button>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-4">
          <h2 className="text-base font-semibold mb-3">
            {activeTab === 'today' ? "Today's Sales" : "Previous Sales"}
          </h2>
          {(activeTab === 'today' ? todaySales : previousSales).length === 0 ? (
            <p className="text-sm text-muted-foreground">No sales {activeTab === 'today' ? 'today' : 'from previous days'} yet.</p>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {(activeTab === 'today' ? todaySales : previousSales).map(sale => (
                <SaleCard key={sale.id} sale={sale} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!receiptSale} onOpenChange={o => { if (!o) setReceiptSale(null); }}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Sale Receipt</DialogTitle></DialogHeader>
          {receiptSale && (
            <Receipt
              items={receiptSale.items.map(i => ({
                itemName: i.item_name, category: i.category, quality: i.quality,
                quantity: i.quantity, priceType: i.price_type, unitPrice: Number(i.unit_price), subtotal: Number(i.subtotal),
              }))}
              grandTotal={Number(receiptSale.grand_total)}
              buyerName={receiptSale.customer_name}
              sellerName={receiptSale.recorded_by}
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
