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
import { Plus, Trash2, ShoppingCart, Receipt as ReceiptIcon, Wrench, Package, ScanLine } from 'lucide-react';
import Receipt from '@/components/Receipt';
import BarcodeScanner from '@/components/BarcodeScanner';
import { toast } from 'sonner';
import type { Sale } from '@/context/BusinessContext';

function toSentenceCase(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export default function SalesPage() {
  const { stock, sales, addSale, saveReceipt, currentBusiness, updateSalePayment } = useBusiness();
  const { fmt } = useCurrency();

  const [items, setItems] = useState<{
    stock_item_id: string; item_name: string; category: string;
    quality: string; quantity: number; price_type: string; unit_price: number;
  }[]>([]);
  const [serviceItems, setServiceItems] = useState<{
    service_name: string; description: string; cost: number;
  }[]>([]);
  // Parts used from stock for service items
  const [serviceParts, setServiceParts] = useState<{
    stock_item_id: string; item_name: string; category: string; quality: string;
    quantity: number; unit_price: number; subtotal: number;
  }[]>([]);

  const [selectedStock, setSelectedStock] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [priceType, setPriceType] = useState<'wholesale' | 'retail'>('retail');
  const [svcForm, setSvcForm] = useState({ service_name: '', description: '', cost: '' });
  const [buyerName, setBuyerName] = useState('');
  const [sellerName, setSellerName] = useState('');
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);
  const [activeTab, setActiveTab] = useState<'today' | 'previous'>('today');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'partial' | 'unpaid'>('paid');
  const [amountPaid, setAmountPaid] = useState('');
  const [editPaymentSale, setEditPaymentSale] = useState<Sale | null>(null);
  const [editAmountPaid, setEditAmountPaid] = useState('');
  // Service parts selection
  const [selectedPartStock, setSelectedPartStock] = useState('');
  const [partQty, setPartQty] = useState('1');

  const [scannerOpen, setScannerOpen] = useState(false);
  const [partScannerOpen, setPartScannerOpen] = useState(false);
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

  function addServicePart() {
    const stockItem = activeStock.find(s => s.id === selectedPartStock);
    if (!stockItem) return;
    const qty = parseInt(partQty) || 1;
    const maxQty = stockItem.quantity - serviceParts.filter(p => p.stock_item_id === stockItem.id).reduce((s, p) => s + p.quantity, 0);
    if (qty > maxQty) return;
    setServiceParts(prev => [...prev, {
      stock_item_id: stockItem.id,
      item_name: stockItem.name,
      category: stockItem.category,
      quality: stockItem.quality,
      quantity: qty,
      unit_price: Number(stockItem.retail_price),
      subtotal: qty * Number(stockItem.retail_price),
    }]);
    setSelectedPartStock('');
    setPartQty('1');
  }

  function removeItem(idx: number) { setItems(prev => prev.filter((_, i) => i !== idx)); }
  function removeServiceItem(idx: number) { setServiceItems(prev => prev.filter((_, i) => i !== idx)); }
  function removeServicePart(idx: number) { setServiceParts(prev => prev.filter((_, i) => i !== idx)); }

  const itemsTotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const servicesTotal = serviceItems.reduce((sum, svc) => sum + svc.cost, 0);
  const partsTotal = serviceParts.reduce((sum, p) => sum + p.subtotal, 0);
  const grandTotal = itemsTotal + servicesTotal + partsTotal;

  const canSave = (items.length > 0 || serviceItems.length > 0 || serviceParts.length > 0) && buyerName.trim() && sellerName.trim();

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
    const newSale = await addSale(allItems, grandTotal, toSentenceCase(sellerName.trim()), toSentenceCase(buyerName.trim()), undefined, undefined, paymentStatus, paidAmt);
    
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
    setServiceParts([]);
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
                {item.price_type && item.price_type !== 'service' && item.price_type !== 'part' && <span className="text-xs ml-1 text-muted-foreground">({item.price_type})</span>}
                {item.price_type === 'part' && <span className="text-xs ml-1 text-accent">(part used)</span>}
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

  const availablePartsStock = activeStock.filter(s => s.quantity > 0);

  function handleBarcodeScan(code: string) {
    const match = activeStock.find(s => s.barcode && s.barcode === code && s.quantity > 0);
    if (match) { setSelectedStock(match.id); toast.success(`Found: ${match.name}`); }
    else { toast.error(`No stock item found for barcode: ${code}`); }
  }
  function handlePartBarcodeScan(code: string) {
    const match = availablePartsStock.find(s => s.barcode && s.barcode === code);
    if (match) { setSelectedPartStock(match.id); toast.success(`Found: ${match.name}`); }
    else { toast.error(`No stock item found for barcode: ${code}`); }
  }

  return (
    <div className="space-y-6">
      <BarcodeScanner open={scannerOpen} onOpenChange={setScannerOpen} onScan={handleBarcodeScan} />
      <BarcodeScanner open={partScannerOpen} onOpenChange={setPartScannerOpen} onScan={handlePartBarcodeScan} />
      <h1 className="text-2xl font-bold">Sales</h1>

      <Card className="shadow-card">
        <CardContent className="p-4 space-y-4">
          <h2 className="text-base font-semibold">Record New Sale</h2>

          {/* Buyer & Seller names — required */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-muted/40 rounded-lg border">
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
            <div className="space-y-3 sm:space-y-0 sm:flex sm:flex-wrap sm:gap-3 sm:items-end">
              <div className="w-full sm:flex-1 sm:min-w-[200px]">
                <Label>Item</Label>
                <div className="flex gap-1.5">
                  <Select value={selectedStock} onValueChange={setSelectedStock}>
                    <SelectTrigger className="flex-1">
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
                  <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={() => setScannerOpen(true)} title="Scan barcode">
                    <ScanLine className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:contents">
                <div className="sm:w-20"><Label>Qty</Label><Input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} /></div>
                <div className="sm:w-32">
                  <Label>Price Type</Label>
                  <Select value={priceType} onValueChange={v => setPriceType(v as 'wholesale' | 'retail')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="wholesale">Wholesale</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={addItem} disabled={!selectedStock} className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-1" />Add Item</Button>
            </div>
          </div>

          {/* Service Items */}
          <div className="border rounded-lg p-3 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">🔧 Services (Optional)</p>
            
            {/* Service Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label>Service Name</Label>
                <Input value={svcForm.service_name} onChange={e => setSvcForm(f => ({ ...f, service_name: e.target.value }))} onBlur={() => setSvcForm(f => ({ ...f, service_name: toSentenceCase(f.service_name) }))} placeholder="e.g. Repair..." />
              </div>
              <div>
                <Label>Description</Label>
                <Input value={svcForm.description} onChange={e => setSvcForm(f => ({ ...f, description: e.target.value }))} placeholder="Details..." />
              </div>
              <div>
                <Label>Cost</Label>
                <Input type="number" min="0" step="0.01" value={svcForm.cost} onChange={e => setSvcForm(f => ({ ...f, cost: e.target.value }))} placeholder="0.00" />
              </div>
            </div>

            {/* Parts Used from Stock */}
            <div className="bg-muted/30 rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Package className="h-3.5 w-3.5" /> Items/Parts Used from Stock
              </p>
              <div className="flex flex-wrap gap-2 items-end">
                <div className="flex-1 min-w-[180px]">
                  <Label className="text-xs">Select Part</Label>
                  <div className="flex gap-1.5">
                    <Select value={selectedPartStock} onValueChange={setSelectedPartStock}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Choose from stock..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePartsStock.map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}{s.category ? ` · ${s.category}` : ''}{s.quality ? ` · ${s.quality}` : ''} (qty: {s.quantity})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" size="icon" className="shrink-0 h-9 w-9" onClick={() => setPartScannerOpen(true)} title="Scan barcode">
                      <ScanLine className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="w-16">
                  <Label className="text-xs">Qty</Label>
                  <Input type="number" min="1" value={partQty} onChange={e => setPartQty(e.target.value)} />
                </div>
                <Button size="sm" variant="outline" onClick={addServicePart} disabled={!selectedPartStock}>
                  <Plus className="h-3.5 w-3.5 mr-1" />Add Part
                </Button>
              </div>
              {serviceParts.length > 0 && (
                <div className="space-y-1 mt-2">
                  {serviceParts.map((part, i) => (
                    <div key={i} className="flex items-center justify-between text-sm bg-background rounded px-2 py-1">
                      <span>
                        {part.item_name} × {part.quantity}
                        {part.category && <span className="text-xs text-muted-foreground ml-1">· {part.category}</span>}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums font-medium text-xs">{fmt(part.subtotal)}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeServicePart(i)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="text-xs text-muted-foreground text-right">Parts total: {fmt(partsTotal)}</div>
                </div>
              )}
            </div>

            {/* Add Service Button - at the bottom */}
            <Button onClick={addServiceItem} disabled={!svcForm.service_name.trim()} variant="outline" className="w-full">
              <Wrench className="h-4 w-4 mr-1" />Add Service
            </Button>
          </div>


          {(items.length > 0 || serviceItems.length > 0 || serviceParts.length > 0) && (
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
                    {serviceParts.map((part, i) => (
                      <TableRow key={`part-${i}`} className="bg-accent/5">
                        <TableCell className="font-medium">
                          <span className="flex items-center gap-1"><Package className="h-3 w-3 text-accent" />{part.item_name}</span>
                        </TableCell>
                        <TableCell>{part.category}</TableCell>
                        <TableCell>{part.quality}</TableCell>
                        <TableCell className="text-accent text-xs">Part Used</TableCell>
                        <TableCell className="text-right">{part.quantity}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmt(part.unit_price)}</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">{fmt(part.subtotal)}</TableCell>
                        <TableCell><Button variant="ghost" size="icon" onClick={() => removeServicePart(i)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></TableCell>
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
