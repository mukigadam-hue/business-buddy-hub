import { useEffect, useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNetworkStatus } from './useNetworkStatus';
import { getOfflineQueue, saveOfflineQueue, type OfflineQueueItem } from '@/lib/offlineStore';

const SYNC_EVENT = 'biztrack_offline_sync_complete';
const QUEUE_EVENT = 'biztrack_queue_changed';

function findMatchingStockItem(stockItems: any[], item: any) {
  return (
    stockItems.find((s) => s.name?.toLowerCase() === item.item_name?.toLowerCase() &&
      (s.category || '').toLowerCase() === (item.category || '').toLowerCase() &&
      (s.quality || '').toLowerCase() === (item.quality || '').toLowerCase()
    ) || stockItems.find((s) => s.name?.toLowerCase() === item.item_name?.toLowerCase())
  );
}

async function syncOperation(op: OfflineQueueItem): Promise<string[]> {
  switch (op.action) {
    case 'create_stock_item': {
      const { error } = await supabase.from('stock_items').insert(op.payload.item as any);
      if (error) throw error;
      return op.optimisticIds || [];
    }
    case 'create_sale': {
      const { sale, items, businessId } = op.payload;
      const { data: saleData, error } = await supabase.from('sales').insert(sale as any).select().single();
      if (error || !saleData) throw error || new Error('Failed to sync sale');
      const saleItems = items.map((item: any) => ({
        sale_id: saleData.id, stock_item_id: item.stock_item_id || null,
        item_name: item.item_name, category: item.category, quality: item.quality,
        quantity: item.quantity, price_type: item.price_type, unit_price: item.unit_price,
        subtotal: item.subtotal, serial_numbers: item.serial_numbers || '',
      }));
      if (saleItems.length > 0) await supabase.from('sale_items').insert(saleItems as any);
      const { data: stockItems } = await supabase.from('stock_items').select('*').eq('business_id', businessId).is('deleted_at', null);
      for (const item of items) {
        if (item.price_type === 'service') continue;
        const stockItem = item.stock_item_id
          ? stockItems?.find((e: any) => e.id === item.stock_item_id)
          : findMatchingStockItem(stockItems || [], item);
        if (stockItem) {
          await supabase.from('stock_items').update({ quantity: Math.max(0, Number(stockItem.quantity) - Number(item.quantity)) } as any).eq('id', stockItem.id);
        }
      }
      return op.optimisticIds || [];
    }
    case 'create_purchase': {
      const { purchase, items, businessId } = op.payload;
      const { data: pd, error } = await supabase.from('purchases').insert(purchase as any).select().single();
      if (error || !pd) throw error || new Error('Failed to sync purchase');
      const pItems = items.map((item: any) => ({
        purchase_id: pd.id, item_name: item.item_name, category: item.category,
        quality: item.quality, quantity: item.quantity, unit_price: item.unit_price,
        subtotal: item.subtotal, serial_numbers: item.serial_numbers || '',
      }));
      if (pItems.length > 0) await supabase.from('purchase_items').insert(pItems as any);
      const { data: stockItems } = await supabase.from('stock_items').select('*').eq('business_id', businessId).is('deleted_at', null);
      for (const item of items) {
        const existing = findMatchingStockItem(stockItems || [], item);
        const bp = Number(item.unit_price) || 0;
        const wp = Number(item.wholesale_price ?? item.unit_price) || 0;
        const rp = Number(item.retail_price ?? item.unit_price) || 0;
        if (existing) {
          await supabase.from('stock_items').update({ quantity: Number(existing.quantity) + Number(item.quantity), buying_price: bp, wholesale_price: wp, retail_price: rp } as any).eq('id', existing.id);
        } else {
          await supabase.from('stock_items').insert({ business_id: businessId, name: item.item_name, category: item.category || '', quality: item.quality || '', buying_price: bp, wholesale_price: wp, retail_price: rp, quantity: item.quantity, min_stock_level: item.min_stock_level || 5, barcode: item.barcode || '' } as any);
        }
      }
      return op.optimisticIds || [];
    }
    case 'create_order': {
      const { order, items, notification } = op.payload;
      const { data: od, error } = await supabase.from('orders').insert(order as any).select().single();
      if (error || !od) throw error || new Error('Failed to sync order');
      const oItems = items.map((item: any) => ({ order_id: od.id, item_name: item.item_name, category: item.category, quality: item.quality, quantity: item.quantity, price_type: item.price_type, unit_price: item.unit_price, subtotal: item.subtotal, serial_numbers: item.serial_numbers || '' }));
      if (oItems.length > 0) await supabase.from('order_items').insert(oItems as any);
      if (notification) await supabase.from('notifications').insert(notification as any);
      return op.optimisticIds || [];
    }
    case 'send_b2b_order': {
      const { error, data } = await supabase.functions.invoke('send-b2b-order', { body: op.payload });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return op.optimisticIds || [];
    }
    case 'create_property_booking': {
      const { booking, notify } = op.payload;
      const { data: hasConflict } = await supabase.rpc('check_booking_conflict', { _asset_id: booking.asset_id, _start: booking.start_date, _end: booking.end_date });
      if (hasConflict) throw new Error('Property no longer available for selected dates');
      const { error } = await supabase.from('property_bookings').insert(booking as any);
      if (error) throw error;
      if (notify) await supabase.from('notifications').insert({ business_id: booking.business_id, title: notify.title, message: notify.message, type: 'booking' } as any);
      return op.optimisticIds || [];
    }
    case 'create_expense': {
      const { error } = await supabase.from('business_expenses').insert(op.payload.expense as any);
      if (error) throw error;
      return op.optimisticIds || [];
    }
    case 'create_factory_expense': {
      const { error } = await supabase.from('factory_expenses').insert(op.payload.expense as any);
      if (error) throw error;
      return op.optimisticIds || [];
    }
    case 'create_raw_material': {
      const { error } = await supabase.from('factory_raw_materials').insert(op.payload.item as any);
      if (error) throw error;
      return op.optimisticIds || [];
    }
    case 'create_production': {
      const { error } = await supabase.from('factory_production').insert(op.payload.record as any);
      if (error) throw error;
      return op.optimisticIds || [];
    }
    default:
      return [];
  }
}

export function useOfflineQueue() {
  const isOnline = useNetworkStatus();
  const syncingRef = useRef(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Load initial count
  useEffect(() => {
    getOfflineQueue().then(q => setPendingCount(q.length));
  }, []);

  const syncQueue = useCallback(async () => {
    if (syncingRef.current) return;
    const queue = await getOfflineQueue();
    if (queue.length === 0) return;

    syncingRef.current = true;
    const failed: OfflineQueueItem[] = [];
    const syncedOptimisticIds: string[] = [];
    let synced = 0;

    try {
      for (const op of queue) {
        try {
          const ids = await syncOperation(op);
          synced++;
          syncedOptimisticIds.push(...ids);
        } catch (err) {
          console.error('Offline sync failed for op:', op, err);
          failed.push(op);
        }
      }

      await saveOfflineQueue(failed);
      setPendingCount(failed.length);

      if (synced > 0) {
        window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { optimisticIds: syncedOptimisticIds, synced } }));
        toast.success(`✅ ${synced} offline record(s) synced successfully!`);
      }
      if (failed.length > 0) {
        toast.error(`${failed.length} record(s) failed to sync. Will retry.`);
      }
    } finally {
      syncingRef.current = false;
    }
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const count = (e as CustomEvent<{ count?: number }>).detail?.count;
      setPendingCount(typeof count === 'number' ? count : 0);
    };
    window.addEventListener(QUEUE_EVENT, handler as EventListener);
    return () => window.removeEventListener(QUEUE_EVENT, handler as EventListener);
  }, []);

  useEffect(() => {
    if (isOnline) syncQueue();
  }, [isOnline, syncQueue]);

  useEffect(() => {
    if (!isOnline) return;
    const interval = setInterval(syncQueue, 15000);
    return () => clearInterval(interval);
  }, [isOnline, syncQueue]);

  return { isOnline, syncQueue, pendingCount };
}
