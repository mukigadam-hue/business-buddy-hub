import { useState } from 'react';
import { useBusiness } from '@/context/BusinessContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, DollarSign, TrendingUp, Wallet, Building2, Plus, Crown, User, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

function AddBusinessDialog({ onCreated }: { onCreated: () => void }) {
  const { createBusiness } = useBusiness();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', contact: '', email: '' });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Business name is required'); return; }
    setLoading(true);
    await createBusiness(form.name.trim(), form.address.trim(), form.contact.trim(), form.email.trim());
    setForm({ name: '', address: '', contact: '', email: '' });
    setOpen(false);
    setLoading(false);
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full border-dashed">
          <Plus className="h-4 w-4 mr-2" /> Add Personal Business
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" /> Create New Business
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
          <div><Label>Business Name *</Label><Input placeholder="e.g. My Wholesale Shop" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
          <div><Label>Address</Label><Input placeholder="Location" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
          <div><Label>Contact</Label><Input placeholder="Phone number" value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} /></div>
          <div><Label>Email</Label><Input type="email" placeholder="business@email.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating...' : 'Create Business'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function SettingsPage() {
  const { currentBusiness, updateBusiness, stock, sales, purchases, businesses, memberships, setCurrentBusinessId } = useBusiness();
  const [form, setForm] = useState({
    name: currentBusiness?.name || '',
    address: currentBusiness?.address || '',
    contact: currentBusiness?.contact || '',
    email: currentBusiness?.email || '',
    total_capital: currentBusiness?.total_capital || 0,
  });

  const todayRevenue = sales
    .filter(s => new Date(s.created_at).toDateString() === new Date().toDateString())
    .reduce((sum, s) => sum + Number(s.grand_total), 0);

  let wholesale = 0, retail = 0;
  stock.forEach(item => {
    wholesale += item.quantity * Number(item.wholesale_price);
    retail += item.quantity * Number(item.retail_price);
  });

  function getRoleForBusiness(businessId: string) {
    return memberships.find(m => m.business_id === businessId)?.role || 'worker';
  }

  const ownedBusinesses = businesses.filter(b => getRoleForBusiness(b.id) === 'owner');
  const employedBusinesses = businesses.filter(b => getRoleForBusiness(b.id) !== 'owner');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await updateBusiness({
      name: form.name.trim(),
      address: form.address.trim(),
      contact: form.contact.trim(),
      email: form.email.trim(),
      total_capital: parseFloat(String(form.total_capital)) || 0,
    });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Financial Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-card"><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-success/10"><DollarSign className="h-5 w-5 text-success" /></div><div><p className="text-xs text-muted-foreground">Today's Revenue</p><p className="text-xl font-bold">${todayRevenue.toLocaleString()}</p></div></div></CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Wallet className="h-5 w-5 text-primary" /></div><div><p className="text-xs text-muted-foreground">Total Capital</p><p className="text-xl font-bold">${(Number(currentBusiness?.total_capital) || 0).toLocaleString()}</p></div></div></CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-accent/10"><TrendingUp className="h-5 w-5 text-accent" /></div><div><p className="text-xs text-muted-foreground">Expected Revenue (Retail)</p><p className="text-xl font-bold">${retail.toLocaleString()}</p></div></div></CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-success/10"><DollarSign className="h-5 w-5 text-success" /></div><div><p className="text-xs text-muted-foreground">Expected Wholesale</p><p className="text-xl font-bold">${wholesale.toLocaleString()}</p></div></div></CardContent></Card>
      </div>

      {/* My Businesses Section */}
      <Card className="shadow-card">
        <CardContent className="p-4 space-y-4">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4" /> My Businesses
          </h2>

          {/* Owned Businesses */}
          {ownedBusinesses.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">👔 Your Businesses</p>
              {ownedBusinesses.map(b => {
                const isActive = b.id === currentBusiness?.id;
                return (
                  <button
                    key={b.id}
                    onClick={() => setCurrentBusinessId(b.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                      isActive
                        ? 'bg-primary/10 border-2 border-primary'
                        : 'bg-muted/30 border-2 border-transparent hover:border-primary/20'
                    }`}
                  >
                    <Crown className="h-4 w-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{b.name}</p>
                      <p className="text-xs text-muted-foreground">{b.address || 'No address'}</p>
                    </div>
                    {isActive ? (
                      <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full shrink-0">Active</span>
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Employed Businesses */}
          {employedBusinesses.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">🏢 Employed At</p>
              {employedBusinesses.map(b => {
                const isActive = b.id === currentBusiness?.id;
                const role = getRoleForBusiness(b.id);
                return (
                  <button
                    key={b.id}
                    onClick={() => setCurrentBusinessId(b.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                      isActive
                        ? 'bg-orange-500/10 border-2 border-orange-500'
                        : 'bg-muted/30 border-2 border-transparent hover:border-orange-500/20'
                    }`}
                  >
                    <User className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{b.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{role}</p>
                    </div>
                    {isActive ? (
                      <span className="text-[10px] bg-orange-500 text-white px-2 py-0.5 rounded-full shrink-0">Active</span>
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <AddBusinessDialog onCreated={() => {}} />
        </CardContent>
      </Card>

      {/* Current Business Information */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <h2 className="text-base font-semibold mb-3">
            Business Information — {currentBusiness?.name}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div><Label>Business Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
            <div><Label>Address</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
            <div><Label>Contact</Label><Input value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div><Label>Total Capital ($)</Label><Input type="number" min="0" step="0.01" value={form.total_capital || ''} onChange={e => setForm(f => ({ ...f, total_capital: parseFloat(e.target.value) || 0 }))} placeholder="Enter total business capital" /></div>
            <Button type="submit" className="w-full"><Save className="h-4 w-4 mr-2" />Save Changes</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
