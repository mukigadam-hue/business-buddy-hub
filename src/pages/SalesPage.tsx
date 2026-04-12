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
import BarcodeScanHandler from '@/components/BarcodeScanHandler';
import { toast } from 'sonner';
import type { Sale } from '@/context/BusinessContext';
import AdSpace from '@/components/AdSpace';
import { BulkPackagingFields } from '@/components/BulkPackagingInfo';

import { toSentenceCase, toTitleCase } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useSubmitLock } from '@/hooks/useSubmitLock';

export default function SalesPage() {
  const { stock, sales, addSale, saveReceipt, currentBusiness, updateSalePayment, userRole } = useBusiness();
  const { user } = useAuth();
  const { fmt } = useCurrency();

  // Auto-fill seller name from user profile
  const userFullName = user?.user_metadata?.full_name || '';
  const roleLabel = userRole === 'owner' ? '(Owner)' : userRole === 'admin' ? '(Admin)' : '(Worker)';

  const [items, setItems] = useState<{
    stock_item_id: string; item_name: string; category: string;
    quality: string; quantity: number; price_type: string; unit_price: number;
    serial_numbers?: string; custom_price?: number;
  }[]>([]);
  const [serialInput, setSerialInput] = useState('');
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
  const [customPrice, setCustomPrice] = useState('');
  const [svcForm, setSvcForm] = useState({ service_name: '', description: '', cost: '' });
  const [buyerName, setBuyerName] = useState('');
  const [sellerName, setSellerName] = useState(userFullName);
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);
  const [activeTab, setActiveTab] = useState<'today' | 'previous'>('today');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'partial' | 'unpaid'>('paid');
  const [amountPaid, setAmountPaid] = useState('');
  const [editPaymentSale, setEditPaymentSale] = useState<Sale | null>(null);
  const [editAmountPaid, setEditAmountPaid] = useState('');
  // Service parts selection
  const [selectedPartStock, setSelectedPartStock] = useState('');
  const [partQty, setPartQty] = useState('1');
  const [stockSearch, setStockSearch] = useState('');
  const [bulkPkg, setBulkPkg] = useState({ pieces_per_carton: '0', cartons_per_box: '0', boxes_per_container: '0' });
  const [bulkQuantity, setBulkQuantity] = useState('');
  const { locked: submitLocked, withLock } = useSubmitLock();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [partScannerOpen, setPartScannerOpen] = useState(false);
  const activeStock = stock.filter(s => !s.deleted_at);
  const todaySales = sales.filter(s => new Date(s.created_at).toDateString() === new Date().toDateString());
  const previousSales = sales.filter(s => new Date(s.created_at).toDateString() !== new Date().toDateString());

  // Filter stock items by search text
  const filteredStock = activeStock.filter(s => {
    if (s.quantity <= 0) return false;
    if (!stockSearch) return true;
    const q = stockSearch.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q) || s.quality.toLowerCase().includes(q);
  });

  // When stock item is selected, load its packaging config
  function handleSelectStock(id: string) {
    setSelectedStock(id);
    setStockSearch('');
    const item = activeStock.find(s => s.id === id);
    if (item) {
      setBulkPkg({
        pieces_per_carton: String(item.pieces_per_carton || 0),
        cartons_per_box: String(item.cartons_per_box || 0),
        boxes_per_container: String(item.boxes_per_container || 0),
      });
      setBulkQuantity(quantity);
    }
  }

  function addItem() {
    const stockItem = activeStock.find(s => s.id === selectedStock);
    if (!stockItem) return;
    const finalQty = parseInt(bulkPkg.pieces_per_carton) > 0 ? (parseFloat(bulkQuantity) || parseFloat(quantity) || 1) : (parseFloat(quantity) || 1);
    const basePrice = priceType === 'wholesale' ? Number(stockItem.wholesale_price) : Number(stockItem.retail_price);
    const unitPrice = customPrice.trim() ? (parseFloat(customPrice) || basePrice) : basePrice;
    setItems(prev => [...prev, {
      stock_item_id: stockItem.id,
      item_name: stockItem.name,
      category: stockItem.category,
      quality: stockItem.quality,
      quantity: finalQty,
      price_type: customPrice.trim() ? 'custom' : priceType,
      unit_price: unitPrice,
      serial_numbers: serialInput.trim() || undefined,
      custom_price: customPrice.trim() ? unitPrice : undefined,
    }]);
    setSelectedStock('');
    setQuantity('1');
    setSerialInput('');
    setCustomPrice('');
    setStockSearch('');
    setBulkPkg({ pieces_per_carton: '0', cartons_per_box: '0', boxes_per_container: '0' });
    setBulkQuantity('');
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
    const qty = parseFloat(partQty) || 1;
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
      ...items.map(item => ({ ...item, subtotal: item.quantity * item.unit_price, serial_numbers: item.serial_numbers || '' })),
      ...serviceItems.map(svc => ({
        stock_item_id: undefined as any,
        item_name: `[Service] ${svc.service_name}`,
        category: 'Service',
        quality: svc.description || '-',
        quantity: 1,
        price_type: 'service',
        unit_price: svc.cost,
        subtotal: svc.cost,
        serial_numbers: '',
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
        serial_numbers: '',
      })),
    ];

    const paidAmt = paymentStatus === 'paid' ? grandTotal : (parseFloat(amountPaid) || 0);
    const newSale = await addSale(allItems, grandTotal, toTitleCase(sellerName.trim()), toTitleCase(buyerName.trim()), undefined, undefined, paymentStatus, paidAmt);
    
    // Auto-save receipt
    if (newSale && currentBusiness) {
      await saveReceipt({
        business_id: currentBusiness.id,
        receipt_type: 'sale',
        transaction_id: newSale.id,
        buyer_name: toTitleCase(buyerName.trim()),
        seller_name: toTitleCase(sellerName.trim()),
        grand_total: grandTotal,
        items: allItems.map(i => ({
          itemName: i.item_name, category: i.category, quality: i.quality,
          quantity: i.quantity, priceType: i.price_type, unitPrice: i.unit_price, subtotal: i.subtotal,
          serialNumbers: i.serial_numbers || undefined,
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
    setPaymentStatus('paid');
    setAmountPaid('');
  }

  function MoneyBadge({ value, className = 'text-success' }: { value: number; className?: string }) {
    return (
      <span className={`font-bold tabular-nums ${className} bg-success/10 px-2 py-0.5 rounded-md text-sm`}>
        {fmt(value)}
      </span>
    );
  }

  function SaleCard({ sale }: { sale: Sale }) {
    const isPaid = sale.payment_status === 'paid';
    const isPartial = sale.payment_status === 'partial';
    const isUnpaid = sale.payment_status === 'unpaid';
    return (
      <div className={`border rounded-lg p-3 space-y-2 ${isUnpaid ? 'border-destructive/40 bg-destructive/5' : isPartial ? 'border-warning/40 bg-warning/5' : ''}`}>
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {sale.customer_name && <span className="text-sm font-medium">👤 {sale.customer_name}</span>}
              {sale.from_order_code && <span className="text-xs bg-accent/10 text-accent px-1.5 py-0.5 rounded-full">From Order {sale.from_order_code}</span>}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${isPaid ? 'bg-success/10 text-success' : isPartial ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'}`}>
                {isPaid ? '✅ Paid' : isPartial ? `⚠️ Partial (${fmt(Number(sale.amount_paid))})` : '❌ Unpaid'}
              </span>
            </div>
            {sale.recorded_by && <p className="text-xs text-muted-foreground">Seller: {sale.recorded_by}</p>}
            <p className="text-xs text-muted-foreground">{new Date(sale.created_at).toLocaleString()}</p>
            {!isPaid && (
              <p className="text-xs font-semibold text-destructive">
                Balance owed: {fmt(Number(sale.balance))}
              </p>
            )}
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
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => setReceiptSale(sale)}>
            <ReceiptIcon className="h-3.5 w-3.5 mr-1" />Receipt
          </Button>
          {!isPaid && (
            <Button size="sm" variant="outline" onClick={() => { setEditPaymentSale(sale); setEditAmountPaid(''); }}>
              💰 Update Payment
            </Button>
          )}
        </div>
      </div>
    );
  }

  const availablePartsStock = activeStock.filter(s => s.quantity > 0);

  function handleScanExistingItem(item: any, qty: number) {
    const unitPrice = priceType === 'wholesale' ? Number(item.wholesale_price) : Number(item.retail_price);
    setItems(prev => [...prev, {
      stock_item_id: item.id,
      item_name: item.name,
      category: item.category,
      quality: item.quality,
      quantity: qty,
      price_type: priceType,
      unit_price: unitPrice,
    }]);
    toast.success(`${item.name} × ${qty} added to sale`);
  }
  function handleScanNewItem() {
    toast.success('New item created — scan again to add to sale');
  }
  function handlePartScanExisting(item: any, quantity: number) {
    setServiceParts(prev => [...prev, {
      stock_item_id: item.id,
      item_name: item.name,
      category: item.category,
      quality: item.quality,
      quantity,
      unit_price: Number(item.retail_price),
      subtotal: quantity * Number(item.retail_price),
    }]);
    toast.success(`Part: ${item.name} × ${quantity} added`);
  }

  return (
    <div className="space-y-6">
      <BarcodeScanHandler
        scannerOpen={scannerOpen}
        onScannerOpenChange={setScannerOpen}
        mode="sale"
        onExistingItemFound={handleScanExistingItem}
        onNewItemCreated={handleScanNewItem}
      />
      <BarcodeScanHandler
        scannerOpen={partScannerOpen}
        onScannerOpenChange={setPartScannerOpen}
        mode="sale"
        onExistingItemFound={handlePartScanExisting}
        onNewItemCreated={handleScanNewItem}
      />
      <h1 className="text-2xl font-bold">Sales</h1>

      <Card className="shadow-card">
        <CardContent className="p-4 space-y-4">
          <h2 className="text-base font-semibold">Record New Sale</h2>

          {/* Buyer & Seller names — required */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-muted/40 rounded-lg border">
            <div>
              <Label className="text-xs font-semibold text-destructive">Buyer Name *</Label>
              <Input value={buyerName} onChange={e => setBuyerName(e.target.value)} onBlur={() => setBuyerName(toTitleCase(buyerName))} placeholder="Customer name (required)" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-destructive">Seller Name * {roleLabel}</Label>
              <Input value={sellerName} onChange={e => setSellerName(e.target.value)} onBlur={() => setSellerName(toTitleCase(sellerName))} placeholder="Your name (auto-filled)" />
              {currentBusiness && <p className="text-[10px] text-muted-foreground mt-0.5">📍 {currentBusiness.name}</p>}
            </div>
          </div>

          {/* Stock Items */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">📦 Stock Items</p>
            <div className="space-y-3">
              <div className="w-full">
                <Label>Search & Select Item</Label>
                <Input
                  placeholder="Type to search items by name, category, quality..."
                  value={stockSearch}
                  onChange={e => setStockSearch(e.target.value)}
                  className="mb-1.5"
                />
                <div className="flex gap-1.5">
                  <Select value={selectedStock} onValueChange={handleSelectStock}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select item..." />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredStock.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}{s.category ? ` · ${s.category}` : ''}{s.quality ? ` · ${s.quality}` : ''} (qty: {s.quantity})
                        </SelectItem>
                      ))}
                      {filteredStock.length === 0 && (
                        <div className="px-3 py-2 text-xs text-muted-foreground">No items found</div>
                      )}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={() => setScannerOpen(true)} title="Scan barcode">
                    <ScanLine className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label>Qty</Label><Input type="number" min="0.01" step="0.01" value={quantity} onChange={e => setQuantity(e.target.value)}
                  readOnly={parseInt(bulkPkg.pieces_per_carton) > 0}
                  className={parseInt(bulkPkg.pieces_per_carton) > 0 ? 'bg-muted cursor-not-allowed' : ''} />
                  {parseInt(bulkPkg.pieces_per_carton) > 0 && <p className="text-[10px] text-muted-foreground mt-0.5">Auto-calculated from bulk</p>}
                </div>
                <div>
                  <Label>Price Type</Label>
                  <Select value={priceType} onValueChange={v => setPriceType(v as 'wholesale' | 'retail')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="wholesale">Wholesale</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Alt. Price <span className="text-[10px] text-muted-foreground">(optional)</span></Label>
                  <Input type="number" min="0" step="0.01" value={customPrice} onChange={e => setCustomPrice(e.target.value)} placeholder="Custom..." />
                </div>
              </div>

              <BulkPackagingFields
                piecesPerCarton={bulkPkg.pieces_per_carton}
                cartonsPerBox={bulkPkg.cartons_per_box}
                boxesPerContainer={bulkPkg.boxes_per_container}
                onChange={(field, value) => setBulkPkg(f => ({ ...f, [field]: value }))}
                onQuantityCalculated={(total) => { setQuantity(String(total)); setBulkQuantity(String(total)); }}
                currentQuantity={quantity}
              />

              {selectedStock && (() => {
                const si = activeStock.find(s => s.id === selectedStock);
                if (!si) return null;
                const basePrice = priceType === 'wholesale' ? Number(si.wholesale_price) : Number(si.retail_price);
                const effectivePrice = customPrice.trim() ? (parseFloat(customPrice) || basePrice) : basePrice;
                const totalQty = parseFloat(quantity) || 0;
                return (
                  <div className="text-xs text-muted-foreground bg-muted/40 rounded p-2">
                    {customPrice.trim() && <span className="text-warning font-medium mr-2">⚡ Custom price: {fmt(effectivePrice)}</span>}
                    Subtotal: <span className="font-bold text-foreground">{fmt(totalQty * effectivePrice)}</span>
                  </div>
                );
              })()}
              <Button onClick={addItem} disabled={!selectedStock} className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-1" />Add Item</Button>
            </div>
            {selectedStock && (
              <div className="mt-2">
                <Label className="text-xs text-muted-foreground">Serial Number (optional)</Label>
                <Input value={serialInput} onChange={e => setSerialInput(e.target.value)} placeholder="e.g. IMEI, S/N..." className="max-w-xs" />
              </div>
            )}
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
                  <Input type="number" min="0.01" step="0.01" value={partQty} onChange={e => setPartQty(e.target.value)} />
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
              {!buyerName.trim() || !sellerName.trim() ? (
                <p className="text-xs text-destructive text-center">⚠️ Buyer name and Seller name are required before saving.</p>
              ) : null}
              <Button onClick={() => withLock(handleSave)} className="w-full" disabled={!canSave || submitLocked}>
                <ShoppingCart className="h-4 w-4 mr-2" />{submitLocked ? 'Saving...' : `Record Sale — ${fmt(grandTotal)}`}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <AdSpace variant="banner" />

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
                serialNumbers: (i as any).serial_numbers || undefined,
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

      {/* Update Payment Dialog */}
      <Dialog open={!!editPaymentSale} onOpenChange={o => { if (!o) setEditPaymentSale(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Update Payment — {editPaymentSale?.customer_name}</DialogTitle></DialogHeader>
          {editPaymentSale && (() => {
            const total = Number(editPaymentSale.grand_total);
            const previouslyPaid = Number(editPaymentSale.amount_paid);
            const remaining = total - previouslyPaid;
            const payingNow = parseFloat(editAmountPaid) || 0;
            const newTotal = previouslyPaid + payingNow;
            const newBalance = Math.max(0, total - newTotal);
            const fullyPaid = newTotal >= total;
            return (
              <div className="space-y-3">
                <div className="p-3 bg-muted/40 rounded-lg border space-y-1">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Charged</span><span className="font-bold">{fmt(total)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Previously Paid</span><span className="font-bold">{fmt(previouslyPaid)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Remaining Balance</span><span className="font-bold text-destructive">{fmt(remaining)}</span></div>
                </div>
                <div>
                  <Label>💰 Amount Paying Now</Label>
                  <Input type="number" min="0" max={remaining} step="0.01" value={editAmountPaid} onChange={e => setEditAmountPaid(e.target.value)} placeholder={String(remaining)} />
                </div>
                {fullyPaid && <p className="text-sm font-semibold text-success text-center">✅ Fully Paid — debt cleared!</p>}
                {!fullyPaid && payingNow > 0 && <p className="text-sm text-center">New balance: <span className="font-bold text-destructive">{fmt(newBalance)}</span></p>}
                <Button className="w-full" onClick={async () => {
                  await updateSalePayment(editPaymentSale.id, newTotal, fullyPaid ? 'paid' : newTotal > 0 ? 'partial' : 'unpaid');
                  setEditPaymentSale(null);
                }}>
                  💰 {fullyPaid ? 'Clear Debt' : 'Save Payment'}
                </Button>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
