import { useState } from 'react';
import { useBusiness } from '@/context/BusinessContext';
import { useCurrency } from '@/hooks/useCurrency';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Wrench, Receipt as ReceiptIcon, Plus, Trash2, Package } from 'lucide-react';
import Receipt from '@/components/Receipt';
import type { ServiceRecord } from '@/context/BusinessContext';
import AdSpace from '@/components/AdSpace';

function toSentenceCase(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export default function ServicesPage() {
  const { services, stock, addService, saveReceipt, currentBusiness, updateServicePayment } = useBusiness();
  const { fmt } = useCurrency();
  const [form, setForm] = useState({ service_name: '', description: '', cost: '', customer_name: '', seller_name: '' });
  const [receiptService, setReceiptService] = useState<ServiceRecord | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'partial' | 'unpaid'>('paid');
  const [amountPaid, setAmountPaid] = useState('');
  const [editPaymentService, setEditPaymentService] = useState<ServiceRecord | null>(null);
  const [editAmountPaid, setEditAmountPaid] = useState('');

  // Items used from stock
  const [itemsUsed, setItemsUsed] = useState<{ stock_item_id: string; item_name: string; category: string; quality: string; quantity: number; unit_price: number; subtotal: number }[]>([]);
  const [selectedStock, setSelectedStock] = useState('');
  const [itemQty, setItemQty] = useState('1');

  const activeStock = stock.filter(s => !s.deleted_at && s.quantity > 0);

  const canSubmit = form.service_name.trim() && form.customer_name.trim() && form.seller_name.trim();

  function addUsedItem() {
    const stockItem = activeStock.find(s => s.id === selectedStock);
    if (!stockItem) return;
    const qty = parseInt(itemQty) || 1;
    const maxQty = stockItem.quantity - itemsUsed.filter(u => u.stock_item_id === stockItem.id).reduce((s, u) => s + u.quantity, 0);
    if (qty > maxQty) return;
    setItemsUsed(prev => [...prev, {
      stock_item_id: stockItem.id, item_name: stockItem.name, category: stockItem.category,
      quality: stockItem.quality, quantity: qty, unit_price: Number(stockItem.retail_price),
      subtotal: qty * Number(stockItem.retail_price),
    }]);
    setSelectedStock(''); setItemQty('1');
  }

  function removeUsedItem(idx: number) { setItemsUsed(prev => prev.filter((_, i) => i !== idx)); }

  const itemsTotal = itemsUsed.reduce((sum, i) => sum + i.subtotal, 0);
  const serviceCost = parseFloat(form.cost) || 0;
  const totalCost = serviceCost + itemsTotal;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const paid = paymentStatus === 'paid' ? totalCost : (parseFloat(amountPaid) || 0);
    const bal = Math.max(0, totalCost - paid);
    const status = bal <= 0 ? 'paid' : (paid > 0 ? 'partial' : 'unpaid');

    const newService = await addService(
      {
        service_name: toSentenceCase(form.service_name.trim()),
        description: form.description.trim(),
        cost: totalCost,
        customer_name: toSentenceCase(form.customer_name.trim()),
        seller_name: toSentenceCase(form.seller_name.trim()),
        payment_status: status,
        amount_paid: paid,
        balance: bal,
      },
      itemsUsed.length > 0 ? itemsUsed : undefined
    );
    if (newService && currentBusiness) {
      const receiptItems = [
        { itemName: newService.service_name, category: 'Service', quality: newService.description || '-', quantity: 1, priceType: 'service', unitPrice: serviceCost, subtotal: serviceCost },
        ...itemsUsed.map(i => ({ itemName: `[Part] ${i.item_name}`, category: i.category, quality: i.quality, quantity: i.quantity, priceType: 'part', unitPrice: i.unit_price, subtotal: i.subtotal })),
      ];
      if (status === 'paid') {
        await saveReceipt({
          business_id: currentBusiness.id, receipt_type: 'service', transaction_id: newService.id,
          buyer_name: newService.customer_name, seller_name: newService.seller_name,
          grand_total: totalCost, items: receiptItems,
          business_info: { name: currentBusiness.name, address: currentBusiness.address, contact: currentBusiness.contact, email: currentBusiness.email },
          code: null,
        });
      }
      setReceiptService({ ...newService, cost: totalCost, payment_status: status, amount_paid: paid, balance: bal });
    }
    setForm({ service_name: '', description: '', cost: '', customer_name: '', seller_name: '' });
    setItemsUsed([]); setPaymentStatus('paid'); setAmountPaid('');
  }

  const todayServices = services.filter(s => new Date(s.created_at).toDateString() === new Date().toDateString());
  const prevServices = services.filter(s => new Date(s.created_at).toDateString() !== new Date().toDateString());
  const [activeTab, setActiveTab] = useState<'today' | 'previous'>('today');

  function PaymentBadge({ s }: { s: ServiceRecord }) {
    if (s.payment_status === 'paid' || !s.payment_status || Number(s.balance) <= 0) {
      return <span className="text-[10px] font-semibold text-success bg-success/10 px-1.5 py-0.5 rounded">✅ Paid</span>;
    }
    if (s.payment_status === 'partial') {
      return <span className="text-[10px] font-semibold text-warning bg-warning/10 px-1.5 py-0.5 rounded">⚠️ Partial — owes {fmt(Number(s.balance))}</span>;
    }
    return <span className="text-[10px] font-semibold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">❌ Credit — {fmt(Number(s.balance))}</span>;
  }

  function ServiceCard({ s }: { s: ServiceRecord }) {
    const isOverdue = s.payment_status !== 'paid' && Number(s.balance) > 0 && (Date.now() - new Date(s.created_at).getTime()) > 3 * 24 * 60 * 60 * 1000;
    return (
      <div className={`border rounded-lg p-3 flex justify-between items-start ${isOverdue ? 'border-destructive/50 bg-destructive/5' : ''}`}>
        <div className="flex-1">
          <p className="font-medium text-sm">{s.service_name}</p>
          <p className="text-xs text-muted-foreground">👤 {s.customer_name} · Seller: {s.seller_name}</p>
          {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
          <div className="flex items-center gap-2 mt-1">
            <PaymentBadge s={s} />
            {isOverdue && <span className="text-[10px] font-bold text-destructive animate-pulse">🔴 OVERDUE</span>}
          </div>
          <p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <span className="font-bold text-success bg-success/10 px-2 py-0.5 rounded-md text-sm tabular-nums">{fmt(Number(s.cost))}</span>
          {s.payment_status !== 'paid' && Number(s.balance) > 0 && (
            <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { setEditPaymentService(s); setEditAmountPaid(String(s.amount_paid || 0)); }}>
              💰 Pay
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setReceiptService(s)}>
            <ReceiptIcon className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Services</h1>
      <Card className="shadow-card">
        <CardContent className="p-4">
          <h2 className="text-base font-semibold mb-3">Record Service</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3 p-3 bg-muted/40 rounded-lg border">
              <div>
                <Label className="text-xs font-semibold text-destructive">Customer (Buyer) *</Label>
                <Input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))}
                  onBlur={() => setForm(f => ({ ...f, customer_name: toSentenceCase(f.customer_name) }))} placeholder="Customer name" required />
              </div>
              <div>
                <Label className="text-xs font-semibold text-destructive">Seller *</Label>
                <Input value={form.seller_name} onChange={e => setForm(f => ({ ...f, seller_name: e.target.value }))}
                  onBlur={() => setForm(f => ({ ...f, seller_name: toSentenceCase(f.seller_name) }))} placeholder="Your name" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Service Name</Label>
                <Input value={form.service_name} onChange={e => setForm(f => ({ ...f, service_name: e.target.value }))}
                  onBlur={() => setForm(f => ({ ...f, service_name: toSentenceCase(f.service_name) }))} required />
              </div>
              <div>
                <Label>Service Fee (Labour)</Label>
                <Input type="number" min="0" step="0.01" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} placeholder="Labour cost" />
              </div>
            </div>
            <div><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>

            {/* Items Used from Stock */}
            <div className="border rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Package className="h-3.5 w-3.5" /> Items/Parts Used (from Stock)
              </p>
              <div className="flex flex-wrap gap-2 items-end">
                <div className="flex-1 min-w-[180px]">
                  <Label className="text-xs">Select Part</Label>
                  <Select value={selectedStock} onValueChange={setSelectedStock}>
                    <SelectTrigger><SelectValue placeholder="Choose from stock..." /></SelectTrigger>
                    <SelectContent>
                      {activeStock.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}{s.category ? ` · ${s.category}` : ''}{s.quality ? ` · ${s.quality}` : ''} (qty: {s.quantity})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-16"><Label className="text-xs">Qty</Label><Input type="number" min="1" value={itemQty} onChange={e => setItemQty(e.target.value)} /></div>
                <Button type="button" size="sm" variant="outline" onClick={addUsedItem} disabled={!selectedStock}><Plus className="h-3.5 w-3.5 mr-1" />Add</Button>
              </div>
              {itemsUsed.length > 0 && (
                <div className="space-y-1 mt-2">
                  {itemsUsed.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm bg-muted/30 rounded px-2 py-1">
                      <span>{item.item_name} × {item.quantity}{item.category && <span className="text-xs text-muted-foreground ml-1">· {item.category}</span>}</span>
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums font-medium text-xs">{fmt(item.subtotal)}</span>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeUsedItem(i)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                      </div>
                    </div>
                  ))}
                  <div className="text-xs text-muted-foreground text-right">Parts total: {fmt(itemsTotal)}</div>
                </div>
              )}
            </div>

            {/* Total */}
            {(serviceCost > 0 || itemsUsed.length > 0) && (
              <div className="flex justify-between items-center p-2 bg-success/5 rounded-lg border border-success/20">
                <span className="text-sm font-medium">Total Cost (Labour + Parts)</span>
                <span className="font-bold text-success tabular-nums">{fmt(totalCost)}</span>
              </div>
            )}

            {/* Payment Status */}
            {totalCost > 0 && (
              <div className="p-3 bg-muted/40 rounded-lg border space-y-2">
                <Label className="text-xs font-semibold">💰 Payment Status</Label>
                <div className="flex gap-2">
                  {(['paid', 'partial', 'unpaid'] as const).map(s => (
                    <button key={s} type="button" onClick={() => setPaymentStatus(s)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${paymentStatus === s
                        ? s === 'paid' ? 'bg-success text-success-foreground' : s === 'partial' ? 'bg-warning text-warning-foreground' : 'bg-destructive text-destructive-foreground'
                        : 'bg-muted text-muted-foreground'}`}>
                      {s === 'paid' ? '✅ Paid Full' : s === 'partial' ? '⚠️ Paid Partial' : '❌ Credit'}
                    </button>
                  ))}
                </div>
                {paymentStatus !== 'paid' && (
                  <div className="flex items-center gap-2">
                    <Label className="text-xs whitespace-nowrap">Amount Paid:</Label>
                    <Input type="number" min="0" step="0.01" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} placeholder="0.00" className="w-32" />
                    <span className="text-xs text-muted-foreground">Balance: <span className="font-bold text-destructive">{fmt(totalCost - (parseFloat(amountPaid) || 0))}</span></span>
                  </div>
                )}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={!canSubmit}>
              <Wrench className="h-4 w-4 mr-2" />Record Service — {totalCost > 0 ? fmt(totalCost) : ''}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* History Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setActiveTab('today')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'today' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
          Today ({todayServices.length})
        </button>
        <button onClick={() => setActiveTab('previous')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'previous' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
          Previous ({prevServices.length})
        </button>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-4">
          {(activeTab === 'today' ? todayServices : prevServices).length === 0 ? (
            <p className="text-sm text-muted-foreground">No services yet.</p>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {(activeTab === 'today' ? todayServices : prevServices).map(s => (
                <ServiceCard key={s.id} s={s} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!receiptService} onOpenChange={o => { if (!o) setReceiptService(null); }}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Service Receipt</DialogTitle></DialogHeader>
          {receiptService && (
            <Receipt
              items={[{ itemName: receiptService.service_name, category: 'Service', quality: receiptService.description || '-', quantity: 1, priceType: 'service', unitPrice: Number(receiptService.cost), subtotal: Number(receiptService.cost) }]}
              grandTotal={Number(receiptService.cost)} buyerName={receiptService.customer_name} sellerName={receiptService.seller_name}
              date={receiptService.created_at} type="service"
              businessInfo={currentBusiness ? { name: currentBusiness.name, address: currentBusiness.address, contact: currentBusiness.contact, email: currentBusiness.email } : undefined}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Update Payment Dialog */}
      <Dialog open={!!editPaymentService} onOpenChange={o => { if (!o) setEditPaymentService(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Update Payment — {editPaymentService?.customer_name}</DialogTitle></DialogHeader>
          {editPaymentService && (
            <div className="space-y-3">
              <p className="text-sm">Total: <span className="font-bold">{fmt(Number(editPaymentService.cost))}</span></p>
              <p className="text-sm">Previously Paid: <span className="font-bold">{fmt(Number(editPaymentService.amount_paid))}</span></p>
              <div><Label>New Total Amount Paid</Label><Input type="number" min="0" step="0.01" value={editAmountPaid} onChange={e => setEditAmountPaid(e.target.value)} /></div>
              <p className="text-sm">New Balance: <span className="font-bold text-destructive">{fmt(Number(editPaymentService.cost) - (parseFloat(editAmountPaid) || 0))}</span></p>
              <Button className="w-full" onClick={async () => {
                const amt = parseFloat(editAmountPaid) || 0;
                await updateServicePayment(editPaymentService.id, amt, amt >= Number(editPaymentService.cost) ? 'paid' : amt > 0 ? 'partial' : 'unpaid');
                setEditPaymentService(null);
              }}>💰 Save Payment</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}