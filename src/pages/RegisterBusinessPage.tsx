import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusiness } from '@/context/BusinessContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Factory, Home, MapPin, ArrowLeft, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { countries, getCountryByCode } from '@/lib/countries';
import { useCurrency } from '@/hooks/useCurrency';
import i18n from '@/i18n';

export default function RegisterBusinessPage() {
  const { createBusiness } = useBusiness();
  const { setCurrency } = useCurrency();
  const navigate = useNavigate();
  const [businessType, setBusinessType] = useState<'business' | 'factory' | 'property' | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [district, setDistrict] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [countrySearch, setCountrySearch] = useState('');
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
      if (i18n.language !== country.language) i18n.changeLanguage(country.language);
    }
  }

  const selectedCountry = getCountryByCode(countryCode);
  const typeLabels = {
    business: { icon: '🏪', title: 'Business', sub: 'Shops, retail, trading' },
    factory: { icon: '🏭', title: 'Factory', sub: 'Manufacturing, production' },
    property: { icon: '🏠', title: 'Property', sub: 'Rentals, real estate' },
  };

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !businessType) return;
    if (!countryCode) { toast.error('Please select your country'); return; }
    setLoading(true);
    await createBusiness(name.trim(), address.trim(), contact.trim(), email.trim(), countryCode);
    if (businessType !== 'business' || district.trim()) {
      const { data } = await supabase.from('businesses').select('id').order('created_at', { ascending: false }).limit(1).single();
      if (data) {
        const updates: any = {};
        if (businessType !== 'business') updates.business_type = businessType;
        if (district.trim()) updates.district = district.trim();
        if (Object.keys(updates).length > 0) {
          await supabase.from('businesses').update(updates).eq('id', data.id);
        }
      }
    }
    setLoading(false);
    toast.success(`${typeLabels[businessType].title} created successfully!`);
    window.location.href = '/';
  }

  return (
    <div className="max-w-md mx-auto py-6">
      <Button variant="ghost" size="sm" onClick={() => businessType ? setBusinessType(null) : navigate('/')} className="mb-4 gap-1.5">
        <ArrowLeft className="h-3.5 w-3.5" /> {businessType ? 'Back' : 'Cancel'}
      </Button>

      <Card className="shadow-card">
        <CardContent className="p-6 space-y-6">
          <div className="text-center space-y-1">
            <Crown className="h-8 w-8 text-primary mx-auto" />
            <h2 className="text-xl font-bold">Register New {businessType ? typeLabels[businessType].title : 'Entity'}</h2>
            <p className="text-sm text-muted-foreground">
              {businessType ? `Create your own ${typeLabels[businessType].title.toLowerCase()}` : 'What would you like to create?'}
            </p>
          </div>

          {!businessType ? (
            <div className="grid grid-cols-1 gap-3">
              {(['business', 'factory', 'property'] as const).map(type => (
                <button key={type} onClick={() => setBusinessType(type)}
                  className="p-4 rounded-xl border-2 border-border hover:border-primary/50 text-left transition-all flex items-center gap-4">
                  <span className="text-3xl">{typeLabels[type].icon}</span>
                  <div>
                    <p className="font-semibold text-base">{typeLabels[type].title}</p>
                    <p className="text-xs text-muted-foreground">{typeLabels[type].sub}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <form onSubmit={handleCreate} className="space-y-4">
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
                      <p className="text-xs text-muted-foreground">Currency: {selectedCountry.currencySymbol}</p>
                    </div>
                  </button>
                ) : (
                  <div className="mt-1.5 space-y-2">
                    <Input placeholder="Search country..." value={countrySearch} onChange={e => setCountrySearch(e.target.value)} className="h-9" />
                    <div className="max-h-40 overflow-y-auto rounded-lg border border-border">
                      {filteredCountries.map(c => (
                        <button key={c.code} type="button" onClick={() => handleCountrySelect(c.code)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted/60 text-sm border-b border-border last:border-0">
                          <span className="text-lg">{c.flag}</span>
                          <span className="flex-1">{c.name}</span>
                          <span className="text-xs text-muted-foreground">{c.currencySymbol}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <Label>{businessType === 'factory' ? 'Factory Name' : businessType === 'property' ? 'Property / Agency Name' : 'Business Name'} *</Label>
                <Input value={name} onChange={e => setName(e.target.value)} required placeholder={businessType === 'factory' ? 'My Factory' : businessType === 'property' ? 'My Rentals' : 'My Shop'} />
              </div>
              <div><Label>Address</Label><Input value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main St" /></div>
              <div>
                <Label>Contact</Label>
                <Input value={contact} onChange={e => setContact(e.target.value)} placeholder={selectedCountry ? `${selectedCountry.phonePrefix} ...` : '+1 234 567 890'} />
              </div>
              <div><Label>Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" /></div>
              <Button type="submit" className="w-full" disabled={loading}>
                {businessType === 'factory' ? <Factory className="h-4 w-4 mr-2" /> : businessType === 'property' ? <Home className="h-4 w-4 mr-2" /> : <Building2 className="h-4 w-4 mr-2" />}
                Create {typeLabels[businessType].title}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
