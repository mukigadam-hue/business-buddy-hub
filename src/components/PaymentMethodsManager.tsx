import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Smartphone, CreditCard, Wallet, Edit2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { toTitleCase } from '@/lib/utils';

const MOBILE_MONEY_PROVIDERS = [
  { name: 'MTN Mobile Money', icon: '🟡' },
  { name: 'Airtel Money', icon: '🔴' },
  { name: 'M-Pesa', icon: '🟢' },
  { name: 'Vodacom M-Pesa', icon: '🔴' },
  { name: 'Orange Money', icon: '🟠' },
  { name: 'Safaricom M-Pesa', icon: '🟢' },
  { name: 'Ethio Telecom Telebirr', icon: '🟢' },
  { name: 'Glo Mobile Money', icon: '🟢' },
  { name: 'Maroc Telecom Pay', icon: '🔵' },
  { name: 'Tigo Pesa', icon: '🔵' },
  { name: 'EcoCash', icon: '🟢' },
  { name: 'Wave', icon: '🔵' },
  { name: 'Moov Money', icon: '🔵' },
  { name: 'Zamtel Kwacha', icon: '🟢' },
  { name: 'Halotel Halopesa', icon: '🔵' },
];

const CARD_PROVIDERS = [
  { name: 'Stripe', icon: '💳' },
  { name: 'PayPal', icon: '🅿️' },
  { name: 'Airwallex', icon: '💳' },
  { name: 'Adyen', icon: '💳' },
  { name: 'Payoneer', icon: '💳' },
  { name: 'Wise', icon: '💳' },
  { name: 'Shopify Payments', icon: '🛒' },
  { name: '2Checkout', icon: '💳' },
  { name: 'Paddle', icon: '💳' },
  { name: 'Flutterwave', icon: '💳' },
  { name: 'Paystack', icon: '💳' },
  { name: 'DPO Group', icon: '💳' },
  { name: 'Chipper Cash', icon: '💳' },
];

const BANK_PROVIDERS = [
  { name: 'Bank Transfer', icon: '🏦' },
  { name: 'Direct Deposit', icon: '🏦' },
];

interface PaymentMethod {
  id: string;
  business_id: string;
  provider_type: string;
  provider_name: string;
  account_name: string;
  account_number: string;
  is_active: boolean;
  created_at: string;
}

export default function PaymentMethodsManager({ businessId }: { businessId: string }) {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [providerType, setProviderType] = useState<'mobile_money' | 'card' | 'bank'>('mobile_money');
  const [providerName, setProviderName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchMethods = useCallback(async () => {
    const { data } = await supabase
      .from('business_payment_methods' as any)
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: true });
    setMethods((data as any[]) || []);
  }, [businessId]);

  useEffect(() => { fetchMethods(); }, [fetchMethods]);

  const providersList = providerType === 'mobile_money' ? MOBILE_MONEY_PROVIDERS
    : providerType === 'card' ? CARD_PROVIDERS : BANK_PROVIDERS;

  async function handleAdd() {
    if (!providerName || !accountNumber.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('business_payment_methods' as any).insert({
      business_id: businessId,
      provider_type: providerType,
      provider_name: providerName,
      account_name: toTitleCase(accountName.trim()),
      account_number: accountNumber.trim(),
      is_active: true,
    } as any);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${providerName} added successfully`);
    setShowAdd(false);
    setProviderName('');
    setAccountName('');
    setAccountNumber('');
    fetchMethods();
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from('business_payment_methods' as any).update({ is_active: !current } as any).eq('id', id);
    fetchMethods();
  }

  async function deleteMethod(id: string) {
    await supabase.from('business_payment_methods' as any).delete().eq('id', id);
    toast.success('Payment method removed');
    fetchMethods();
  }

  const mobileCount = methods.filter(m => m.provider_type === 'mobile_money').length;
  const cardCount = methods.filter(m => m.provider_type === 'card').length;
  const bankCount = methods.filter(m => m.provider_type === 'bank').length;

  return (
    <Card className="shadow-card">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Wallet className="h-4 w-4" /> Payment Methods
          </h2>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Register the payment methods your customers or renters can use to pay you. They will see these when making payments.
        </p>

        {/* Summary badges */}
        <div className="flex flex-wrap gap-2">
          {mobileCount > 0 && <Badge variant="secondary" className="gap-1"><Smartphone className="h-3 w-3" /> {mobileCount} Mobile Money</Badge>}
          {cardCount > 0 && <Badge variant="secondary" className="gap-1"><CreditCard className="h-3 w-3" /> {cardCount} Card/Online</Badge>}
          {bankCount > 0 && <Badge variant="secondary" className="gap-1">🏦 {bankCount} Bank</Badge>}
          {methods.length === 0 && <p className="text-xs text-muted-foreground italic">No payment methods registered yet. Add one to get started.</p>}
        </div>

        {/* Mobile Money Methods */}
        {methods.filter(m => m.provider_type === 'mobile_money').length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Smartphone className="h-3 w-3" /> Mobile Money
            </p>
            {methods.filter(m => m.provider_type === 'mobile_money').map(m => (
              <PaymentMethodCard key={m.id} method={m} onToggle={toggleActive} onDelete={deleteMethod} />
            ))}
          </div>
        )}

        {/* Card/Online Methods */}
        {methods.filter(m => m.provider_type === 'card').length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <CreditCard className="h-3 w-3" /> Card / Online Payments
            </p>
            {methods.filter(m => m.provider_type === 'card').map(m => (
              <PaymentMethodCard key={m.id} method={m} onToggle={toggleActive} onDelete={deleteMethod} />
            ))}
          </div>
        )}

        {/* Bank Methods */}
        {methods.filter(m => m.provider_type === 'bank').length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              🏦 Bank Transfer
            </p>
            {methods.filter(m => m.provider_type === 'bank').map(m => (
              <PaymentMethodCard key={m.id} method={m} onToggle={toggleActive} onDelete={deleteMethod} />
            ))}
          </div>
        )}

        {/* Add Dialog */}
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" /> Register Payment Method
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              {/* Type Selector */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { type: 'mobile_money' as const, label: 'Mobile Money', icon: <Smartphone className="h-5 w-5" /> },
                  { type: 'card' as const, label: 'Card/Online', icon: <CreditCard className="h-5 w-5" /> },
                  { type: 'bank' as const, label: 'Bank', icon: <span className="text-lg">🏦</span> },
                ].map(t => (
                  <button key={t.type} onClick={() => { setProviderType(t.type); setProviderName(''); }}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center ${
                      providerType === t.type ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'
                    }`}>
                    {t.icon}
                    <span className="text-xs font-medium">{t.label}</span>
                  </button>
                ))}
              </div>

              {/* Provider Selector */}
              <div>
                <Label className="text-xs font-semibold">
                  {providerType === 'mobile_money' ? 'Mobile Network *' : providerType === 'card' ? 'Payment Platform *' : 'Bank Type *'}
                </Label>
                <Select value={providerName} onValueChange={setProviderName}>
                  <SelectTrigger><SelectValue placeholder="Select provider..." /></SelectTrigger>
                  <SelectContent>
                    {providersList.map(p => (
                      <SelectItem key={p.name} value={p.name}>
                        <span className="flex items-center gap-2">{p.icon} {p.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Account Details */}
              <div>
                <Label className="text-xs font-semibold">
                  {providerType === 'mobile_money' ? 'Phone Number *' : providerType === 'bank' ? 'Account Number *' : 'Account ID / Email *'}
                </Label>
                <Input
                  value={accountNumber}
                  onChange={e => setAccountNumber(e.target.value)}
                  placeholder={providerType === 'mobile_money' ? '+256 700 000 000' : providerType === 'bank' ? '0012345678' : 'email@example.com'}
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Account Holder Name</Label>
                <Input
                  value={accountName}
                  onChange={e => setAccountName(e.target.value)}
                  placeholder="Name on account"
                />
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">
                  ⚠️ <strong>Important:</strong> Double-check your {providerType === 'mobile_money' ? 'phone number' : 'account details'}. 
                  Customers will send payments to this {providerType === 'mobile_money' ? 'number' : 'account'}. 
                  Incorrect details may cause payment issues.
                </p>
              </div>

              <Button onClick={handleAdd} disabled={saving || !providerName || !accountNumber.trim()} className="w-full">
                <CheckCircle className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Register Payment Method'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function PaymentMethodCard({ method, onToggle, onDelete }: {
  method: PaymentMethod;
  onToggle: (id: string, current: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const providerIcon = [...MOBILE_MONEY_PROVIDERS, ...CARD_PROVIDERS, ...BANK_PROVIDERS]
    .find(p => p.name === method.provider_name)?.icon || '💳';

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
      method.is_active ? 'bg-background border-border' : 'bg-muted/30 border-border/50 opacity-60'
    }`}>
      <span className="text-xl shrink-0">{providerIcon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{method.provider_name}</p>
        <p className="text-xs text-muted-foreground font-mono">{method.account_number}</p>
        {method.account_name && <p className="text-xs text-muted-foreground">{method.account_name}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Switch checked={method.is_active} onCheckedChange={() => onToggle(method.id, method.is_active)} />
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(method.id)}>
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

// Viewer component for buyers/renters to see seller's payment methods
export function PaymentMethodsViewer({ businessId, onSelectMethod }: {
  businessId: string;
  onSelectMethod?: (method: PaymentMethod) => void;
}) {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('business_payment_methods' as any)
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('provider_type', { ascending: true })
      .then(({ data }) => setMethods((data as any[]) || []));
  }, [businessId]);

  if (methods.length === 0) {
    return (
      <div className="text-center p-4 bg-muted/30 rounded-lg border">
        <p className="text-sm text-muted-foreground">No payment methods registered by seller</p>
        <p className="text-xs text-muted-foreground mt-1">Contact the seller directly for payment details</p>
      </div>
    );
  }

  const mobileMethods = methods.filter(m => m.provider_type === 'mobile_money');
  const cardMethods = methods.filter(m => m.provider_type === 'card');
  const bankMethods = methods.filter(m => m.provider_type === 'bank');

  function handleSelect(method: PaymentMethod) {
    setSelected(method.id);
    onSelectMethod?.(method);
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Seller's Accepted Payment Methods
      </p>

      {mobileMethods.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium flex items-center gap-1"><Smartphone className="h-3 w-3" /> Mobile Money</p>
          {mobileMethods.map(m => {
            const icon = MOBILE_MONEY_PROVIDERS.find(p => p.name === m.provider_name)?.icon || '📱';
            return (
              <button key={m.id} onClick={() => handleSelect(m)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                  selected === m.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                }`}>
                <span className="text-lg">{icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{m.provider_name}</p>
                  <p className="text-xs font-mono text-muted-foreground">{m.account_number}</p>
                  {m.account_name && <p className="text-xs text-muted-foreground">{m.account_name}</p>}
                </div>
                {selected === m.id && <CheckCircle className="h-4 w-4 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      )}

      {cardMethods.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium flex items-center gap-1"><CreditCard className="h-3 w-3" /> Card / Online</p>
          {cardMethods.map(m => {
            const icon = CARD_PROVIDERS.find(p => p.name === m.provider_name)?.icon || '💳';
            return (
              <button key={m.id} onClick={() => handleSelect(m)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                  selected === m.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                }`}>
                <span className="text-lg">{icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{m.provider_name}</p>
                  <p className="text-xs font-mono text-muted-foreground">{m.account_number}</p>
                  {m.account_name && <p className="text-xs text-muted-foreground">{m.account_name}</p>}
                </div>
                {selected === m.id && <CheckCircle className="h-4 w-4 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      )}

      {bankMethods.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium flex items-center gap-1">🏦 Bank Transfer</p>
          {bankMethods.map(m => (
            <button key={m.id} onClick={() => handleSelect(m)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                selected === m.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
              }`}>
              <span className="text-lg">🏦</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{m.provider_name}</p>
                <p className="text-xs font-mono text-muted-foreground">{m.account_number}</p>
                {m.account_name && <p className="text-xs text-muted-foreground">{m.account_name}</p>}
              </div>
              {selected === m.id && <CheckCircle className="h-4 w-4 text-primary shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export { MOBILE_MONEY_PROVIDERS, CARD_PROVIDERS, BANK_PROVIDERS };
export type { PaymentMethod };
