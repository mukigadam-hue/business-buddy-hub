import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Phone, Building2, Factory, Store, Copy, Check, Globe, ShoppingCart, CalendarCheck, Home, ArrowLeft, Circle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import BusinessDetailDialog from '@/components/BusinessDetailDialog';
import ImageLightbox from '@/components/ImageLightbox';
import AdSpace from '@/components/AdSpace';
import { useBusiness } from '@/context/BusinessContext';
import { getCountryFlag, getCountryByCode, COUNTRIES } from '@/lib/countries';
import { activityStatus } from '@/lib/relativeTime';

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
  district: string;
  last_active_at?: string | null;
}

type Scope = 'near' | 'world';

interface CountryCount {
  country_code: string;
  business_count: number;
}

export default function DiscoverPage() {
  const { t } = useTranslation();
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
  const [scope, setScope] = useState<Scope>('near');
  // When scope === 'world' and no country picked → show country grid.
  // When user clicks a country → drill in to that country's businesses.
  const [pickedCountry, setPickedCountry] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'business' | 'factory' | 'property'>('all');
  const [districtFilter, setDistrictFilter] = useState('');
  const [logoLightbox, setLogoLightbox] = useState<string | null>(null);

  const [countryCounts, setCountryCounts] = useState<CountryCount[]>([]);
  const [countryCountsLoading, setCountryCountsLoading] = useState(false);
  const [countryQuery, setCountryQuery] = useState('');

  // Tick every 15s so activity labels stay close to real time.
  const [, setNowTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setNowTick(t => t + 1), 15_000);
    return () => clearInterval(id);
  }, []);

  const myCountry = (currentBusiness as any)?.country_code || '';
  const myCountryData = getCountryByCode(myCountry);

  // Effective country filter for the search call.
  // - scope 'near'   → myCountry
  // - scope 'world' + pickedCountry → that country
  // - scope 'world' + no pickedCountry → '' (used only for query-driven search; otherwise we render the country grid)
  const effectiveCountry = scope === 'near' ? myCountry : pickedCountry;
  const showCountryGrid = scope === 'world' && !pickedCountry && query.trim() === '';

  const searchBusinesses = useCallback(async (searchQuery: string) => {
    if (showCountryGrid) return; // skip business search while browsing countries
    if (!navigator.onLine) {
      const cached: DiscoveredBusiness[] = (() => { try { return JSON.parse(localStorage.getItem('biztrack_cache_discover') || '[]'); } catch { return []; } })();
      const q = searchQuery.toLowerCase();
      const filtered = cached.filter(b =>
        (!q || b.name.toLowerCase().includes(q) || b.address?.toLowerCase().includes(q) || b.products_description?.toLowerCase().includes(q) || (b.district && b.district.toLowerCase().includes(q))) &&
        (filterType === 'all' || b.business_type === filterType) &&
        (!effectiveCountry || b.country_code === effectiveCountry) &&
        (!districtFilter || (b.district && b.district.toLowerCase().includes(districtFilter.toLowerCase())))
      );
      setResults(filtered);
      setHasSearched(true);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await (supabase.rpc as any)('search_businesses', {
        _query: searchQuery,
        _limit: 30,
        _offset: 0,
        _country_code: effectiveCountry,
        _district: districtFilter.trim(),
      });
      if (error) throw error;
      const allResults = (data as DiscoveredBusiness[]) || [];
      const displayResults = filterType === 'all' ? allResults : allResults.filter(b => b.business_type === filterType);

      // Enrich with last_active_at so we can show "Active X ago" badges.
      const ids = displayResults.map(b => b.id);
      if (ids.length) {
        const { data: activity } = await supabase
          .from('businesses')
          .select('id,last_active_at')
          .in('id', ids);
        const map = new Map<string, string>();
        (activity || []).forEach((row: any) => map.set(row.id, row.last_active_at));
        displayResults.forEach(b => { b.last_active_at = map.get(b.id) || null; });
      }

      setResults(displayResults);
      setHasSearched(true);
      try {
        const existing: DiscoveredBusiness[] = JSON.parse(localStorage.getItem('biztrack_cache_discover') || '[]');
        const merged = [...existing];
        for (const biz of displayResults) {
          const idx = merged.findIndex(b => b.id === biz.id);
          if (idx >= 0) merged[idx] = biz;
          else merged.push(biz);
        }
        localStorage.setItem('biztrack_cache_discover', JSON.stringify(merged.slice(-200)));
      } catch {}
    } catch (err) {
      console.error('Search error:', err);
      toast.error('Failed to search businesses');
    } finally {
      setLoading(false);
    }
  }, [effectiveCountry, filterType, districtFilter, showCountryGrid]);

  // Load country counts when entering world view (no picked country yet).
  useEffect(() => {
    if (!showCountryGrid) return;
    let cancelled = false;
    (async () => {
      setCountryCountsLoading(true);
      try {
        const { data, error } = await (supabase.rpc as any)('get_country_business_counts');
        if (error) throw error;
        if (!cancelled) {
          setCountryCounts(
            (data || []).map((r: any) => ({
              country_code: r.country_code,
              business_count: Number(r.business_count) || 0,
            }))
          );
        }
      } catch (e) {
        console.error('Country counts error:', e);
      } finally {
        if (!cancelled) setCountryCountsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [showCountryGrid]);

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
      navigate(`/browse?property_id=${biz.id}&property_name=${encodeURIComponent(biz.name)}`);
    } else {
      navigate(`/orders?supplier_id=${biz.id}&supplier_name=${encodeURIComponent(biz.name)}`);
    }
  }

  // Build country list for the world grid: every world country + business count (0 when unknown).
  const countryList = useMemo(() => {
    const counts = new Map(countryCounts.map(c => [c.country_code, c.business_count]));
    const q = countryQuery.trim().toLowerCase();
    return COUNTRIES
      .map(c => ({ ...c, business_count: counts.get(c.code) || 0 }))
      .filter(c => !q || c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q))
      .sort((a, b) => {
        if (b.business_count !== a.business_count) return b.business_count - a.business_count;
        return a.name.localeCompare(b.name);
      });
  }, [countryCounts, countryQuery]);

  const pickedCountryData = getCountryByCode(pickedCountry);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">🔍 {t('discover.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Find businesses selling products you need — search by name, location, or product type
        </p>
      </div>

      {/* Search Bar (always available) */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search e.g. 'agricultural inputs', 'electronics', 'Kampala'..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="pl-10 h-11"
        />
      </div>

      {/* Scope toggle */}
      {myCountry && (
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={scope === 'near' ? 'default' : 'outline'}
            size="sm"
            className="text-xs gap-1.5"
            onClick={() => { setScope('near'); setPickedCountry(''); }}
          >
            {myCountryData?.flag} Near me ({myCountryData?.name})
          </Button>
          <Button
            variant={scope === 'world' ? 'default' : 'outline'}
            size="sm"
            className="text-xs gap-1.5"
            onClick={() => { setScope('world'); setPickedCountry(''); }}
          >
            <Globe className="h-3 w-3" /> All countries
          </Button>
          {scope === 'world' && pickedCountry && (
            <Button variant="ghost" size="sm" className="text-xs gap-1.5" onClick={() => setPickedCountry('')}>
              <ArrowLeft className="h-3 w-3" /> Back to countries
            </Button>
          )}
        </div>
      )}

      {/* === World view: country grid === */}
      {showCountryGrid ? (
        <>
          <div className="rounded-lg border bg-card p-3">
            <p className="text-sm font-medium mb-1">Browse by country</p>
            <p className="text-xs text-muted-foreground mb-3">
              Tap any country to see the businesses there. The number shows how many businesses use Business Manager in that country.
            </p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter countries..."
                value={countryQuery}
                onChange={e => setCountryQuery(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
          </div>

          <AdSpace variant="compact" />

          {countryCountsLoading && countryCounts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Loading countries...</div>
          ) : (
            <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {countryList.map(c => {
                const hasUsers = c.business_count > 0;
                return (
                  <button
                    key={c.code}
                    onClick={() => { setPickedCountry(c.code); setDistrictFilter(''); }}
                    className={`text-left rounded-lg border bg-card p-3 hover:border-primary hover:shadow-sm transition-all min-h-[44px] ${
                      hasUsers ? '' : 'opacity-70'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-2xl leading-none">{c.flag}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{c.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {hasUsers
                            ? `${c.business_count} ${c.business_count === 1 ? 'business' : 'businesses'}`
                            : 'No businesses yet'}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Business-type & district filters (shown when listing businesses) */}
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

            {scope === 'world' && pickedCountry && pickedCountryData && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-xl">{pickedCountryData.flag}</span>
                <span className="font-medium">Showing businesses in {pickedCountryData.name}</span>
              </div>
            )}

            {effectiveCountry && (
              <div className="relative">
                <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Filter by District, Region, Province, or Address..."
                  value={districtFilter}
                  onChange={e => setDistrictFilter(e.target.value)}
                  className="pl-8 h-9 text-sm"
                />
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
              <p className="text-muted-foreground">No businesses found{query ? ` for "${query}"` : ''}</p>
              <p className="text-xs text-muted-foreground mt-1">Try different keywords or switch to "All countries"</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {results.map(biz => (
                <Card key={biz.id} className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedBiz(biz)}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      {biz.logo_url ? (
                        <img
                          src={biz.logo_url}
                          alt={biz.name}
                          className="h-10 w-10 rounded-lg object-cover border cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={(e) => { e.stopPropagation(); setLogoLightbox(biz.logo_url!); }}
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-lg">
                          {biz.business_type === 'factory' ? '🏭' : biz.business_type === 'property' ? '🏠' : '🏪'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">{biz.name}</h3>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
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
                        {/* Real-time activity indicator */}
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`h-2 w-2 rounded-full ${activityDotClass(biz.last_active_at)}`} />
                          <span className="text-[11px] text-muted-foreground">
                            Active {timeAgo(biz.last_active_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {biz.products_description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{biz.products_description}</p>
                    )}

                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      {biz.district && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3 w-3 shrink-0 text-primary" />
                          <span className="font-medium text-foreground">{biz.district}</span>
                        </div>
                      )}
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
        </>
      )}

      <BusinessDetailDialog
        business={selectedBiz}
        open={!!selectedBiz}
        onOpenChange={(open) => { if (!open) setSelectedBiz(null); }}
        onOrderOrBook={handleOrderOrBook}
      />

      <ImageLightbox
        images={logoLightbox ? [logoLightbox] : []}
        open={!!logoLightbox}
        onOpenChange={(o) => { if (!o) setLogoLightbox(null); }}
        title="Business Logo"
      />
    </div>
  );
}
