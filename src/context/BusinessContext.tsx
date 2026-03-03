import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

export interface StockItem {
  id: string;
  business_id: string;
  name: string;
  category: string;
  quality: string;
  buying_price: number;
  wholesale_price: number;
  retail_price: number;
  quantity: number;
  min_stock_level: number;
  image_url_1: string;
  image_url_2: string;
  image_url_3: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  stock_item_id: string | null;
  item_name: string;
  category: string;
  quality: string;
  quantity: number;
  price_type: string;
  unit_price: number;
  subtotal: number;
  created_at: string;
}

export interface Sale {
  id: string;
  business_id: string;
  grand_total: number;
  recorded_by: string;
  customer_name: string;
  from_order_id: string | null;
  from_order_code: string | null;
  created_at: string;
  items: SaleItem[];
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  item_name: string;
  category: string;
  quality: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at: string;
}

export interface Purchase {
  id: string;
  business_id: string;
  grand_total: number;
  supplier: string;
  recorded_by: string;
  created_at: string;
  items: PurchaseItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  item_name: string;
  category: string;
  quality: string;
  quantity: number;
  price_type: string;
  unit_price: number;
  subtotal: number;
  created_at: string;
}

export interface Order {
  id: string;
  business_id: string;
  type: string;
  customer_name: string;
  grand_total: number;
  status: string;
  code: string;
  transferred_to_sale: boolean;
  sharing_code: string | null;
  created_at: string;
  items: OrderItem[];
}

export interface ServiceItemUsed {
  id: string;
  service_id: string;
  stock_item_id: string;
  item_name: string;
  category: string;
  quality: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at: string;
}

export interface ServiceRecord {
  id: string;
  business_id: string;
  service_name: string;
  description: string;
  cost: number;
  customer_name: string;
  seller_name: string;
  created_at: string;
  items_used?: ServiceItemUsed[];
}

export interface Business {
  id: string;
  name: string;
  address: string;
  contact: string;
  email: string;
  total_capital: number;
  logo_url: string;
  owner_id: string;
  created_at: string;
}

export interface BusinessMembership {
  id: string;
  user_id: string;
  business_id: string;
  role: string;
  created_at: string;
}

export interface ReceiptRecord {
  id: string;
  business_id: string;
  receipt_type: string;
  transaction_id: string;
  buyer_name: string;
  seller_name: string;
  grand_total: number;
  items: any[];
  business_info: any;
  code: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  business_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface BusinessContextType {
  currentBusiness: Business | null;
  businesses: Business[];
  memberships: BusinessMembership[];
  userRole: string | null;
  stock: StockItem[];
  sales: Sale[];
  purchases: Purchase[];
  orders: Order[];
  services: ServiceRecord[];
  notifications: Notification[];
  loading: boolean;
  setCurrentBusinessId: (id: string) => void;
  createBusiness: (name: string, address: string, contact: string, email: string) => Promise<void>;
  updateBusiness: (updates: Partial<Business>) => Promise<void>;
  addStockItem: (item: Omit<StockItem, 'id' | 'business_id' | 'created_at' | 'updated_at' | 'deleted_at'>) => Promise<void>;
  updateStockItem: (id: string, updates: Partial<StockItem>) => Promise<void>;
  deleteStockItem: (id: string) => Promise<void>;
  restoreStockItem: (id: string) => Promise<void>;
  permanentDeleteStockItem: (id: string) => Promise<void>;
  addSale: (
    items: { stock_item_id?: string; item_name: string; category: string; quality: string; quantity: number; price_type: string; unit_price: number; subtotal: number }[],
    grandTotal: number,
    recordedBy: string,
    customerName: string,
    fromOrderId?: string,
    fromOrderCode?: string
  ) => Promise<Sale | null>;
  addPurchase: (items: { item_name: string; category: string; quality: string; quantity: number; unit_price: number; wholesale_price?: number; retail_price?: number; subtotal: number }[], grandTotal: number, supplier: string, recordedBy: string) => Promise<void>;
  addOrder: (type: string, customerName: string, items: { item_name: string; category: string; quality: string; quantity: number; price_type: string; unit_price: number; subtotal: number }[], grandTotal: number, status: string) => Promise<void>;
  updateOrder: (id: string, items: OrderItem[], grandTotal: number, status?: string) => Promise<void>;
  completeOrderToSale: (orderId: string, buyerName: string, sellerName: string) => Promise<void>;
  addService: (service: Omit<ServiceRecord, 'id' | 'business_id' | 'created_at' | 'items_used'>, itemsUsed?: { stock_item_id: string; item_name: string; category: string; quality: string; quantity: number; unit_price: number; subtotal: number }[]) => Promise<ServiceRecord | null>;
  saveReceipt: (receipt: Omit<ReceiptRecord, 'id' | 'created_at'>) => Promise<void>;
  getReceipts: () => Promise<ReceiptRecord[]>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  generateInviteCode: (type?: 'worker' | 'customer') => Promise<string | null>;
  getCustomers: () => Promise<{ id: string; user_id: string; customer_name: string; phone: string; created_at: string }[]>;
  removeCustomer: (id: string) => Promise<void>;
  redeemInviteCode: (code: string) => Promise<boolean>;
  getMembers: () => Promise<{ user_id: string; role: string; email: string; full_name: string }[]>;
  removeMember: (userId: string) => Promise<void>;
  updateMemberRole: (userId: string, role: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

const BusinessContext = createContext<BusinessContextType | null>(null);

function generateCode(): string {
  return 'ORD-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [memberships, setMemberships] = useState<BusinessMembership[]>([]);
  const [currentBusinessId, setCurrentBusinessId] = useState<string | null>(() => {
    return localStorage.getItem('biztrack_current_business');
  });
  const [stock, setStock] = useState<StockItem[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const currentBusiness = businesses.find(b => b.id === currentBusinessId) || null;
  const userRole = memberships.find(m => m.business_id === currentBusinessId)?.role || null;

  useEffect(() => {
    if (currentBusinessId) {
      localStorage.setItem('biztrack_current_business', currentBusinessId);
    }
  }, [currentBusinessId]);

  useEffect(() => {
    if (!user) {
      setBusinesses([]);
      setMemberships([]);
      setLoading(false);
      return;
    }
    loadBusinesses();
  }, [user]);

  useEffect(() => {
    if (currentBusinessId && user) {
      loadBusinessData();
      return setupRealtimeSubscriptions();
    }
  }, [currentBusinessId, user]);

  async function loadBusinesses() {
    if (!user) return;
    setLoading(true);
    try {
      const { data: membershipData } = await supabase
        .from('business_memberships')
        .select('*')
        .eq('user_id', user.id);
      
      if (membershipData && membershipData.length > 0) {
        setMemberships(membershipData as BusinessMembership[]);
        const businessIds = membershipData.map(m => m.business_id);
        const { data: businessData } = await supabase
          .from('businesses')
          .select('*')
          .in('id', businessIds);
        
        if (businessData) {
          setBusinesses(businessData as Business[]);
          if (!currentBusinessId || !businessIds.includes(currentBusinessId)) {
            setCurrentBusinessId(businessData[0].id);
          }
        }
      } else {
        setMemberships([]);
        setBusinesses([]);
      }
    } catch (err) {
      console.error('Error loading businesses:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadBusinessData() {
    if (!currentBusinessId) return;
    
    const [stockRes, salesRes, purchasesRes, ordersRes, servicesRes, notifRes] = await Promise.all([
      supabase.from('stock_items').select('*').eq('business_id', currentBusinessId).order('name'),
      supabase.from('sales').select('*').eq('business_id', currentBusinessId).order('created_at', { ascending: false }),
      supabase.from('purchases').select('*').eq('business_id', currentBusinessId).order('created_at', { ascending: false }),
      supabase.from('orders').select('*').eq('business_id', currentBusinessId).order('created_at', { ascending: false }),
      supabase.from('services').select('*').eq('business_id', currentBusinessId).order('created_at', { ascending: false }),
      supabase.from('notifications').select('*').eq('business_id', currentBusinessId).order('created_at', { ascending: false }).limit(50),
    ]);

    setStock((stockRes.data || []) as StockItem[]);
    setNotifications((notifRes.data || []) as Notification[]);
    
    // Load sale items
    const salesData = (salesRes.data || []) as any[];
    if (salesData.length > 0) {
      const saleIds = salesData.map(s => s.id);
      const { data: saleItemsData } = await supabase.from('sale_items').select('*').in('sale_id', saleIds);
      const salesWithItems = salesData.map(s => ({
        ...s,
        items: (saleItemsData || []).filter((si: any) => si.sale_id === s.id),
      }));
      setSales(salesWithItems as Sale[]);
    } else {
      setSales([]);
    }

    // Load purchase items
    const purchasesData = (purchasesRes.data || []) as any[];
    if (purchasesData.length > 0) {
      const purchaseIds = purchasesData.map(p => p.id);
      const { data: purchaseItemsData } = await supabase.from('purchase_items').select('*').in('purchase_id', purchaseIds);
      const purchasesWithItems = purchasesData.map(p => ({
        ...p,
        items: (purchaseItemsData || []).filter((pi: any) => pi.purchase_id === p.id),
      }));
      setPurchases(purchasesWithItems as Purchase[]);
    } else {
      setPurchases([]);
    }

    // Load order items
    const ordersData = (ordersRes.data || []) as any[];
    if (ordersData.length > 0) {
      const orderIds = ordersData.map(o => o.id);
      const { data: orderItemsData } = await supabase.from('order_items').select('*').in('order_id', orderIds);
      const ordersWithItems = ordersData.map(o => ({
        ...o,
        items: (orderItemsData || []).filter((oi: any) => oi.order_id === o.id),
      }));
      setOrders(ordersWithItems as Order[]);
    } else {
      setOrders([]);
    }

    setServices((servicesRes.data || []) as ServiceRecord[]);
  }

  function setupRealtimeSubscriptions() {
    if (!currentBusinessId) return;

    // Use debounced reload to avoid multiple rapid reloads
    let reloadTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedReload = () => {
      if (reloadTimer) clearTimeout(reloadTimer);
      reloadTimer = setTimeout(() => loadBusinessData(), 300);
    };

    const channel = supabase
      .channel(`business-${currentBusinessId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_items', filter: `business_id=eq.${currentBusinessId}` }, (payload) => {
        // Optimistic: update stock in-place for simple updates
        if (payload.eventType === 'UPDATE' && payload.new) {
          setStock(prev => prev.map(s => s.id === (payload.new as any).id ? { ...s, ...payload.new } as StockItem : s));
        } else if (payload.eventType === 'INSERT' && payload.new) {
          setStock(prev => [...prev, payload.new as StockItem].sort((a, b) => a.name.localeCompare(b.name)));
        } else if (payload.eventType === 'DELETE' && payload.old) {
          setStock(prev => prev.filter(s => s.id !== (payload.old as any).id));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales', filter: `business_id=eq.${currentBusinessId}` }, debouncedReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchases', filter: `business_id=eq.${currentBusinessId}` }, debouncedReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `business_id=eq.${currentBusinessId}` }, debouncedReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services', filter: `business_id=eq.${currentBusinessId}` }, debouncedReload)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `business_id=eq.${currentBusinessId}` }, (payload) => {
        const notif = payload.new as Notification;
        setNotifications(prev => [notif, ...prev]);
        toast(notif.title, { description: notif.message });
      })
      .subscribe();

    return () => {
      if (reloadTimer) clearTimeout(reloadTimer);
      supabase.removeChannel(channel);
    };
  }

  async function addNotification(type: string, title: string, message: string) {
    if (!currentBusinessId) return;
    await supabase.from('notifications').insert({
      business_id: currentBusinessId, type, title, message,
    } as any);
  }

  const createBusiness = useCallback(async (name: string, address: string, contact: string, email: string) => {
    if (!user) return;
    const { data, error } = await supabase.from('businesses').insert({
      name, address, contact, email, owner_id: user.id,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    toast.success('Business created!');
    await loadBusinesses();
    if (data) setCurrentBusinessId(data.id);
  }, [user]);

  const updateBusiness = useCallback(async (updates: Partial<Business>) => {
    if (!currentBusinessId) return;
    const { error } = await supabase.from('businesses').update(updates).eq('id', currentBusinessId);
    if (error) { toast.error(error.message); return; }
    setBusinesses(prev => prev.map(b => b.id === currentBusinessId ? { ...b, ...updates } : b));
    toast.success('Business updated!');
  }, [currentBusinessId]);

  const addStockItem = useCallback(async (item: Omit<StockItem, 'id' | 'business_id' | 'created_at' | 'updated_at' | 'deleted_at'>) => {
    if (!currentBusinessId) return;
    const { data, error } = await supabase.from('stock_items').insert({ ...item, business_id: currentBusinessId } as any).select().single();
    if (error) { toast.error(error.message); return; }
    // Optimistic insert
    if (data) setStock(prev => [...prev, data as unknown as StockItem].sort((a, b) => a.name.localeCompare(b.name)));
    toast.success('Item added to stock!');
  }, [currentBusinessId]);

  const updateStockItem = useCallback(async (id: string, updates: Partial<StockItem>) => {
    // Optimistic update
    setStock(prev => prev.map(s => s.id === id ? { ...s, ...updates } as StockItem : s));
    const { error } = await supabase.from('stock_items').update(updates).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Stock item updated!');
  }, []);

  // Soft delete
  const deleteStockItem = useCallback(async (id: string) => {
    const { error } = await supabase.from('stock_items').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Item moved to recycle bin');
  }, []);

  const restoreStockItem = useCallback(async (id: string) => {
    const { error } = await supabase.from('stock_items').update({ deleted_at: null }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Item restored to stock!');
  }, []);

  const permanentDeleteStockItem = useCallback(async (id: string) => {
    const { error } = await supabase.from('stock_items').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Item permanently deleted');
  }, []);

  const addSale = useCallback(async (
    items: { stock_item_id?: string; item_name: string; category: string; quality: string; quantity: number; price_type: string; unit_price: number; subtotal: number }[],
    grandTotal: number,
    recordedBy: string,
    customerName: string,
    fromOrderId?: string,
    fromOrderCode?: string
  ): Promise<Sale | null> => {
    if (!currentBusinessId) return null;
    const { data: saleData, error: saleError } = await supabase.from('sales').insert({
      business_id: currentBusinessId,
      grand_total: grandTotal,
      recorded_by: recordedBy,
      customer_name: customerName,
      from_order_id: fromOrderId || null,
      from_order_code: fromOrderCode || null,
    } as any).select().single();
    if (saleError || !saleData) { toast.error(saleError?.message || 'Failed'); return null; }

    const saleItems = items.map(item => ({
      sale_id: saleData.id,
      stock_item_id: item.stock_item_id || null,
      item_name: item.item_name,
      category: item.category,
      quality: item.quality,
      quantity: item.quantity,
      price_type: item.price_type,
      unit_price: item.unit_price,
      subtotal: item.subtotal,
    }));
    await supabase.from('sale_items').insert(saleItems);

    // Deduct from stock
    const currentStock = stock;
    for (const item of items) {
      if (item.price_type === 'service') continue;
      if (item.stock_item_id) {
        const stockItem = currentStock.find(s => s.id === item.stock_item_id);
        if (stockItem) {
          await supabase.from('stock_items').update({ quantity: Math.max(0, stockItem.quantity - item.quantity) }).eq('id', item.stock_item_id);
        }
      } else {
        const stockItem = currentStock.find(s =>
          s.name.toLowerCase() === item.item_name.toLowerCase() &&
          s.category.toLowerCase() === (item.category || '').toLowerCase() &&
          s.quality.toLowerCase() === (item.quality || '').toLowerCase()
        ) || currentStock.find(s => s.name.toLowerCase() === item.item_name.toLowerCase());
        if (stockItem) {
          await supabase.from('stock_items').update({ quantity: Math.max(0, stockItem.quantity - item.quantity) }).eq('id', stockItem.id);
        }
      }
    }
    toast.success('Sale recorded!');
    return { ...saleData, items: saleItems as any, customer_name: customerName } as Sale;
  }, [currentBusinessId, stock]);

  const addPurchase = useCallback(async (
    items: { item_name: string; category: string; quality: string; quantity: number; unit_price: number; wholesale_price?: number; retail_price?: number; subtotal: number }[],
    grandTotal: number, supplier: string, recordedBy: string
  ) => {
    if (!currentBusinessId) return;
    const { data: purchaseData, error } = await supabase.from('purchases').insert({
      business_id: currentBusinessId, grand_total: grandTotal, supplier, recorded_by: recordedBy,
    }).select().single();
    if (error || !purchaseData) { toast.error(error?.message || 'Failed'); return; }

    const purchaseItems = items.map(item => ({
      purchase_id: purchaseData.id, item_name: item.item_name, category: item.category,
      quality: item.quality, quantity: item.quantity, unit_price: item.unit_price, subtotal: item.subtotal,
    }));
    await supabase.from('purchase_items').insert(purchaseItems);

    // Notify
    await addNotification('new_purchase', '🛒 New Purchase Recorded', `${items.length} item(s) from ${supplier} — Total: recorded by ${recordedBy}`);

    // Update stock
    const currentStock = stock;
    for (const item of items) {
      const existingStock = currentStock.find(s =>
        s.name.toLowerCase() === item.item_name.toLowerCase() &&
        s.category.toLowerCase() === item.category.toLowerCase() &&
        s.quality.toLowerCase() === item.quality.toLowerCase()
      ) || currentStock.find(s => s.name.toLowerCase() === item.item_name.toLowerCase() && !item.category && !item.quality);

      const buyPrice = item.unit_price; // purchase cost = buying price
      const ws = item.wholesale_price ?? item.unit_price;
      const ret = item.retail_price ?? item.unit_price;

      if (existingStock) {
        await supabase.from('stock_items').update({
          quantity: existingStock.quantity + item.quantity,
          buying_price: buyPrice,
          wholesale_price: ws,
          retail_price: ret,
        }).eq('id', existingStock.id);
      } else {
        await supabase.from('stock_items').insert({
          business_id: currentBusinessId, name: item.item_name, category: item.category,
          quality: item.quality, buying_price: buyPrice, wholesale_price: ws, retail_price: ret,
          quantity: item.quantity, min_stock_level: 5,
        });
      }
    }
    toast.success('Purchase recorded!');
  }, [currentBusinessId, stock]);

  const addOrder = useCallback(async (
    type: string, customerName: string,
    items: { item_name: string; category: string; quality: string; quantity: number; price_type: string; unit_price: number; subtotal: number }[],
    grandTotal: number, status: string
  ) => {
    if (!currentBusinessId) return;
    const code = generateCode();
    const { data: orderData, error } = await supabase.from('orders').insert({
      business_id: currentBusinessId, type, customer_name: customerName,
      grand_total: grandTotal, status, code,
    }).select().single();
    if (error || !orderData) { toast.error(error?.message || 'Failed'); return; }

    const orderItems = items.map(item => ({
      order_id: orderData.id, item_name: item.item_name, category: item.category,
      quality: item.quality, quantity: item.quantity, price_type: item.price_type,
      unit_price: item.unit_price, subtotal: item.subtotal,
    }));
    await supabase.from('order_items').insert(orderItems);

    // Notify for inbox orders
    if (type === 'inbox') {
      await addNotification('new_order', '📥 New Order Received', `Order ${code} from ${customerName} — ${items.length} item(s)`);
    }
    toast.success('Order created!');
  }, [currentBusinessId]);

  const updateOrder = useCallback(async (id: string, items: OrderItem[], grandTotal: number, status?: string) => {
    const updates: any = { grand_total: grandTotal };
    if (status) updates.status = status;
    await supabase.from('orders').update(updates).eq('id', id);
    // Delete old items and insert new ones
    await supabase.from('order_items').delete().eq('order_id', id);
    const orderItems = items.map(item => ({
      order_id: id, item_name: item.item_name, category: item.category,
      quality: item.quality, quantity: item.quantity, price_type: item.price_type,
      unit_price: item.unit_price, subtotal: item.subtotal,
    }));
    if (orderItems.length > 0) {
      await supabase.from('order_items').insert(orderItems);
    }
    toast.success('Order updated!');
    await loadBusinessData();
  }, [currentBusinessId]);

  const completeOrderToSale = useCallback(async (orderId: string, buyerName: string, sellerName: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order || order.transferred_to_sale) return;

    await supabase.from('orders').update({ status: 'completed', transferred_to_sale: true }).eq('id', orderId);

    await addSale(
      order.items.map(item => ({
        item_name: item.item_name, category: item.category, quality: item.quality,
        quantity: item.quantity, price_type: item.price_type, unit_price: item.unit_price,
        subtotal: item.subtotal,
      })),
      order.grand_total,
      sellerName,
      buyerName,
      order.id,
      order.code
    );

    toast.success(`Order ${order.code} transferred to sales!`);
    await loadBusinessData();
  }, [orders, addSale]);

  const addService = useCallback(async (
    service: Omit<ServiceRecord, 'id' | 'business_id' | 'created_at' | 'items_used'>,
    itemsUsed?: { stock_item_id: string; item_name: string; category: string; quality: string; quantity: number; unit_price: number; subtotal: number }[]
  ): Promise<ServiceRecord | null> => {
    if (!currentBusinessId) return null;
    const { data, error } = await supabase.from('services').insert({
      ...service,
      business_id: currentBusinessId,
    } as any).select().single();
    if (error || !data) { toast.error(error?.message || 'Failed'); return null; }

    // Save items used and deduct from stock
    if (itemsUsed && itemsUsed.length > 0) {
      const serviceItemRows = itemsUsed.map(item => ({
        service_id: data.id,
        stock_item_id: item.stock_item_id,
        item_name: item.item_name,
        category: item.category,
        quality: item.quality,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
      }));
      await supabase.from('service_items').insert(serviceItemRows);

      // Deduct from stock
      const currentStock = stock;
      for (const item of itemsUsed) {
        const stockItem = currentStock.find(s => s.id === item.stock_item_id);
        if (stockItem) {
          await supabase.from('stock_items').update({
            quantity: Math.max(0, stockItem.quantity - item.quantity),
          }).eq('id', item.stock_item_id);
        }
      }
    }

    toast.success('Service recorded!');
    return { ...data, items_used: [] } as ServiceRecord;
  }, [currentBusinessId, stock]);

  const saveReceipt = useCallback(async (receipt: Omit<ReceiptRecord, 'id' | 'created_at'>) => {
    if (!currentBusinessId) return;
    await supabase.from('receipts').insert({ ...receipt } as any);
  }, [currentBusinessId]);

  const getReceipts = useCallback(async (): Promise<ReceiptRecord[]> => {
    if (!currentBusinessId) return [];
    const { data } = await supabase
      .from('receipts')
      .select('*')
      .eq('business_id', currentBusinessId)
      .order('created_at', { ascending: false });
    return (data || []) as any[];
  }, [currentBusinessId]);

  const markNotificationRead = useCallback(async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    if (!currentBusinessId) return;
    await supabase.from('notifications').update({ is_read: true }).eq('business_id', currentBusinessId).eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  }, [currentBusinessId]);

  const generateInviteCode = useCallback(async (type: 'worker' | 'customer' = 'worker'): Promise<string | null> => {
    if (!currentBusinessId || !user) return null;
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { error } = await supabase.from('invite_codes').insert({
      business_id: currentBusinessId, code, created_by: user.id, type,
    } as any);
    if (error) { toast.error(error.message); return null; }
    return code;
  }, [currentBusinessId, user]);

  const redeemInviteCode = useCallback(async (code: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const response = await supabase.functions.invoke('redeem-invite', {
        body: { code: code.toUpperCase() },
      });
      if (response.error) { toast.error('Invalid or expired invite code'); return false; }
      toast.success('Successfully joined business!');
      await loadBusinesses();
      return true;
    } catch {
      toast.error('Failed to redeem code');
      return false;
    }
  }, [user]);

  const getMembers = useCallback(async () => {
    if (!currentBusinessId) return [];
    const { data: memberData } = await supabase
      .from('business_memberships')
      .select('user_id, role')
      .eq('business_id', currentBusinessId);
    if (!memberData) return [];
    const userIds = memberData.map(m => m.user_id);
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds);
    return memberData.map(m => {
      const profile = profileData?.find(p => p.id === m.user_id);
      return { user_id: m.user_id, role: m.role, email: profile?.email || '', full_name: profile?.full_name || '' };
    });
  }, [currentBusinessId]);

  const removeMember = useCallback(async (userId: string) => {
    if (!currentBusinessId) return;
    const { error } = await supabase.from('business_memberships').delete()
      .eq('user_id', userId).eq('business_id', currentBusinessId);
    if (error) { toast.error(error.message); return; }
    toast.success('Member removed');
  }, [currentBusinessId]);

  const updateMemberRole = useCallback(async (userId: string, role: string) => {
    if (!currentBusinessId) return;
    await supabase.from('business_memberships').delete().eq('user_id', userId).eq('business_id', currentBusinessId);
    const { error } = await supabase.from('business_memberships').insert({
      user_id: userId, business_id: currentBusinessId, role: role as any,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Role updated');
  }, [currentBusinessId]);

  const getCustomers = useCallback(async () => {
    if (!currentBusinessId) return [];
    const { data } = await supabase
      .from('business_customers')
      .select('*')
      .eq('business_id', currentBusinessId)
      .order('created_at', { ascending: false });
    return (data || []) as any[];
  }, [currentBusinessId]);

  const removeCustomer = useCallback(async (id: string) => {
    const { error } = await supabase.from('business_customers').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Customer removed');
  }, []);

  const refreshData = useCallback(async () => {
    await loadBusinessData();
  }, [currentBusinessId]);

  return (
    <BusinessContext.Provider value={{
      currentBusiness, businesses, memberships, userRole,
      stock, sales, purchases, orders, services, notifications, loading,
      setCurrentBusinessId, createBusiness, updateBusiness,
      addStockItem, updateStockItem, deleteStockItem, restoreStockItem, permanentDeleteStockItem,
      addSale, addPurchase, addOrder, updateOrder, completeOrderToSale,
      addService, saveReceipt, getReceipts,
      markNotificationRead, markAllNotificationsRead,
      generateInviteCode, redeemInviteCode,
      getMembers, removeMember, updateMemberRole,
      getCustomers, removeCustomer, refreshData,
    }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error('useBusiness must be used within BusinessProvider');
  return ctx;
}
