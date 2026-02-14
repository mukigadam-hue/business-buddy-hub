import { useState } from 'react';
import { useBusiness } from '@/context/BusinessContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, DollarSign, TrendingUp, Wallet } from 'lucide-react';

export default function SettingsPage() {
  const { data, updateBusinessInfo, getTodayRevenue, getExpectedRevenue } = useBusiness();
  const [form, setForm] = useState(data.businessInfo);

  const todayRevenue = getTodayRevenue();
  const expected = getExpectedRevenue();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateBusinessInfo({
      name: form.name.trim(),
      address: form.address.trim(),
      contact: form.contact.trim(),
      email: form.email.trim(),
      totalCapital: parseFloat(String(form.totalCapital)) || 0,
    });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Financial Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <DollarSign className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Today's Revenue</p>
                <p className="text-xl font-bold">${todayRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Capital</p>
                <p className="text-xl font-bold">${(data.businessInfo.totalCapital || 0).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <TrendingUp className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Expected Revenue (Retail)</p>
                <p className="text-xl font-bold">${expected.retail.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <DollarSign className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Expected Wholesale</p>
                <p className="text-xl font-bold">${expected.wholesale.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card max-w-lg">
        <CardContent className="p-4">
          <h2 className="text-base font-semibold mb-3">Business Information</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label>Business Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <Label>Address</Label>
              <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            </div>
            <div>
              <Label>Contact</Label>
              <Input value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <Label>Total Capital ($)</Label>
              <Input type="number" min="0" step="0.01" value={form.totalCapital || ''} onChange={e => setForm(f => ({ ...f, totalCapital: parseFloat(e.target.value) || 0 }))} placeholder="Enter total business capital" />
            </div>
            <Button type="submit" className="w-full"><Save className="h-4 w-4 mr-2" />Save Changes</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
