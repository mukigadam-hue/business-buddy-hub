import BulkCleanupButton from '@/components/BulkCleanupButton';
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
import { Plus, Trash2, Wrench, Receipt as ReceiptIcon, Package, ScanLine } from 'lucide-react';
import Receipt from '@/components/Receipt';
import BarcodeScanner from '@/components/BarcodeScanner';
import { toast } from 'sonner';
import type { ServiceRecord } from '@/context/BusinessContext';
import AdSpace from '@/components/AdSpace';
import RecycleDeleteButton from '@/components/RecycleDeleteButton';
import CustomerNameInput, { buildCustomerStats } from '@/components/CustomerNameInput';
import CustomerGroupedList from '@/components/CustomerGroupedList';

import { toSentenceCase, toTitleCase } from '@/lib/utils';

const SERVICE_TYPES = [
  'Equipment Repair', 'Machine Maintenance', 'Custom Manufacturing',
  'Welding', 'Assembly', 'Testing & Quality Check', 'Installation',
  'Calibration', 'Consultation', 'Other',
];

export default function FactoryServices() {
  const { t } = useTranslation();
  const { services, stock, addService, saveReceipt, currentBusiness, updateServicePayment } = useBusiness();
  const { fmt } = useCurrency();
  const [form, setForm] = useState({ service_name: '', description: '', cost: '', customer_name: '', seller_name: '' });
  const [receiptService, setReceiptService] = useState<ServiceRecord | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'partial' | 'unpaid'>('paid');
  const [amountPaid, setAmountPaid] = useState('');
  const [editPaymentService, setEditPaymentService] = useState<ServiceRecord | null>(null);
  const [editAmountPaid, setEditAmountPaid] = useState('');

  const [itemsUsed, setItemsUsed] = useState<{ stock_item_id: string; item_name: string; category: string; quality: string; quantity: number; unit_price: number; subtotal: number }[]>([]);
  const [selectedStock, setSelectedStock] = useState('');
  const [itemQty, setItemQty] = useState('1');
  const activeStock = stock.filter(s => !s.deleted_at && s.quantity > 0);

  const canSubmit = form.service_name.trim() && form.customer_name.trim() && form.seller_name.trim();

  function addUsedItem() {
    const stockItem = activeStock.find(s => s.id === selectedStock);
    if (!stockItem) return;
    const qty = parseInt(itemQty) || 1;
    setItemsUsed(prev => [...prev, {
      stock_item_id: stockItem.id, item_name: stockItem.name, category: stockItem.category,
      quality: stockItem.quality, quantity: qty, unit_price: Number(stockItem.retail_price),
      subtotal: qty * Number(stockItem.retail_price),
    }]);
    setSelectedStock(''); setItemQty('1');
  }

  function handleBarcodeScan(code: string) {
    const match = activeStock.find(s => s.barcode && s.barcode === code);
    if (match) { setSelectedStock(match.id); toast.success(t('factoryUI.foundColon', { name: match.name })); }
    else { toast.error(t('factoryUI.noItemForBarcodeColon', { code })); }
  }

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
      { service_name: toSentenceCase(form.service_name.trim()), description: toSentenceCase(form.description.trim()), cost: totalCost, customer_name: toTitleCase(form.customer_name.trim()), seller_name: toTitleCase(form.seller_name.trim()), payment_status: status, amount_paid: paid, balance: bal },
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
  const [historySearch, setHistorySearch] = useState('');
  const visibleServices = (activeTab === 'today' ? todayServices : prevServices).filter(s => {
    const q = historySearch.trim().toLowerCase();
    if (!q) return true;
    return (s.service_name || '').toLowerCase().includes(q)
      || (s.customer_name || '').toLowerCase().includes(q)
      || (s.seller_name || '').toLowerCase().includes(q);
  });
  const [groupByCustomer, setGroupByCustomer] = useState(true);
  const customerStats = buildCustomerStats(
    services,
    s => s.customer_name || '',
    s => Number(s.cost) || 0,
    s => Number(s.balance) || 0,
    s => s.created_at,
  );

  function FactoryServiceCard({ s }: { s: ServiceRecord }) {
    const isOverdue = s.payment_status !== 'paid' && Number(s.balance) > 0 && (Date.now() - new Date(s.created_at).getTime()) > 3 * 24 * 60 * 60 * 1000;
    return (
      <div className={`border rounded-lg p-3 flex justify-between items-start ${isOverdue ? 'border-destructive/50 bg-destructive/5' : s.payment_status === 'partial' ? 'border-warning/40 bg-warning/5' : s.payment_status === 'unpaid' ? 'border-destructive/40 bg-destructive/5' : ''}`}>
        <div className="flex-1">
          <p className="font-medium text-sm">{s.service_name}</p>
          <p className="text-xs text-muted-foreground">👤 {s.customer_name}</p>
          <p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <PaymentBadge s={s} />
            {isOverdue && <span className="text-[10px] font-bold text-destructive animate-pulse">🔴 OVERDUE</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <span className="font-bold text-success bg-success/10 px-2 py-0.5 rounded-md text-sm tabular-nums">{fmt(Number(s.cost))}</span>
          {s.payment_status !== 'paid' && Number(s.balance) > 0 && (
            <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { setEditPaymentService(s); setEditAmountPaid(''); }}>
              💰 Pay
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setReceiptService(s)}><ReceiptIcon className="h-3.5 w-3.5" /></Button>
          <RecycleDeleteButton table="services" recordId={s.id} />
        </div>
      </div>
    );
  }



  function PaymentBadge({ s }: { s: ServiceRecord }) {
    if (s.payment_status === 'paid' || !s.payment_status || Number(s.balance) <= 0) {
      return <span className="text-[10px] font-semibold text-success bg-success/10 px-1.5 py-0.5 rounded">✅ {t('invoice.receipt')}</span>;
    }
    if (s.payment_status === 'partial') {
      return <span className="text-[10px] font-semibold text-warning bg-warning/10 px-1.5 py-0.5 rounded">📄 {t('invoice.invoice')} · {t('invoice.balance')}: {fmt(Number(s.balance))} ({t('invoice.paid')} {fmt(Number(s.amount_paid))})</span>;
    }
    return <span className="text-[10px] font-semibold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">📄 {t('invoice.invoice')} · {t('invoice.balance')}: {fmt(Number(s.balance))}</span>;
  }

  return (
    <div className="space-y-6">
      <BarcodeScanner open={scannerOpen} onOpenChange={setScannerOpen} onScan={handleBarcodeScan} />
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Wrench className="h-6 w-6" /> {t('services.title')}</h1>
        <BulkCleanupButton table="services" />
      </div>

      <Card className="shadow-card">
        <CardContent className="p-4">
          <h2 className="text-base font-semibold mb-3">{t('factoryUI.recordService')}</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3 p-3 bg-muted/40 rounded-lg border">
              <div><Label className="text-xs font-semibold text-destructive">{t('factoryUI.customer')} *</Label><CustomerNameInput value={form.customer_name} onChange={v => setForm(f => ({ ...f, customer_name: v }))} customers={customerStats} required /></div>
              <div><Label className="text-xs font-semibold text-destructive">{t('factoryUI.seller')} *</Label><Input value={form.seller_name} onChange={e => setForm(f => ({ ...f, seller_name: e.target.value }))} required /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('factoryUI.serviceType')}</Label>
                <Select value={form.service_name} onValueChange={v => setForm(f => ({ ...f, service_name: v }))}>
                  <SelectTrigger><SelectValue placeholder={t('factoryUI.selectService')} /></SelectTrigger>
                  <SelectContent>{SERVICE_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>{t('factoryUI.serviceFee')}</Label><Input type="number" min="0" step="0.01" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} /></div>
            </div>
            <div><Label>{t('factoryUI.description')}</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>

            {/* Parts used */}
            <div className="border rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Package className="h-3.5 w-3.5" /> {t('factoryUI.partsMaterialsUsed')}</p>
              <div className="flex flex-wrap gap-2 items-end">
                <div className="flex-1 min-w-[180px]">
                  <div className="flex gap-1.5">
                    <Select value={selectedStock} onValueChange={setSelectedStock}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder={t('factoryUI.choosePart')} /></SelectTrigger>
                      <SelectContent>{activeStock.map(s => <SelectItem key={s.id} value={s.id}>{s.name}{s.category ? ` · ${s.category}` : ''} ({t('factoryUI.qty').toLowerCase()}: {s.quantity})</SelectItem>)}</SelectContent>
                    </Select>
                    <Button type="button" variant="outline" size="icon" className="shrink-0 h-9 w-9" onClick={() => setScannerOpen(true)} title={t('factoryUI.scanBarcode')}>
                      <ScanLine className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="w-16"><Input type="number" min="1" value={itemQty} onChange={e => setItemQty(e.target.value)} /></div>
                <Button type="button" size="sm" variant="outline" onClick={addUsedItem} disabled={!selectedStock}><Plus className="h-3.5 w-3.5" /></Button>
              </div>
              {itemsUsed.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm bg-muted/30 rounded px-2 py-1">
                  <span>{item.item_name} × {item.quantity}</span>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums text-xs">{fmt(item.subtotal)}</span>
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setItemsUsed(prev => prev.filter((_, idx) => idx !== i))}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {totalCost > 0 && (
              <div className="flex justify-between items-center p-2 bg-success/5 rounded-lg border border-success/20">
                <span className="text-sm font-medium">{t('factoryUI.total')}</span>
                <span className="font-bold text-success tabular-nums">{fmt(totalCost)}</span>
              </div>
            )}

            {/* Payment Status */}
            {totalCost > 0 && (
              <div className="p-3 bg-muted/40 rounded-lg border space-y-2">
                <Label className="text-xs font-semibold">💰 Payment Status</Label>
                <div className="flex gap-2 flex-wrap">
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <Label className="text-xs whitespace-nowrap">Amount Paid:</Label>
                    <Input type="number" min="0" step="0.01" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} placeholder="0.00" className="w-32" />
                    <span className="text-xs text-muted-foreground">Balance: <span className="font-bold text-destructive">{fmt(totalCost - (parseFloat(amountPaid) || 0))}</span></span>
                  </div>
                )}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={!canSubmit}>
              <Wrench className="h-4 w-4 mr-2" />{t('factoryUI.recordService')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <AdSpace variant="banner" />

      {/* History */}
      <div className="flex gap-2">
        <button onClick={() => setActiveTab('today')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'today' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{t('factoryUI.today')} ({todayServices.length})</button>
        <button onClick={() => setActiveTab('previous')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'previous' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{t('factoryUI.previous')} ({prevServices.length})</button>
      </div>
      <Input
        value={historySearch}
        onChange={e => setHistorySearch(e.target.value)}
        placeholder="🔍 Search by service or customer…"
        className="h-9"
      />

      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-end mb-3">
            <button
              type="button"
              onClick={() => setGroupByCustomer(v => !v)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${groupByCustomer ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              👤 {groupByCustomer ? 'Grouped by customer' : 'Group by customer'}
            </button>
          </div>
          {visibleServices.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('factoryUI.noServicesYet')}</p>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {groupByCustomer ? (
                <CustomerGroupedList
                  records={visibleServices}
                  getName={s => s.customer_name || ''}
                  getDate={s => s.created_at}
                  getTotal={s => Number(s.cost) || 0}
                  getBalance={s => Number(s.balance) || 0}
                  defaultExpanded={activeTab === 'today'}
                  renderRecord={s => <FactoryServiceCard s={s} />}
                />
              ) : visibleServices.map(s => <FactoryServiceCard key={s.id} s={s} />)}
            </div>
          )}
        </CardContent>
      </Card>


      <Dialog open={!!receiptService} onOpenChange={o => { if (!o) { setReceiptService(null); import('@/lib/interstitialAd').then(m => m.triggerInterstitial('close-service-receipt')); } }}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t('factoryUI.serviceReceipt')}</DialogTitle></DialogHeader>
          {receiptService && (
            <Receipt
              items={[{ itemName: receiptService.service_name, category: 'Service', quality: receiptService.description || '-', quantity: 1, priceType: 'service', unitPrice: Number(receiptService.cost), subtotal: Number(receiptService.cost) }]}
              grandTotal={Number(receiptService.cost)}
              amountPaid={Number(receiptService.amount_paid ?? receiptService.cost)}
              paymentStatus={receiptService.payment_status}
              buyerName={receiptService.customer_name} sellerName={receiptService.seller_name}
              date={receiptService.created_at} type="service"
              businessInfo={currentBusiness ? { name: currentBusiness.name, address: currentBusiness.address, contact: currentBusiness.contact, email: currentBusiness.email } : undefined}
              verifyId={receiptService.id}
              verifyType="service"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Update Payment Dialog */}
      <Dialog open={!!editPaymentService} onOpenChange={o => { if (!o) setEditPaymentService(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Update Payment — {editPaymentService?.customer_name}</DialogTitle></DialogHeader>
          {editPaymentService && (() => {
            const total = Number(editPaymentService.cost);
            const previouslyPaid = Number(editPaymentService.amount_paid || 0);
            const remaining = Math.max(0, total - previouslyPaid);
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
                {fullyPaid && <p className="text-sm font-semibold text-success text-center">✅ Debt fully cleared</p>}
                {!fullyPaid && payingNow > 0 && <p className="text-sm text-center">New Balance: <span className="font-bold text-destructive">{fmt(newBalance)}</span></p>}
                <Button className="w-full" onClick={async () => {
                  await updateServicePayment(editPaymentService.id, newTotal, fullyPaid ? 'paid' : newTotal > 0 ? 'partial' : 'unpaid');
                  setEditPaymentService(null);
                }}>💰 {fullyPaid ? 'Clear Debt' : 'Save Payment'}</Button>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
