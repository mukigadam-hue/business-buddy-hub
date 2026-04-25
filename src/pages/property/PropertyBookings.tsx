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
import { CalendarCheck, CheckCircle, XCircle, Clock, Camera, Plus, Search, Send, Wallet, FileText, Copy, Banknote, Smartphone, CreditCard, Upload, AlertTriangle, UserPlus } from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';
import Receipt from '@/components/Receipt';
import { toast } from 'sonner';
import { toSentenceCase, toTitleCase } from '@/lib/utils';
import AdSpace from '@/components/AdSpace';
import RecycleDeleteButton from '@/components/RecycleDeleteButton';
import { addToOfflineQueue } from '@/lib/offlineStore';
import { PhoneInput, isValidIntlPhone } from '@/components/PhoneInput';
import { isAssetBookable, shouldMarkAssetOccupied } from '@/lib/propertyUnits';

const PAYMENT_FREQUENCIES = [
  { value: 'monthly', label: 'Every Month' },
  { value: 'quarterly', label: 'Every 3 Months' },
  { value: 'biannual', label: 'Every 6 Months' },
  { value: 'annual', label: 'Every 12 Months' },
  { value: 'one-time', label: 'One-Time Payment' },
];

// Helper to send notifications to both owner and renter businesses
async function sendCrossBusinessNotification(booking: any, title: string, message: string) {
  try {
    // 1. Notify the owner's business
    await supabase.from('notifications').insert({
      business_id: booking.business_id,
      title,
      message,
      type: 'booking',
    } as any);

    // 2. Notify the renter — find all businesses where renter_id is a member
    if (booking.renter_id) {
      const { data: renterMemberships } = await supabase
        .from('business_memberships')
        .select('business_id')
        .eq('user_id', booking.renter_id);
      if (renterMemberships) {
        for (const m of renterMemberships) {
          if (m.business_id !== booking.business_id) {
            await supabase.from('notifications').insert({
              business_id: m.business_id,
              title,
              message,
              type: 'booking',
            } as any);
          }
        }
      }
    }
  } catch (e) { console.error('Notification error', e); }
}

// ========== CHECK-IN DIALOG ==========
function CheckInDialog({ bookingId, businessId, onClose }: { bookingId: string; businessId: string; onClose: () => void }) {
  const { addCheckIn } = useProperty();
  const { user } = useAuth();
  const [checkType, setCheckType] = useState<'start' | 'end'>('start');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [existingCheckIns, setExistingCheckIns] = useState<any[]>([]);

  useEffect(() => { loadCheckIns(); }, [bookingId]);

  async function loadCheckIns() {
    const { data } = await supabase.from('property_check_ins').select('*').eq('booking_id', bookingId).order('created_at');
    setExistingCheckIns((data || []) as any[]);
  }

  async function handleSubmit() {
    if (!user) return;
    await addCheckIn({
      booking_id: bookingId, business_id: businessId, check_type: checkType,
      photo_urls: photos, notes: toSentenceCase(notes), recorded_by: user.id,
    });
    toast.success(`${checkType === 'start' ? 'Check-In' : 'Check-Out'} recorded with ${photos.length} photo(s)`);
    loadCheckIns(); setNotes(''); setPhotos([]);
  }

  return (
    <div className="space-y-4">
      {existingCheckIns.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">📋 Previous Records:</p>
          {existingCheckIns.map((ci: any) => (
            <div key={ci.id} className="p-2 rounded-lg bg-muted/50 text-xs space-y-1">
              <div className="flex justify-between">
                <Badge variant={ci.check_type === 'start' ? 'default' : 'secondary'} className="text-[9px]">
                  {ci.check_type === 'start' ? '📥 Check-In' : '📤 Check-Out'}
                </Badge>
                <span className="text-muted-foreground">{new Date(ci.created_at).toLocaleString()}</span>
              </div>
              {ci.notes && <p>{ci.notes}</p>}
              {ci.photo_urls && (ci.photo_urls as any[]).length > 0 && (
                <div className="flex gap-1">
                  {(ci.photo_urls as string[]).map((url, i) => (
                    <img key={i} src={url} alt="" className="h-12 w-12 rounded object-cover border" />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Button variant={checkType === 'start' ? 'default' : 'outline'} onClick={() => setCheckType('start')} className="text-sm">📥 Check-In</Button>
        <Button variant={checkType === 'end' ? 'default' : 'outline'} onClick={() => setCheckType('end')} className="text-sm">📤 Check-Out</Button>
      </div>
      <div><Label>Condition Notes</Label><Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Describe the condition..." /></div>
      <div>
        <p className="text-xs font-semibold mb-2">Condition Photos</p>
        <div className="flex gap-3 flex-wrap">
          {[0, 1, 2].map(i => (
            <ImageUpload key={i} bucket="item-images" path="checkins" currentUrl={photos[i]} size="sm"
              onUploaded={url => setPhotos(p => { const n = [...p]; n[i] = url; return n; })}
              onRemoved={() => setPhotos(p => { const n = [...p]; n.splice(i, 1); return n; })}
              label={`Photo ${i + 1}`} />
          ))}
        </div>
      </div>
      <Button onClick={handleSubmit} className="w-full">Record {checkType === 'start' ? 'Check-In' : 'Check-Out'}</Button>
    </div>
  );
}

// ========== DIRECT BOOKING DIALOG (Walk-in) ==========
function DirectBookingDialog({ open, onClose, assets }: { open: boolean; onClose: () => void; assets: any[] }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currentBusiness } = useBusiness();
  const { fmt } = useCurrency();
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [renterName, setRenterName] = useState('');
  const [renterContact, setRenterContact] = useState('');
  const [renterOccupation, setRenterOccupation] = useState('');
  const [rentalPurpose, setRentalPurpose] = useState('');
  const [renterGender, setRenterGender] = useState('');
  const [renterAge, setRenterAge] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [durationType, setDurationType] = useState('monthly');
  const [paymentFrequency, setPaymentFrequency] = useState('monthly');
  const [agreedAmount, setAgreedAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedAsset = assets.find(a => a.id === selectedAssetId);

  useEffect(() => {
    if (selectedAsset) {
      const priceMap: Record<string, number> = { hourly: selectedAsset.hourly_price, daily: selectedAsset.daily_price, monthly: selectedAsset.monthly_price };
      setAgreedAmount(String(priceMap[durationType] || selectedAsset.monthly_price || selectedAsset.daily_price || 0));
    }
  }, [selectedAssetId, durationType]);

  async function handleSubmit() {
    if (!user || !currentBusiness || !selectedAssetId || !renterName.trim() || !startDate || !endDate) {
      toast.error('Please fill in all required fields'); return;
    }
    if (renterContact && !isValidIntlPhone(renterContact)) {
      toast.error('Phone must start with country code (e.g. +254712345678)'); return;
    }
    setSubmitting(true);
    const totalPrice = parseFloat(agreedAmount) || 0;
    const paid = parseFloat(amountPaid) || 0;
    const payStatus = paid >= totalPrice ? 'paid' : paid > 0 ? 'partial' : 'unpaid';

    // Multi-unit aware conflict check
    const { data: hasConflict } = await supabase.rpc('check_booking_conflict', {
      _asset_id: selectedAssetId,
      _start: new Date(startDate).toISOString(),
      _end: new Date(endDate).toISOString(),
    });
    if (hasConflict) { toast.error('All units of this asset are booked for the selected dates'); setSubmitting(false); return; }

    const { error } = await supabase.from('property_bookings').insert({
      asset_id: selectedAssetId, business_id: currentBusiness.id, renter_id: user.id,
      renter_name: toTitleCase(renterName.trim()), renter_contact: renterContact.trim(),
      start_date: new Date(startDate).toISOString(), end_date: new Date(endDate).toISOString(),
      duration_type: durationType, payment_frequency: paymentFrequency,
      total_price: totalPrice, agreed_amount: totalPrice, amount_paid: paid,
      payment_status: payStatus, payment_method: paymentMethod,
      status: 'active', booking_type: 'direct',
      notes: toSentenceCase(notes.trim()),
      renter_occupation: toSentenceCase(renterOccupation.trim()),
      rental_purpose: toSentenceCase(rentalPurpose.trim()),
      gender: renterGender, age: renterAge ? parseInt(renterAge) : null,
      expected_payment_date: new Date(endDate).toISOString(),
      proof_url: proofUrl || null,
    } as any);

    if (error) { toast.error(error.message); setSubmitting(false); return; }
    // Only flip availability flag when this is a single-unit asset
    if (shouldMarkAssetOccupied(selectedAsset as any)) {
      await supabase.from('property_assets').update({ is_available: false } as any).eq('id', selectedAssetId);
    }
    
    // Auto-add tenant
    const { data: existingTenant } = await supabase.from('business_team_members')
      .select('id').eq('business_id', currentBusiness.id)
      .eq('full_name', toTitleCase(renterName.trim())).eq('rank', 'Tenant').limit(1);
    if (!existingTenant || existingTenant.length === 0) {
      await supabase.from('business_team_members').insert({
        business_id: currentBusiness.id, full_name: toTitleCase(renterName.trim()),
        phone: renterContact.trim(), rank: 'Tenant',
        hire_date: startDate, rental_end_date: endDate || null,
        occupation: toSentenceCase(renterOccupation.trim()),
        rental_purpose: toSentenceCase(rentalPurpose.trim()),
        gender: renterGender, age: renterAge ? parseInt(renterAge) : null,
        agreed_amount: totalPrice, is_active: true, payment_frequency: paymentFrequency, salary: 0,
      } as any);
    }

    toast.success('Direct booking created! Asset marked as occupied.');
    setSubmitting(false); onClose();
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" /> Direct Booking (Walk-in)</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Select Asset / Unit *</Label>
            <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
              <SelectTrigger><SelectValue placeholder="Choose asset or specific room/unit..." /></SelectTrigger>
              <SelectContent>
                {assets.filter(a => isAssetBookable(a as any)).map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.category === 'house' ? '🏠' : a.category === 'land' ? '🏞️' : a.category === 'vehicle' ? '🚗' : '🚢'} {a.name} - {a.location}
                    {(a as any).total_rooms > 0 && ` (${(a as any).total_rooms} rooms)`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground mt-1">💡 Tip: Add each room/unit as a separate asset with its own price for different pricing</p>
          </div>

          {selectedAsset && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-2 text-xs">
                <p className="font-semibold">{selectedAsset.name}</p>
                <div className="flex gap-2 mt-1">
                  {selectedAsset.hourly_price > 0 && <Badge variant="outline" className="text-[9px]">{fmt(selectedAsset.hourly_price)}/hr</Badge>}
                  {selectedAsset.daily_price > 0 && <Badge variant="outline" className="text-[9px]">{fmt(selectedAsset.daily_price)}/day</Badge>}
                  {selectedAsset.monthly_price > 0 && <Badge variant="outline" className="text-[9px]">{fmt(selectedAsset.monthly_price)}/mo</Badge>}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div><Label>{t('propertyUI.renterName')} *</Label><Input value={renterName} onChange={e => setRenterName(e.target.value)} /></div>
            <div><Label>{t('propertyUI.phone')} *</Label><PhoneInput value={renterContact} onChange={setRenterContact} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Occupation</Label><Input value={renterOccupation} onChange={e => setRenterOccupation(e.target.value)} /></div>
            <div><Label>Purpose</Label><Input value={rentalPurpose} onChange={e => setRentalPurpose(e.target.value)} /></div>
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
            <div><Label>Age</Label><Input type="number" value={renterAge} onChange={e => setRenterAge(e.target.value)} /></div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Billing Duration</Label>
              <Select value={durationType} onValueChange={setDurationType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('propertyUI.paymentFrequency')}</Label>
              <Select value={paymentFrequency} onValueChange={setPaymentFrequency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_FREQUENCIES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>{t('propertyUI.startDate')} *</Label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
            <div><Label>{t('propertyUI.endDate')} *</Label><Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
          </div>

          <div className="border-t pt-3 space-y-2">
            <p className="text-xs font-semibold">💰 {t('propertyUI.paymentAmount')}</p>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>{t('propertyUI.amount')}</Label><Input type="number" value={agreedAmount} onChange={e => setAgreedAmount(e.target.value)} /></div>
              <div><Label>{t('propertyUI.amountPaidNow')}</Label><Input type="number" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} placeholder={t('propertyUI.ifCredit')} /></div>
            </div>
            <div>
              <Label>{t('propertyUI.paymentMethod')}</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">💵 Cash in Hand</SelectItem>
                  <SelectItem value="mobile_money">📱 Mobile Money / M-Pesa</SelectItem>
                  <SelectItem value="card">💳 Card</SelectItem>
                  <SelectItem value="bank">🏦 Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(paymentMethod === 'mobile_money' || paymentMethod === 'card' || paymentMethod === 'bank') && (
              <div>
                <Label>{t('propertyUI.paymentProof')}</Label>
                <ImageUpload bucket="payment-proofs" path="bookings" currentUrl={proofUrl}
                  onUploaded={url => setProofUrl(url)} onRemoved={() => setProofUrl('')} size="sm" label={t('propertyUI.paymentProof')} />
              </div>
            )}
          </div>

          <div><Label>{t('propertyUI.notes')}</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} /></div>
          <Button onClick={handleSubmit} disabled={submitting} className="w-full">
            <CheckCircle className="h-4 w-4 mr-2" />{submitting ? t('propertyUI.loading') : t('propertyUI.newBooking')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ========== ONLINE BOOK NOW DIALOG ==========
function BookNowDialog({ open, onClose, prefilledPropertyId, prefilledPropertyName }: { open: boolean; onClose: () => void; prefilledPropertyId?: string; prefilledPropertyName?: string }) {
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
  const [paymentFrequency, setPaymentFrequency] = useState('monthly');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [propertyAssets, setPropertyAssets] = useState<any[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);

  useEffect(() => {
    if (open && prefilledPropertyId) {
      setLoadingAssets(true);
      supabase.from('property_assets').select('*').eq('business_id', prefilledPropertyId).is('deleted_at', null)
        .then(({ data }) => {
          // Keep multi-unit assets even if flagged occupied — capacity is checked at booking time
          const bookable = (data || []).filter(a => isAssetBookable(a as any));
          setPropertyAssets(bookable); setLoadingAssets(false);
        });
    }
  }, [open, prefilledPropertyId]);

  function selectPropertyAsset(asset: any) {
    setFoundAsset({ ...asset, businesses: { name: prefilledPropertyName || 'Owner' } });
  }

  async function searchAsset() {
    if (!assetCode.trim()) return;
    setSearching(true); setFoundAsset(null);
    const { data, error } = await supabase.from('property_assets')
      .select('*, businesses!property_assets_business_id_fkey(name, contact)')
      .eq('asset_code', assetCode.trim().toUpperCase()).is('deleted_at', null).limit(1);
    if (error || !data || data.length === 0) { toast.error('No asset found with that code'); setSearching(false); return; }
    if (!isAssetBookable(data[0] as any)) {
      toast.error('This asset is currently fully booked'); setSearching(false); return;
    }
    setFoundAsset(data[0]); setSearching(false);
  }

  async function handleBook() {
    if (!foundAsset || !user || !startDate || !endDate || !renterName.trim()) { toast.error('Fill all required fields'); return; }
    if (!isValidIntlPhone(renterContact)) { toast.error('Phone must start with country code (e.g. +254712345678)'); return; }
    setSubmitting(true);
    const priceMap: Record<string, number> = { hourly: foundAsset.hourly_price, daily: foundAsset.daily_price, monthly: foundAsset.monthly_price };
    const price = priceMap[durationType] || foundAsset.daily_price;
    const start = new Date(startDate), end = new Date(endDate);
    let units = 1;
    if (durationType === 'hourly') units = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 3600000));
    else if (durationType === 'daily') units = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
    else units = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (86400000 * 30)));

    const { data: hasConflict } = await supabase.rpc('check_booking_conflict', { _asset_id: foundAsset.id, _start: start.toISOString(), _end: end.toISOString() });
    if (hasConflict) { toast.error('Asset already booked for these dates'); setSubmitting(false); return; }

    const totalPrice = price * units;
    const bookingData = {
      asset_id: foundAsset.id, business_id: foundAsset.business_id, renter_id: user.id,
      renter_name: toTitleCase(renterName.trim()), renter_contact: renterContact.trim(),
      start_date: start.toISOString(), end_date: end.toISOString(),
      duration_type: durationType, payment_frequency: paymentFrequency,
      total_price: totalPrice, agreed_amount: totalPrice,
      status: 'pending', booking_type: 'online',
      notes: toSentenceCase(notes.trim()),
      renter_occupation: toSentenceCase(renterOccupation.trim()),
      rental_purpose: toSentenceCase(rentalPurpose.trim()),
      gender: renterGender, age: renterAge ? parseInt(renterAge) : null,
      expected_payment_date: end.toISOString(),
    };

    if (!navigator.onLine) {
      addToOfflineQueue({
        action: 'create_property_booking',
        payload: {
          booking: bookingData,
          notify: {
            title: '📅 New Booking Request',
            message: `${toTitleCase(renterName.trim())} wants to rent "${foundAsset.name}" from ${start.toLocaleDateString()} to ${end.toLocaleDateString()}. Total: ${totalPrice}. Payment: ${paymentFrequency}.`,
          },
        },
      });
      toast.success('Booking saved offline — it will send when internet returns');
      setSubmitting(false);
      onClose();
      return;
    }

    const { error } = await supabase.from('property_bookings').insert(bookingData as any);
    if (error) { toast.error(error.message); setSubmitting(false); return; }

    // Send notification to owner's business about new booking request
    await sendCrossBusinessNotification(
      { business_id: foundAsset.business_id, renter_id: user.id },
      '📅 New Booking Request',
      `${toTitleCase(renterName.trim())} wants to rent "${foundAsset.name}" from ${start.toLocaleDateString()} to ${end.toLocaleDateString()}. Total: ${totalPrice}. Payment: ${paymentFrequency}.`
    );

    toast.success('Booking request sent! The owner will be notified.'); setSubmitting(false); onClose();
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Online Booking</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!foundAsset && prefilledPropertyId ? (
            <div>
              <p className="text-sm font-medium mb-2">🏠 Select from <span className="text-primary">{prefilledPropertyName}</span>:</p>
              {loadingAssets ? <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
                : propertyAssets.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No available assets</p>
                : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {propertyAssets.map(asset => (
                    <button key={asset.id} className="w-full text-left p-3 rounded-lg border hover:border-primary/50 hover:bg-primary/5 transition-colors"
                      onClick={() => selectPropertyAsset(asset)}>
                      <div className="flex items-center gap-3">
                        {asset.image_url_1 ? <img src={asset.image_url_1} alt="" className="h-12 w-12 rounded-lg object-cover border" />
                          : <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center text-lg">🏠</div>}
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
              <div className="relative mt-3"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs"><span className="bg-background px-2 text-muted-foreground">or enter code</span></div></div>
              <div className="flex gap-2 mt-2">
                <Input value={assetCode} onChange={e => setAssetCode(e.target.value.toUpperCase())} placeholder="AST-XXXXXX" className="font-mono tracking-wider flex-1" maxLength={12}
                  onKeyDown={e => e.key === 'Enter' && searchAsset()} />
                <Button onClick={searchAsset} disabled={searching} size="sm"><Search className="h-4 w-4" /></Button>
              </div>
            </div>
          ) : !foundAsset ? (
            <div>
              <Label>Asset Code *</Label>
              <div className="flex gap-2 mt-1">
                <Input value={assetCode} onChange={e => setAssetCode(e.target.value.toUpperCase())} placeholder="AST-XXXXXX" className="font-mono tracking-wider" maxLength={12}
                  onKeyDown={e => e.key === 'Enter' && searchAsset()} />
                <Button onClick={searchAsset} disabled={searching} size="sm"><Search className="h-4 w-4" /></Button>
              </div>
            </div>
          ) : null}

          {foundAsset && (
            <>
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-3 space-y-1">
                  {foundAsset.image_url_1 && <img src={foundAsset.image_url_1} alt="" className="w-full h-28 object-cover rounded-lg mb-2" />}
                  <p className="font-semibold text-sm">{foundAsset.name}</p>
                  <p className="text-xs text-muted-foreground">📍 {foundAsset.location}</p>
                  <p className="text-xs text-muted-foreground">By: {foundAsset.businesses?.name || 'Owner'}</p>
                  <div className="flex gap-2 text-xs font-medium mt-1">
                    {foundAsset.hourly_price > 0 && <Badge variant="outline">{fmt(foundAsset.hourly_price)}/hr</Badge>}
                    {foundAsset.daily_price > 0 && <Badge variant="outline">{fmt(foundAsset.daily_price)}/day</Badge>}
                    {foundAsset.monthly_price > 0 && <Badge variant="outline">{fmt(foundAsset.monthly_price)}/mo</Badge>}
                  </div>
                </CardContent>
              </Card>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Your Name *</Label><Input value={renterName} onChange={e => setRenterName(e.target.value)} /></div>
                <div><Label>Your Phone *</Label><PhoneInput value={renterContact} onChange={setRenterContact} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Occupation</Label><Input value={renterOccupation} onChange={e => setRenterOccupation(e.target.value)} /></div>
                <div><Label>Purpose</Label><Input value={rentalPurpose} onChange={e => setRentalPurpose(e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Gender</Label>
                  <Select value={renterGender} onValueChange={setRenterGender}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>Age</Label><Input type="number" value={renterAge} onChange={e => setRenterAge(e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Billing Duration</Label>
                  <Select value={durationType} onValueChange={setDurationType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {foundAsset.hourly_price > 0 && <SelectItem value="hourly">Hourly ({fmt(foundAsset.hourly_price)}/hr)</SelectItem>}
                      {foundAsset.daily_price > 0 && <SelectItem value="daily">Daily ({fmt(foundAsset.daily_price)}/day)</SelectItem>}
                      {foundAsset.monthly_price > 0 && <SelectItem value="monthly">Monthly ({fmt(foundAsset.monthly_price)}/mo)</SelectItem>}
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
              <div><Label>Message</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} /></div>
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

// ========== BOOKING COMMENTS ==========
function BookingComments({ booking, isOwner }: { booking: any; isOwner: boolean }) {
  const [ownerNotes, setOwnerNotes] = useState(booking.owner_notes || '');
  const [saving, setSaving] = useState(false);

  async function saveOwnerNotes() {
    setSaving(true);
    const { error } = await supabase.from('property_bookings').update({ owner_notes: toSentenceCase(ownerNotes) } as any).eq('id', booking.id);
    if (error) toast.error(error.message);
    else {
      toast.success('Response saved and visible to renter!');
      // Notify renter about the response
      await sendCrossBusinessNotification(booking, '💬 Owner Responded', `The owner responded to your booking for "${booking.renter_name}": "${ownerNotes.slice(0, 80)}"`);
    }
    setSaving(false);
  }

  return (
    <div className="space-y-2 border-t pt-2">
      {booking.notes && (
        <div className="p-2 rounded-lg bg-muted/50">
          <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">📝 Renter's Message:</p>
          <p className="text-xs">{booking.notes}</p>
        </div>
      )}
      {booking.renter_occupation && <p className="text-xs text-muted-foreground">👤 Occupation: <span className="font-medium text-foreground">{booking.renter_occupation}</span></p>}
      {booking.rental_purpose && <p className="text-xs text-muted-foreground">🎯 Purpose: <span className="font-medium text-foreground">{booking.rental_purpose}</span></p>}
      {(booking.gender || booking.age) && (
        <p className="text-xs text-muted-foreground">{booking.gender && `👤 ${booking.gender}`}{booking.age && `, ${booking.age} yrs`}</p>
      )}
      {isOwner && (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-muted-foreground">💬 Your Response:</p>
          <Textarea value={ownerNotes} onChange={e => setOwnerNotes(e.target.value)} placeholder="Reply to renter..." rows={2} className="text-xs" />
          <Button size="sm" className="h-7 text-xs" onClick={saveOwnerNotes} disabled={saving}>
            <Send className="h-3 w-3 mr-1" />{saving ? 'Saving...' : 'Save Response'}
          </Button>
        </div>
      )}
      {!isOwner && booking.owner_notes && (
        <div className="p-2 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-[10px] font-semibold text-primary mb-0.5">💬 Owner's Response:</p>
          <p className="text-xs">{booking.owner_notes}</p>
        </div>
      )}
    </div>
  );
}

// ========== RECEIPT DIALOG ==========
function ReceiptDialog({ booking, asset, businessInfo, open, onClose }: { booking: any; asset: any; businessInfo: any; open: boolean; onClose: () => void }) {
  if (!booking || !open) return null;
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>📄 Booking Receipt</DialogTitle></DialogHeader>
        <Receipt
          items={[{ itemName: asset?.name || 'Asset Rental', category: asset?.category || 'rental', quantity: 1, unitPrice: Number(booking.total_price), subtotal: Number(booking.total_price) }]}
          grandTotal={Number(booking.total_price)} buyerName={booking.renter_name}
          sellerName={businessInfo?.name || ''} date={booking.created_at} type="sale" businessInfo={businessInfo}
        />
      </DialogContent>
    </Dialog>
  );
}

// ========== COMPLAINTS SECTION ==========
function ComplaintsSection({ bookings, assets, isOwnerOrAdmin, businessId }: { bookings: any[]; assets: any[]; isOwnerOrAdmin: boolean; businessId: string }) {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState('');
  const [category, setCategory] = useState('general');
  const [description, setDescription] = useState('');
  const [responseText, setResponseText] = useState('');
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!businessId) return;
    supabase.from('property_complaints').select('*').eq('business_id', businessId).order('created_at', { ascending: false })
      .then(({ data }) => setComplaints(data || []));
  }, [businessId]);

  async function submitComplaint() {
    if (!selectedBooking || !description.trim() || !user) { toast.error('Fill all required fields'); return; }
    const booking = bookings.find(b => b.id === selectedBooking);
    if (!booking) return;
    const { error } = await supabase.from('property_complaints').insert({
      booking_id: selectedBooking, asset_id: booking.asset_id, business_id: businessId,
      renter_id: user.id, renter_name: booking.renter_name || 'Renter',
      category, description: toSentenceCase(description.trim()),
    } as any);
    if (error) { toast.error(error.message); return; }
    await supabase.from('notifications').insert({
      business_id: businessId, title: '⚠️ New Complaint',
      message: `${booking.renter_name} filed a complaint: ${category} — "${description.trim().slice(0, 80)}"`, type: 'complaint',
    } as any);
    toast.success('Complaint submitted! Owner will be notified.');
    setShowAdd(false); setDescription(''); setSelectedBooking(''); setCategory('general');
    const { data } = await supabase.from('property_complaints').select('*').eq('business_id', businessId).order('created_at', { ascending: false });
    setComplaints(data || []);
  }

  async function saveResponse(complaintId: string) {
    if (!responseText.trim()) return;
    const { error } = await supabase.from('property_complaints').update({
      owner_response: toSentenceCase(responseText.trim()), status: 'responded',
    } as any).eq('id', complaintId);
    if (error) { toast.error(error.message); return; }
    toast.success('Response saved!'); setRespondingId(null); setResponseText('');
    const { data } = await supabase.from('property_complaints').select('*').eq('business_id', businessId).order('created_at', { ascending: false });
    setComplaints(data || []);
  }

  async function resolveComplaint(complaintId: string) {
    await supabase.from('property_complaints').update({ status: 'resolved', resolved_at: new Date().toISOString() } as any).eq('id', complaintId);
    toast.success('Complaint resolved!');
    const { data } = await supabase.from('property_complaints').select('*').eq('business_id', businessId).order('created_at', { ascending: false });
    setComplaints(data || []);
  }

  const activeBookings = bookings.filter(b => ['active', 'confirmed'].includes(b.status));
  const COMPLAINT_CATS = [
    { value: 'general', label: 'General' }, { value: 'maintenance', label: '🔧 Maintenance / Repairs' },
    { value: 'plumbing', label: '🚿 Plumbing / Leaks' }, { value: 'electrical', label: '⚡ Electrical' },
    { value: 'noise', label: '🔊 Noise / Disturbance' }, { value: 'cleanliness', label: '🧹 Cleanliness' },
    { value: 'vehicle_repair', label: '🚗 Vehicle Repair Needed' }, { value: 'other', label: 'Other' },
  ];

  return (
    <div className="space-y-3">
      <Button size="sm" onClick={() => setShowAdd(true)} className="w-full"><AlertTriangle className="h-4 w-4 mr-1" /> File a Complaint</Button>
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>⚠️ File a Complaint</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Select Your Booking *</Label>
              <Select value={selectedBooking} onValueChange={setSelectedBooking}>
                <SelectTrigger><SelectValue placeholder="Choose booking..." /></SelectTrigger>
                <SelectContent>
                  {activeBookings.map(b => {
                    const asset = assets.find(a => a.id === b.asset_id);
                    return <SelectItem key={b.id} value={b.id}>{asset?.name || 'Asset'} — {b.renter_name}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{COMPLAINT_CATS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Description *</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the issue in detail..." rows={3} /></div>
            <Button onClick={submitComplaint} className="w-full">Submit Complaint</Button>
          </div>
        </DialogContent>
      </Dialog>

      {complaints.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
          <AlertTriangle className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />No complaints filed yet.
        </CardContent></Card>
      ) : (
        complaints.map(c => {
          const asset = assets.find(a => a.id === c.asset_id);
          return (
            <Card key={c.id} className={c.status === 'open' ? 'border-amber-500/30' : c.status === 'resolved' ? 'border-green-500/30' : ''}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold">{asset?.name || 'Asset'}</p>
                    <p className="text-xs text-muted-foreground">{c.renter_name} · {new Date(c.created_at).toLocaleDateString()}</p>
                  </div>
                  <Badge variant={c.status === 'open' ? 'secondary' : c.status === 'resolved' ? 'default' : 'outline'} className="text-[10px]">
                    {c.status === 'open' ? '🔴 Open' : c.status === 'resolved' ? '✅ Resolved' : '💬 Responded'}
                  </Badge>
                </div>
                <div className="p-2 rounded-lg bg-muted/50">
                  <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">📋 {c.category}</p>
                  <p className="text-xs">{c.description}</p>
                </div>
                {c.owner_response && (
                  <div className="p-2 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-[10px] font-semibold text-primary mb-0.5">💬 Owner Response:</p>
                    <p className="text-xs">{c.owner_response}</p>
                  </div>
                )}
                {isOwnerOrAdmin && c.status !== 'resolved' && (
                  <div className="flex gap-1">
                    {respondingId === c.id ? (
                      <div className="w-full space-y-1">
                        <Textarea value={responseText} onChange={e => setResponseText(e.target.value)} placeholder="Your response..." rows={2} className="text-xs" />
                        <div className="flex gap-1">
                          <Button size="sm" className="h-7 text-xs flex-1" onClick={() => saveResponse(c.id)}><Send className="h-3 w-3 mr-1" /> Save Response</Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setRespondingId(null)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setRespondingId(c.id); setResponseText(c.owner_response || ''); }}>
                          <Send className="h-3 w-3 mr-1" /> Respond
                        </Button>
                        <Button size="sm" className="h-7 text-xs" onClick={() => resolveComplaint(c.id)}>
                          <CheckCircle className="h-3 w-3 mr-1" /> Resolve
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}

const FREQ_LABEL: Record<string, string> = {
  monthly: 'Monthly', quarterly: 'Every 3 months', biannual: 'Every 6 months', annual: 'Yearly', 'one-time': 'One-time',
};

// ========== MAIN COMPONENT ==========
export default function PropertyBookings() {
  const { t } = useTranslation();
  const { bookings, assets, updateBooking, refreshData } = useProperty();
  const { userRole, currentBusiness } = useBusiness();
  const { fmt } = useCurrency();
  const [searchParams, setSearchParams] = useSearchParams();
  const [checkInBooking, setCheckInBooking] = useState<string | null>(null);
  const [bookNowOpen, setBookNowOpen] = useState(false);
  const [directBookOpen, setDirectBookOpen] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [proofUrl, setProofUrl] = useState('');
  const [receiptBooking, setReceiptBooking] = useState<any>(null);
  const [prefilledPropertyId, setPrefilledPropertyId] = useState('');
  const [prefilledPropertyName, setPrefilledPropertyName] = useState('');

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

  const payMethodLabel = (m: string) => {
    switch (m) {
      case 'cash': return '💵 Cash';
      case 'mobile_money': return '📱 Mobile Money';
      case 'card': return '💳 Card';
      case 'bank': return '🏦 Bank';
      default: return m;
    }
  };

  async function handleRecordPayment() {
    if (!paymentDialog || !paymentAmount) return;
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) { toast.error('Enter a valid amount'); return; }
    const newPaid = Number(paymentDialog.amount_paid) + amt;
    const newStatus = newPaid >= Number(paymentDialog.total_price) ? 'paid' : 'partial';

    const updates: any = {
      amount_paid: newPaid, payment_status: newStatus, payment_method: paymentMethod,
      last_payment_date: new Date().toISOString(),
    };
    if (proofUrl) updates.proof_url = proofUrl;

    const { error } = await supabase.from('property_bookings').update(updates).eq('id', paymentDialog.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Payment of ${fmt(amt)} recorded!`);

    // Notify both parties about payment
    const asset = assets.find(a => a.id === paymentDialog.asset_id);
    await sendCrossBusinessNotification(
      paymentDialog,
      '💰 Payment Recorded',
      `Payment of ${fmt(amt)} for "${asset?.name || 'Rental'}" by ${paymentDialog.renter_name}. Status: ${newStatus === 'paid' ? 'Fully Paid ✅' : 'Partial Payment'}`
    );

    if (newStatus === 'paid') {
      await supabase.from('receipts').insert({
        business_id: paymentDialog.business_id, transaction_id: paymentDialog.id,
        receipt_type: 'booking', buyer_name: paymentDialog.renter_name,
        seller_name: currentBusiness?.name || '', grand_total: Number(paymentDialog.total_price),
        items: [{ item_name: asset?.name || 'Rental', quantity: 1, unit_price: Number(paymentDialog.total_price), subtotal: Number(paymentDialog.total_price), category: 'rental' }],
        business_info: { name: currentBusiness?.name, address: currentBusiness?.address, contact: currentBusiness?.contact, email: currentBusiness?.email },
      } as any);
      toast.success('Receipt archived!');
    }

    setPaymentDialog(null); setPaymentAmount(''); setProofUrl('');
    refreshData();
  }

  async function handleStatusChange(bookingId: string, newStatus: string) {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;
    const asset = assets.find(a => a.id === booking.asset_id);

    await updateBooking(bookingId, { status: newStatus } as any);

    const statusLabels: Record<string, string> = { confirmed: 'confirmed ✅', active: 'started 🟢', completed: 'completed ✅', cancelled: 'cancelled ❌' };
    await sendCrossBusinessNotification(
      booking,
      '📅 Booking Update',
      `Booking for "${asset?.name || 'Asset'}" by ${booking.renter_name} has been ${statusLabels[newStatus] || newStatus}.`
    );

    // Only flip availability flag for single-unit assets — multi-unit assets stay listed
    if (shouldMarkAssetOccupied(asset as any)) {
      if (newStatus === 'active' || newStatus === 'confirmed') {
        await supabase.from('property_assets').update({ is_available: false } as any).eq('id', booking.asset_id);
      }
      if (newStatus === 'completed' || newStatus === 'cancelled') {
        await supabase.from('property_assets').update({ is_available: true } as any).eq('id', booking.asset_id);
      }
    }

    // Auto-add to tenant list
    if (newStatus === 'active' || newStatus === 'confirmed') {
      const { data: existingTenant } = await supabase.from('business_team_members')
        .select('id').eq('business_id', booking.business_id)
        .eq('full_name', booking.renter_name).eq('rank', 'Tenant').limit(1);
      if (!existingTenant || existingTenant.length === 0) {
        await supabase.from('business_team_members').insert({
          business_id: booking.business_id, full_name: booking.renter_name || 'Tenant',
          phone: booking.renter_contact || '', rank: 'Tenant',
          hire_date: new Date(booking.start_date).toISOString().slice(0, 10),
          rental_end_date: new Date(booking.end_date).toISOString().slice(0, 10),
          occupation: (booking as any).renter_occupation || '',
          rental_purpose: (booking as any).rental_purpose || '',
          gender: (booking as any).gender || '', age: (booking as any).age || null,
          agreed_amount: Number(booking.total_price) || 0,
          is_active: true, payment_frequency: (booking as any).payment_frequency || 'monthly', salary: 0,
        } as any);
      }
    }

    refreshData();
  }

  function BookingCard({ booking }: { booking: typeof bookings[0] }) {
    const asset = assets.find(a => a.id === booking.asset_id);
    const outstanding = Number(booking.total_price) - Number(booking.amount_paid);
    const bType = (booking as any).booking_type || 'online';
    const freq = (booking as any).payment_frequency || 'monthly';

    return (
      <Card>
        <CardContent className="p-3 space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-sm">{asset?.name || 'Unknown Asset'}</p>
              <p className="text-xs text-muted-foreground">{booking.renter_name} · {booking.renter_contact}</p>
            </div>
            <div className="flex items-center gap-1">
              <Badge className="text-[9px]" variant={bType === 'direct' ? 'secondary' : 'outline'}>
                {bType === 'direct' ? '🤝 Direct' : '🌐 Online'}
              </Badge>
              <Badge className={`text-[10px] ${statusColor(booking.status)}`}>{booking.status.toUpperCase()}</Badge>
            </div>
          </div>
          <div className="text-xs space-y-0.5">
            <p>📅 {new Date(booking.start_date).toLocaleDateString()} → {new Date(booking.end_date).toLocaleDateString()}</p>
            <p>⏱ {booking.duration_type} · {fmt(Number(booking.total_price))} · <span className="text-primary font-medium">Pays {FREQ_LABEL[freq] || freq}</span></p>
            <div className="flex items-center gap-3">
              <span>💰 Paid: <span className="text-success font-medium">{fmt(Number(booking.amount_paid))}</span></span>
              {outstanding > 0 && <span>Balance: <span className="text-warning font-medium">{fmt(outstanding)}</span></span>}
            </div>
            <p>📋 Payment: <span className={booking.payment_status === 'paid' ? 'text-success' : 'text-amber-600'}>{booking.payment_status}</span>
              {(booking as any).payment_method && ` · ${payMethodLabel((booking as any).payment_method)}`}
            </p>
            {(booking as any).proof_url && (
              <a href={(booking as any).proof_url} target="_blank" rel="noopener noreferrer" className="text-primary underline text-[10px]">📎 View Payment Proof</a>
            )}
          </div>

          <BookingComments booking={booking} isOwner={isOwnerOrAdmin} />

          <div className="flex gap-1 flex-wrap pt-1">
            {isOwnerOrAdmin && (
              <>
                {booking.status === 'pending' && (
                  <>
                    <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => handleStatusChange(booking.id, 'confirmed')}>
                      <CheckCircle className="h-3 w-3 mr-1" />{t('propertyUI.confirm')}
                    </Button>
                    <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleStatusChange(booking.id, 'cancelled')}>
                      <XCircle className="h-3 w-3 mr-1" />{t('propertyUI.reject')}
                    </Button>
                  </>
                )}
                {booking.status === 'confirmed' && (
                  <Button size="sm" className="h-7 text-xs" onClick={() => handleStatusChange(booking.id, 'active')}>
                    <Clock className="h-3 w-3 mr-1" />{t('propertyUI.active')}
                  </Button>
                )}
                {booking.status === 'active' && (
                  <Button size="sm" className="h-7 text-xs" onClick={() => handleStatusChange(booking.id, 'completed')}>
                    <CheckCircle className="h-3 w-3 mr-1" />{t('propertyUI.markCompleted')}
                  </Button>
                )}
                {outstanding > 0 && (booking.status === 'active' || booking.status === 'confirmed') && (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setPaymentDialog(booking); setPaymentAmount(String(outstanding)); setPaymentMethod((booking as any).payment_method || 'cash'); }}>
                    <Wallet className="h-3 w-3 mr-1" />{t('propertyUI.payNow')}
                  </Button>
                )}
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setCheckInBooking(booking.id)}>
                  <Camera className="h-3 w-3 mr-1" />{t('propertyUI.checkInOut')}
                </Button>
              </>
            )}
            {(booking.status === 'completed' || booking.payment_status === 'paid') && (
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setReceiptBooking(booking)}>
                <FileText className="h-3 w-3 mr-1" />Receipt
              </Button>
            )}
            <RecycleDeleteButton table="property_bookings" recordId={booking.id} label="Cancel" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const receiptAsset = receiptBooking ? assets.find(a => a.id === receiptBooking.asset_id) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">📅 {t('propertyUI.bookingsTitle')}</h1>
        <div className="flex gap-1">
          {isOwnerOrAdmin && (
            <Button size="sm" variant="outline" onClick={() => setDirectBookOpen(true)}>
              <Banknote className="h-4 w-4 mr-1" /> {t('propertyUI.newBooking')}
            </Button>
          )}
          <Button size="sm" onClick={() => setBookNowOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> {t('propertyUI.requestBooking')}
          </Button>
        </div>
      </div>

      <AdSpace variant="banner" />

      <Tabs defaultValue="pending">
        <TabsList className="grid grid-cols-4">
          <TabsTrigger value="pending" className="text-xs">{t('propertyUI.pending')} ({pending.length})</TabsTrigger>
          <TabsTrigger value="active" className="text-xs">{t('propertyUI.active')} ({active.length})</TabsTrigger>
          <TabsTrigger value="history" className="text-xs">{t('propertyUI.completed')} ({completed.length})</TabsTrigger>
          <TabsTrigger value="complaints" className="text-xs">⚠️</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="space-y-2 mt-3">
          {pending.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">{t('propertyUI.noBookingsYet')}</p>
            : pending.map(b => <BookingCard key={b.id} booking={b} />)}
        </TabsContent>
        <TabsContent value="active" className="space-y-2 mt-3">
          {active.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">{t('propertyUI.noBookingsYet')}</p>
            : active.map(b => <BookingCard key={b.id} booking={b} />)}
        </TabsContent>
        <TabsContent value="history" className="space-y-2 mt-3">
          {completed.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">{t('propertyUI.noBookingsYet')}</p>
            : completed.map(b => <BookingCard key={b.id} booking={b} />)}
        </TabsContent>
        <TabsContent value="complaints" className="space-y-2 mt-3">
          <ComplaintsSection bookings={bookings} assets={assets} isOwnerOrAdmin={isOwnerOrAdmin} businessId={currentBusiness?.id || ''} />
        </TabsContent>
      </Tabs>

      <AdSpace variant="inline" />

      <BookNowDialog open={bookNowOpen} onClose={() => { setBookNowOpen(false); setPrefilledPropertyId(''); setPrefilledPropertyName(''); }}
        prefilledPropertyId={prefilledPropertyId} prefilledPropertyName={prefilledPropertyName} />
      <DirectBookingDialog open={directBookOpen} onClose={() => { setDirectBookOpen(false); refreshData(); }} assets={assets} />

      <Dialog open={!!checkInBooking} onOpenChange={() => setCheckInBooking(null)}>
        <DialogContent><DialogHeader><DialogTitle>Digital Check-In/Out</DialogTitle></DialogHeader>
          {checkInBooking && currentBusiness && <CheckInDialog bookingId={checkInBooking} businessId={currentBusiness.id} onClose={() => setCheckInBooking(null)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!paymentDialog} onOpenChange={o => { if (!o) { setPaymentDialog(null); setProofUrl(''); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('propertyUI.payNow')} — {paymentDialog?.renter_name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="p-3 bg-muted/30 rounded-lg text-sm">
              <p>{t('propertyUI.total')}: <strong>{fmt(Number(paymentDialog?.total_price || 0))}</strong></p>
              <p>{t('propertyUI.paid')}: <strong className="text-success">{fmt(Number(paymentDialog?.amount_paid || 0))}</strong></p>
              <p>{t('propertyUI.balance')}: <strong className="text-warning">{fmt(Number(paymentDialog?.total_price || 0) - Number(paymentDialog?.amount_paid || 0))}</strong></p>
            </div>
            <div><Label>{t('propertyUI.paymentAmount')}</Label>
              <Input type="number" min="0" step="0.01" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} />
            </div>
            <div><Label>{t('propertyUI.paymentMethod')}</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">💵 Cash in Hand</SelectItem>
                  <SelectItem value="mobile_money">📱 Mobile Money / M-Pesa</SelectItem>
                  <SelectItem value="card">💳 Card</SelectItem>
                  <SelectItem value="bank">🏦 Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(paymentMethod === 'mobile_money' || paymentMethod === 'card' || paymentMethod === 'bank') && (
              <div>
                <Label>{t('propertyUI.paymentProof')}</Label>
                <ImageUpload bucket="payment-proofs" path="bookings" currentUrl={proofUrl}
                  onUploaded={url => setProofUrl(url)} onRemoved={() => setProofUrl('')} size="sm" label={t('propertyUI.paymentProof')} />
              </div>
            )}
            <Button onClick={handleRecordPayment} className="w-full">
              <Wallet className="h-4 w-4 mr-2" /> {t('propertyUI.confirm')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ReceiptDialog
        booking={receiptBooking} asset={receiptAsset}
        businessInfo={currentBusiness ? { name: currentBusiness.name, address: currentBusiness.address, contact: currentBusiness.contact, email: currentBusiness.email } : null}
        open={!!receiptBooking} onClose={() => setReceiptBooking(null)}
      />
    </div>
  );
}
