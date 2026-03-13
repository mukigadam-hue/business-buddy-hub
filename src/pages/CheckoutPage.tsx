import { useState, useRef } from 'react';
import { useBusiness } from '@/context/BusinessContext';
import { useCurrency } from '@/hooks/useCurrency';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, CreditCard, Smartphone, Upload, CheckCircle, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import Receipt from '@/components/Receipt';
import type { Order } from '@/context/BusinessContext';
import AdSpace from '@/components/AdSpace';

import { toSentenceCase, toTitleCase } from '@/lib/utils';

export default function CheckoutPage() {
  const { stock, addOrder, saveReceipt, currentBusiness } = useBusiness();
  const { fmt } = useCurrency();

  const activeProducts = stock.filter(s => !s.deleted_at && s.quantity > 0);

  const [items, setItems] = useState<{
    item_name: string; category: string; quality: string;
    quantity: number; price_type: string; unit_price: number; subtotal: number;
  }[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [qty, setQty] = useState('1');
  const [priceType, setPriceType] = useState('retail');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mobile_money' | 'card'>('mobile_money');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function addItem() {
    const product = activeProducts.find(p => p.id === selectedProduct);
    if (!product) return;
    const q = parseInt(qty) || 1;
    const price = priceType === 'wholesale' ? Number(product.wholesale_price) : Number(product.retail_price);
    setItems(prev => [...prev, {
      item_name: product.name, category: product.category,
      quality: product.quality, quantity: q, price_type: priceType,
      unit_price: price, subtotal: q * price,
    }]);
    setSelectedProduct(''); setQty('1');
  }

  function removeItem(idx: number) { setItems(prev => prev.filter((_, i) => i !== idx)); }
  const grandTotal = items.reduce((sum, i) => sum + i.subtotal, 0);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File must be under 5MB');
      return;
    }
    setProofFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setProofPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleCheckout() {
    if (!items.length || !customerName.trim()) return;
    if (paymentMethod === 'mobile_money' && !proofFile) {
      toast.error('Please upload payment proof screenshot');
      return;
    }

    setSubmitting(true);
    try {
      let proofUrl: string | null = null;

      // Upload proof if mobile money
      if (paymentMethod === 'mobile_money' && proofFile) {
        const ext = proofFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('payment-proofs')
          .upload(fileName, proofFile);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('payment-proofs')
          .getPublicUrl(fileName);
        proofUrl = urlData.publicUrl;
      }

      // Create order with payment info
      if (!currentBusiness) throw new Error('No business selected');

      const code = 'CHK-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      const orderItems = items.map(item => ({ ...item, subtotal: item.subtotal }));

      const { data: orderData, error: orderError } = await supabase.from('orders').insert({
        business_id: currentBusiness.id,
        type: 'checkout',
        customer_name: toTitleCase(customerName.trim()),
        grand_total: grandTotal,
        status: paymentMethod === 'card' || paymentMethod === 'cash' ? 'paid' : 'pending',
        code,
        payment_method: paymentMethod,
        proof_url: proofUrl,
      } as any).select().single();

      if (orderError) throw orderError;

      // Insert order items
      if (orderData) {
        const itemsToInsert = orderItems.map(item => ({
          order_id: (orderData as any).id,
          item_name: item.item_name,
          category: item.category,
          quality: item.quality,
          quantity: item.quantity,
          price_type: item.price_type,
          unit_price: item.unit_price,
          subtotal: item.subtotal,
        }));
        await supabase.from('order_items').insert(itemsToInsert as any);

        // Save receipt
        await saveReceipt({
          business_id: currentBusiness.id,
          receipt_type: 'checkout',
          transaction_id: (orderData as any).id,
          buyer_name: toTitleCase(customerName.trim()),
          seller_name: currentBusiness.name,
          grand_total: grandTotal,
          items: orderItems.map(i => ({
            itemName: i.item_name, category: i.category, quality: i.quality,
            quantity: i.quantity, priceType: i.price_type, unitPrice: i.unit_price, subtotal: i.subtotal,
          })),
          business_info: { name: currentBusiness.name, address: currentBusiness.address, contact: currentBusiness.contact, email: currentBusiness.email },
          code,
        });

        setCompletedOrder({
          id: (orderData as any).id,
          business_id: currentBusiness.id,
          type: 'checkout',
          customer_name: toTitleCase(customerName.trim()),
          grand_total: grandTotal,
          status: paymentMethod === 'card' || paymentMethod === 'cash' ? 'paid' : 'pending',
          code,
          transferred_to_sale: false,
          sharing_code: null,
          created_at: new Date().toISOString(),
          items: orderItems.map((item, idx) => ({
            id: `temp-${idx}`, order_id: (orderData as any).id,
            ...item, created_at: new Date().toISOString(),
          })),
        });
      }

      toast.success(
        paymentMethod === 'mobile_money'
          ? 'Order placed! Payment proof submitted for verification.'
          : paymentMethod === 'cash'
          ? 'Order placed! Cash payment recorded.'
          : 'Order placed and paid!'
      );
      setItems([]); setCustomerName(''); setProofFile(null); setProofPreview(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <ShoppingBag className="h-6 w-6" /> Checkout
      </h1>

      <Card className="shadow-card">
        <CardContent className="p-4 space-y-4">
          <div>
            <Label className="text-xs font-semibold text-destructive">Customer Name *</Label>
            <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Customer name" />
          </div>

          {/* Add products */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[160px]">
              <Label>Product</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger><SelectValue placeholder="Choose product..." /></SelectTrigger>
                <SelectContent>
                  {activeProducts.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}{p.category ? ` · ${p.category}` : ''} (qty: {p.quantity})
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

          {/* Items table */}
          {items.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium text-sm">{item.item_name}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmt(item.unit_price)}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{fmt(item.subtotal)}</TableCell>
                      <TableCell><Button variant="ghost" size="icon" onClick={() => removeItem(i)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={3} className="text-right font-bold">Total</TableCell>
                    <TableCell className="text-right font-bold text-lg text-success tabular-nums">{fmt(grandTotal)}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AdSpace variant="compact" />

      {/* Payment Method */}
      {items.length > 0 && (
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Payment Method</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                  paymentMethod === 'cash'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                <ShoppingBag className="h-6 w-6 text-amber-600" />
                <div className="text-left">
                  <p className="font-semibold text-sm">Cash in Hand</p>
                  <p className="text-xs text-muted-foreground">Direct cash payment</p>
                </div>
              </button>
              <button
                onClick={() => setPaymentMethod('mobile_money')}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                  paymentMethod === 'mobile_money'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                <Smartphone className="h-6 w-6 text-success" />
                <div className="text-left">
                  <p className="font-semibold text-sm">Mobile Money / M-Pesa</p>
                  <p className="text-xs text-muted-foreground">Upload payment screenshot</p>
                </div>
              </button>
              <button
                onClick={() => setPaymentMethod('card')}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                  paymentMethod === 'card'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                <CreditCard className="h-6 w-6 text-info" />
                <div className="text-left">
                  <p className="font-semibold text-sm">Credit/Debit Card</p>
                  <p className="text-xs text-muted-foreground">Pay with Stripe (if configured)</p>
                </div>
              </button>
            </div>

            {/* Mobile Money - proof upload */}
            {paymentMethod === 'mobile_money' && (
              <div className="space-y-3 p-4 bg-muted/40 rounded-lg border">
                <div>
                  <p className="text-sm font-medium mb-1">📱 Send payment to:</p>
                  <p className="text-sm text-muted-foreground">
                    {currentBusiness?.contact || 'Contact number in settings'} — <span className="font-semibold">{currentBusiness?.name}</span>
                  </p>
                  <p className="text-lg font-bold text-success mt-1">{fmt(grandTotal)}</p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-destructive">Upload Payment Screenshot *</Label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-1 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    {proofPreview ? (
                      <img src={proofPreview} alt="Payment proof" className="max-h-48 mx-auto rounded-lg" />
                    ) : (
                      <div className="space-y-2">
                        <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Tap to upload screenshot</p>
                        <p className="text-xs text-muted-foreground">PNG, JPG up to 5MB</p>
                      </div>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  {proofFile && <p className="text-xs text-success mt-1">✓ {proofFile.name}</p>}
                </div>
              </div>
            )}

            {/* Cash in Hand info */}
            {paymentMethod === 'cash' && (
              <div className="p-4 bg-amber-500/5 rounded-lg border border-amber-500/20">
                <p className="text-sm text-muted-foreground">
                  💵 Cash payment received directly. The order will be marked as <span className="font-semibold text-success">Paid</span> immediately.
                </p>
              </div>
            )}

            {/* Card payment info */}
            {paymentMethod === 'card' && (
              <div className="p-4 bg-info/5 rounded-lg border border-info/20">
                <p className="text-sm text-muted-foreground">
                  💳 Card payments via Stripe can be configured by the business owner in <span className="font-semibold">Settings</span>. 
                  If not yet configured, the order will be saved as pending.
                </p>
              </div>
            )}

            <Button
              onClick={handleCheckout}
              className="w-full h-12 text-base"
              disabled={submitting || !customerName.trim() || items.length === 0 || (paymentMethod === 'mobile_money' && !proofFile)}
            >
              {submitting ? (
                'Processing...'
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Place Order — {fmt(grandTotal)}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Completed order dialog */}
      <Dialog open={!!completedOrder} onOpenChange={o => { if (!o) setCompletedOrder(null); }}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Order Confirmation</DialogTitle></DialogHeader>
          {completedOrder && (
            <div className="space-y-4">
              <div className={`text-center p-4 rounded-lg ${
                completedOrder.status === 'paid' ? 'bg-success/10' : 'bg-warning/10'
              }`}>
                <p className="text-lg font-bold">
                  {completedOrder.status === 'paid' ? '✅ Payment Confirmed' : '⏳ Payment Under Verification'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Order Code: <span className="font-mono font-bold">{completedOrder.code}</span></p>
              </div>
              <Receipt
                items={completedOrder.items.map(i => ({
                  itemName: i.item_name, category: i.category, quality: i.quality,
                  quantity: i.quantity, priceType: i.price_type, unitPrice: Number(i.unit_price), subtotal: Number(i.subtotal),
                }))}
                grandTotal={Number(completedOrder.grand_total)}
                buyerName={completedOrder.customer_name}
                sellerName={currentBusiness?.name || ''}
                date={completedOrder.created_at}
                type="checkout"
                businessInfo={currentBusiness ? { name: currentBusiness.name, address: currentBusiness.address, contact: currentBusiness.contact, email: currentBusiness.email } : undefined}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
