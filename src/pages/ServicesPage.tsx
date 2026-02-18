import { useState } from 'react';
import { useBusiness } from '@/context/BusinessContext';
import { useCurrency } from '@/hooks/useCurrency';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Wrench, Receipt as ReceiptIcon } from 'lucide-react';
import Receipt from '@/components/Receipt';
import type { ServiceRecord } from '@/context/BusinessContext';

function toSentenceCase(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export default function ServicesPage() {
  const { services, addService, currentBusiness } = useBusiness();
  const { fmt } = useCurrency();
  const [form, setForm] = useState({ service_name: '', description: '', cost: '', customer_name: '' });
  const [receiptService, setReceiptService] = useState<ServiceRecord | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await addService({
      service_name: toSentenceCase(form.service_name.trim()),
      description: form.description.trim(),
      cost: parseFloat(form.cost) || 0,
      customer_name: toSentenceCase(form.customer_name.trim()) || 'Walk-in',
    });
    setForm({ service_name: '', description: '', cost: '', customer_name: '' });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Services</h1>
      <Card className="shadow-card">
        <CardContent className="p-4">
          <h2 className="text-base font-semibold mb-3">Record Service</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Service Name</Label>
                <Input
                  value={form.service_name}
                  onChange={e => setForm(f => ({ ...f, service_name: e.target.value }))}
                  onBlur={() => setForm(f => ({ ...f, service_name: toSentenceCase(f.service_name) }))}
                  required
                />
              </div>
              <div>
                <Label>Customer</Label>
                <Input
                  value={form.customer_name}
                  onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))}
                  onBlur={() => setForm(f => ({ ...f, customer_name: toSentenceCase(f.customer_name) }))}
                  placeholder="Customer name"
                />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <Label>Cost</Label>
              <Input type="number" min="0" step="0.01" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} required />
            </div>
            <Button type="submit" className="w-full"><Wrench className="h-4 w-4 mr-2" />Record Service</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardContent className="p-4">
          <h2 className="text-base font-semibold mb-3">Service History</h2>
          {services.length === 0 ? (
            <p className="text-sm text-muted-foreground">No services recorded.</p>
          ) : (
            <div className="space-y-2">
              {services.map(s => (
                <div key={s.id} className="border rounded-lg p-3 flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{s.service_name}</p>
                    <p className="text-xs text-muted-foreground">{s.customer_name} · {s.description}</p>
                    <p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-success">{fmt(Number(s.cost))}</span>
                    <Button size="sm" variant="ghost" onClick={() => setReceiptService(s)}>
                      <ReceiptIcon className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!receiptService} onOpenChange={o => { if (!o) setReceiptService(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Service Receipt</DialogTitle></DialogHeader>
          {receiptService && (
            <Receipt
              items={[{
                itemName: receiptService.service_name,
                category: 'Service',
                quality: receiptService.description || '-',
                quantity: 1,
                priceType: 'service',
                unitPrice: Number(receiptService.cost),
                subtotal: Number(receiptService.cost),
              }]}
              grandTotal={Number(receiptService.cost)}
              customerName={receiptService.customer_name}
              date={receiptService.created_at}
              type="sale"
              businessInfo={currentBusiness ? { name: currentBusiness.name, address: currentBusiness.address, contact: currentBusiness.contact, email: currentBusiness.email } : undefined}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
