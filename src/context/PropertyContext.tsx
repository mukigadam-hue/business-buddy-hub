import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from './BusinessContext';
import { useAuth } from './AuthContext';
import { CACHE_KEYS, cachePersist, readJsonSync } from '@/lib/offlineStore';
import { addToOfflineQueue } from '@/lib/offlineStore';

export interface PropertyAsset {
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
  is_available: boolean;
  image_url_1: string;
  image_url_2: string;
  image_url_3: string;
  owner_name: string;
  owner_contact: string;
  features: string;
  rules: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PropertyBooking {
  id: string;
  asset_id: string;
  business_id: string;
  renter_id: string;
  renter_name: string;
  renter_contact: string;
  start_date: string;
  end_date: string;
  duration_type: string;
  total_price: number;
  status: string;
  payment_status: string;
  amount_paid: number;
  notes: string;
  created_at: string;
  asset?: PropertyAsset;
}

export interface PropertyCheckIn {
  id: string;
  booking_id: string;
  business_id: string;
  check_type: string;
  photo_urls: string[];
  notes: string;
  recorded_by: string;
  created_at: string;
}

export interface PropertyConversation {
  id: string;
  asset_id: string | null;
  business_id: string;
  renter_id: string;
  last_message_at: string;
  created_at: string;
  renter_name?: string;
  asset_name?: string;
  unread_count?: number;
}

export interface PropertyMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface PropertyContextType {
  assets: PropertyAsset[];
  bookings: PropertyBooking[];
  conversations: PropertyConversation[];
  loading: boolean;
  addAsset: (asset: Partial<PropertyAsset>) => Promise<void>;
  updateAsset: (id: string, updates: Partial<PropertyAsset>) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  addBooking: (booking: Partial<PropertyBooking>) => Promise<boolean>;
  updateBooking: (id: string, updates: Partial<PropertyBooking>) => Promise<void>;
  addCheckIn: (checkIn: Omit<PropertyCheckIn, 'id' | 'created_at'>) => Promise<void>;
  getCheckIns: (bookingId: string) => Promise<PropertyCheckIn[]>;
  getConversations: () => Promise<PropertyConversation[]>;
  getMessages: (conversationId: string) => Promise<PropertyMessage[]>;
  sendMessage: (conversationId: string, message: string) => Promise<void>;
  startConversation: (assetId: string, businessId: string) => Promise<string | null>;
  refreshData: () => Promise<void>;
}

const PropertyContext = createContext<PropertyContextType | null>(null);

export function PropertyProvider({ children }: { children: React.ReactNode }) {
  const { currentBusiness } = useBusiness();
  const { user } = useAuth();
  const [assets, setAssets] = useState<PropertyAsset[]>(() => readJsonSync(CACHE_KEYS.propertyAssets, []));
  const [bookings, setBookings] = useState<PropertyBooking[]>(() => readJsonSync(CACHE_KEYS.propertyBookings, []));
  const [conversations, setConversations] = useState<PropertyConversation[]>(() => readJsonSync(CACHE_KEYS.propertyConversations, []));
  const [loading, setLoading] = useState(() => readJsonSync<PropertyAsset[]>(CACHE_KEYS.propertyAssets, []).length === 0 && navigator.onLine);

  const businessId = currentBusiness?.id;

  // Persist to IndexedDB + localStorage
  useEffect(() => { cachePersist(CACHE_KEYS.propertyAssets, assets); }, [assets]);
  useEffect(() => { cachePersist(CACHE_KEYS.propertyBookings, bookings); }, [bookings]);
  useEffect(() => { cachePersist(CACHE_KEYS.propertyConversations, conversations); }, [conversations]);

  const loadData = useCallback(async () => {
    if (!businessId) return;
    if (assets.length === 0) setLoading(true);
    try {
      const [assetsRes, bookingsRes, convsRes] = await Promise.all([
        supabase.from('property_assets').select('*').eq('business_id', businessId).is('deleted_at', null).order('created_at', { ascending: false }),
        supabase.from('property_bookings').select('*').eq('business_id', businessId).is('deleted_at', null).order('created_at', { ascending: false }),
        supabase.from('property_conversations').select('*').eq('business_id', businessId).order('last_message_at', { ascending: false }),
      ]);
      setAssets((assetsRes.data || []) as PropertyAsset[]);
      setBookings((bookingsRes.data || []) as PropertyBooking[]);
      setConversations((convsRes.data || []) as PropertyConversation[]);
    } catch (err) {
      console.warn('Failed to load property data (offline?):', err);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    if (businessId) {
      loadData();
      const channel = supabase
        .channel(`property-${businessId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'property_assets', filter: `business_id=eq.${businessId}` }, () => loadData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'property_bookings', filter: `business_id=eq.${businessId}` }, () => loadData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'property_messages' }, () => loadData())
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [businessId, loadData]);

  async function addAsset(asset: Partial<PropertyAsset>) {
    if (!businessId) return;
    const tempId = crypto.randomUUID();
    const optimistic = { ...asset, id: tempId, business_id: businessId, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), deleted_at: null } as PropertyAsset;
    setAssets(prev => [optimistic, ...prev]);
    toast.success('Asset listed!');
    const { error } = await supabase.from('property_assets').insert({ ...asset, business_id: businessId } as any);
    if (error) { toast.error('Save failed: ' + error.message); setAssets(prev => prev.filter(a => a.id !== tempId)); return; }
    loadData();
  }

  async function updateAsset(id: string, updates: Partial<PropertyAsset>) {
    const { error } = await supabase.from('property_assets').update(updates as any).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Asset updated!');
    loadData();
  }

  async function deleteAsset(id: string) {
    const { error } = await supabase.from('property_assets').update({ deleted_at: new Date().toISOString() } as any).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Asset removed');
    loadData();
  }

  async function addBooking(booking: Partial<PropertyBooking>): Promise<boolean> {
    if (!businessId || !user) return false;

    if (!navigator.onLine) {
      const tempId = crypto.randomUUID();
      const optimistic = {
        ...booking, id: tempId, business_id: businessId, renter_id: user.id,
        created_at: new Date().toISOString(), status: booking.status || 'pending',
        payment_status: booking.payment_status || 'unpaid', amount_paid: booking.amount_paid || 0,
      } as PropertyBooking;
      setBookings(prev => [optimistic, ...prev]);
      await addToOfflineQueue({
        action: 'create_property_booking',
        payload: {
          booking: { ...booking, business_id: businessId, renter_id: user.id },
          notify: { title: '📅 New Booking Request', message: `Booking from ${booking.renter_name || 'a renter'}` },
        },
        optimisticIds: [tempId],
      });
      toast.success('Booking saved offline — will sync when online');
      return true;
    }

    const { data: hasConflict } = await supabase.rpc('check_booking_conflict', {
      _asset_id: booking.asset_id!,
      _start: booking.start_date!,
      _end: booking.end_date!,
    });
    if (hasConflict) {
      toast.error('This asset is already booked for the selected dates');
      return false;
    }
    const { error } = await supabase.from('property_bookings').insert({
      ...booking, business_id: businessId, renter_id: user.id,
    } as any);
    if (error) { toast.error(error.message); return false; }
    toast.success('Booking request sent!');
    loadData();
    return true;
  }

  async function updateBooking(id: string, updates: Partial<PropertyBooking>) {
    const { error } = await supabase.from('property_bookings').update(updates as any).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Booking updated!');
    loadData();
  }

  async function addCheckIn(checkIn: Omit<PropertyCheckIn, 'id' | 'created_at'>) {
    const { error } = await supabase.from('property_check_ins').insert(checkIn as any);
    if (error) { toast.error(error.message); return; }
    toast.success('Check-in recorded!');
  }

  async function getCheckIns(bookingId: string): Promise<PropertyCheckIn[]> {
    const { data } = await supabase.from('property_check_ins').select('*').eq('booking_id', bookingId).order('created_at');
    return (data || []) as PropertyCheckIn[];
  }

  async function getConversations(): Promise<PropertyConversation[]> {
    if (!businessId) return [];
    const { data } = await supabase.from('property_conversations').select('*').eq('business_id', businessId).order('last_message_at', { ascending: false });
    return (data || []) as PropertyConversation[];
  }

  async function getMessages(conversationId: string): Promise<PropertyMessage[]> {
    const { data } = await supabase.from('property_messages').select('*').eq('conversation_id', conversationId).order('created_at');
    if (user) {
      await supabase.from('property_messages').update({ is_read: true } as any)
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .eq('is_read', false);
    }
    return (data || []) as PropertyMessage[];
  }

  async function sendMessage(conversationId: string, message: string) {
    if (!user) return;
    const { error } = await supabase.from('property_messages').insert({
      conversation_id: conversationId, sender_id: user.id, message,
    } as any);
    if (error) { toast.error(error.message); return; }
    await supabase.from('property_conversations').update({ last_message_at: new Date().toISOString() } as any).eq('id', conversationId);
  }

  async function startConversation(assetId: string, ownerBusinessId: string): Promise<string | null> {
    if (!user) return null;
    const { data: existing } = await supabase.from('property_conversations')
      .select('id').eq('asset_id', assetId).eq('renter_id', user.id)
      .eq('business_id', ownerBusinessId).limit(1);
    if (existing && existing.length > 0) return existing[0].id;
    const { data, error } = await supabase.from('property_conversations').insert({
      asset_id: assetId, business_id: ownerBusinessId, renter_id: user.id,
    } as any).select('id').single();
    if (error) { toast.error(error.message); return null; }
    return data?.id || null;
  }

  return (
    <PropertyContext.Provider value={{
      assets, bookings, conversations, loading,
      addAsset, updateAsset, deleteAsset,
      addBooking, updateBooking,
      addCheckIn, getCheckIns,
      getConversations, getMessages, sendMessage, startConversation,
      refreshData: loadData,
    }}>
      {children}
    </PropertyContext.Provider>
  );
}

export function useProperty() {
  const ctx = useContext(PropertyContext);
  if (!ctx) throw new Error('useProperty must be used within PropertyProvider');
  return ctx;
}
