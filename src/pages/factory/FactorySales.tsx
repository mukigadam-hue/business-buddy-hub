import { useState } from 'react';
import { useBusiness } from '@/context/BusinessContext';
import { useCurrency } from '@/hooks/useCurrency';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, TrendingUp, Receipt as ReceiptIcon } from 'lucide-react';
import Receipt from '@/components/Receipt';
import type { Sale } from '@/context/BusinessContext';

function toSentenceCase(str: string) { return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : str; }

export default function FactorySales() {
  const { stock, sales, addSale, saveReceipt, currentBusiness } = useBusiness();
  const { fmt } = useCurrency();

  const activeProducts = stock.filter(s => !s.deleted_at);

  const [items, setItems] = useState<{
    stock_item_id: string; item_name: string; category: string; quality: string;
    quantity: number; price_type: string; unit_price: number; subtotal: number;
  }[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [sellerName, setSellerName] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [qty, setQty] = useState('1');
  const [priceType, setPriceType] = useState('retail');
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);

  const [activeTab, setActiveTab] = useState<'today' | 'previous'>('today');
  const todaySales = sales.filter(s => new Date(s.created_at).toDateString() === new Date().toDateString());
  const prevSales = sales.filter(s => new Date(s.created_at).toDateString() !== new Date().toDateString());

  function addItem() {
    const product = activeProducts.find(p => p.id === selectedProduct);
    if (!product) return;
    const q = parseInt(qty) || 1;
    const price = priceType === 'wholesale' ? Number(product.wholesale_price) : Number(product.retail_price);
    setItems(prev => [...prev, {
      stock_item_id: product.id, item_name: product.name, category: product.category,
      quality: product.quality, quantity: q, price_type: priceType,
      unit_price: price, subtotal: q * price,
    }]);
    setSelectedProduct(''); setQty('1');
  }

  function removeItem(idx: number) { setItems(prev => prev.filter((_, i) => i !== idx)); }
  const grandTotal = items.reduce((sum, i) => sum + i.subtotal, 0);

  async function handleSave() {
    if (!items.length || !customerName.trim() || !sellerName.trim()) return;
    const sale = await addSale(items, grandTotal, toSentenceCase(sellerName.trim()), toSentenceCase(customerName.trim()));
    if (sale && currentBusiness) {
      const receiptItems = items.map(i => ({
        itemName: i.item_name, category: i.category, quality: i.quality,
        quantity: i.quantity, priceType: i.price_type, unitPrice: i.unit_price, subtotal: i.subtotal,
      }));
      await saveReceipt({
        business_id: currentBusiness.id, receipt_type: 'sale', transaction_id: sale.id,
        buyer_name: toSentenceCase(customerName.trim()), seller_name: toSentenceCase(sellerName.trim()),
        grand_total: grandTotal, items: receiptItems,
        business_info: { name: currentBusiness.name, address: currentBusiness.address, contact: currentBusiness.contact, email: currentBusiness.email },
        code: null,
      });
      setReceiptSale(sale);
    }
    setItems([]); setCustomerName(''); setSellerName('');
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2"><TrendingUp className="h-6 w-6" /> Sales</h1>

      <Card className="shadow-card">
        <CardContent className="p-4 space-y-4">
          <h2 className="text-base font-semibold">Sell Finished Products</h2>
          <div className="grid grid-cols-2 gap-3 p-3 bg-muted/40 rounded-lg border">
            <div>
              <Label className="text-xs font-semibold text-destructive">Customer (Buyer) *</Label>
              <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Customer name" required />
            </div>
            <div>
              <Label className="text-xs font-semibold text-destructive">Seller *</Label>
              <Input value={sellerName} onChange={e => setSellerName(e.target.value)} placeholder="Your name" required />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[180px]">
              <Label>Product</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger><SelectValue placeholder="Choose product..." /></SelectTrigger>
                <SelectContent>
                  {activeProducts.filter(p => p.quantity > 0).map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}{p.category ? ` · ${p.category}` : ''}{p.quality ? ` · ${p.quality}` : ''} (qty: {p.quantity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-20"><Label>Qty</Label><Input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} /></div>
            <div className="w-28">
              <Label>Price Type</Label>
              <Select value={priceType} onValueChange={setPriceType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="wholesale">Wholesale</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={addItem} disabled={!selectedProduct}><Plus className="h-4 w-4 mr-1" />Add</Button>
          </div>

          {items.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead><TableHead>Type</TableHead>
                      <TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead><TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{item.item_name}</TableCell>
                        <TableCell className="capitalize text-xs">{item.price_type}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmt(item.unit_price)}</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">{fmt(item.subtotal)}</TableCell>
                        <TableCell><Button variant="ghost" size="icon" onClick={() => removeItem(i)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={4} className="text-right font-bold">Grand Total</TableCell>
                      <TableCell className="text-right font-bold text-lg text-success tabular-nums">{fmt(grandTotal)}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              <Button onClick={handleSave} className="w-full" disabled={!customerName.trim() || !sellerName.trim()}>
                <TrendingUp className="h-4 w-4 mr-2" />Complete Sale — {fmt(grandTotal)}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* History */}
      <div className="flex gap-2">
        <button onClick={() => setActiveTab('today')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'today' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
          Today ({todaySales.length})
        </button>
        <button onClick={() => setActiveTab('previous')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'previous' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
          Previous ({prevSales.length})
        </button>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-4">
          {(activeTab === 'today' ? todaySales : prevSales).length === 0 ? (
            <p className="text-sm text-muted-foreground">No sales yet.</p>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {(activeTab === 'today' ? todaySales : prevSales).map(s => (
                <div key={s.id} className="border rounded-lg p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">👤 {s.customer_name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-success bg-success/10 px-2 py-0.5 rounded-md text-sm tabular-nums">{fmt(Number(s.grand_total))}</span>
                      <Button size="sm" variant="ghost" onClick={() => setReceiptSale(s)}><ReceiptIcon className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</p>
                  <div className="text-sm text-muted-foreground space-y-1 mt-1">
                    {s.items.map((item, i) => (
                      <div key={i} className="flex justify-between">
                        <span>{item.item_name} × {item.quantity} ({item.price_type})</span>
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

      {/* Receipt Dialog */}
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
              date={receiptSale.created_at} type="sale"
              businessInfo={currentBusiness ? { name: currentBusiness.name, address: currentBusiness.address, contact: currentBusiness.contact, email: currentBusiness.email } : undefined}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
