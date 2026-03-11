import { useState } from 'react';
import { useBusiness } from '@/context/BusinessContext';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Building2, KeyRound, Plus, Factory, MapPin, Home } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { countries, getCountryByCode } from '@/lib/countries';
import { useCurrency } from '@/hooks/useCurrency';
import i18n from '@/i18n';

export default function BusinessSetupPage() {
  const { createBusiness, redeemInviteCode } = useBusiness();
  const { signOut } = useAuth();
  const { setCurrency } = useCurrency();
  const [tab, setTab] = useState<'create' | 'join'>('create');
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
      // Auto-set currency and language
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-card">
        <CardContent className="p-6 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">📦 BizTrack</h1>
            <p className="text-sm text-muted-foreground">Set up your business, factory, or property — or join an existing one</p>
            <Button type="button" variant="ghost" size="sm" onClick={handleExit} disabled={loading}>
              Exit to sign in / sign up
            </Button>
          </div>

          <div className="flex gap-2">
            <Button variant={tab === 'create' ? 'default' : 'outline'} className="flex-1" onClick={() => setTab('create')}>
              <Plus className="h-4 w-4 mr-2" />Create New
            </Button>
            <Button variant={tab === 'join' ? 'default' : 'outline'} className="flex-1" onClick={() => setTab('join')}>
              <KeyRound className="h-4 w-4 mr-2" />Join with Code
            </Button>
          </div>

          <Separator />

          {tab === 'create' ? (
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
                <Label className="text-sm font-semibold">What are you managing?</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <button type="button" onClick={() => setBusinessType('business')}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${
                      businessType === 'business' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                    }`}>
                    <span className="text-2xl">🏪</span>
                    <p className="text-xs font-semibold mt-1">Business</p>
                    <p className="text-[10px] text-muted-foreground">Shops, retail</p>
                  </button>
                  <button type="button" onClick={() => setBusinessType('factory')}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${
                      businessType === 'factory' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                    }`}>
                    <span className="text-2xl">🏭</span>
                    <p className="text-xs font-semibold mt-1">Factory</p>
                    <p className="text-[10px] text-muted-foreground">Manufacturing</p>
                  </button>
                  <button type="button" onClick={() => setBusinessType('property')}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${
                      businessType === 'property' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                    }`}>
                    <span className="text-2xl">🏠</span>
                    <p className="text-xs font-semibold mt-1">Property</p>
                    <p className="text-[10px] text-muted-foreground">Rentals</p>
                  </button>
                </div>
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
          ) : (
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <Label>Invite Code</Label>
                <Input value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())}
                  required placeholder="Enter invite code" maxLength={6}
                  className="text-center text-lg tracking-widest font-mono" />
                <p className="text-xs text-muted-foreground mt-1">
                  Ask your business/factory owner for the invite code.
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                <KeyRound className="h-4 w-4 mr-2" />Join
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
