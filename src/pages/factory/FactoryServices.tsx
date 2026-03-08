import { useState } from 'react';
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

import { toSentenceCase, toTitleCase } from '@/lib/utils';

const SERVICE_TYPES = [
  'Equipment Repair', 'Machine Maintenance', 'Custom Manufacturing',
  'Welding', 'Assembly', 'Testing & Quality Check', 'Installation',
  'Calibration', 'Consultation', 'Other',
];

export default function FactoryServices() {
  const { services, stock, addService, saveReceipt, currentBusiness } = useBusiness();
  const { fmt } = useCurrency();
  const [form, setForm] = useState({ service_name: '', description: '', cost: '', customer_name: '', seller_name: '' });
  const [receiptService, setReceiptService] = useState<ServiceRecord | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

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
    if (match) { setSelectedStock(match.id); toast.success(`Found: ${match.name}`); }
    else { toast.error(`No item found for barcode: ${code}`); }
  }

  const itemsTotal = itemsUsed.reduce((sum, i) => sum + i.subtotal, 0);
  const serviceCost = parseFloat(form.cost) || 0;
  const totalCost = serviceCost + itemsTotal;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const newService = await addService(
      { service_name: toSentenceCase(form.service_name.trim()), description: toSentenceCase(form.description.trim()), cost: totalCost, customer_name: toTitleCase(form.customer_name.trim()), seller_name: toTitleCase(form.seller_name.trim()), payment_status: 'paid', amount_paid: totalCost, balance: 0 },
      itemsUsed.length > 0 ? itemsUsed : undefined
    );
    if (newService && currentBusiness) {
      const receiptItems = [
        { itemName: newService.service_name, category: 'Service', quality: newService.description || '-', quantity: 1, priceType: 'service', unitPrice: serviceCost, subtotal: serviceCost },
        ...itemsUsed.map(i => ({ itemName: `[Part] ${i.item_name}`, category: i.category, quality: i.quality, quantity: i.quantity, priceType: 'part', unitPrice: i.unit_price, subtotal: i.subtotal })),
      ];
      await saveReceipt({
        business_id: currentBusiness.id, receipt_type: 'service', transaction_id: newService.id,
        buyer_name: newService.customer_name, seller_name: newService.seller_name,
        grand_total: totalCost, items: receiptItems,
        business_info: { name: currentBusiness.name, address: currentBusiness.address, contact: currentBusiness.contact, email: currentBusiness.email },
        code: null,
      });
      setReceiptService({ ...newService, cost: totalCost, payment_status: 'paid', amount_paid: totalCost, balance: 0 });
    }
    setForm({ service_name: '', description: '', cost: '', customer_name: '', seller_name: '' });
    setItemsUsed([]);
  }

  const todayServices = services.filter(s => new Date(s.created_at).toDateString() === new Date().toDateString());
  const prevServices = services.filter(s => new Date(s.created_at).toDateString() !== new Date().toDateString());
  const [activeTab, setActiveTab] = useState<'today' | 'previous'>('today');

  return (
    <div className="space-y-6">
      <BarcodeScanner open={scannerOpen} onOpenChange={setScannerOpen} onScan={handleBarcodeScan} />
      <h1 className="text-2xl font-bold flex items-center gap-2"><Wrench className="h-6 w-6" /> Factory Services</h1>

      <Card className="shadow-card">
        <CardContent className="p-4">
          <h2 className="text-base font-semibold mb-3">Record Service</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3 p-3 bg-muted/40 rounded-lg border">
              <div><Label className="text-xs font-semibold text-destructive">Customer *</Label><Input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} required /></div>
              <div><Label className="text-xs font-semibold text-destructive">Seller *</Label><Input value={form.seller_name} onChange={e => setForm(f => ({ ...f, seller_name: e.target.value }))} required /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Service Type</Label>
                <Select value={form.service_name} onValueChange={v => setForm(f => ({ ...f, service_name: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select service..." /></SelectTrigger>
                  <SelectContent>{SERVICE_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Service Fee</Label><Input type="number" min="0" step="0.01" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} /></div>
            </div>
            <div><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>

            {/* Parts used */}
            <div className="border rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Package className="h-3.5 w-3.5" /> Parts/Materials Used</p>
              <div className="flex flex-wrap gap-2 items-end">
                <div className="flex-1 min-w-[180px]">
                  <div className="flex gap-1.5">
                    <Select value={selectedStock} onValueChange={setSelectedStock}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Choose part..." /></SelectTrigger>
                      <SelectContent>{activeStock.map(s => <SelectItem key={s.id} value={s.id}>{s.name}{s.category ? ` · ${s.category}` : ''} (qty: {s.quantity})</SelectItem>)}</SelectContent>
                    </Select>
                    <Button type="button" variant="outline" size="icon" className="shrink-0 h-9 w-9" onClick={() => setScannerOpen(true)} title="Scan barcode">
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
                <span className="text-sm font-medium">Total</span>
                <span className="font-bold text-success tabular-nums">{fmt(totalCost)}</span>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={!canSubmit}>
              <Wrench className="h-4 w-4 mr-2" />Record Service
            </Button>
          </form>
        </CardContent>
      </Card>

      <AdSpace variant="banner" />

      {/* History */}
      <div className="flex gap-2">
        <button onClick={() => setActiveTab('today')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'today' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>Today ({todayServices.length})</button>
        <button onClick={() => setActiveTab('previous')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'previous' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>Previous ({prevServices.length})</button>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-4">
          {(activeTab === 'today' ? todayServices : prevServices).length === 0 ? (
            <p className="text-sm text-muted-foreground">No services yet.</p>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {(activeTab === 'today' ? todayServices : prevServices).map(s => (
                <div key={s.id} className="border rounded-lg p-3 flex justify-between items-start">
                  <div><p className="font-medium text-sm">{s.service_name}</p><p className="text-xs text-muted-foreground">👤 {s.customer_name}</p></div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-success bg-success/10 px-2 py-0.5 rounded-md text-sm tabular-nums">{fmt(Number(s.cost))}</span>
                    <Button size="sm" variant="ghost" onClick={() => setReceiptService(s)}><ReceiptIcon className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
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
    </div>
  );
}
