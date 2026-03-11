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
import { Search, MapPin, Calendar, MessageSquare, Phone } from 'lucide-react';
import { toast } from 'sonner';

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
  const { currency } = useCurrency();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [location, setLocation] = useState('');
  const [results, setResults] = useState<SearchAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [bookingAsset, setBookingAsset] = useState<SearchAsset | null>(null);
  const [contactAsset, setContactAsset] = useState<SearchAsset | null>(null);

  // Booking form
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [durationType, setDurationType] = useState('daily');
  const [renterName, setRenterName] = useState('');
  const [renterContact, setRenterContact] = useState('');

  useEffect(() => {
    searchAssets();
  }, []);

  async function searchAssets() {
    setLoading(true);
    const { data, error } = await supabase.rpc('search_property_assets', {
      _query: query,
      _category: category === 'all' ? '' : category,
      _location: location,
    });
    if (!error) setResults((data || []) as SearchAsset[]);
    setLoading(false);
  }

  async function handleBook() {
    if (!bookingAsset || !user || !startDate || !endDate) return;
    const priceMap: Record<string, number> = {
      hourly: bookingAsset.hourly_price,
      daily: bookingAsset.daily_price,
      monthly: bookingAsset.monthly_price,
    };
    const price = priceMap[durationType] || bookingAsset.daily_price;
    const start = new Date(startDate);
    const end = new Date(endDate);
    let units = 1;
    if (durationType === 'hourly') units = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 3600000));
    else if (durationType === 'daily') units = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
    else units = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (86400000 * 30)));

    // Check conflict
    const { data: hasConflict } = await supabase.rpc('check_booking_conflict', {
      _asset_id: bookingAsset.id,
      _start: start.toISOString(),
      _end: end.toISOString(),
    });
    if (hasConflict) { toast.error(t('property.alreadyBooked', 'This asset is already booked for these dates')); return; }

    const { error } = await supabase.from('property_bookings').insert({
      asset_id: bookingAsset.id,
      business_id: bookingAsset.business_id,
      renter_id: user.id,
      renter_name: renterName,
      renter_contact: renterContact,
      start_date: start.toISOString(),
      end_date: end.toISOString(),
      duration_type: durationType,
      total_price: price * units,
      status: 'pending',
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success(t('property.bookingRequested', 'Booking request sent!'));
    setBookingAsset(null);
  }

  async function handleStartChat(asset: SearchAsset) {
    if (!user) return;
    // Check existing conversation
    const { data: existing } = await supabase.from('property_conversations')
      .select('id')
      .eq('asset_id', asset.id)
      .eq('renter_id', user.id)
      .eq('business_id', asset.business_id)
      .limit(1);
    
    let convId: string;
    if (existing && existing.length > 0) {
      convId = existing[0].id;
    } else {
      const { data, error } = await supabase.from('property_conversations').insert({
        asset_id: asset.id,
        business_id: asset.business_id,
        renter_id: user.id,
      } as any).select('id').single();
      if (error) { toast.error(error.message); return; }
      convId = data?.id;
    }
    // Send initial message
    await supabase.from('property_messages').insert({
      conversation_id: convId,
      sender_id: user.id,
      message: `Hi, I'm interested in "${asset.name}". Is it available?`,
    } as any);
    toast.success(t('property.messageSent', 'Message sent to the owner!'));
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
          <SelectTrigger className="w-36 h-9"><SelectValue placeholder={t('property.allCategories', 'All Types')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="land">🏞️ Land</SelectItem>
            <SelectItem value="vehicle">🚗 Vehicle</SelectItem>
            <SelectItem value="vessel">🚢 Vessel</SelectItem>
          </SelectContent>
        </Select>
        <Input placeholder={t('property.locationFilter', 'Location...')} value={location} onChange={e => setLocation(e.target.value)} className="w-36 h-9" />
        <Button onClick={searchAssets} size="sm" className="h-9">{t('common.search', 'Search')}</Button>
      </div>

      {loading ? (
        <div className="text-center py-8"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>
      ) : results.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">{t('property.noResults', 'No assets found. Try different filters.')}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {results.map(asset => (
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
                  {asset.hourly_price > 0 && <Badge variant="outline">{currency}{asset.hourly_price}/hr</Badge>}
                  {asset.daily_price > 0 && <Badge variant="outline">{currency}{asset.daily_price}/day</Badge>}
                  {asset.monthly_price > 0 && <Badge variant="outline">{currency}{asset.monthly_price}/mo</Badge>}
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
                  <Button size="sm" className="flex-1 h-7 text-xs" onClick={() => setBookingAsset(asset)}>
                    <Calendar className="h-3 w-3 mr-1" />{t('property.book', 'Book')}
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleStartChat(asset)}>
                    <MessageSquare className="h-3 w-3 mr-1" />{t('property.chat', 'Chat')}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setContactAsset(asset)}>
                    <Phone className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Booking Dialog */}
      <Dialog open={!!bookingAsset} onOpenChange={() => setBookingAsset(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('property.bookAsset', 'Book')} — {bookingAsset?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label>{t('common.name', 'Your Name')}</Label><Input value={renterName} onChange={e => setRenterName(e.target.value)} /></div>
              <div><Label>{t('common.phone', 'Your Phone')}</Label><Input value={renterContact} onChange={e => setRenterContact(e.target.value)} /></div>
            </div>
            <div>
              <Label>{t('property.durationType', 'Duration Type')}</Label>
              <Select value={durationType} onValueChange={setDurationType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {bookingAsset?.hourly_price ? <SelectItem value="hourly">{t('property.hourly', 'Hourly')} ({currency}{bookingAsset.hourly_price}/hr)</SelectItem> : null}
                  {bookingAsset?.daily_price ? <SelectItem value="daily">{t('property.daily', 'Daily')} ({currency}{bookingAsset.daily_price}/day)</SelectItem> : null}
                  {bookingAsset?.monthly_price ? <SelectItem value="monthly">{t('property.monthly', 'Monthly')} ({currency}{bookingAsset.monthly_price}/mo)</SelectItem> : null}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>{t('property.startDate', 'Start')}</Label><Input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
              <div><Label>{t('property.endDate', 'End')}</Label><Input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
            </div>
            <Button onClick={handleBook} className="w-full">{t('property.requestBooking', 'Request Booking')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contact Dialog */}
      <Dialog open={!!contactAsset} onOpenChange={() => setContactAsset(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('property.contactOwner', 'Contact Owner')}</DialogTitle>
          </DialogHeader>
          {contactAsset && (
            <div className="space-y-3">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-semibold">{contactAsset.owner_name || contactAsset.business_name}</p>
                <p className="text-sm text-muted-foreground">📞 {contactAsset.owner_contact || contactAsset.business_contact}</p>
              </div>
              <p className="text-xs text-muted-foreground">{t('property.contactTip', 'You can call or message this owner directly.')}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
