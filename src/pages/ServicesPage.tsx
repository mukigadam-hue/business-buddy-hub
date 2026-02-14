import { useState } from 'react';
import { useBusiness } from '@/context/BusinessContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wrench } from 'lucide-react';

export default function ServicesPage() {
  const { data, addService } = useBusiness();
  const [form, setForm] = useState({ serviceName: '', description: '', cost: '', customerName: '' });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    addService({
      serviceName: form.serviceName.trim(),
      description: form.description.trim(),
      cost: parseFloat(form.cost) || 0,
      customerName: form.customerName.trim() || 'Walk-in',
    });
    setForm({ serviceName: '', description: '', cost: '', customerName: '' });
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
                <Input value={form.serviceName} onChange={e => setForm(f => ({ ...f, serviceName: e.target.value }))} required />
              </div>
              <div>
                <Label>Customer</Label>
                <Input value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))} placeholder="Customer name" />
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
          {data.services.length === 0 ? (
            <p className="text-sm text-muted-foreground">No services recorded.</p>
          ) : (
            <div className="space-y-2">
              {data.services.slice().reverse().map(s => (
                <div key={s.id} className="border rounded-lg p-3 flex justify-between items-start">
                  <div>
                    <p className="font-medium text-sm">{s.serviceName}</p>
                    <p className="text-xs text-muted-foreground">{s.customerName} · {s.description}</p>
                    <p className="text-xs text-muted-foreground">{new Date(s.timestamp).toLocaleString()}</p>
                  </div>
                  <span className="font-bold text-success">${s.cost.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
