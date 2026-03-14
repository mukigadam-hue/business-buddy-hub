import { useState } from 'react';
import { useBusiness } from '@/context/BusinessContext';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Building2, KeyRound, Plus, Factory, MapPin, Home, ArrowLeft, Crown, User } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { countries, getCountryByCode } from '@/lib/countries';
import { useCurrency } from '@/hooks/useCurrency';
import i18n from '@/i18n';

type Step = 'choose_type' | 'choose_role' | 'create' | 'join';

export default function BusinessSetupPage() {
  const { createBusiness, redeemInviteCode } = useBusiness();
  const { signOut } = useAuth();
  const { setCurrency } = useCurrency();
  const [step, setStep] = useState<Step>('choose_type');
  const [businessType, setBusinessType] = useState<'business' | 'factory' | 'property'>('business');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [countrySearch, setCountrySearch] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  const filteredCountries = countrySearch
    ? countries.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase()) || c.code.toLowerCase().includes(countrySearch.toLowerCase()))
    : countries;

  function handleCountrySelect(code: string) {
    setCountryCode(code);
    setCountrySearch('');
    const country = getCountryByCode(code);
    if (country) {
      setCurrency(country.currencySymbol);
      if (i18n.language !== country.language) {
        i18n.changeLanguage(country.language);
      }
    }
  }

  async function handleExit() {
    setLoading(true);
    await signOut();
    setLoading(false);
  }

  function handleTypeSelect(type: 'business' | 'factory' | 'property') {
    setBusinessType(type);
    setStep('choose_role');
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (!countryCode) { toast.error('Please select your country'); return; }
    setLoading(true);
    await createBusiness(name.trim(), address.trim(), contact.trim(), email.trim(), countryCode);
    if (businessType !== 'business') {
      const { data } = await supabase.from('businesses').select('id').order('created_at', { ascending: false }).limit(1).single();
      if (data) {
        await supabase.from('businesses').update({ business_type: businessType } as any).eq('id', data.id);
      }
    }
    setLoading(false);
    window.location.reload();
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setLoading(true);
    const success = await redeemInviteCode(inviteCode.trim());
    if (!success) {
      toast.error('Failed to join. Check the code and try again.');
    }
    setLoading(false);
  }

  const selectedCountry = getCountryByCode(countryCode);

  const typeLabels = {
    business: { icon: '🏪', title: 'Business', sub: 'Shops, retail, trading' },
    factory: { icon: '🏭', title: 'Factory', sub: 'Manufacturing, production' },
    property: { icon: '🏠', title: 'Property', sub: 'Rentals, real estate' },
  };

  const roleLabels = {
    business: { owner: 'Register a Personal Business', ownerDesc: 'I own or manage a shop/business', worker: 'Register as a Worker', workerDesc: 'My boss will give me an invite code' },
    factory: { owner: 'Register a Personal Factory', ownerDesc: 'I own or manage a factory', worker: 'Register as a Worker', workerDesc: 'My boss will give me an invite code' },
    property: { owner: 'Register as an Asset Owner', ownerDesc: 'I own or manage rental properties', worker: 'Register as a Renter', workerDesc: 'My landlord will give me an invite code' },
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-card">
        <CardContent className="p-6 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">📦 BizTrack</h1>
            <p className="text-sm text-muted-foreground">
              {step === 'choose_type' ? 'What would you like to manage?' :
               step === 'choose_role' ? `${typeLabels[businessType].icon} ${typeLabels[businessType].title} — How will you use it?` :
               step === 'create' ? `Create your ${typeLabels[businessType].title.toLowerCase()}` :
               `Join a ${typeLabels[businessType].title.toLowerCase()}`}
            </p>
            <Button type="button" variant="ghost" size="sm" onClick={handleExit} disabled={loading}>
              Exit to sign in / sign up
            </Button>
          </div>

          {step !== 'choose_type' && (
            <Button variant="ghost" size="sm" onClick={() => setStep(step === 'create' || step === 'join' ? 'choose_role' : 'choose_type')} className="gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>
          )}

          {/* Step 1: Choose Type */}
          {step === 'choose_type' && (
            <div className="grid grid-cols-1 gap-3">
              {(['business', 'factory', 'property'] as const).map(type => (
                <button key={type} onClick={() => handleTypeSelect(type)}
                  className="p-4 rounded-xl border-2 border-border hover:border-primary/50 text-left transition-all flex items-center gap-4">
                  <span className="text-3xl">{typeLabels[type].icon}</span>
                  <div>
                    <p className="font-semibold text-base">{typeLabels[type].title}</p>
                    <p className="text-xs text-muted-foreground">{typeLabels[type].sub}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Choose Role */}
          {step === 'choose_role' && (
            <div className="grid grid-cols-1 gap-3">
              <button onClick={() => setStep('create')}
                className="p-4 rounded-xl border-2 border-border hover:border-primary/50 text-left transition-all flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Crown className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-base">{roleLabels[businessType].owner}</p>
                  <p className="text-xs text-muted-foreground">{roleLabels[businessType].ownerDesc}</p>
                </div>
              </button>
              <button onClick={() => setStep('join')}
                className="p-4 rounded-xl border-2 border-border hover:border-primary/50 text-left transition-all flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
                  <User className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="font-semibold text-base">{roleLabels[businessType].worker}</p>
                  <p className="text-xs text-muted-foreground">{roleLabels[businessType].workerDesc}</p>
                </div>
              </button>
            </div>
          )}

          {/* Step 3a: Create */}
          {step === 'create' && (
            <form onSubmit={handleCreate} className="space-y-4">
              {/* Country Selection */}
              <div>
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> Your Country *
                </Label>
                {selectedCountry ? (
                  <button type="button" onClick={() => setCountryCode('')}
                    className="w-full mt-1.5 flex items-center gap-3 p-3 rounded-xl border-2 border-primary bg-primary/5 text-left">
                    <span className="text-2xl">{selectedCountry.flag}</span>
                    <div>
                      <p className="font-semibold text-sm">{selectedCountry.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Currency: {selectedCountry.currencySymbol} · Code prefix: {selectedCountry.code}-XXXXXX
                      </p>
                    </div>
                  </button>
                ) : (
                  <div className="mt-1.5 space-y-2">
                    <Input
                      placeholder="Search country..."
                      value={countrySearch}
                      onChange={e => setCountrySearch(e.target.value)}
                      className="h-9"
                    />
                    <div className="max-h-40 overflow-y-auto rounded-lg border border-border">
                      {filteredCountries.map(c => (
                        <button key={c.code} type="button" onClick={() => handleCountrySelect(c.code)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted/60 text-sm border-b border-border last:border-0">
                          <span className="text-lg">{c.flag}</span>
                          <span className="flex-1">{c.name}</span>
                          <span className="text-xs text-muted-foreground">{c.currencySymbol}</span>
                        </button>
                      ))}
                      {filteredCountries.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-3">No countries found</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label>{businessType === 'factory' ? 'Factory Name' : businessType === 'property' ? 'Property / Agency Name' : 'Business Name'} *</Label>
                <Input value={name} onChange={e => setName(e.target.value)} required
                  placeholder={businessType === 'factory' ? 'My Factory' : businessType === 'property' ? 'My Rentals' : 'My Shop'} />
              </div>
              <div><Label>Address</Label><Input value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main St" /></div>
              <div>
                <Label>Contact</Label>
                <Input value={contact} onChange={e => setContact(e.target.value)} 
                  placeholder={selectedCountry ? `${selectedCountry.phonePrefix} ...` : '+1 234 567 890'} />
              </div>
              <div><Label>Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" /></div>
              <Button type="submit" className="w-full" disabled={loading}>
                {businessType === 'factory' ? <Factory className="h-4 w-4 mr-2" /> : businessType === 'property' ? <Home className="h-4 w-4 mr-2" /> : <Building2 className="h-4 w-4 mr-2" />}
                Create {businessType === 'factory' ? 'Factory' : businessType === 'property' ? 'Property' : 'Business'}
              </Button>
            </form>
          )}

          {/* Step 3b: Join as Worker/Renter */}
          {step === 'join' && (
            <form onSubmit={handleJoin} className="space-y-4">
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">
                  {businessType === 'property' ? '🏠 Joining as a Renter' : '👷 Joining as a Worker'}
                </p>
                <p>
                  {businessType === 'property'
                    ? 'Your landlord or property manager will give you an invite code. Enter it below to join their property.'
                    : 'Your boss or business owner will give you an invite code. Enter it below to join their business.'}
                </p>
              </div>
              <div>
                <Label>Invite Code from {businessType === 'property' ? 'Landlord' : 'Owner'}</Label>
                <Input value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())}
                  required placeholder="Enter the code you received" maxLength={6}
                  className="text-center text-lg tracking-widest font-mono" />
                <p className="text-xs text-muted-foreground mt-1">
                  Ask your {businessType === 'property' ? 'property owner' : 'business/factory owner'} for the invite code.
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                <KeyRound className="h-4 w-4 mr-2" />Request to Join
              </Button>

              <Separator />

              <div className="p-3 rounded-lg bg-muted/50 border text-xs text-muted-foreground space-y-2">
                <p className="font-medium text-foreground">💡 Want to register your own business too?</p>
                <p>After joining as a {businessType === 'property' ? 'renter' : 'worker'}, you can always add your own personal business, factory, or property from the app's menu.</p>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
