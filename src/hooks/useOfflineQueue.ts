import { useEffect, useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNetworkStatus } from './useNetworkStatus';

interface LegacyQueuedOperation {
  table: string;
  type: 'insert' | 'update' | 'delete';
  data: any;
  filter?: { column: string; value: string };
}

interface ActionQueuedOperation {
  action:
    | 'create_stock_item'
    | 'create_sale'
    | 'create_purchase'
    | 'create_order'
    | 'send_b2b_order'
    | 'create_property_booking';
  payload: any;
  optimisticIds?: string[];
}

type QueuedOperation = {
  id: string;
  timestamp: number;
} & (LegacyQueuedOperation | ActionQueuedOperation);

const QUEUE_KEY = 'biztrack_offline_queue';
const QUEUE_EVENT = 'biztrack_offline_queue_changed';
const SYNC_EVENT = 'biztrack_offline_sync_complete';

function emitWindowEvent(name: string, detail?: Record<string, any>) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

function getQueue(): QueuedOperation[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedOperation[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  emitWindowEvent(QUEUE_EVENT, { count: queue.length });
}

export function enqueueOfflineOperation(op: Omit<QueuedOperation, 'id' | 'timestamp'>) {
  const queue = getQueue();
  queue.push({ ...op, id: crypto.randomUUID(), timestamp: Date.now() } as QueuedOperation);
  saveQueue(queue);
}

function findMatchingStockItem(stockItems: any[], item: any) {
  return (
    stockItems.find((stockItem) =>
      stockItem.name?.toLowerCase() === item.item_name?.toLowerCase() &&
      (stockItem.category || '').toLowerCase() === (item.category || '').toLowerCase() &&
      (stockItem.quality || '').toLowerCase() === (item.quality || '').toLowerCase()
    ) || stockItems.find((stockItem) => stockItem.name?.toLowerCase() === item.item_name?.toLowerCase())
  );
}

async function syncLegacyOperation(op: QueuedOperation) {
  if (!('table' in op)) return { optimisticIds: [] as string[] };

  if (op.type === 'insert') {
    const { error } = await supabase.from(op.table as any).insert(op.data);
    if (error) throw error;
  } else if (op.type === 'update' && op.filter) {
    const { error } = await supabase.from(op.table as any).update(op.data).eq(op.filter.column, op.filter.value);
    if (error) throw error;
  } else if (op.type === 'delete' && op.filter) {
    const { error } = await supabase.from(op.table as any).delete().eq(op.filter.column, op.filter.value);
    if (error) throw error;
  }

  return { optimisticIds: [] as string[] };
}

async function syncActionOperation(op: QueuedOperation) {
  if (!('action' in op)) return { optimisticIds: [] as string[] };

  switch (op.action) {
    case 'create_stock_item': {
      const { item } = op.payload;
      const { error } = await supabase.from('stock_items').insert(item as any);
      if (error) throw error;
      return { optimisticIds: op.optimisticIds || [] };
    }

    case 'create_sale': {
      const { sale, items, businessId } = op.payload;
      const { data: saleData, error: saleError } = await supabase.from('sales').insert(sale as any).select().single();
      if (saleError || !saleData) throw saleError || new Error('Failed to sync sale');

      const saleItems = items.map((item: any) => ({
        sale_id: saleData.id,
        stock_item_id: item.stock_item_id || null,
        item_name: item.item_name,
        category: item.category,
        quality: item.quality,
        quantity: item.quantity,
        price_type: item.price_type,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
        serial_numbers: item.serial_numbers || '',
      }));

      if (saleItems.length > 0) {
        const { error: itemError } = await supabase.from('sale_items').insert(saleItems as any);
        if (itemError) throw itemError;
      }

      const { data: stockItems } = await supabase.from('stock_items').select('*').eq('business_id', businessId).is('deleted_at', null);
      for (const item of items) {
        if (item.price_type === 'service') continue;
        const stockItem = item.stock_item_id
          ? stockItems?.find((entry: any) => entry.id === item.stock_item_id)
          : findMatchingStockItem(stockItems || [], item);

        if (stockItem) {
          const { error: stockError } = await supabase
            .from('stock_items')
            .update({ quantity: Math.max(0, Number(stockItem.quantity) - Number(item.quantity)) } as any)
            .eq('id', stockItem.id);
          if (stockError) throw stockError;
        }
      }

      return { optimisticIds: op.optimisticIds || [] };
    }

    case 'create_purchase': {
      const { purchase, items, businessId } = op.payload;
      const { data: purchaseData, error: purchaseError } = await supabase.from('purchases').insert(purchase as any).select().single();
      if (purchaseError || !purchaseData) throw purchaseError || new Error('Failed to sync purchase');

      const purchaseItems = items.map((item: any) => ({
        purchase_id: purchaseData.id,
        item_name: item.item_name,
        category: item.category,
        quality: item.quality,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
        serial_numbers: item.serial_numbers || '',
      }));

      if (purchaseItems.length > 0) {
        const { error: itemError } = await supabase.from('purchase_items').insert(purchaseItems as any);
        if (itemError) throw itemError;
      }

      const { data: stockItems } = await supabase.from('stock_items').select('*').eq('business_id', businessId).is('deleted_at', null);
      for (const item of items) {
        const existingStock = findMatchingStockItem(stockItems || [], item);
        const buyPrice = Number(item.unit_price) || 0;
        const wholesalePrice = Number(item.wholesale_price ?? item.unit_price) || 0;
        const retailPrice = Number(item.retail_price ?? item.unit_price) || 0;

        if (existingStock) {
          const { error: stockError } = await supabase.from('stock_items').update({
            quantity: Number(existingStock.quantity) + Number(item.quantity),
            buying_price: buyPrice,
            wholesale_price: wholesalePrice,
            retail_price: retailPrice,
          } as any).eq('id', existingStock.id);
          if (stockError) throw stockError;
        } else {
          const { error: insertError } = await supabase.from('stock_items').insert({
            business_id: businessId,
            name: item.item_name,
            category: item.category || '',
            quality: item.quality || '',
            buying_price: buyPrice,
            wholesale_price: wholesalePrice,
            retail_price: retailPrice,
            quantity: item.quantity,
            min_stock_level: item.min_stock_level || 5,
            barcode: item.barcode || '',
          } as any);
          if (insertError) throw insertError;
        }
      }

      return { optimisticIds: op.optimisticIds || [] };
    }

    case 'create_order': {
      const { order, items, notification } = op.payload;
      const { data: orderData, error: orderError } = await supabase.from('orders').insert(order as any).select().single();
      if (orderError || !orderData) throw orderError || new Error('Failed to sync order');

      const orderItems = items.map((item: any) => ({
        order_id: orderData.id,
        item_name: item.item_name,
        category: item.category,
        quality: item.quality,
        quantity: item.quantity,
        price_type: item.price_type,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
        serial_numbers: item.serial_numbers || '',
      }));

      if (orderItems.length > 0) {
        const { error: itemError } = await supabase.from('order_items').insert(orderItems as any);
        if (itemError) throw itemError;
      }

      if (notification) {
        await supabase.from('notifications').insert(notification as any);
      }

      return { optimisticIds: op.optimisticIds || [] };
    }

    case 'send_b2b_order': {
      const { error, data } = await supabase.functions.invoke('send-b2b-order', { body: op.payload });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return { optimisticIds: op.optimisticIds || [] };
    }

    case 'create_property_booking': {
      const { booking, notify } = op.payload;
      const { data: hasConflict } = await supabase.rpc('check_booking_conflict', {
        _asset_id: booking.asset_id,
        _start: booking.start_date,
        _end: booking.end_date,
      });
      if (hasConflict) throw new Error('That property is no longer available for the selected dates');

      const { error: bookingError } = await supabase.from('property_bookings').insert(booking as any);
      if (bookingError) throw bookingError;

      if (notify) {
        await supabase.from('notifications').insert({
          business_id: booking.business_id,
          title: notify.title,
          message: notify.message,
          type: 'booking',
        } as any);
      }

      return { optimisticIds: op.optimisticIds || [] };
    }

    default:
      return { optimisticIds: [] as string[] };
  }
}

export function useOfflineQueue() {
  const isOnline = useNetworkStatus();
  const syncingRef = useRef(false);
  const [pendingCount, setPendingCount] = useState(getQueue().length);

  const syncQueue = useCallback(async () => {
    if (syncingRef.current) return;
    const queue = getQueue();
    if (queue.length === 0) return;

    syncingRef.current = true;
    const failed: QueuedOperation[] = [];
    const syncedOptimisticIds: string[] = [];
    let synced = 0;

    try {
      for (const op of queue) {
        try {
          const result = 'action' in op ? await syncActionOperation(op) : await syncLegacyOperation(op);
          synced++;
          syncedOptimisticIds.push(...(result.optimisticIds || []));
        } catch (err) {
          console.error('Offline sync failed for op:', op, err);
          failed.push(op);
        }
      }

      saveQueue(failed);
      setPendingCount(failed.length);

      if (synced > 0) {
        emitWindowEvent(SYNC_EVENT, { optimisticIds: syncedOptimisticIds, synced });
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
    const handleQueueChange = (event: Event) => {
      const count = (event as CustomEvent<{ count?: number }>).detail?.count;
      setPendingCount(typeof count === 'number' ? count : getQueue().length);
    };

    window.addEventListener(QUEUE_EVENT, handleQueueChange as EventListener);
    window.addEventListener('storage', handleQueueChange as EventListener);

    return () => {
      window.removeEventListener(QUEUE_EVENT, handleQueueChange as EventListener);
      window.removeEventListener('storage', handleQueueChange as EventListener);
    };
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
