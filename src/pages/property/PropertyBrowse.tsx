import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useCurrency } from '@/hooks/useCurrency';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, MapPin, Phone, Copy } from 'lucide-react';
import { toast } from 'sonner';
import AdSpace, { withInlineAds } from '@/components/AdSpace';

interface SearchAsset {
  id: string;
  business_id: string;
  name: string;
  description: string;
  category: string;
  sub_category: string;
  location: string;
  area_size: number;
  area_unit: string;
  hourly_price: number;
  daily_price: number;
  monthly_price: number;
  image_url_1: string;
  owner_name: string;
  owner_contact: string;
  features: string;
  business_name: string;
  business_contact: string;
}

export default function PropertyBrowse() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currency, fmt } = useCurrency();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [location, setLocation] = useState('');
  const [results, setResults] = useState<SearchAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [contactAsset, setContactAsset] = useState<SearchAsset | null>(null);

  useEffect(() => { searchAssets(); }, []);

  async function searchAssets() {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('search_property_assets', {
        _query: query || '',
        _category: category === 'all' ? '' : category,
        _location: location || '',
      });
      if (!error) setResults((data || []) as SearchAsset[]);
      else console.error('Search error:', error);
    } catch (err) {
      console.error('Search failed:', err);
      setResults([]);
    }
    setLoading(false);
  }

  async function copyAssetCode(assetId: string) {
    // Fetch asset code
    const { data } = await supabase.from('property_assets').select('asset_code').eq('id', assetId).single();
    const code = (data as any)?.asset_code;
    if (code) {
      navigator.clipboard.writeText(code);
      toast.success(`Asset code "${code}" copied! Paste it in Bookings → Book Now`);
    } else {
      toast.error('Asset code not available');
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">🔍 {t('property.browseAssets', 'Browse Rentals')}</h1>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t('property.searchPlaceholder', 'Search by name, location...')} value={query} onChange={e => setQuery(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-36 h-9"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="land">🏞️ Land</SelectItem>
            <SelectItem value="vehicle">🚗 Vehicle</SelectItem>
            <SelectItem value="vessel">🚢 Vessel</SelectItem>
          </SelectContent>
        </Select>
        <Input placeholder="Location..." value={location} onChange={e => setLocation(e.target.value)} className="w-36 h-9" />
        <Button onClick={searchAssets} size="sm" className="h-9">Search</Button>
      </div>

      {loading ? (
        <div className="text-center py-8"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>
      ) : results.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No assets found. Try different filters.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {withInlineAds(results, (asset) => (
            <Card key={asset.id} className="overflow-hidden">
              {asset.image_url_1 && (
                <div className="h-36 overflow-hidden">
                  <img src={asset.image_url_1} alt={asset.name} className="w-full h-full object-cover" />
                </div>
              )}
              <CardContent className="p-3 space-y-2">
                <h3 className="font-semibold text-sm">{asset.name}</h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{asset.location}</p>
                <p className="text-xs">{asset.category === 'land' ? '🏞️' : asset.category === 'vehicle' ? '🚗' : '🚢'} {asset.sub_category || asset.category}</p>
                {asset.description && <p className="text-xs text-muted-foreground line-clamp-2">{asset.description}</p>}
                <div className="flex gap-2 text-xs font-medium">
                  {asset.hourly_price > 0 && <Badge variant="outline">{fmt(asset.hourly_price)}/hr</Badge>}
                  {asset.daily_price > 0 && <Badge variant="outline">{fmt(asset.daily_price)}/day</Badge>}
                  {asset.monthly_price > 0 && <Badge variant="outline">{fmt(asset.monthly_price)}/mo</Badge>}
                </div>
                {asset.features && (
                  <div className="flex flex-wrap gap-1">
                    {asset.features.split(',').slice(0, 3).map((f, i) => (
                      <Badge key={i} variant="secondary" className="text-[9px]">{f.trim()}</Badge>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">By: {asset.business_name}</p>
                <div className="flex gap-1 pt-1">
                  <Button size="sm" className="flex-1 h-7 text-xs" onClick={() => copyAssetCode(asset.id)}>
                    <Copy className="h-3 w-3 mr-1" /> Copy Code
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setContactAsset(asset)}>
                    <Phone className="h-3 w-3 mr-1" /> Contact
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Contact Dialog */}
      <Dialog open={!!contactAsset} onOpenChange={() => setContactAsset(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact Owner</DialogTitle>
          </DialogHeader>
          {contactAsset && (
            <div className="space-y-3">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-semibold">{contactAsset.owner_name || contactAsset.business_name}</p>
                <p className="text-sm text-muted-foreground">📞 {contactAsset.owner_contact || contactAsset.business_contact}</p>
              </div>
              <p className="text-xs text-muted-foreground">You can call or message this owner directly. To book, copy the asset code and use "Book Now" in Bookings.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
