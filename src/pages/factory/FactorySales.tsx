import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBusiness } from '@/context/BusinessContext';
import { useCurrency } from '@/hooks/useCurrency';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, TrendingUp, Receipt as ReceiptIcon, ScanLine, Search } from 'lucide-react';
import Receipt from '@/components/Receipt';
import BarcodeScanner from '@/components/BarcodeScanner';
import { toast } from 'sonner';
import type { Sale } from '@/context/BusinessContext';
import AdSpace from '@/components/AdSpace';
import { BulkPackagingFields } from '@/components/BulkPackagingInfo';
import RecycleDeleteButton from '@/components/RecycleDeleteButton';

import { toSentenceCase, toTitleCase } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useSubmitLock } from '@/hooks/useSubmitLock';

export default function FactorySales() {
  const { t } = useTranslation();
  const { stock, sales, addSale, saveReceipt, currentBusiness, updateSalePayment, userRole } = useBusiness();
  const { user } = useAuth();
  const { fmt } = useCurrency();
  const { locked: submitLocked, withLock } = useSubmitLock();

  const userFullName = user?.user_metadata?.full_name || '';
  const roleLabel = userRole === 'owner' ? '(Owner)' : userRole === 'admin' ? '(Admin)' : '(Worker)';

  const activeProducts = stock.filter(s => !s.deleted_at);

  const [items, setItems] = useState<{
    stock_item_id: string; item_name: string; category: string; quality: string;
    quantity: number; price_type: string; unit_price: number; subtotal: number;
    serial_numbers?: string; custom_price?: number;
  }[]>([]);
  const [serialInput, setSerialInput] = useState('');

  const [customerName, setCustomerName] = useState('');
  const [sellerName, setSellerName] = useState(userFullName);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [qty, setQty] = useState('1');
  const [priceType, setPriceType] = useState<'wholesale' | 'retail'>('retail');
  const [customPrice, setCustomPrice] = useState('');
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'partial' | 'unpaid'>('paid');
  const [amountPaid, setAmountPaid] = useState('');
  const [editPaymentSale, setEditPaymentSale] = useState<Sale | null>(null);
  const [editAmountPaid, setEditAmountPaid] = useState('');
  const [stockSearch, setStockSearch] = useState('');

  // Bulk packaging
  const [bulkPkg, setBulkPkg] = useState({ pieces_per_carton: '0', cartons_per_box: '0', boxes_per_container: '0' });
  const [bulkQuantity, setBulkQuantity] = useState('');

  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'debt'>('all');
  const [activeTab, setActiveTab] = useState<'today' | 'previous'>('today');
  const todaySales = sales.filter(s => new Date(s.created_at).toDateString() === new Date().toDateString());
  const prevSales = sales.filter(s => new Date(s.created_at).toDateString() !== new Date().toDateString());
  const currentSalesList = activeTab === 'today' ? todaySales : prevSales;
  const filteredSales = currentSalesList.filter(s => {
    if (paymentFilter === 'all') return true;
    if (paymentFilter === 'paid') return s.payment_status === 'paid';
    return s.payment_status === 'partial' || s.payment_status === 'unpaid';
  });

  // Filter stock items by search text
  const filteredStock = activeProducts.filter(s => {
    if (s.quantity <= 0) return false;
    if (!stockSearch) return true;
    const q = stockSearch.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q) || (s.quality || '').toLowerCase().includes(q);
  });

  function handleSelectProduct(id: string) {
    setSelectedProduct(id);
    setStockSearch('');
    const item = activeProducts.find(p => p.id === id);
    if (item) {
      setBulkPkg({
        pieces_per_carton: String(item.pieces_per_carton || 0),
        cartons_per_box: String(item.cartons_per_box || 0),
        boxes_per_container: String(item.boxes_per_container || 0),
      });
      setBulkQuantity(qty);
    }
  }

  function addItem() {
    const product = activeProducts.find(p => p.id === selectedProduct);
    if (!product) return;
    const finalQty = parseInt(bulkPkg.pieces_per_carton) > 0 ? (parseFloat(bulkQuantity) || parseFloat(qty) || 1) : (parseFloat(qty) || 1);
    const basePrice = priceType === 'wholesale' ? Number(product.wholesale_price) : Number(product.retail_price);
    const unitPrice = customPrice.trim() ? (parseFloat(customPrice) || basePrice) : basePrice;
    setItems(prev => [...prev, {
      stock_item_id: product.id, item_name: product.name, category: product.category,
      quality: product.quality, quantity: finalQty,
      price_type: customPrice.trim() ? 'custom' : priceType,
      unit_price: unitPrice, subtotal: finalQty * unitPrice,
      serial_numbers: serialInput.trim() || undefined,
      custom_price: customPrice.trim() ? unitPrice : undefined,
    }]);
    setSelectedProduct(''); setQty('1'); setSerialInput(''); setCustomPrice(''); setStockSearch('');
    setBulkPkg({ pieces_per_carton: '0', cartons_per_box: '0', boxes_per_container: '0' });
    setBulkQuantity('');
  }

  function removeItem(idx: number) { setItems(prev => prev.filter((_, i) => i !== idx)); }

  const grandTotal = items.reduce((sum, i) => sum + i.subtotal, 0);
  const canSave = items.length > 0 && customerName.trim() && sellerName.trim();

  function handleBarcodeScan(code: string) {
    const match = activeProducts.find(s => s.barcode && s.barcode === code && s.quantity > 0);
    if (match) { setSelectedProduct(match.id); toast.success(`Found: ${match.name}`); }
    else { toast.error(`No product found for barcode: ${code}`); }
  }

  async function handleSave() {
    if (!canSave) return;

    const paidAmt = paymentStatus === 'paid' ? grandTotal : (parseFloat(amountPaid) || 0);
    const sale = await addSale(
      items.map(i => ({ ...i, serial_numbers: i.serial_numbers || '' })),
      grandTotal, toTitleCase(sellerName.trim()), toTitleCase(customerName.trim()), undefined, undefined, paymentStatus, paidAmt
    );
    if (sale && currentBusiness) {
      const receiptItems = items.map(i => ({
        itemName: i.item_name, category: i.category, quality: i.quality,
        quantity: i.quantity, priceType: i.price_type, unitPrice: i.unit_price, subtotal: i.subtotal,
        serialNumbers: i.serial_numbers || undefined,
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
    setItems([]); setCustomerName(''); setSellerName(userFullName); setPaymentStatus('paid'); setAmountPaid('');
  }

  return (
    <div className="space-y-6">
      <BarcodeScanner open={scannerOpen} onOpenChange={setScannerOpen} onScan={handleBarcodeScan} />
      <h1 className="text-2xl font-bold flex items-center gap-2"><TrendingUp className="h-6 w-6" /> {t('sales.title')}</h1>

      <Card className="shadow-card">
        <CardContent className="p-4 space-y-4">
          <h2 className="text-base font-semibold">Sell Finished Products</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-muted/40 rounded-lg border">
            <div>
              <Label className="text-xs font-semibold text-destructive">Customer (Buyer) *</Label>
              <Input value={customerName} onChange={e => setCustomerName(e.target.value)} onBlur={() => setCustomerName(toTitleCase(customerName))} placeholder="Customer name" required />
            </div>
            <div>
              <Label className="text-xs font-semibold text-destructive">Seller * {roleLabel}</Label>
              <Input value={sellerName} onChange={e => setSellerName(e.target.value)} onBlur={() => setSellerName(toTitleCase(sellerName))} placeholder="Your name (auto-filled)" required />
              {currentBusiness && <p className="text-[10px] text-muted-foreground mt-0.5">📍 {currentBusiness.name}</p>}
            </div>
          </div>

          {/* Stock Items with Search */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">📦 Products</p>
            <div className="space-y-3">
              <div className="w-full">
                <Label className="flex items-center gap-1.5"><Search className="h-3.5 w-3.5" /> Search & Select Item</Label>
                <Input
                  placeholder="Type to search items by name, category, quality..."
                  value={stockSearch}
                  onChange={e => setStockSearch(e.target.value)}
                  className="mb-1.5"
                />
                <div className="flex gap-1.5">
                  <Select value={selectedProduct} onValueChange={handleSelectProduct}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select item..." />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredStock.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}{p.category ? ` · ${p.category}` : ''}{p.quality ? ` · ${p.quality}` : ''} (qty: {p.quantity})
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
                <div><Label>Qty</Label><Input type="number" min="0.01" step="0.01" value={qty} onChange={e => setQty(e.target.value)}
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
                  <Label>Alt. Price <span className="text-[10px] text-muted-foreground">(bargain)</span></Label>
                  <Input type="number" min="0" step="0.01" value={customPrice} onChange={e => setCustomPrice(e.target.value)} placeholder="Custom..." />
                </div>
              </div>

              <BulkPackagingFields
                piecesPerCarton={bulkPkg.pieces_per_carton}
                cartonsPerBox={bulkPkg.cartons_per_box}
                boxesPerContainer={bulkPkg.boxes_per_container}
                onChange={(field, value) => setBulkPkg(f => ({ ...f, [field]: value }))}
                onQuantityCalculated={(total) => { setQty(String(total)); setBulkQuantity(String(total)); }}
                currentQuantity={qty}
              />

              {/* Preview */}
              {selectedProduct && (() => {
                const si = activeProducts.find(s => s.id === selectedProduct);
                if (!si) return null;
                const basePrice = priceType === 'wholesale' ? Number(si.wholesale_price) : Number(si.retail_price);
                const effectivePrice = customPrice.trim() ? (parseFloat(customPrice) || basePrice) : basePrice;
                const totalQty = parseFloat(qty) || 0;
                return (
                  <div className="text-xs text-muted-foreground bg-muted/40 rounded p-2">
                    {customPrice.trim() && <span className="text-warning font-medium mr-2">⚡ Custom price: {fmt(effectivePrice)}</span>}
                    Subtotal: <span className="font-bold text-foreground">{fmt(totalQty * effectivePrice)}</span>
                  </div>
                );
              })()}
              <Button onClick={addItem} disabled={!selectedProduct} className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-1" />Add Item</Button>
            </div>
            {selectedProduct && (
              <div className="mt-2">
                <Label className="text-xs text-muted-foreground">Serial Number (optional)</Label>
                <Input value={serialInput} onChange={e => setSerialInput(e.target.value)} placeholder="e.g. IMEI, S/N..." className="max-w-xs" />
              </div>
            )}
          </div>

          {/* Summary Table */}
          {items.length > 0 && (
            <>
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead><TableHead>Category</TableHead><TableHead>Quality</TableHead>
                      <TableHead>Type</TableHead><TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead><TableHead className="text-right">Subtotal</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, i) => (
                      <TableRow key={`item-${i}`}>
                        <TableCell className="font-medium">{item.item_name}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>{item.quality}</TableCell>
                        <TableCell className="capitalize text-xs">{item.price_type}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmt(item.unit_price)}</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">{fmt(item.subtotal)}</TableCell>
                        <TableCell><Button variant="ghost" size="icon" onClick={() => removeItem(i)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></TableCell>
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
              <Button onClick={() => withLock(handleSave)} className="w-full" disabled={!canSave || submitLocked}>
                <TrendingUp className="h-4 w-4 mr-2" />{submitLocked ? 'Saving...' : `Complete Sale — ${fmt(grandTotal)}`}
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

      {/* Payment filter */}
      <div className="flex gap-1.5 flex-wrap">
        {(['all', 'paid', 'debt'] as const).map(f => (
          <button key={f} onClick={() => setPaymentFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${paymentFilter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            {f === 'all' ? '📋 All' : f === 'paid' ? '✅ Paid' : '❌ Debts'}
          </button>
        ))}
      </div>

      <Card className="shadow-card">
        <CardContent className="p-4">
          {filteredSales.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sales matching filter.</p>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {filteredSales.map(s => (
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
                        </span>
                        <span className="tabular-nums">{fmt(Number(item.subtotal))}</span>
                      </div>
                    ))}
                  </div>
                  {s.payment_status !== 'paid' && (
                    <Button size="sm" variant="outline" className="mt-2" onClick={() => { setEditPaymentSale(s); setEditAmountPaid(''); }}>
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
