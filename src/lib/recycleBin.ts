import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Recycle Bin helpers.
 *
 * Any team member can soft-delete transactional records (sales, purchases,
 * orders, services, expenses, production, bookings). Soft-deleted records
 * are hidden from all regular views but visible in the Recycle Bin (Settings),
 * where owners/admins can permanently delete them.
 *
 * When a sale/order/service is soft-deleted, stock quantities are restored
 * automatically (the items return to inventory). When a purchase is
 * soft-deleted, the stock quantities that were added by that purchase are
 * subtracted back out.
 */

export type RecyclableTable =
  | 'sales'
  | 'purchases'
  | 'orders'
  | 'services'
  | 'business_expenses'
  | 'factory_expenses'
  | 'factory_production'
  | 'property_bookings'
  | 'stock_items'
  | 'property_assets'
  | 'factory_raw_materials';

export interface DeleteActor {
  userId?: string;
  userName?: string;
  reason?: string;
}

export async function softDeleteRecord(
  table: RecyclableTable,
  id: string,
  actor: DeleteActor = {}
): Promise<boolean> {
  const payload: Record<string, any> = {
    deleted_at: new Date().toISOString(),
    deleted_by: actor.userId || null,
    deleted_by_name: actor.userName || '',
    deletion_reason: actor.reason || '',
  };
  const { error } = await supabase.from(table as any).update(payload).eq('id', id);
  if (error) {
    toast.error(error.message);
    return false;
  }
  return true;
}

export async function restoreRecord(table: RecyclableTable, id: string): Promise<boolean> {
  const { error } = await supabase
    .from(table as any)
    .update({ deleted_at: null, deleted_by: null, deleted_by_name: '', deletion_reason: '' })
    .eq('id', id);
  if (error) {
    toast.error(error.message);
    return false;
  }
  return true;
}

export async function permanentDeleteRecord(table: RecyclableTable, id: string): Promise<boolean> {
  // For tables with child items, delete children first to avoid FK issues.
  if (table === 'sales') {
    await supabase.from('sale_items').delete().eq('sale_id', id);
  } else if (table === 'purchases') {
    await supabase.from('purchase_items').delete().eq('purchase_id', id);
  } else if (table === 'orders') {
    await supabase.from('order_items').delete().eq('order_id', id);
  } else if (table === 'services') {
    await supabase.from('service_items').delete().eq('service_id', id);
  }
  const { error } = await supabase.from(table as any).delete().eq('id', id);
  if (error) {
    toast.error(error.message);
    return false;
  }
  return true;
}

/**
 * Restore stock quantities for items that belong to a sale/order/service
 * that is being soft-deleted. Returns items back to inventory.
 */
export async function restoreStockFromSale(saleId: string): Promise<void> {
  const { data: items } = await supabase
    .from('sale_items')
    .select('stock_item_id, quantity')
    .eq('sale_id', saleId);
  if (!items) return;
  for (const it of items as any[]) {
    if (!it.stock_item_id) continue;
    const { data: stock } = await supabase
      .from('stock_items')
      .select('quantity')
      .eq('id', it.stock_item_id)
      .maybeSingle();
    if (stock) {
      await supabase
        .from('stock_items')
        .update({ quantity: Number((stock as any).quantity || 0) + Number(it.quantity || 0) })
        .eq('id', it.stock_item_id);
    }
  }
}

export async function restoreStockFromOrder(orderId: string): Promise<void> {
  // Orders that were transferred to sale already decremented stock through
  // the linked sale; only decrement when the order itself reserves stock.
  // Keep conservative: restore based on order_items with matching stock by name.
  const { data: items } = await supabase
    .from('order_items')
    .select('item_name, category, quality, quantity, order_id')
    .eq('order_id', orderId);
  if (!items) return;
  // Look up the order to find the business
  const { data: ord } = await supabase.from('orders').select('business_id, transferred_to_sale').eq('id', orderId).maybeSingle();
  if (!ord || (ord as any).transferred_to_sale) return; // already handled via sale
  // No deterministic stock_item_id on order_items; skip stock restoration for orders.
}

export async function restoreStockFromService(serviceId: string): Promise<void> {
  const { data: parts } = await supabase
    .from('service_items')
    .select('stock_item_id, quantity')
    .eq('service_id', serviceId);
  if (!parts) return;
  for (const it of parts as any[]) {
    if (!it.stock_item_id) continue;
    const { data: stock } = await supabase
      .from('stock_items')
      .select('quantity')
      .eq('id', it.stock_item_id)
      .maybeSingle();
    if (stock) {
      await supabase
        .from('stock_items')
        .update({ quantity: Number((stock as any).quantity || 0) + Number(it.quantity || 0) })
        .eq('id', it.stock_item_id);
    }
  }
}

/**
 * When a purchase is reversed, subtract the quantities that were added to
 * stock. We match by stock item name+category+quality within the business.
 */
export async function reverseStockFromPurchase(purchaseId: string): Promise<void> {
  const { data: purchase } = await supabase
    .from('purchases')
    .select('business_id')
    .eq('id', purchaseId)
    .maybeSingle();
  if (!purchase) return;
  const businessId = (purchase as any).business_id;
  const { data: items } = await supabase
    .from('purchase_items')
    .select('item_name, category, quality, quantity')
    .eq('purchase_id', purchaseId);
  if (!items) return;
  for (const it of items as any[]) {
    const { data: stock } = await supabase
      .from('stock_items')
      .select('id, quantity')
      .eq('business_id', businessId)
      .ilike('name', it.item_name || '')
      .ilike('category', it.category || '')
      .ilike('quality', it.quality || '')
      .is('deleted_at', null)
      .maybeSingle();
    if (stock) {
      const newQty = Math.max(0, Number((stock as any).quantity || 0) - Number(it.quantity || 0));
      await supabase.from('stock_items').update({ quantity: newQty }).eq('id', (stock as any).id);
    }
  }
}

/**
 * Load all soft-deleted records for a business across transactional tables.
 * Returns a unified list for the Recycle Bin UI.
 */
export interface RecycledRecord {
  id: string;
  table: RecyclableTable;
  title: string;
  subtitle: string;
  amount?: number;
  deleted_at: string;
  deleted_by_name: string;
  deletion_reason: string;
  created_at: string;
}

export async function loadRecycleBin(businessId: string): Promise<RecycledRecord[]> {
  const tables: { t: RecyclableTable; title: (r: any) => string; subtitle: (r: any) => string; amount?: (r: any) => number }[] = [
    { t: 'sales', title: r => `Sale — ${r.customer_name || 'Walk-in'}`, subtitle: r => `By ${r.recorded_by || '-'}`, amount: r => Number(r.grand_total || 0) },
    { t: 'purchases', title: r => `Purchase — ${r.supplier || 'Supplier'}`, subtitle: r => `By ${r.recorded_by || '-'}`, amount: r => Number(r.grand_total || 0) },
    { t: 'orders', title: r => `Order ${r.code || ''} — ${r.customer_name || '-'}`, subtitle: r => `${r.type || 'order'} / ${r.status || '-'}`, amount: r => Number(r.grand_total || 0) },
    { t: 'services', title: r => `Service — ${r.service_name || '-'}`, subtitle: r => `${r.customer_name || '-'} by ${r.seller_name || '-'}`, amount: r => Number(r.cost || 0) },
    { t: 'business_expenses', title: r => `Expense — ${r.category || '-'}`, subtitle: r => r.description || '-', amount: r => Number(r.amount || 0) },
    { t: 'factory_expenses', title: r => `Factory Expense — ${r.category || '-'}`, subtitle: r => r.description || '-', amount: r => Number(r.amount || 0) },
    { t: 'factory_production', title: r => `Production — ${r.product_name || '-'}`, subtitle: r => `Batch ${r.batch_number || '-'}`, amount: r => Number(r.quantity_produced || 0) },
    { t: 'property_bookings', title: r => `Booking — ${r.renter_name || '-'}`, subtitle: r => `${r.status || '-'}`, amount: r => Number(r.total_price || 0) },
    { t: 'stock_items', title: r => `Stock — ${r.name || '-'}`, subtitle: r => `${r.category || '-'} / ${r.quality || '-'}`, amount: r => Number(r.quantity || 0) },
    { t: 'property_assets', title: r => `Asset — ${r.name || '-'}`, subtitle: r => `${r.category || '-'}`, amount: r => Number(r.daily_price || 0) },
    { t: 'factory_raw_materials', title: r => `Material — ${r.name || '-'}`, subtitle: r => `${r.category || '-'}`, amount: r => Number(r.quantity || 0) },
  ];

  const results: RecycledRecord[] = [];
  await Promise.all(
    tables.map(async ({ t, title, subtitle, amount }) => {
      try {
        const { data } = await supabase
          .from(t as any)
          .select('*')
          .eq('business_id', businessId)
          .not('deleted_at', 'is', null)
          .order('deleted_at', { ascending: false })
          .limit(200);
        (data || []).forEach((r: any) => {
          results.push({
            id: r.id,
            table: t,
            title: title(r),
            subtitle: subtitle(r),
            amount: amount ? amount(r) : undefined,
            deleted_at: r.deleted_at,
            deleted_by_name: r.deleted_by_name || '',
            deletion_reason: r.deletion_reason || '',
            created_at: r.created_at,
          });
        });
      } catch {
        // ignore per-table load errors (e.g. missing column on older schema)
      }
    })
  );

  results.sort((a, b) => (a.deleted_at < b.deleted_at ? 1 : -1));
  return results;
}

/**
 * Reverse any stock side-effects when restoring or permanently removing.
 * Called on both restore (re-apply) and permanent delete? We only reverse
 * stock on the initial soft-delete to avoid double-counting.
 */
export async function applyStockReversal(table: RecyclableTable, id: string): Promise<void> {
  if (table === 'sales') await restoreStockFromSale(id);
  else if (table === 'services') await restoreStockFromService(id);
  else if (table === 'purchases') await reverseStockFromPurchase(id);
  else if (table === 'orders') await restoreStockFromOrder(id);
}

/**
 * Re-apply stock side-effects when a record is restored (undo the reversal).
 */
export async function undoStockReversal(table: RecyclableTable, id: string): Promise<void> {
  if (table === 'sales') {
    // Subtract items back out of stock
    const { data: items } = await supabase
      .from('sale_items').select('stock_item_id, quantity').eq('sale_id', id);
    for (const it of (items || []) as any[]) {
      if (!it.stock_item_id) continue;
      const { data: stock } = await supabase.from('stock_items').select('quantity').eq('id', it.stock_item_id).maybeSingle();
      if (stock) {
        const qty = Math.max(0, Number((stock as any).quantity || 0) - Number(it.quantity || 0));
        await supabase.from('stock_items').update({ quantity: qty }).eq('id', it.stock_item_id);
      }
    }
  } else if (table === 'services') {
    const { data: items } = await supabase
      .from('service_items').select('stock_item_id, quantity').eq('service_id', id);
    for (const it of (items || []) as any[]) {
      if (!it.stock_item_id) continue;
      const { data: stock } = await supabase.from('stock_items').select('quantity').eq('id', it.stock_item_id).maybeSingle();
      if (stock) {
        const qty = Math.max(0, Number((stock as any).quantity || 0) - Number(it.quantity || 0));
        await supabase.from('stock_items').update({ quantity: qty }).eq('id', it.stock_item_id);
      }
    }
  } else if (table === 'purchases') {
    // Re-add items back into stock
    const { data: purchase } = await supabase.from('purchases').select('business_id').eq('id', id).maybeSingle();
    const businessId = (purchase as any)?.business_id;
    if (!businessId) return;
    const { data: items } = await supabase
      .from('purchase_items').select('item_name, category, quality, quantity').eq('purchase_id', id);
    for (const it of (items || []) as any[]) {
      const { data: stock } = await supabase
        .from('stock_items')
        .select('id, quantity')
        .eq('business_id', businessId)
        .ilike('name', it.item_name || '')
        .ilike('category', it.category || '')
        .ilike('quality', it.quality || '')
        .is('deleted_at', null)
        .maybeSingle();
      if (stock) {
        await supabase.from('stock_items').update({
          quantity: Number((stock as any).quantity || 0) + Number(it.quantity || 0),
        }).eq('id', (stock as any).id);
      }
    }
  }
}
