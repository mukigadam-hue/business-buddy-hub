import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProperty } from '@/context/PropertyContext';
import { useBusiness } from '@/context/BusinessContext';
import { useCurrency } from '@/hooks/useCurrency';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarCheck, CheckCircle, XCircle, Clock, Camera } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ImageUpload from '@/components/ImageUpload';
import { useAuth } from '@/context/AuthContext';

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

export default function PropertyBookings() {
  const { t } = useTranslation();
  const { bookings, assets, updateBooking } = useProperty();
  const { userRole, currentBusiness } = useBusiness();
  const { currency } = useCurrency();
  const [checkInBooking, setCheckInBooking] = useState<string | null>(null);

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

  function BookingCard({ booking }: { booking: typeof bookings[0] }) {
    const asset = assets.find(a => a.id === booking.asset_id);
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
            <p>⏱ {booking.duration_type} · {currency}{booking.total_price.toLocaleString()}</p>
            <p>💰 {t('sales.paymentStatus', 'Payment')}: <span className={booking.payment_status === 'paid' ? 'text-green-600' : 'text-amber-600'}>{booking.payment_status}</span></p>
          </div>
          {booking.notes && <p className="text-xs text-muted-foreground">📝 {booking.notes}</p>}

          {(userRole === 'owner' || userRole === 'admin') && (
            <div className="flex gap-1 flex-wrap pt-1">
              {booking.status === 'pending' && (
                <>
                  <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => updateBooking(booking.id, { status: 'confirmed' })}>
                    <CheckCircle className="h-3 w-3 mr-1" />{t('property.confirm', 'Confirm')}
                  </Button>
                  <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => updateBooking(booking.id, { status: 'cancelled' })}>
                    <XCircle className="h-3 w-3 mr-1" />{t('property.reject', 'Reject')}
                  </Button>
                </>
              )}
              {booking.status === 'confirmed' && (
                <Button size="sm" className="h-7 text-xs" onClick={() => updateBooking(booking.id, { status: 'active' })}>
                  <Clock className="h-3 w-3 mr-1" />{t('property.markActive', 'Start Rental')}
                </Button>
              )}
              {booking.status === 'active' && (
                <Button size="sm" className="h-7 text-xs" onClick={() => updateBooking(booking.id, { status: 'completed' })}>
                  <CheckCircle className="h-3 w-3 mr-1" />{t('property.complete', 'Complete')}
                </Button>
              )}
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setCheckInBooking(booking.id)}>
                <Camera className="h-3 w-3 mr-1" />{t('property.checkInOut', 'Check-In/Out')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">📅 {t('property.bookings', 'Bookings')}</h1>

      <Tabs defaultValue="active">
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="pending" className="text-xs">{t('property.pending', 'Pending')} ({pending.length})</TabsTrigger>
          <TabsTrigger value="active" className="text-xs">{t('property.active', 'Active')} ({active.length})</TabsTrigger>
          <TabsTrigger value="history" className="text-xs">{t('property.history', 'History')} ({completed.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="space-y-2 mt-3">
          {pending.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">{t('property.noPending', 'No pending bookings')}</p>
            : pending.map(b => <BookingCard key={b.id} booking={b} />)}
        </TabsContent>
        <TabsContent value="active" className="space-y-2 mt-3">
          {active.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">{t('property.noActive', 'No active bookings')}</p>
            : active.map(b => <BookingCard key={b.id} booking={b} />)}
        </TabsContent>
        <TabsContent value="history" className="space-y-2 mt-3">
          {completed.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">{t('property.noHistory', 'No booking history')}</p>
            : completed.map(b => <BookingCard key={b.id} booking={b} />)}
        </TabsContent>
      </Tabs>

      <Dialog open={!!checkInBooking} onOpenChange={() => setCheckInBooking(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('property.digitalCheckIn', 'Digital Check-In/Out')}</DialogTitle>
          </DialogHeader>
          {checkInBooking && currentBusiness && (
            <CheckInDialog bookingId={checkInBooking} businessId={currentBusiness.id} onClose={() => setCheckInBooking(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
