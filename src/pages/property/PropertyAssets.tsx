import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ImageLightbox from '@/components/ImageLightbox';
import { useProperty, PropertyAsset } from '@/context/PropertyContext';
import { useBusiness } from '@/context/BusinessContext';
import { useCurrency } from '@/hooks/useCurrency';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Search, MapPin, Edit2, Trash2, Home, RefreshCw, DoorOpen } from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { toSentenceCase, toTitleCase } from '@/lib/utils';
import AdSpace from '@/components/AdSpace';

const CATEGORIES = [
  { value: 'house', label: '🏠 House / Apartment', subs: ['apartment', 'single-room', 'bedsitter', 'studio', 'duplex', 'mansion', 'hostel', 'commercial'] },
  { value: 'land', label: '🏞️ Land', subs: ['plot', 'farm', 'parking'] },
  { value: 'vehicle', label: '🚗 Vehicle', subs: ['car', 'motorcycle', 'trailer', 'truck', 'bus'] },
  { value: 'vessel', label: '🚢 Water Vessel', subs: ['boat', 'yacht', 'canoe', 'jet-ski'] },
];

const catIcon = (cat: string) => cat === 'house' ? '🏠' : cat === 'land' ? '🏞️' : cat === 'vehicle' ? '🚗' : '🚢';

function AssetForm({ asset, onSave, onClose }: { asset?: PropertyAsset; onSave: (data: Partial<PropertyAsset>) => void; onClose: () => void }) {
  const { t } = useTranslation();
  const { currency } = useCurrency();
  const [form, setForm] = useState({
    name: asset?.name || '',
    description: asset?.description || '',
    category: asset?.category || 'house',
    sub_category: asset?.sub_category || '',
    location: asset?.location || '',
    area_size: asset?.area_size || 0,
    area_unit: asset?.area_unit || 'sqm',
    total_rooms: (asset as any)?.total_rooms || 0,
    room_size: (asset as any)?.room_size || '',
    hourly_price: asset?.hourly_price || 0,
    daily_price: asset?.daily_price || 0,
    monthly_price: asset?.monthly_price || 0,
    owner_name: asset?.owner_name || '',
    owner_contact: asset?.owner_contact || '',
    features: asset?.features || '',
    rules: asset?.rules || '',
    image_url_1: asset?.image_url_1 || '',
    image_url_2: asset?.image_url_2 || '',
    image_url_3: asset?.image_url_3 || '',
    is_available: asset?.is_available ?? true,
  });

  const catInfo = CATEGORIES.find(c => c.value === form.category);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (!form.location.trim()) { toast.error('Location is required'); return; }
    onSave({
      ...form,
      name: toSentenceCase(form.name.trim()),
      description: toSentenceCase(form.description.trim()),
      location: toTitleCase(form.location.trim()),
      owner_name: toTitleCase(form.owner_name.trim()),
      features: form.features.trim(),
      rules: toSentenceCase(form.rules.trim()),
    });
    onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label>Asset Name *</Label>
          <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Room 1 - front, Room 2 - back, Toyota Hiace" required />
          <p className="text-[10px] text-muted-foreground mt-0.5">💡 For different prices, add each room/unit as a separate asset (e.g. "Room 1 - Front", "Room 2 - Back")</p>
        </div>
        <div>
          <Label>Category</Label>
          <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v, sub_category: '' }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Sub-Category</Label>
          <Select value={form.sub_category} onValueChange={v => setForm(p => ({ ...p, sub_category: v }))}>
            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              {catInfo?.subs.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <Label><MapPin className="h-3 w-3 inline mr-1" />Location *</Label>
          <Input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="City, Area" required />
        </div>

        {/* House-specific: rooms */}
        {form.category === 'house' && (
          <>
            <div>
              <Label><DoorOpen className="h-3 w-3 inline mr-1" />Total Rooms</Label>
              <Input type="number" min="0" value={form.total_rooms || ''} onChange={e => setForm(p => ({ ...p, total_rooms: +e.target.value }))} placeholder="e.g. 10" />
            </div>
            <div>
              <Label>Room Size</Label>
              <Input value={form.room_size} onChange={e => setForm(p => ({ ...p, room_size: e.target.value }))} placeholder="e.g. 4m x 3m" />
            </div>
          </>
        )}

        {/* Land/house: area */}
        {(form.category === 'land' || form.category === 'house') && (
          <>
            <div>
              <Label>Area Size</Label>
              <Input type="number" value={form.area_size || ''} onChange={e => setForm(p => ({ ...p, area_size: +e.target.value }))} />
            </div>
            <div>
              <Label>Unit</Label>
              <Select value={form.area_unit} onValueChange={v => setForm(p => ({ ...p, area_unit: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sqm">sqm</SelectItem>
                  <SelectItem value="sqft">sqft</SelectItem>
                  <SelectItem value="acres">acres</SelectItem>
                  <SelectItem value="hectares">hectares</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        <div className="col-span-2">
          <Label>Description</Label>
          <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe your asset..." rows={3} />
        </div>
      </div>

      <div className="border-t pt-3">
        <p className="text-xs font-semibold mb-2">Pricing ({currency})</p>
        <div className="grid grid-cols-3 gap-2">
          <div><Label className="text-xs">Hourly</Label><Input type="number" value={form.hourly_price || ''} onChange={e => setForm(p => ({ ...p, hourly_price: +e.target.value }))} /></div>
          <div><Label className="text-xs">Daily</Label><Input type="number" value={form.daily_price || ''} onChange={e => setForm(p => ({ ...p, daily_price: +e.target.value }))} /></div>
          <div><Label className="text-xs">Monthly</Label><Input type="number" value={form.monthly_price || ''} onChange={e => setForm(p => ({ ...p, monthly_price: +e.target.value }))} /></div>
        </div>
      </div>

      <div className="border-t pt-3">
        <p className="text-xs font-semibold mb-2">Owner Information</p>
        <div className="grid grid-cols-2 gap-2">
          <div><Label className="text-xs">Name</Label><Input value={form.owner_name} onChange={e => setForm(p => ({ ...p, owner_name: e.target.value }))} /></div>
          <div><Label className="text-xs">Phone</Label><Input value={form.owner_contact} onChange={e => setForm(p => ({ ...p, owner_contact: e.target.value }))} /></div>
        </div>
      </div>

      <div className="border-t pt-3">
        <Label className="text-xs">Features (comma-separated)</Label>
        <Input value={form.features} onChange={e => setForm(p => ({ ...p, features: e.target.value }))} placeholder="WiFi, Parking, AC..." />
        <Label className="text-xs mt-2">Rental Rules</Label>
        <Textarea value={form.rules} onChange={e => setForm(p => ({ ...p, rules: e.target.value }))} placeholder="No smoking, pets allowed..." rows={2} />
      </div>

      <div className="border-t pt-3">
        <p className="text-xs font-semibold mb-2">Photos</p>
        <div className="flex gap-3 flex-wrap">
          <ImageUpload bucket="item-images" path="property" currentUrl={form.image_url_1} onUploaded={url => setForm(p => ({ ...p, image_url_1: url }))} onRemoved={() => setForm(p => ({ ...p, image_url_1: '' }))} size="sm" label="Photo 1" />
          <ImageUpload bucket="item-images" path="property" currentUrl={form.image_url_2} onUploaded={url => setForm(p => ({ ...p, image_url_2: url }))} onRemoved={() => setForm(p => ({ ...p, image_url_2: '' }))} size="sm" label="Photo 2" />
          <ImageUpload bucket="item-images" path="property" currentUrl={form.image_url_3} onUploaded={url => setForm(p => ({ ...p, image_url_3: url }))} onRemoved={() => setForm(p => ({ ...p, image_url_3: '' }))} size="sm" label="Photo 3" />
        </div>
      </div>

      <div className="flex items-center gap-2 border-t pt-3">
        <Switch checked={form.is_available} onCheckedChange={v => setForm(p => ({ ...p, is_available: v }))} />
        <Label className="text-sm">Available for Rent</Label>
      </div>

      <div className="flex gap-2">
        <Button type="submit" className="flex-1">{asset ? 'Save' : 'List Asset'}</Button>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  );
}

export default function PropertyAssets() {
  const { t } = useTranslation();
  const { assets, addAsset, updateAsset, deleteAsset, bookings } = useProperty();
  const { userRole } = useBusiness();
  const { currency, fmt } = useCurrency();
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAsset, setEditAsset] = useState<PropertyAsset | undefined>();
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxTitle, setLightboxTitle] = useState('');

  const filtered = assets.filter(a => {
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.location.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === 'all' || a.category === filterCat;
    return matchSearch && matchCat;
  });

  function getBookingStatus(assetId: string) {
    const active = bookings.find(b => b.asset_id === assetId && (b.status === 'active' || b.status === 'confirmed'));
    return active ? 'occupied' : 'vacant';
  }

  function getOccupiedRooms(assetId: string) {
    return bookings.filter(b => b.asset_id === assetId && (b.status === 'active' || b.status === 'confirmed')).length;
  }

  async function reAdvertise(assetId: string) {
    await supabase.from('property_assets').update({ is_available: true } as any).eq('id', assetId);
    toast.success('Asset re-advertised as available!');
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">🏠 My Assets</h1>
        <Dialog open={dialogOpen} onOpenChange={v => { setDialogOpen(v); if (!v) setEditAsset(undefined); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editAsset ? 'Edit Asset' : 'List New Asset'}</DialogTitle>
            </DialogHeader>
            <AssetForm asset={editAsset} onSave={data => { editAsset ? updateAsset(editAsset.id, data) : addAsset(data); }} onClose={() => { setDialogOpen(false); setEditAsset(undefined); }} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search assets..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Home className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No assets listed yet</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((asset, idx) => {
            const showAd = idx > 0 && idx % 8 === 0;
            const status = getBookingStatus(asset.id);
            const totalRooms = (asset as any).total_rooms || 0;
            const occupiedRooms = asset.category === 'house' && totalRooms > 0 ? getOccupiedRooms(asset.id) : 0;
            const vacantRooms = totalRooms - occupiedRooms;
            const activeBookingsCount = bookings.filter(b => b.asset_id === asset.id && (b.status === 'active' || b.status === 'confirmed')).length;

            return (
              <React.Fragment key={asset.id}>
                {showAd && <div className="sm:col-span-2"><AdSpace variant="inline" /></div>}
                <Card className={`overflow-hidden ${status === 'occupied' ? 'border-destructive/30' : 'border-success/30'}`}>
                  {asset.image_url_1 && (
                    <button className="h-32 overflow-hidden w-full" onClick={() => { setLightboxImages([asset.image_url_1, asset.image_url_2, asset.image_url_3].filter(Boolean)); setLightboxTitle(asset.name); }}>
                      <img src={asset.image_url_1} alt={asset.name} className="w-full h-full object-cover" />
                    </button>
                  )}
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-sm">{asset.name}</h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{asset.location}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant={status === 'occupied' ? 'destructive' : 'default'} className="text-[10px]">
                          {status === 'occupied' ? '🔴 Rented' : '🟢 Available'}
                        </Badge>
                        {!asset.is_available && <Badge variant="secondary" className="text-[10px]">Hidden</Badge>}
                      </div>
                    </div>
                    <div className="flex gap-2 text-xs flex-wrap">
                      <span className="capitalize">{catIcon(asset.category)} {asset.sub_category || asset.category}</span>
                      {asset.area_size > 0 && <span>· 📐 {asset.area_size} {asset.area_unit}</span>}
                      {(asset as any).room_size && <span>· {(asset as any).room_size}</span>}
                    </div>

                    {/* Room breakdown for houses */}
                    {asset.category === 'house' && totalRooms > 0 && (
                      <div className="flex gap-2 text-xs">
                        <Badge variant="outline" className="text-[9px]">🚪 {totalRooms} rooms</Badge>
                        <Badge variant="default" className="text-[9px] bg-success/10 text-success">{vacantRooms} vacant</Badge>
                        {occupiedRooms > 0 && <Badge variant="secondary" className="text-[9px]">{occupiedRooms} occupied</Badge>}
                      </div>
                    )}

                    {/* Active bookings indicator for non-house assets */}
                    {asset.category !== 'house' && activeBookingsCount > 0 && (
                      <div className="text-[10px] text-muted-foreground">
                        📋 {activeBookingsCount} active booking{activeBookingsCount > 1 ? 's' : ''}
                      </div>
                    )}

                    <div className="flex gap-3 text-xs">
                      {asset.hourly_price > 0 && <span>{fmt(asset.hourly_price)}/hr</span>}
                      {asset.daily_price > 0 && <span>{fmt(asset.daily_price)}/day</span>}
                      {asset.monthly_price > 0 && <span>{fmt(asset.monthly_price)}/mo</span>}
                    </div>
                    {asset.features && (
                      <div className="flex flex-wrap gap-1">
                        {asset.features.split(',').slice(0, 4).map((f, i) => (
                          <Badge key={i} variant="outline" className="text-[9px] py-0">{f.trim()}</Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-1 pt-1">
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditAsset(asset); setDialogOpen(true); }}>
                        <Edit2 className="h-3 w-3 mr-1" />Edit
                      </Button>
                      {/* Re-advertise button for unavailable assets */}
                      {!asset.is_available && status !== 'occupied' && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-primary" onClick={() => reAdvertise(asset.id)}>
                          <RefreshCw className="h-3 w-3 mr-1" />Re-advertise
                        </Button>
                      )}
                      {(userRole === 'owner' || userRole === 'admin') && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => { if (confirm('Delete this asset?')) deleteAsset(asset.id); }}>
                          <Trash2 className="h-3 w-3 mr-1" />Delete
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </React.Fragment>
            );
          })}
        </div>
      )}
      <ImageLightbox
        images={lightboxImages}
        open={lightboxImages.length > 0}
        onOpenChange={(o) => { if (!o) setLightboxImages([]); }}
        title={lightboxTitle}
      />
    </div>
  );
}
