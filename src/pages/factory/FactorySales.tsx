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
import { Plus, Trash2, TrendingUp, Receipt as ReceiptIcon, ScanLine, Wrench, Package } from 'lucide-react';
import Receipt from '@/components/Receipt';
import BarcodeScanner from '@/components/BarcodeScanner';
import { toast } from 'sonner';
import type { Sale } from '@/context/BusinessContext';
import AdSpace from '@/components/AdSpace';

import { toSentenceCase, toTitleCase } from '@/lib/utils';

export default function FactorySales() {
  const { stock, sales, addSale, saveReceipt, currentBusiness, updateSalePayment } = useBusiness();
  const { fmt } = useCurrency();

  const activeProducts = stock.filter(s => !s.deleted_at);

  const [items, setItems] = useState<{
    stock_item_id: string; item_name: string; category: string; quality: string;
    quantity: number; price_type: string; unit_price: number; subtotal: number;
    serial_numbers?: string;
  }[]>([]);
  const [serialInput, setSerialInput] = useState('');
  const [serviceItems, setServiceItems] = useState<{
    service_name: string; description: string; cost: number;
  }[]>([]);
  const [serviceParts, setServiceParts] = useState<{
    stock_item_id: string; item_name: string; category: string; quality: string;
    quantity: number; unit_price: number; subtotal: number;
  }[]>([]);

  const [customerName, setCustomerName] = useState('');
  const [sellerName, setSellerName] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [qty, setQty] = useState('1');
  const [priceType, setPriceType] = useState('retail');
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [partScannerOpen, setPartScannerOpen] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'partial' | 'unpaid'>('paid');
  const [amountPaid, setAmountPaid] = useState('');
  const [editPaymentSale, setEditPaymentSale] = useState<Sale | null>(null);
  const [editAmountPaid, setEditAmountPaid] = useState('');

  const [svcForm, setSvcForm] = useState({ service_name: '', description: '', cost: '' });
  const [selectedPartStock, setSelectedPartStock] = useState('');
  const [partQty, setPartQty] = useState('1');

  const [activeTab, setActiveTab] = useState<'today' | 'previous'>('today');
  const todaySales = sales.filter(s => new Date(s.created_at).toDateString() === new Date().toDateString());
  const prevSales = sales.filter(s => new Date(s.created_at).toDateString() !== new Date().toDateString());

  const availablePartsStock = activeProducts.filter(s => s.quantity > 0);

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

  function addServiceItem() {
    if (!svcForm.service_name.trim()) return;
    setServiceItems(prev => [...prev, {
      service_name: toSentenceCase(svcForm.service_name.trim()),
      description: svcForm.description.trim(),
      cost: parseFloat(svcForm.cost) || 0,
    }]);
    setSvcForm({ service_name: '', description: '', cost: '' });
  }

  function addServicePart() {
    const stockItem = activeProducts.find(s => s.id === selectedPartStock);
    if (!stockItem) return;
    const q = parseInt(partQty) || 1;
    const maxQty = stockItem.quantity - serviceParts.filter(p => p.stock_item_id === stockItem.id).reduce((s, p) => s + p.quantity, 0);
    if (q > maxQty) return;
    setServiceParts(prev => [...prev, {
      stock_item_id: stockItem.id,
      item_name: stockItem.name,
      category: stockItem.category,
      quality: stockItem.quality,
      quantity: q,
      unit_price: Number(stockItem.retail_price),
      subtotal: q * Number(stockItem.retail_price),
    }]);
    setSelectedPartStock('');
    setPartQty('1');
  }

  function removeItem(idx: number) { setItems(prev => prev.filter((_, i) => i !== idx)); }
  function removeServiceItem(idx: number) { setServiceItems(prev => prev.filter((_, i) => i !== idx)); }
  function removeServicePart(idx: number) { setServiceParts(prev => prev.filter((_, i) => i !== idx)); }

  const itemsTotal = items.reduce((sum, i) => sum + i.subtotal, 0);
  const servicesTotal = serviceItems.reduce((sum, svc) => sum + svc.cost, 0);
  const partsTotal = serviceParts.reduce((sum, p) => sum + p.subtotal, 0);
  const grandTotal = itemsTotal + servicesTotal + partsTotal;

  const canSave = (items.length > 0 || serviceItems.length > 0 || serviceParts.length > 0) && customerName.trim() && sellerName.trim();

  function handleBarcodeScan(code: string) {
    const match = activeProducts.find(s => s.barcode && s.barcode === code && s.quantity > 0);
    if (match) { setSelectedProduct(match.id); toast.success(`Found: ${match.name}`); }
    else { toast.error(`No product found for barcode: ${code}`); }
  }

  function handlePartBarcodeScan(code: string) {
    const match = availablePartsStock.find(s => s.barcode && s.barcode === code);
    if (match) { setSelectedPartStock(match.id); toast.success(`Found: ${match.name}`); }
    else { toast.error(`No stock item found for barcode: ${code}`); }
  }

  async function handleSave() {
    if (!canSave) return;

    const allItems = [
      ...items,
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
      ...serviceParts.map(part => ({
        stock_item_id: part.stock_item_id,
        item_name: `[Part] ${part.item_name}`,
        category: part.category,
        quality: part.quality,
        quantity: part.quantity,
        price_type: 'part',
        unit_price: part.unit_price,
        subtotal: part.subtotal,
      })),
    ];

    const paidAmt = paymentStatus === 'paid' ? grandTotal : (parseFloat(amountPaid) || 0);
    const sale = await addSale(allItems, grandTotal, toTitleCase(sellerName.trim()), toTitleCase(customerName.trim()), undefined, undefined, paymentStatus, paidAmt);
    if (sale && currentBusiness) {
      const receiptItems = allItems.map(i => ({
        itemName: i.item_name, category: i.category, quality: i.quality,
        quantity: i.quantity, priceType: i.price_type, unitPrice: i.unit_price, subtotal: i.subtotal,
      }));
      await saveReceipt({
        business_id: currentBusiness.id, receipt_type: 'sale', transaction_id: sale.id,
        buyer_name: toTitleCase(customerName.trim()), seller_name: toTitleCase(sellerName.trim()),
        grand_total: grandTotal, items: receiptItems,
        business_info: { name: currentBusiness.name, address: currentBusiness.address, contact: currentBusiness.contact, email: currentBusiness.email },
        code: null,
      });
      setReceiptSale(sale);
    }
    setItems([]); setServiceItems([]); setServiceParts([]); setCustomerName(''); setSellerName(''); setPaymentStatus('paid'); setAmountPaid('');
  }

  return (
    <div className="space-y-6">
      <BarcodeScanner open={scannerOpen} onOpenChange={setScannerOpen} onScan={handleBarcodeScan} />
      <BarcodeScanner open={partScannerOpen} onOpenChange={setPartScannerOpen} onScan={handlePartBarcodeScan} />
      <h1 className="text-2xl font-bold flex items-center gap-2"><TrendingUp className="h-6 w-6" /> Sales</h1>

      <Card className="shadow-card">
        <CardContent className="p-4 space-y-4">
          <h2 className="text-base font-semibold">Sell Finished Products</h2>
          <div className="grid grid-cols-2 gap-3 p-3 bg-muted/40 rounded-lg border">
            <div>
              <Label className="text-xs font-semibold text-destructive">Customer (Buyer) *</Label>
              <Input value={customerName} onChange={e => setCustomerName(e.target.value)} onBlur={() => setCustomerName(toTitleCase(customerName))} placeholder="Customer name" required />
            </div>
            <div>
              <Label className="text-xs font-semibold text-destructive">Seller *</Label>
              <Input value={sellerName} onChange={e => setSellerName(e.target.value)} onBlur={() => setSellerName(toTitleCase(sellerName))} placeholder="Your name" required />
            </div>
          </div>

          {/* Stock Items */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">📦 Products</p>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[180px]">
                <Label>Product</Label>
                <div className="flex gap-1.5">
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Choose product..." /></SelectTrigger>
                    <SelectContent>
                      {activeProducts.filter(p => p.quantity > 0).map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}{p.category ? ` · ${p.category}` : ''}{p.quality ? ` · ${p.quality}` : ''} (qty: {p.quantity})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={() => setScannerOpen(true)} title="Scan barcode">
                    <ScanLine className="h-4 w-4" />
                  </Button>
                </div>
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
          </div>

          {/* Service section removed for factory */}

          {/* Summary Table */}
          {(items.length > 0 || serviceItems.length > 0 || serviceParts.length > 0) && (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead><TableHead>Type</TableHead>
                      <TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead><TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, i) => (
                      <TableRow key={`item-${i}`}>
                        <TableCell className="font-medium">{item.item_name}</TableCell>
                        <TableCell className="capitalize text-xs">{item.price_type}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmt(item.unit_price)}</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">{fmt(item.subtotal)}</TableCell>
                        <TableCell><Button variant="ghost" size="icon" onClick={() => removeItem(i)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></TableCell>
                      </TableRow>
                    ))}
                    {/* Service rows removed */}
                    <TableRow>
                      <TableCell colSpan={4} className="text-right font-bold">Grand Total</TableCell>
                      <TableCell className="text-right font-bold text-lg text-success tabular-nums">{fmt(grandTotal)}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              {/* Payment Status */}
              <div className="p-3 bg-muted/40 rounded-lg border space-y-2">
                <Label className="text-xs font-semibold">💰 Payment Status</Label>
                <div className="flex gap-2 flex-wrap">
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
              <Button onClick={handleSave} className="w-full" disabled={!canSave}>
                <TrendingUp className="h-4 w-4 mr-2" />Complete Sale — {fmt(grandTotal)}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <AdSpace variant="banner" />

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
                <div key={s.id} className={`border rounded-lg p-3 ${s.payment_status === 'unpaid' ? 'border-destructive/40 bg-destructive/5' : s.payment_status === 'partial' ? 'border-warning/40 bg-warning/5' : ''}`}>
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">👤 {s.customer_name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${s.payment_status === 'paid' ? 'bg-success/10 text-success' : s.payment_status === 'partial' ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'}`}>
                        {s.payment_status === 'paid' ? '✅ Paid' : s.payment_status === 'partial' ? `⚠️ Partial (${fmt(Number(s.amount_paid))})` : '❌ Unpaid'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-success bg-success/10 px-2 py-0.5 rounded-md text-sm tabular-nums">{fmt(Number(s.grand_total))}</span>
                      <Button size="sm" variant="ghost" onClick={() => setReceiptSale(s)}><ReceiptIcon className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                  {s.payment_status !== 'paid' && <p className="text-xs font-semibold text-destructive">Balance: {fmt(Number(s.balance))}</p>}
                  <p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</p>
                  <div className="text-sm text-muted-foreground space-y-1 mt-1">
                    {s.items.map((item, i) => (
                      <div key={i} className="flex justify-between">
                        <span>
                          {item.item_name} × {item.quantity}
                          {item.price_type && item.price_type !== 'service' && item.price_type !== 'part' && <span className="ml-1">({item.price_type})</span>}
                          {item.price_type === 'part' && <span className="text-xs ml-1 text-accent">(part used)</span>}
                        </span>
                        <span className="tabular-nums">{fmt(Number(item.subtotal))}</span>
                      </div>
                    ))}
                  </div>
                  {s.payment_status !== 'paid' && (
                    <Button size="sm" variant="outline" className="mt-2" onClick={() => { setEditPaymentSale(s); setEditAmountPaid(String(s.amount_paid || 0)); }}>
                      💰 Update Payment
                    </Button>
                  )}
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

      {/* Update Payment Dialog */}
      <Dialog open={!!editPaymentSale} onOpenChange={o => { if (!o) setEditPaymentSale(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Update Payment — {editPaymentSale?.customer_name}</DialogTitle></DialogHeader>
          {editPaymentSale && (
            <div className="space-y-3">
              <p className="text-sm">Total: <span className="font-bold">{fmt(Number(editPaymentSale.grand_total))}</span></p>
              <p className="text-sm">Previously Paid: <span className="font-bold">{fmt(Number(editPaymentSale.amount_paid))}</span></p>
              <div>
                <Label>New Total Amount Paid</Label>
                <Input type="number" min="0" step="0.01" value={editAmountPaid} onChange={e => setEditAmountPaid(e.target.value)} />
              </div>
              <p className="text-sm">New Balance: <span className="font-bold text-destructive">{fmt(Number(editPaymentSale.grand_total) - (parseFloat(editAmountPaid) || 0))}</span></p>
              <Button className="w-full" onClick={async () => {
                const amt = parseFloat(editAmountPaid) || 0;
                await updateSalePayment(editPaymentSale.id, amt, amt >= Number(editPaymentSale.grand_total) ? 'paid' : amt > 0 ? 'partial' : 'unpaid');
                setEditPaymentSale(null);
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
