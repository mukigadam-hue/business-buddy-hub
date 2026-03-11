import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useProperty } from '@/context/PropertyContext';
import { useBusiness } from '@/context/BusinessContext';
import { useCurrency } from '@/hooks/useCurrency';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarCheck, CheckCircle, XCircle, Clock, Camera, Plus, Search, MessageSquare, Send, Wallet, FileText, Copy } from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';
import { toast } from 'sonner';

function CheckInDialog({ bookingId, businessId, onClose }: { bookingId: string; businessId: string; onClose: () => void }) {
  const { t } = useTranslation();
  const { addCheckIn } = useProperty();
  const { user } = useAuth();
  const [checkType, setCheckType] = useState<'start' | 'end'>('start');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  async function handleSubmit() {
    if (!user) return;
    await addCheckIn({
      booking_id: bookingId,
      business_id: businessId,
      check_type: checkType,
      photo_urls: photos,
      notes,
      recorded_by: user.id,
    });
    onClose();
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Button variant={checkType === 'start' ? 'default' : 'outline'} onClick={() => setCheckType('start')} className="text-sm">
          {t('property.checkIn', 'Check-In')}
        </Button>
        <Button variant={checkType === 'end' ? 'default' : 'outline'} onClick={() => setCheckType('end')} className="text-sm">
          {t('property.checkOut', 'Check-Out')}
        </Button>
      </div>
      <div>
        <Label>{t('property.conditionNotes', 'Condition Notes')}</Label>
        <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Describe the condition..." />
      </div>
      <div>
        <p className="text-xs font-semibold mb-2">{t('property.conditionPhotos', 'Condition Photos')}</p>
        <div className="flex gap-3 flex-wrap">
          {[0, 1, 2].map(i => (
            <ImageUpload key={i} bucket="item-images" path="checkins" currentUrl={photos[i]} size="sm"
              onUploaded={url => setPhotos(p => { const n = [...p]; n[i] = url; return n; })}
              onRemoved={() => setPhotos(p => { const n = [...p]; n.splice(i, 1); return n; })}
              label={`Photo ${i + 1}`} />
          ))}
        </div>
      </div>
      <Button onClick={handleSubmit} className="w-full">{t('property.recordCheckIn', 'Record')}</Button>
    </div>
  );
}

function BookNowDialog({ open, onClose, prefilledPropertyId, prefilledPropertyName }: { open: boolean; onClose: () => void; prefilledPropertyId?: string; prefilledPropertyName?: string }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { fmt } = useCurrency();
  const [assetCode, setAssetCode] = useState('');
  const [searching, setSearching] = useState(false);
  const [foundAsset, setFoundAsset] = useState<any>(null);
  const [renterName, setRenterName] = useState('');
  const [renterContact, setRenterContact] = useState('');
  const [renterOccupation, setRenterOccupation] = useState('');
  const [rentalPurpose, setRentalPurpose] = useState('');
  const [renterGender, setRenterGender] = useState('');
  const [renterAge, setRenterAge] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [durationType, setDurationType] = useState('daily');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Property assets list for direct selection (from Discover)
  const [propertyAssets, setPropertyAssets] = useState<any[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);

  // Load property assets when coming from Discover
  useEffect(() => {
    if (open && prefilledPropertyId) {
      setLoadingAssets(true);
      supabase
        .from('property_assets')
        .select('*')
        .eq('business_id', prefilledPropertyId)
        .eq('is_available', true)
        .is('deleted_at', null)
        .then(({ data }) => {
          setPropertyAssets(data || []);
          setLoadingAssets(false);
        });
    }
  }, [open, prefilledPropertyId]);

  function selectPropertyAsset(asset: any) {
    setFoundAsset({ ...asset, businesses: { name: prefilledPropertyName || 'Owner' } });
  }

  async function searchAsset() {
    if (!assetCode.trim()) return;
    setSearching(true);
    setFoundAsset(null);
    const { data, error } = await supabase
      .from('property_assets')
      .select('*, businesses!property_assets_business_id_fkey(name, contact)')
      .eq('asset_code', assetCode.trim().toUpperCase())
      .eq('is_available', true)
      .is('deleted_at', null)
      .limit(1);
    
    if (error || !data || data.length === 0) {
      toast.error('No available asset found with that code');
      setSearching(false);
      return;
    }
    setFoundAsset(data[0]);
    setSearching(false);
  }

  async function handleBook() {
    if (!foundAsset || !user || !startDate || !endDate || !renterName.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSubmitting(true);
    
    const priceMap: Record<string, number> = {
      hourly: foundAsset.hourly_price,
      daily: foundAsset.daily_price,
      monthly: foundAsset.monthly_price,
    };
    const price = priceMap[durationType] || foundAsset.daily_price;
    const start = new Date(startDate);
    const end = new Date(endDate);
    let units = 1;
    if (durationType === 'hourly') units = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 3600000));
    else if (durationType === 'daily') units = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
    else units = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (86400000 * 30)));

    const { data: hasConflict } = await supabase.rpc('check_booking_conflict', {
      _asset_id: foundAsset.id,
      _start: start.toISOString(),
      _end: end.toISOString(),
    });
    if (hasConflict) { toast.error('This asset is already booked for these dates'); setSubmitting(false); return; }

    const totalPrice = price * units;
    const { error } = await supabase.from('property_bookings').insert({
      asset_id: foundAsset.id,
      business_id: foundAsset.business_id,
      renter_id: user.id,
      renter_name: renterName.trim(),
      renter_contact: renterContact.trim(),
      start_date: start.toISOString(),
      end_date: end.toISOString(),
      duration_type: durationType,
      total_price: totalPrice,
      agreed_amount: totalPrice,
      status: 'pending',
      notes: notes.trim(),
      renter_occupation: renterOccupation.trim(),
      rental_purpose: rentalPurpose.trim(),
      gender: renterGender,
      age: renterAge ? parseInt(renterAge) : null,
      expected_payment_date: end.toISOString(),
    } as any);
    if (error) { toast.error(error.message); setSubmitting(false); return; }
    toast.success('Booking request sent!');
    setSubmitting(false);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Book Now</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Property assets list from Discover or Asset Code Search */}
          {!foundAsset && prefilledPropertyId ? (
            <div>
              <p className="text-sm font-medium mb-2">🏠 Select an asset from <span className="text-primary">{prefilledPropertyName}</span>:</p>
              {loadingAssets ? (
                <p className="text-sm text-muted-foreground text-center py-4">Loading assets...</p>
              ) : propertyAssets.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No available assets from this property</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {propertyAssets.map(asset => (
                    <button key={asset.id} className="w-full text-left p-3 rounded-lg border hover:border-primary/50 hover:bg-primary/5 transition-colors"
                      onClick={() => selectPropertyAsset(asset)}>
                      <div className="flex items-center gap-3">
                        {asset.image_url_1 ? (
                          <img src={asset.image_url_1} alt="" className="h-12 w-12 rounded-lg object-cover border" />
                        ) : (
                          <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center text-lg">🏠</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{asset.name}</p>
                          <p className="text-xs text-muted-foreground">📍 {asset.location} · {asset.category}</p>
                          <div className="flex gap-2 mt-0.5">
                            {asset.daily_price > 0 && <span className="text-xs font-medium text-primary">{fmt(asset.daily_price)}/day</span>}
                            {asset.monthly_price > 0 && <span className="text-xs font-medium text-primary">{fmt(asset.monthly_price)}/mo</span>}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <div className="relative mt-3">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs"><span className="bg-background px-2 text-muted-foreground">or enter code manually</span></div>
              </div>
              <div className="flex gap-2 mt-2">
                <Input value={assetCode} onChange={e => setAssetCode(e.target.value.toUpperCase())} 
                  placeholder="AST-XXXXXX" className="font-mono tracking-wider flex-1" maxLength={12}
                  onKeyDown={e => e.key === 'Enter' && searchAsset()} />
                <Button onClick={searchAsset} disabled={searching} size="sm"><Search className="h-4 w-4" /></Button>
              </div>
            </div>
          ) : !foundAsset ? (
            <div>
              <Label>Asset Code *</Label>
              <div className="flex gap-2 mt-1">
                <Input value={assetCode} onChange={e => setAssetCode(e.target.value.toUpperCase())} 
                  placeholder="e.g. AST-XXXXXX" className="font-mono tracking-wider" maxLength={12}
                  onKeyDown={e => e.key === 'Enter' && searchAsset()} />
                <Button onClick={searchAsset} disabled={searching} size="sm"><Search className="h-4 w-4" /></Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Paste the asset code from Browse</p>
            </div>
          ) : null}

          {foundAsset && (
            <>
              {/* Asset Preview */}
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-3 space-y-1">
                  {foundAsset.image_url_1 && (
                    <img src={foundAsset.image_url_1} alt="" className="w-full h-28 object-cover rounded-lg mb-2" />
                  )}
                  <p className="font-semibold text-sm">{foundAsset.name}</p>
                  <p className="text-xs text-muted-foreground">📍 {foundAsset.location}</p>
                  <p className="text-xs text-muted-foreground">By: {(foundAsset as any).businesses?.name || 'Owner'}</p>
                  <div className="flex gap-2 text-xs font-medium mt-1">
                    {foundAsset.hourly_price > 0 && <Badge variant="outline">{fmt(foundAsset.hourly_price)}/hr</Badge>}
                    {foundAsset.daily_price > 0 && <Badge variant="outline">{fmt(foundAsset.daily_price)}/day</Badge>}
                    {foundAsset.monthly_price > 0 && <Badge variant="outline">{fmt(foundAsset.monthly_price)}/mo</Badge>}
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

              {/* Duration */}
              <div>
                <Label>Duration Type</Label>
                <Select value={durationType} onValueChange={setDurationType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {foundAsset.hourly_price > 0 && <SelectItem value="hourly">Hourly ({fmt(foundAsset.hourly_price)}/hr)</SelectItem>}
                    {foundAsset.daily_price > 0 && <SelectItem value="daily">Daily ({fmt(foundAsset.daily_price)}/day)</SelectItem>}
                    {foundAsset.monthly_price > 0 && <SelectItem value="monthly">Monthly ({fmt(foundAsset.monthly_price)}/mo)</SelectItem>}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div><Label>Start *</Label><Input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
                <div><Label>End *</Label><Input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
              </div>

              <div>
                <Label>Message to Owner</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any special requests or comments..." rows={2} />
              </div>

              <Button onClick={handleBook} disabled={submitting} className="w-full">
                <Send className="h-4 w-4 mr-2" />{submitting ? 'Sending...' : 'Send Booking Request'}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BookingComments({ booking, isOwner }: { booking: any; isOwner: boolean }) {
  const [ownerNotes, setOwnerNotes] = useState((booking as any).owner_notes || '');
  const [saving, setSaving] = useState(false);

  async function saveOwnerNotes() {
    setSaving(true);
    const { error } = await supabase.from('property_bookings').update({ owner_notes: ownerNotes } as any).eq('id', booking.id);
    if (error) toast.error(error.message);
    else toast.success('Notes saved');
    setSaving(false);
  }

  return (
    <div className="space-y-2 border-t pt-2">
      {/* Renter's message */}
      {booking.notes && (
        <div className="p-2 rounded-lg bg-muted/50">
          <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">📝 Renter's Message:</p>
          <p className="text-xs">{booking.notes}</p>
        </div>
      )}
      {(booking as any).renter_occupation && (
        <p className="text-xs text-muted-foreground">👤 Occupation: <span className="font-medium text-foreground">{(booking as any).renter_occupation}</span></p>
      )}
      {(booking as any).rental_purpose && (
        <p className="text-xs text-muted-foreground">🎯 Purpose: <span className="font-medium text-foreground">{(booking as any).rental_purpose}</span></p>
      )}
      {/* Owner's response */}
      {isOwner && (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-muted-foreground">💬 Your Response:</p>
          <Textarea value={ownerNotes} onChange={e => setOwnerNotes(e.target.value)} 
            placeholder="Reply to renter, add conditions..." rows={2} className="text-xs" />
          <Button size="sm" className="h-7 text-xs" onClick={saveOwnerNotes} disabled={saving}>
            <Send className="h-3 w-3 mr-1" />{saving ? 'Saving...' : 'Save Response'}
          </Button>
        </div>
      )}
      {!isOwner && (booking as any).owner_notes && (
        <div className="p-2 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-[10px] font-semibold text-primary mb-0.5">💬 Owner's Response:</p>
          <p className="text-xs">{(booking as any).owner_notes}</p>
        </div>
      )}
    </div>
  );
}

export default function PropertyBookings() {
  const { t } = useTranslation();
  const { bookings, assets, updateBooking } = useProperty();
  const { userRole, currentBusiness } = useBusiness();
  const { fmt } = useCurrency();
  const [searchParams, setSearchParams] = useSearchParams();
  const [checkInBooking, setCheckInBooking] = useState<string | null>(null);
  const [bookNowOpen, setBookNowOpen] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  
  // Pre-filled property from Discover page
  const [prefilledPropertyId, setPrefilledPropertyId] = useState('');
  const [prefilledPropertyName, setPrefilledPropertyName] = useState('');

  // Auto-open BookNow when coming from Discover
  useEffect(() => {
    const propId = searchParams.get('property_id');
    const propName = searchParams.get('property_name');
    if (propId) {
      setPrefilledPropertyId(propId);
      setPrefilledPropertyName(propName ? decodeURIComponent(propName) : '');
      setBookNowOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, []);
  const isOwnerOrAdmin = userRole === 'owner' || userRole === 'admin';

  const pending = bookings.filter(b => b.status === 'pending');
  const active = bookings.filter(b => b.status === 'active' || b.status === 'confirmed');
  const completed = bookings.filter(b => b.status === 'completed' || b.status === 'cancelled');

  const statusColor = (s: string) => {
    switch (s) {
      case 'pending': return 'bg-amber-500/10 text-amber-700';
      case 'confirmed': return 'bg-blue-500/10 text-blue-700';
      case 'active': return 'bg-green-500/10 text-green-700';
      case 'completed': return 'bg-muted text-muted-foreground';
      case 'cancelled': return 'bg-destructive/10 text-destructive';
      default: return '';
    }
  };

  async function handleRecordPayment() {
    if (!paymentDialog || !paymentAmount) return;
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) { toast.error('Enter a valid amount'); return; }
    const newPaid = Number(paymentDialog.amount_paid) + amt;
    const newStatus = newPaid >= Number(paymentDialog.total_price) ? 'paid' : 'partial';
    const { error } = await supabase.from('property_bookings').update({
      amount_paid: newPaid,
      payment_status: newStatus,
    } as any).eq('id', paymentDialog.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Payment of ${fmt(amt)} recorded!`);
    setPaymentDialog(null);
    setPaymentAmount('');
  }

  async function generateReceipt(booking: any) {
    const asset = assets.find(a => a.id === booking.asset_id);
    const { error } = await supabase.from('receipts').insert({
      business_id: booking.business_id,
      transaction_id: booking.id,
      receipt_type: 'booking',
      buyer_name: booking.renter_name,
      seller_name: currentBusiness?.name || '',
      grand_total: Number(booking.total_price),
      items: [{
        item_name: asset?.name || 'Asset Rental',
        quantity: 1,
        unit_price: Number(booking.total_price),
        subtotal: Number(booking.total_price),
        category: asset?.category || 'rental',
      }],
      business_info: {
        name: currentBusiness?.name,
        address: currentBusiness?.address,
        contact: currentBusiness?.contact,
        email: currentBusiness?.email,
      },
    } as any);
    if (error) toast.error(error.message);
    else toast.success('Receipt generated and stored in archive!');
  }

  function BookingCard({ booking }: { booking: typeof bookings[0] }) {
    const asset = assets.find(a => a.id === booking.asset_id);
    const outstanding = Number(booking.total_price) - Number(booking.amount_paid);
    return (
      <Card>
        <CardContent className="p-3 space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-sm">{asset?.name || 'Unknown Asset'}</p>
              <p className="text-xs text-muted-foreground">{booking.renter_name} · {booking.renter_contact}</p>
            </div>
            <Badge className={`text-[10px] ${statusColor(booking.status)}`}>{booking.status.toUpperCase()}</Badge>
          </div>
          <div className="text-xs space-y-0.5">
            <p>📅 {new Date(booking.start_date).toLocaleDateString()} → {new Date(booking.end_date).toLocaleDateString()}</p>
            <p>⏱ {booking.duration_type} · {fmt(Number(booking.total_price))}</p>
            <div className="flex items-center gap-3">
              <span>💰 Paid: <span className="text-success font-medium">{fmt(Number(booking.amount_paid))}</span></span>
              {outstanding > 0 && <span>Balance: <span className="text-warning font-medium">{fmt(outstanding)}</span></span>}
            </div>
            <p>📋 Status: <span className={booking.payment_status === 'paid' ? 'text-success' : 'text-amber-600'}>{booking.payment_status}</span></p>
          </div>

          {/* Comments Section */}
          <BookingComments booking={booking} isOwner={isOwnerOrAdmin} />

          {/* Actions */}
          <div className="flex gap-1 flex-wrap pt-1">
            {isOwnerOrAdmin && (
              <>
                {booking.status === 'pending' && (
                  <>
                    <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => updateBooking(booking.id, { status: 'confirmed' })}>
                      <CheckCircle className="h-3 w-3 mr-1" />Confirm
                    </Button>
                    <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => updateBooking(booking.id, { status: 'cancelled' })}>
                      <XCircle className="h-3 w-3 mr-1" />Reject
                    </Button>
                  </>
                )}
                {booking.status === 'confirmed' && (
                  <Button size="sm" className="h-7 text-xs" onClick={() => updateBooking(booking.id, { status: 'active' })}>
                    <Clock className="h-3 w-3 mr-1" />Start Rental
                  </Button>
                )}
                {booking.status === 'active' && (
                  <Button size="sm" className="h-7 text-xs" onClick={() => updateBooking(booking.id, { status: 'completed' })}>
                    <CheckCircle className="h-3 w-3 mr-1" />Complete
                  </Button>
                )}
                {outstanding > 0 && (booking.status === 'active' || booking.status === 'confirmed') && (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setPaymentDialog(booking); setPaymentAmount(String(outstanding)); }}>
                    <Wallet className="h-3 w-3 mr-1" />Record Payment
                  </Button>
                )}
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setCheckInBooking(booking.id)}>
                  <Camera className="h-3 w-3 mr-1" />Check-In/Out
                </Button>
                {(booking.status === 'completed' || booking.payment_status === 'paid') && (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => generateReceipt(booking)}>
                    <FileText className="h-3 w-3 mr-1" />Receipt
                  </Button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">📅 {t('property.bookings', 'Bookings')}</h1>
        <Button size="sm" onClick={() => setBookNowOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Book Now
        </Button>
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="pending" className="text-xs">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="active" className="text-xs">Active ({active.length})</TabsTrigger>
          <TabsTrigger value="history" className="text-xs">History ({completed.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="space-y-2 mt-3">
          {pending.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No pending bookings</p>
            : pending.map(b => <BookingCard key={b.id} booking={b} />)}
        </TabsContent>
        <TabsContent value="active" className="space-y-2 mt-3">
          {active.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No active bookings</p>
            : active.map(b => <BookingCard key={b.id} booking={b} />)}
        </TabsContent>
        <TabsContent value="history" className="space-y-2 mt-3">
          {completed.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No booking history</p>
            : completed.map(b => <BookingCard key={b.id} booking={b} />)}
        </TabsContent>
      </Tabs>

      {/* Book Now Dialog */}
      <BookNowDialog open={bookNowOpen} onClose={() => { setBookNowOpen(false); setPrefilledPropertyId(''); setPrefilledPropertyName(''); }} 
        prefilledPropertyId={prefilledPropertyId} prefilledPropertyName={prefilledPropertyName} />

      {/* Check-In Dialog */}
      <Dialog open={!!checkInBooking} onOpenChange={() => setCheckInBooking(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Digital Check-In/Out</DialogTitle>
          </DialogHeader>
          {checkInBooking && currentBusiness && (
            <CheckInDialog bookingId={checkInBooking} businessId={currentBusiness.id} onClose={() => setCheckInBooking(null)} />
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={!!paymentDialog} onOpenChange={o => { if (!o) setPaymentDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment — {paymentDialog?.renter_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="p-3 bg-muted/30 rounded-lg text-sm">
              <p>Total: <strong>{fmt(Number(paymentDialog?.total_price || 0))}</strong></p>
              <p>Paid: <strong className="text-success">{fmt(Number(paymentDialog?.amount_paid || 0))}</strong></p>
              <p>Outstanding: <strong className="text-warning">{fmt(Number(paymentDialog?.total_price || 0) - Number(paymentDialog?.amount_paid || 0))}</strong></p>
            </div>
            <div>
              <Label>Payment Amount</Label>
              <Input type="number" min="0" step="0.01" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} />
            </div>
            <Button onClick={handleRecordPayment} className="w-full">
              <Wallet className="h-4 w-4 mr-2" /> Confirm Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
