import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Phone, Building2, Factory, Store, Copy, Check, Globe, ShoppingCart, CalendarCheck, Home } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import BusinessDetailDialog from '@/components/BusinessDetailDialog';
import AdSpace from '@/components/AdSpace';
import { useBusiness } from '@/context/BusinessContext';
import { getCountryFlag, getCountryByCode } from '@/lib/countries';

interface DiscoveredBusiness {
  id: string;
  name: string;
  business_type: string;
  address: string;
  contact: string;
  email: string;
  logo_url: string | null;
  business_code: string | null;
  products_description: string;
  country_code: string;
}

export default function DiscoverPage() {
  const navigate = useNavigate();
  const { currentBusiness } = useBusiness();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DiscoveredBusiness[]>(() => {
    try { return JSON.parse(localStorage.getItem('biztrack_cache_discover') || '[]'); } catch { return []; }
  });
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedBiz, setSelectedBiz] = useState<DiscoveredBusiness | null>(null);
  const [filterCountry, setFilterCountry] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'business' | 'factory' | 'property'>('all');

  const myCountry = (currentBusiness as any)?.country_code || '';

  const searchBusinesses = useCallback(async (searchQuery: string) => {
    setLoading(true);
    try {
      const { data, error } = await (supabase.rpc as any)('search_businesses', {
        _query: searchQuery,
        _limit: 30,
        _offset: 0,
        _country_code: filterCountry ? myCountry : '',
      });
      if (error) throw error;
      const allResults = (data as DiscoveredBusiness[]) || [];
      setResults(filterType === 'all' ? allResults : allResults.filter(b => b.business_type === filterType));
      setHasSearched(true);
    } catch (err) {
      console.error('Search error:', err);
      toast.error('Failed to search businesses');
    } finally {
      setLoading(false);
    }
  }, [filterCountry, filterType, myCountry]);

  useEffect(() => {
    searchBusinesses('');
  }, [searchBusinesses]);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchBusinesses(query.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [query, searchBusinesses]);

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('Business code copied!');
    setTimeout(() => setCopiedCode(null), 2000);
  }

  function handleOrderOrBook(biz: DiscoveredBusiness) {
    if (biz.business_type === 'property') {
      // Navigate to browse with the property pre-selected for booking
      navigate(`/browse?property_id=${biz.id}&property_name=${encodeURIComponent(biz.name)}`);
    } else {
      // Navigate to orders with supplier pre-filled
      navigate(`/orders?supplier_id=${biz.id}&supplier_name=${encodeURIComponent(biz.name)}`);
    }
  }

  const myCountryData = getCountryByCode(myCountry);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">🔍 Discover Businesses</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Find businesses selling products you need — search by name, location, or product type
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search e.g. 'agricultural inputs', 'electronics', 'Kampala'..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="pl-10 h-11"
        />
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          {([
            { key: 'all', label: 'All', icon: '🌐' },
            { key: 'business', label: 'Business', icon: '🏪' },
            { key: 'factory', label: 'Factory', icon: '🏭' },
            { key: 'property', label: 'FlexRent', icon: '🏠' },
          ] as const).map(t => (
            <Button key={t.key} variant={filterType === t.key ? 'default' : 'outline'} size="sm" className="text-xs gap-1.5"
              onClick={() => setFilterType(t.key)}>
              <span>{t.icon}</span> {t.label}
            </Button>
          ))}
        </div>

        {myCountry && (
          <div className="flex items-center gap-2">
            <Button variant={filterCountry ? 'default' : 'outline'} size="sm" className="text-xs gap-1.5" onClick={() => setFilterCountry(true)}>
              {myCountryData?.flag} Near me ({myCountryData?.name})
            </Button>
            <Button variant={!filterCountry ? 'default' : 'outline'} size="sm" className="text-xs gap-1.5" onClick={() => setFilterCountry(false)}>
              <Globe className="h-3 w-3" /> All countries
            </Button>
          </div>
        )}
      </div>

      <AdSpace variant="compact" />

      {/* Results */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Searching...</div>
      ) : results.length === 0 && hasSearched ? (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">No businesses found for "{query}"</p>
          <p className="text-xs text-muted-foreground mt-1">Try different keywords or switch to "All countries"</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {results.map(biz => (
            <Card key={biz.id} className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedBiz(biz)}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  {biz.logo_url ? (
                    <img src={biz.logo_url} alt={biz.name} className="h-10 w-10 rounded-lg object-cover border" />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-lg">
                      {biz.business_type === 'factory' ? '🏭' : biz.business_type === 'property' ? '🏠' : '🏪'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{biz.name}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge variant="secondary" className="text-[10px]">
                        {biz.business_type === 'factory' ? (
                          <><Factory className="h-3 w-3 mr-1" />Factory</>
                        ) : biz.business_type === 'property' ? (
                          <><Home className="h-3 w-3 mr-1" />Property</>
                        ) : (
                          <><Store className="h-3 w-3 mr-1" />Business</>
                        )}
                      </Badge>
                      {biz.country_code && (
                        <span className="text-sm" title={getCountryByCode(biz.country_code)?.name}>
                          {getCountryFlag(biz.country_code)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {biz.products_description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{biz.products_description}</p>
                )}

                <div className="space-y-1.5 text-xs text-muted-foreground">
                  {biz.address && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{biz.address}</span>
                    </div>
                  )}
                  {biz.contact && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3 w-3 shrink-0" />
                      <span>{biz.contact}</span>
                    </div>
                  )}
                </div>

                {biz.business_code && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs font-mono gap-1"
                      onClick={(e) => { e.stopPropagation(); copyCode(biz.business_code!); }}
                    >
                      {copiedCode === biz.business_code ? (
                        <><Check className="h-3 w-3 text-primary" />Copied!</>
                      ) : (
                        <><Copy className="h-3 w-3" />{biz.business_code}</>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 text-xs gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOrderOrBook(biz);
                      }}
                    >
                      {biz.business_type === 'property' ? (
                        <><CalendarCheck className="h-3 w-3" /> Book Now</>
                      ) : (
                        <><ShoppingCart className="h-3 w-3" /> Order Now</>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <BusinessDetailDialog
        business={selectedBiz}
        open={!!selectedBiz}
        onOpenChange={(open) => { if (!open) setSelectedBiz(null); }}
        onOrderOrBook={handleOrderOrBook}
      />
    </div>
  );
}
