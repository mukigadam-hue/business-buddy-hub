import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useCurrency } from '@/hooks/useCurrency';
import { enqueueOfflineOperation } from '@/hooks/useOfflineQueue';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, MapPin, Phone, Copy, CalendarCheck, Send } from 'lucide-react';
import { toast } from 'sonner';
import { toTitleCase, toSentenceCase } from '@/lib/utils';
import AdSpace, { withInlineAds } from '@/components/AdSpace';
import { PaymentMethodsViewer } from '@/components/PaymentMethodsManager';
import ImageLightbox from '@/components/ImageLightbox';

const PAYMENT_FREQUENCIES = [
  { value: 'monthly', label: 'Every Month' },
  { value: 'quarterly', label: 'Every 3 Months' },
  { value: 'biannual', label: 'Every 6 Months' },
  { value: 'annual', label: 'Every 12 Months' },
  { value: 'one-time', label: 'One-Time Payment' },
];

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

function BookingDialog({ open, onClose, asset, propertyName }: { open: boolean; onClose: () => void; asset: any; propertyName?: string }) {
  const { user } = useAuth();
  const { fmt } = useCurrency();
  const [renterName, setRenterName] = useState('');
  const [renterContact, setRenterContact] = useState('');
  const [renterOccupation, setRenterOccupation] = useState('');
  const [rentalPurpose, setRentalPurpose] = useState('');
  const [renterGender, setRenterGender] = useState('');
  const [renterAge, setRenterAge] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [durationType, setDurationType] = useState('daily');
  const [paymentFrequency, setPaymentFrequency] = useState('monthly');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!asset) return null;

  async function handleBook() {
    if (!asset || !user || !startDate || !endDate || !renterName.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSubmitting(true);

    const priceMap: Record<string, number> = {
      hourly: asset.hourly_price,
      daily: asset.daily_price,
      monthly: asset.monthly_price,
    };
    const price = priceMap[durationType] || asset.daily_price;
    const start = new Date(startDate);
    const end = new Date(endDate);
    let units = 1;
    if (durationType === 'hourly') units = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 3600000));
    else if (durationType === 'daily') units = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
    else units = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (86400000 * 30)));

    const totalPrice = price * units;
    const bookingData = {
      asset_id: asset.id,
      business_id: asset.business_id,
      renter_id: user!.id,
      renter_name: toTitleCase(renterName.trim()),
      renter_contact: renterContact.trim(),
      start_date: start.toISOString(),
      end_date: end.toISOString(),
      duration_type: durationType,
      payment_frequency: paymentFrequency,
      total_price: totalPrice,
      agreed_amount: totalPrice,
      status: 'pending',
      notes: toSentenceCase(notes.trim()),
      renter_occupation: toSentenceCase(renterOccupation.trim()),
      rental_purpose: toSentenceCase(rentalPurpose.trim()),
      gender: renterGender,
      age: renterAge ? parseInt(renterAge) : null,
      expected_payment_date: end.toISOString(),
    };

    if (!navigator.onLine) {
      enqueueOfflineOperation({
        action: 'create_property_booking',
        payload: {
          booking: bookingData,
          notify: {
            title: '📅 New Booking Request',
            message: `${toTitleCase(renterName.trim())} wants to rent "${asset.name}" from ${start.toLocaleDateString()} to ${end.toLocaleDateString()}. Total: ${totalPrice}. Payment: ${paymentFrequency}.`,
          },
        },
      });
      toast.success('Booking saved offline — it will send when internet returns');
      setSubmitting(false);
      onClose();
      return;
    }

    const { data: hasConflict } = await supabase.rpc('check_booking_conflict', {
      _asset_id: asset.id,
      _start: start.toISOString(),
      _end: end.toISOString(),
    });
    if (hasConflict) { toast.error('This asset is already booked for these dates'); setSubmitting(false); return; }

    const { error } = await supabase.from('property_bookings').insert(bookingData as any);
    if (error) { toast.error(error.message); setSubmitting(false); return; }

    // Auto-save property owner as contact
    try {
      const { data: userBiz } = await supabase.from('business_memberships')
        .select('business_id').eq('user_id', user!.id).limit(1);
      if (userBiz && userBiz.length > 0) {
        const myBizId = userBiz[0].business_id;
        const { data: existingContact } = await supabase.from('business_contacts')
          .select('id').eq('business_id', myBizId)
          .eq('contact_business_id', asset.business_id).limit(1);
        if (!existingContact || existingContact.length === 0) {
          await supabase.from('business_contacts').insert({
            business_id: myBizId,
            contact_business_id: asset.business_id,
            nickname: asset.business_name || asset.owner_name || 'Property Owner',
          });
        }
      }
    } catch (e) { /* silent */ }

    toast.success('Booking request sent!');
    setSubmitting(false);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CalendarCheck className="h-5 w-5" /> Book Now</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Asset Preview */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-3 space-y-1">
              {asset.image_url_1 && (
                <img src={asset.image_url_1} alt="" className="w-full h-28 object-cover rounded-lg mb-2" />
              )}
              <p className="font-semibold text-sm">{asset.name}</p>
              <p className="text-xs text-muted-foreground">📍 {asset.location}</p>
              <p className="text-xs text-muted-foreground">By: {propertyName || asset.business_name || asset.owner_name || 'Owner'}</p>
              <div className="flex gap-2 text-xs font-medium mt-1">
                {asset.hourly_price > 0 && <Badge variant="outline">{fmt(asset.hourly_price)}/hr</Badge>}
                {asset.daily_price > 0 && <Badge variant="outline">{fmt(asset.daily_price)}/day</Badge>}
                {asset.monthly_price > 0 && <Badge variant="outline">{fmt(asset.monthly_price)}/mo</Badge>}
              </div>
            </CardContent>
          </Card>

          {/* Renter Info */}
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Your Name *</Label><Input value={renterName} onChange={e => setRenterName(e.target.value)} /></div>
            <div><Label>Your Phone</Label><Input value={renterContact} onChange={e => setRenterContact(e.target.value)} /></div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div><Label>Your Occupation</Label><Input value={renterOccupation} onChange={e => setRenterOccupation(e.target.value)} placeholder="e.g. Farmer, Driver..." /></div>
            <div><Label>Purpose of Renting *</Label><Input value={rentalPurpose} onChange={e => setRentalPurpose(e.target.value)} placeholder="e.g. Farming, Transport..." /></div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Gender</Label>
              <Select value={renterGender} onValueChange={setRenterGender}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Age</Label><Input type="number" min="0" max="150" value={renterAge} onChange={e => setRenterAge(e.target.value)} placeholder="e.g. 30" /></div>
          </div>

          {/* Duration & Payment Frequency */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Billing Duration</Label>
              <Select value={durationType} onValueChange={setDurationType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {asset.hourly_price > 0 && <SelectItem value="hourly">Hourly ({fmt(asset.hourly_price)}/hr)</SelectItem>}
                  {asset.daily_price > 0 && <SelectItem value="daily">Daily ({fmt(asset.daily_price)}/day)</SelectItem>}
                  {asset.monthly_price > 0 && <SelectItem value="monthly">Monthly ({fmt(asset.monthly_price)}/mo)</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payment Frequency</Label>
              <Select value={paymentFrequency} onValueChange={setPaymentFrequency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_FREQUENCIES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div><Label>Start *</Label><Input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
            <div><Label>End *</Label><Input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
          </div>

          <div>
            <Label>Message to Owner</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any special requests or comments..." rows={2} />
          </div>

          {/* Show landlord's registered payment methods */}
          {asset.business_id && (
            <div className="p-3 bg-muted/30 rounded-lg border">
              <p className="text-xs font-semibold mb-2">💰 Owner's Accepted Payment Methods</p>
              <PaymentMethodsViewer businessId={asset.business_id} />
            </div>
          )}

          <Button onClick={handleBook} disabled={submitting} className="w-full">
            <Send className="h-4 w-4 mr-2" />{submitting ? 'Sending...' : 'Send Booking Request'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function PropertyBrowse() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currency, fmt } = useCurrency();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [location, setLocation] = useState('');
  const [results, setResults] = useState<SearchAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [contactAsset, setContactAsset] = useState<SearchAsset | null>(null);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxTitle, setLightboxTitle] = useState('');

  // Booking dialog state
  const [bookingAsset, setBookingAsset] = useState<any>(null);
  const [bookingPropertyName, setBookingPropertyName] = useState('');

  // Pre-filled property from Discover
  const prefilledPropertyId = searchParams.get('property_id');
  const prefilledPropertyName = searchParams.get('property_name') || '';
  const [propertyAssets, setPropertyAssets] = useState<any[]>([]);
  const [loadingPropertyAssets, setLoadingPropertyAssets] = useState(false);

  useEffect(() => { 
    if (prefilledPropertyId) {
      loadPropertyAssets();
    } else {
      searchAssets(); // Auto-search on mount and filter changes
    }
  }, [category, location]);

  async function loadPropertyAssets() {
    if (!prefilledPropertyId) return;
    setLoadingPropertyAssets(true);
    const { data } = await supabase
      .from('property_assets')
      .select('*')
      .eq('business_id', prefilledPropertyId)
      .eq('is_available', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    setPropertyAssets(data || []);
    setLoadingPropertyAssets(false);
  }

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

  function handleBookAsset(asset: any, ownerName?: string) {
    setBookingAsset(asset);
    setBookingPropertyName(ownerName || prefilledPropertyName || '');
  }

  async function copyAssetCode(assetId: string) {
    const { data } = await supabase.from('property_assets').select('asset_code').eq('id', assetId).single();
    const code = (data as any)?.asset_code;
    if (code) {
      navigator.clipboard.writeText(code);
      toast.success(`Asset code "${code}" copied!`);
    } else {
      toast.error('Asset code not available');
    }
  }

  // Show property-specific asset list when coming from Discover
  if (prefilledPropertyId) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold">🏠 {prefilledPropertyName || 'Property'}</h1>
          <p className="text-sm text-muted-foreground mt-1">Select an asset to book from this property</p>
        </div>

        {loadingPropertyAssets ? (
          <div className="text-center py-8"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>
        ) : propertyAssets.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No available assets from this property</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {propertyAssets.map((asset: any) => (
              <Card key={asset.id} className="overflow-hidden">
                {asset.image_url_1 && (
                  <button className="h-36 overflow-hidden w-full" onClick={() => { setLightboxImages([asset.image_url_1, asset.image_url_2, asset.image_url_3].filter(Boolean)); setLightboxTitle(asset.name); }}>
                    <img src={asset.image_url_1} alt={asset.name} className="w-full h-full object-cover" />
                  </button>
                )}
                <CardContent className="p-3 space-y-2">
                  <h3 className="font-semibold text-sm">{asset.name}</h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{asset.location}</p>
                  <p className="text-xs">{asset.category === 'house' ? '🏠' : asset.category === 'land' ? '🏞️' : asset.category === 'vehicle' ? '🚗' : '🚢'} {asset.sub_category || asset.category}</p>
                  {asset.description && <p className="text-xs text-muted-foreground line-clamp-2">{asset.description}</p>}
                  <div className="flex gap-2 text-xs font-medium">
                    {asset.hourly_price > 0 && <Badge variant="outline">{fmt(asset.hourly_price)}/hr</Badge>}
                    {asset.daily_price > 0 && <Badge variant="outline">{fmt(asset.daily_price)}/day</Badge>}
                    {asset.monthly_price > 0 && <Badge variant="outline">{fmt(asset.monthly_price)}/mo</Badge>}
                  </div>
                  <Button size="sm" className="w-full h-8 text-xs gap-1" onClick={() => handleBookAsset(asset, prefilledPropertyName)}>
                    <CalendarCheck className="h-3 w-3" /> Book Now
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <BookingDialog
          open={!!bookingAsset}
          onClose={() => setBookingAsset(null)}
          asset={bookingAsset}
          propertyName={bookingPropertyName}
        />
      </div>
    );
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
            <SelectItem value="house">🏠 House</SelectItem>
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
                <button className="h-36 overflow-hidden w-full" onClick={() => { setLightboxImages([asset.image_url_1].filter(Boolean)); setLightboxTitle(asset.name); }}>
                  <img src={asset.image_url_1} alt={asset.name} className="w-full h-full object-cover" />
                </button>
              )}
              <CardContent className="p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-sm">{asset.name}</h3>
                  <Badge variant="default" className="text-[9px] bg-success/10 text-success border-success/20 shrink-0">✅ Available</Badge>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{asset.location}</p>
                <p className="text-xs">{asset.category === 'house' ? '🏠' : asset.category === 'land' ? '🏞️' : asset.category === 'vehicle' ? '🚗' : '🚢'} {asset.sub_category || asset.category}</p>
                {asset.area_size > 0 && <p className="text-[10px] text-muted-foreground">📐 {asset.area_size} {asset.area_unit}</p>}
                {(asset as any).total_rooms > 0 && <p className="text-[10px] text-muted-foreground">🚪 {(asset as any).total_rooms} rooms {(asset as any).room_size ? `· ${(asset as any).room_size}` : ''}</p>}
                {asset.description && <p className="text-xs text-muted-foreground line-clamp-2">{asset.description}</p>}
                <div className="flex gap-2 text-xs font-medium">
                  {asset.hourly_price > 0 && <Badge variant="outline">{fmt(asset.hourly_price)}/hr</Badge>}
                  {asset.daily_price > 0 && <Badge variant="outline">{fmt(asset.daily_price)}/day</Badge>}
                  {asset.monthly_price > 0 && <Badge variant="outline">{fmt(asset.monthly_price)}/mo</Badge>}
                </div>
                {asset.features && (
                  <div className="flex flex-wrap gap-1">
                    {asset.features.split(',').slice(0, 3).map((f: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-[9px]">{f.trim()}</Badge>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">By: {asset.business_name}</p>
                <div className="flex gap-1 pt-1">
                  <Button size="sm" className="flex-1 h-7 text-xs gap-1" onClick={() => handleBookAsset(asset, asset.business_name)}>
                    <CalendarCheck className="h-3 w-3" /> Book Now
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => copyAssetCode(asset.id)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setContactAsset(asset)}>
                    <Phone className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ), 8)}
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
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Booking Dialog */}
      <BookingDialog
        open={!!bookingAsset}
        onClose={() => setBookingAsset(null)}
        asset={bookingAsset}
        propertyName={bookingPropertyName}
      />

      <ImageLightbox
        images={lightboxImages}
        open={lightboxImages.length > 0}
        onOpenChange={(o) => { if (!o) setLightboxImages([]); }}
        title={lightboxTitle}
      />
    </div>
  );
}
