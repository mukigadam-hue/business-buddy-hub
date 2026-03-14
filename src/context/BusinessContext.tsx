import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { enqueueOfflineOperation } from '@/hooks/useOfflineQueue';

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
  barcode: string;
  image_url_1: string;
  image_url_2: string;
  image_url_3: string;
  pieces_per_carton: number;
  cartons_per_box: number;
  boxes_per_container: number;
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
  payment_status: string;
  amount_paid: number;
  balance: number;
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
  payment_status: string;
  amount_paid: number;
  balance: number;
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
  payment_method?: string;
  proof_url?: string | null;
  payment_status: string;
  amount_paid: number;
  balance: number;
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
  payment_status: string;
  amount_paid: number;
  balance: number;
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
  business_type: string;
  business_code: string;
  settings_password: string;
  country_code: string;
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

export interface BusinessExpense {
  id: string;
  business_id: string;
  category: string;
  description: string;
  amount: number;
  recorded_by: string;
  expense_date: string;
  from_order_id: string | null;
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
  expenses: BusinessExpense[];
  notifications: Notification[];
  loading: boolean;
  setCurrentBusinessId: (id: string) => void;
  createBusiness: (name: string, address: string, contact: string, email: string, countryCode?: string) => Promise<void>;
  deleteBusiness: (businessId: string, reason: string) => Promise<boolean>;
  updateBusiness: (updates: Partial<Business>) => Promise<void>;
  addStockItem: (item: Omit<StockItem, 'id' | 'business_id' | 'created_at' | 'updated_at' | 'deleted_at'| 'pieces_per_carton' | 'cartons_per_box' | 'boxes_per_container'> & { pieces_per_carton?: number; cartons_per_box?: number; boxes_per_container?: number }) => Promise<void>;
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
    fromOrderCode?: string,
    paymentStatus?: string,
    amountPaid?: number
  ) => Promise<Sale | null>;
  addPurchase: (items: { item_name: string; category: string; quality: string; quantity: number; unit_price: number; wholesale_price?: number; retail_price?: number; subtotal: number }[], grandTotal: number, supplier: string, recordedBy: string, paymentStatus?: string, amountPaid?: number) => Promise<void>;
  updateSalePayment: (saleId: string, amountPaid: number, paymentStatus: string) => Promise<void>;
  updatePurchasePayment: (purchaseId: string, amountPaid: number, paymentStatus: string) => Promise<void>;
  addOrder: (type: string, customerName: string, items: { item_name: string; category: string; quality: string; quantity: number; price_type: string; unit_price: number; subtotal: number }[], grandTotal: number, status: string, recipientBusinessId?: string, comment?: string) => Promise<void>;
  updateOrder: (id: string, items: OrderItem[], grandTotal: number, status?: string) => Promise<void>;
  completeOrderToSale: (orderId: string, buyerName: string, sellerName: string) => Promise<void>;
  addService: (service: Omit<ServiceRecord, 'id' | 'business_id' | 'created_at' | 'items_used'>, itemsUsed?: { stock_item_id: string; item_name: string; category: string; quality: string; quantity: number; unit_price: number; subtotal: number }[]) => Promise<ServiceRecord | null>;
  updateServicePayment: (serviceId: string, amountPaid: number, paymentStatus: string) => Promise<void>;
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
  addExpense: (expense: { category: string; description: string; amount: number; recorded_by: string; expense_date: string; from_order_id?: string }) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

const BusinessContext = createContext<BusinessContextType | null>(null);

function generateCode(): string {
  return 'ORD-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>(() => {
    try { return JSON.parse(localStorage.getItem('biztrack_cache_businesses') || '[]'); } catch { return []; }
  });
  const [memberships, setMemberships] = useState<BusinessMembership[]>(() => {
    try { return JSON.parse(localStorage.getItem('biztrack_cache_memberships') || '[]'); } catch { return []; }
  });
  const [currentBusinessId, setCurrentBusinessId] = useState<string | null>(() => {
    return localStorage.getItem('biztrack_current_business');
  });
  const [stock, setStock] = useState<StockItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('biztrack_cache_stock') || '[]'); } catch { return []; }
  });
  const [sales, setSales] = useState<Sale[]>(() => {
    try { return JSON.parse(localStorage.getItem('biztrack_cache_sales') || '[]'); } catch { return []; }
  });
  const [purchases, setPurchases] = useState<Purchase[]>(() => {
    try { return JSON.parse(localStorage.getItem('biztrack_cache_purchases') || '[]'); } catch { return []; }
  });
  const [orders, setOrders] = useState<Order[]>(() => {
    try { return JSON.parse(localStorage.getItem('biztrack_cache_orders') || '[]'); } catch { return []; }
  });
  const [services, setServices] = useState<ServiceRecord[]>(() => {
    try { return JSON.parse(localStorage.getItem('biztrack_cache_services') || '[]'); } catch { return []; }
  });
  const [expenses, setExpenses] = useState<BusinessExpense[]>(() => {
    try { return JSON.parse(localStorage.getItem('biztrack_cache_expenses') || '[]'); } catch { return []; }
  });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(() => {
    // If we have cached businesses, skip the loading state
    try { return JSON.parse(localStorage.getItem('biztrack_cache_businesses') || '[]').length === 0; } catch { return true; }
  });

  const currentBusiness = businesses.find(b => b.id === currentBusinessId) || null;
  const userRole = memberships.find(m => m.business_id === currentBusinessId)?.role || null;

  // Persist cache on data change
  useEffect(() => { try { localStorage.setItem('biztrack_cache_businesses', JSON.stringify(businesses)); } catch {} }, [businesses]);
  useEffect(() => { try { localStorage.setItem('biztrack_cache_memberships', JSON.stringify(memberships)); } catch {} }, [memberships]);
  useEffect(() => { try { localStorage.setItem('biztrack_cache_stock', JSON.stringify(stock)); } catch {} }, [stock]);
  useEffect(() => { try { localStorage.setItem('biztrack_cache_sales', JSON.stringify(sales)); } catch {} }, [sales]);
  useEffect(() => { try { localStorage.setItem('biztrack_cache_purchases', JSON.stringify(purchases)); } catch {} }, [purchases]);
  useEffect(() => { try { localStorage.setItem('biztrack_cache_orders', JSON.stringify(orders)); } catch {} }, [orders]);
  useEffect(() => { try { localStorage.setItem('biztrack_cache_services', JSON.stringify(services)); } catch {} }, [services]);
  useEffect(() => { try { localStorage.setItem('biztrack_cache_expenses', JSON.stringify(expenses)); } catch {} }, [expenses]);

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
    // Only show loading if no cached data
    if (businesses.length === 0) setLoading(true);
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
    
    const [stockRes, salesRes, purchasesRes, ordersRes, servicesRes, expensesRes, notifRes] = await Promise.all([
      supabase.from('stock_items').select('*').eq('business_id', currentBusinessId).order('name').limit(2000),
      supabase.from('sales').select('*').eq('business_id', currentBusinessId).order('created_at', { ascending: false }).limit(2000),
      supabase.from('purchases').select('*').eq('business_id', currentBusinessId).order('created_at', { ascending: false }).limit(2000),
      supabase.from('orders').select('*').eq('business_id', currentBusinessId).order('created_at', { ascending: false }).limit(2000),
      supabase.from('services').select('*').eq('business_id', currentBusinessId).order('created_at', { ascending: false }).limit(2000),
      supabase.from('business_expenses').select('*').eq('business_id', currentBusinessId).order('created_at', { ascending: false }).limit(2000),
      supabase.from('notifications').select('*').eq('business_id', currentBusinessId).order('created_at', { ascending: false }).limit(50),
    ]);

    setStock((stockRes.data || []) as StockItem[]);
    setNotifications((notifRes.data || []) as Notification[]);
    setServices((servicesRes.data || []) as ServiceRecord[]);
    setExpenses((expensesRes.data || []) as any[]);

    // Load all item sub-tables in PARALLEL (not sequential)
    const salesData = (salesRes.data || []) as any[];
    const purchasesData = (purchasesRes.data || []) as any[];
    const ordersData = (ordersRes.data || []) as any[];

    const [saleItemsRes, purchaseItemsRes, orderItemsRes] = await Promise.all([
      salesData.length > 0
        ? supabase.from('sale_items').select('*').in('sale_id', salesData.map(s => s.id))
        : Promise.resolve({ data: [] }),
      purchasesData.length > 0
        ? supabase.from('purchase_items').select('*').in('purchase_id', purchasesData.map(p => p.id))
        : Promise.resolve({ data: [] }),
      ordersData.length > 0
        ? supabase.from('order_items').select('*').in('order_id', ordersData.map(o => o.id))
        : Promise.resolve({ data: [] }),
    ]);

    const saleItemsMap = new Map<string, any[]>();
    (saleItemsRes.data || []).forEach((si: any) => {
      if (!saleItemsMap.has(si.sale_id)) saleItemsMap.set(si.sale_id, []);
      saleItemsMap.get(si.sale_id)!.push(si);
    });
    setSales(salesData.map(s => ({ ...s, items: saleItemsMap.get(s.id) || [] })) as Sale[]);

    const purchaseItemsMap = new Map<string, any[]>();
    (purchaseItemsRes.data || []).forEach((pi: any) => {
      if (!purchaseItemsMap.has(pi.purchase_id)) purchaseItemsMap.set(pi.purchase_id, []);
      purchaseItemsMap.get(pi.purchase_id)!.push(pi);
    });
    setPurchases(purchasesData.map(p => ({ ...p, items: purchaseItemsMap.get(p.id) || [] })) as Purchase[]);

    const orderItemsMap = new Map<string, any[]>();
    (orderItemsRes.data || []).forEach((oi: any) => {
      if (!orderItemsMap.has(oi.order_id)) orderItemsMap.set(oi.order_id, []);
      orderItemsMap.get(oi.order_id)!.push(oi);
    });
    setOrders(ordersData.map(o => ({ ...o, items: orderItemsMap.get(o.id) || [] })) as Order[]);
  }

  // Targeted loaders for realtime — only reload the specific table that changed
  async function reloadSales() {
    if (!currentBusinessId) return;
    const { data: salesData } = await supabase.from('sales').select('*').eq('business_id', currentBusinessId).order('created_at', { ascending: false });
    const sd = (salesData || []) as any[];
    if (sd.length > 0) {
      const { data: items } = await supabase.from('sale_items').select('*').in('sale_id', sd.map(s => s.id));
      const map = new Map<string, any[]>();
      (items || []).forEach((i: any) => { if (!map.has(i.sale_id)) map.set(i.sale_id, []); map.get(i.sale_id)!.push(i); });
      setSales(sd.map(s => ({ ...s, items: map.get(s.id) || [] })) as Sale[]);
    } else { setSales([]); }
  }

  async function reloadPurchases() {
    if (!currentBusinessId) return;
    const { data: pd } = await supabase.from('purchases').select('*').eq('business_id', currentBusinessId).order('created_at', { ascending: false });
    const pdata = (pd || []) as any[];
    if (pdata.length > 0) {
      const { data: items } = await supabase.from('purchase_items').select('*').in('purchase_id', pdata.map(p => p.id));
      const map = new Map<string, any[]>();
      (items || []).forEach((i: any) => { if (!map.has(i.purchase_id)) map.set(i.purchase_id, []); map.get(i.purchase_id)!.push(i); });
      setPurchases(pdata.map(p => ({ ...p, items: map.get(p.id) || [] })) as Purchase[]);
    } else { setPurchases([]); }
  }

  async function reloadOrders() {
    if (!currentBusinessId) return;
    const { data: od } = await supabase.from('orders').select('*').eq('business_id', currentBusinessId).order('created_at', { ascending: false });
    const odata = (od || []) as any[];
    if (odata.length > 0) {
      const { data: items } = await supabase.from('order_items').select('*').in('order_id', odata.map(o => o.id));
      const map = new Map<string, any[]>();
      (items || []).forEach((i: any) => { if (!map.has(i.order_id)) map.set(i.order_id, []); map.get(i.order_id)!.push(i); });
      setOrders(odata.map(o => ({ ...o, items: map.get(o.id) || [] })) as Order[]);
    } else { setOrders([]); }
  }

  function setupRealtimeSubscriptions() {
    if (!currentBusinessId) return;

    // Targeted debounced reloaders — only reload the specific table that changed
    const timers: Record<string, ReturnType<typeof setTimeout>> = {};
    const debounce = (key: string, fn: () => void) => {
      if (timers[key]) clearTimeout(timers[key]);
      timers[key] = setTimeout(fn, 400);
    };

    const channel = supabase
      .channel(`business-${currentBusinessId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_items', filter: `business_id=eq.${currentBusinessId}` }, (payload) => {
        if (payload.eventType === 'UPDATE' && payload.new) {
          setStock(prev => prev.map(s => s.id === (payload.new as any).id ? { ...s, ...payload.new } as StockItem : s));
        } else if (payload.eventType === 'INSERT' && payload.new) {
          setStock(prev => [...prev, payload.new as StockItem].sort((a, b) => a.name.localeCompare(b.name)));
        } else if (payload.eventType === 'DELETE' && payload.old) {
          setStock(prev => prev.filter(s => s.id !== (payload.old as any).id));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales', filter: `business_id=eq.${currentBusinessId}` }, () => debounce('sales', reloadSales))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchases', filter: `business_id=eq.${currentBusinessId}` }, () => debounce('purchases', reloadPurchases))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `business_id=eq.${currentBusinessId}` }, () => debounce('orders', reloadOrders))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services', filter: `business_id=eq.${currentBusinessId}` }, () => debounce('services', async () => {
        const { data } = await supabase.from('services').select('*').eq('business_id', currentBusinessId).order('created_at', { ascending: false });
        setServices((data || []) as ServiceRecord[]);
      }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'business_expenses', filter: `business_id=eq.${currentBusinessId}` }, () => debounce('expenses', async () => {
        const { data } = await supabase.from('business_expenses').select('*').eq('business_id', currentBusinessId).order('created_at', { ascending: false });
        setExpenses((data || []) as any[]);
      }))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `business_id=eq.${currentBusinessId}` }, (payload) => {
        const notif = payload.new as Notification;
        setNotifications(prev => [notif, ...prev]);
        toast(notif.title, { description: notif.message });
      })
      .subscribe();

    return () => {
      Object.values(timers).forEach(t => clearTimeout(t));
      supabase.removeChannel(channel);
    };
  }

  async function addNotification(type: string, title: string, message: string) {
    if (!currentBusinessId) return;
    await supabase.from('notifications').insert({
      business_id: currentBusinessId, type, title, message,
    } as any);
  }

  const createBusiness = useCallback(async (name: string, address: string, contact: string, email: string, countryCode?: string) => {
    if (!user) return;
    const insertData: any = { name, address, contact, email, owner_id: user.id };
    if (countryCode) insertData.country_code = countryCode;
    const { data, error } = await supabase.from('businesses').insert(insertData).select().single();
    if (error) { toast.error(error.message); return; }
    toast.success('Business created!');
    await loadBusinesses();
    if (data) setCurrentBusinessId(data.id);
  }, [user]);

  const deleteBusiness = useCallback(async (businessId: string, reason: string): Promise<boolean> => {
    if (!user) return false;
    // Log the deletion reason as a note (could also store in a table)
    console.log(`Business ${businessId} deleted. Reason: ${reason}`);
    const { error } = await supabase.from('businesses').delete().eq('id', businessId);
    if (error) { toast.error(error.message); return false; }
    toast.success('Business deleted permanently');
    setBusinesses(prev => prev.filter(b => b.id !== businessId));
    if (currentBusinessId === businessId) {
      const remaining = businesses.filter(b => b.id !== businessId);
      if (remaining.length > 0) {
        setCurrentBusinessId(remaining[0].id);
      } else {
        setCurrentBusinessId('');
      }
    }
    await loadBusinesses();
    return true;
  }, [user, currentBusinessId, businesses]);

  const updateBusiness = useCallback(async (updates: Partial<Business>) => {
    if (!currentBusinessId) return;
    const { error } = await supabase.from('businesses').update(updates).eq('id', currentBusinessId);
    if (error) { toast.error(error.message); return; }
    setBusinesses(prev => prev.map(b => b.id === currentBusinessId ? { ...b, ...updates } : b));
    toast.success('Business updated!');
  }, [currentBusinessId]);

  const addStockItem = useCallback(async (item: Omit<StockItem, 'id' | 'business_id' | 'created_at' | 'updated_at' | 'deleted_at' | 'pieces_per_carton' | 'cartons_per_box' | 'boxes_per_container'> & { pieces_per_carton?: number; cartons_per_box?: number; boxes_per_container?: number }) => {
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
    fromOrderCode?: string,
    paymentStatus: string = 'paid',
    amountPaid?: number
  ): Promise<Sale | null> => {
    if (!currentBusinessId) return null;
    const paid = amountPaid ?? grandTotal;
    const bal = Math.max(0, grandTotal - paid);
    const status = bal <= 0 ? 'paid' : (paid > 0 ? 'partial' : 'unpaid');
    
    const salePayload = {
      business_id: currentBusinessId,
      grand_total: grandTotal,
      recorded_by: recordedBy,
      customer_name: customerName,
      from_order_id: fromOrderId || null,
      from_order_code: fromOrderCode || null,
      payment_status: paymentStatus === 'paid' ? status : paymentStatus,
      amount_paid: paid,
      balance: bal,
    };

    // If offline, queue and return optimistic result
    if (!navigator.onLine) {
      const tempId = crypto.randomUUID();
      const saleItems = items.map(item => ({
        sale_id: tempId, stock_item_id: item.stock_item_id || null,
        item_name: item.item_name, category: item.category, quality: item.quality,
        quantity: item.quantity, price_type: item.price_type, unit_price: item.unit_price, subtotal: item.subtotal,
      }));
      enqueueOfflineOperation({ table: 'sales', type: 'insert', data: salePayload });
      // Queue items separately — they'll need the real sale_id, so we queue them together
      const optimistic = { ...salePayload, id: tempId, created_at: new Date().toISOString(), items: saleItems as any } as Sale;
      setSales(prev => [optimistic, ...prev]);
      toast.success('Sale saved offline — will sync when online');
      return optimistic;
    }

    const { data: saleData, error: saleError } = await supabase.from('sales').insert(salePayload as any).select().single();
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
    items: { item_name: string; category: string; quality: string; quantity: number; unit_price: number; wholesale_price?: number; retail_price?: number; subtotal: number; pieces_per_carton?: number; cartons_per_box?: number; boxes_per_container?: number }[],
    grandTotal: number, supplier: string, recordedBy: string,
    paymentStatus: string = 'paid', amountPaid?: number
  ) => {
    if (!currentBusinessId) return;
    const paid = amountPaid ?? grandTotal;
    const bal = Math.max(0, grandTotal - paid);
    const status = bal <= 0 ? 'paid' : (paid > 0 ? 'partial' : 'unpaid');

    const purchasePayload = {
      business_id: currentBusinessId, grand_total: grandTotal, supplier, recorded_by: recordedBy,
      payment_status: paymentStatus === 'paid' ? status : paymentStatus,
      amount_paid: paid, balance: bal,
    };

    // If offline, queue and return optimistic result
    if (!navigator.onLine) {
      const tempId = crypto.randomUUID();
      const purchaseItems = items.map(item => ({
        purchase_id: tempId, item_name: item.item_name, category: item.category,
        quality: item.quality, quantity: item.quantity, unit_price: item.unit_price, subtotal: item.subtotal,
      }));
      enqueueOfflineOperation({ table: 'purchases', type: 'insert', data: purchasePayload });
      const optimistic = { ...purchasePayload, id: tempId, created_at: new Date().toISOString(), items: purchaseItems as any } as Purchase;
      setPurchases(prev => [optimistic, ...prev]);
      toast.success('Purchase saved offline — will sync when online');
      return;
    }

    const { data: purchaseData, error } = await supabase.from('purchases').insert(purchasePayload as any).select().single();
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
      const packagingUpdate: any = {};
      if (item.pieces_per_carton && item.pieces_per_carton > 0) packagingUpdate.pieces_per_carton = item.pieces_per_carton;
      if (item.cartons_per_box && item.cartons_per_box > 0) packagingUpdate.cartons_per_box = item.cartons_per_box;
      if (item.boxes_per_container && item.boxes_per_container > 0) packagingUpdate.boxes_per_container = item.boxes_per_container;

      if (existingStock) {
        await supabase.from('stock_items').update({
          quantity: existingStock.quantity + item.quantity,
          buying_price: buyPrice,
          wholesale_price: ws,
          retail_price: ret,
          ...packagingUpdate,
        }).eq('id', existingStock.id);
      } else {
        await supabase.from('stock_items').insert({
          business_id: currentBusinessId, name: item.item_name, category: item.category,
          quality: item.quality, buying_price: buyPrice, wholesale_price: ws, retail_price: ret,
          quantity: item.quantity, min_stock_level: 5,
          ...packagingUpdate,
        });
      }
    }
    toast.success('Purchase recorded!');
  }, [currentBusinessId, stock]);

  const addOrder = useCallback(async (
    type: string, customerName: string,
    items: { item_name: string; category: string; quality: string; quantity: number; price_type: string; unit_price: number; subtotal: number }[],
    grandTotal: number, status: string, recipientBusinessId?: string, comment?: string
  ) => {
    if (!currentBusinessId) return;
    const code = generateCode();
    const sharingCode = recipientBusinessId ? 'SHR-' + Math.random().toString(36).substring(2, 10).toUpperCase() : null;

    // If sending to a recipient business, use edge function to bypass RLS
    if (recipientBusinessId && type === 'request') {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) { toast.error('Not authenticated'); return; }

      const res = await supabase.functions.invoke('send-b2b-order', {
        body: {
          senderBusinessId: currentBusinessId,
          recipientBusinessId,
          customerName: customerName || 'Walk-in',
          items,
          code,
          sharingCode,
          comment: comment || '',
        },
      });

      if (res.error) {
        toast.error(res.error.message || 'Failed to send order');
        return;
      }
      if (res.data?.error) {
        toast.error(res.data.error);
        return;
      }

      // Auto-add recipient to contacts if not already saved
      const { data: existingContact } = await supabase
        .from('business_contacts')
        .select('id')
        .eq('business_id', currentBusinessId)
        .eq('contact_business_id', recipientBusinessId)
        .maybeSingle();
      if (!existingContact) {
        // Fetch recipient business name for nickname
        const { data: recipientBiz } = await supabase
          .from('businesses')
          .select('name')
          .eq('id', recipientBusinessId)
          .maybeSingle();
        await supabase.from('business_contacts').insert({
          business_id: currentBusinessId,
          contact_business_id: recipientBusinessId,
          nickname: recipientBiz?.name || '',
          notes: 'Auto-added from order request',
        });
      }

      toast.success('Request sent to supplier!');
      await loadBusinessData();
      return;
    }

    // Non-B2B order (live order or direct inbox)
    const { data: orderData, error } = await supabase.from('orders').insert({
      business_id: currentBusinessId, type, customer_name: customerName,
      grand_total: grandTotal, status, code, sharing_code: sharingCode,
    }).select().single();
    if (error || !orderData) { toast.error(error?.message || 'Failed'); return; }

    const orderItems = items.map(item => ({
      order_id: orderData.id, item_name: item.item_name, category: item.category,
      quality: item.quality, quantity: item.quantity, price_type: item.price_type,
      unit_price: item.unit_price, subtotal: item.subtotal,
    }));
    await supabase.from('order_items').insert(orderItems);

    // Notify for direct inbox orders
    if (type === 'inbox') {
      await addNotification('new_order', '📥 New Order Received', `Order ${code} from ${customerName} — ${items.length} item(s)`);
    }
    toast.success('Order created!');
    await loadBusinessData();
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
    let order = orders.find(o => o.id === orderId);
    
    // If not in local state, fetch from DB (e.g. checkout orders)
    if (!order) {
      const { data: orderData } = await supabase.from('orders').select('*').eq('id', orderId).single();
      if (orderData) {
        const { data: itemsData } = await supabase.from('order_items').select('*').eq('order_id', orderId);
        order = { ...orderData, items: itemsData || [] } as Order;
      }
    }
    
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

    const { data, error } = await supabase.rpc('get_business_members', {
      _business_id: currentBusinessId,
    });

    if (error) {
      toast.error(error.message);
      return [];
    }

    return (data || []).map((member: any) => ({
      user_id: member.user_id,
      role: member.role,
      email: member.email || '',
      full_name: member.full_name || '',
    }));
  }, [currentBusinessId]);

  const removeMember = useCallback(async (userId: string) => {
    if (!currentBusinessId) return;
    const { error } = await supabase.from('business_memberships').delete()
      .eq('user_id', userId).eq('business_id', currentBusinessId);
    if (error) { toast.error(error.message); return; }

    // Also look up the user's profile name and deactivate matching team member records
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', userId).single();
    if (profile?.full_name) {
      const name = profile.full_name.trim().toLowerCase();
      // Deactivate in business_team_members
      const { data: btm } = await supabase.from('business_team_members')
        .select('id, full_name').eq('business_id', currentBusinessId).eq('is_active', true);
      const matchBtm = (btm || []).find((m: any) => m.full_name?.trim().toLowerCase() === name);
      if (matchBtm) {
        await supabase.from('business_team_members').update({ is_active: false }).eq('id', matchBtm.id);
      }
      // Deactivate in factory_team_members
      const { data: ftm } = await supabase.from('factory_team_members')
        .select('id, full_name').eq('business_id', currentBusinessId).eq('is_active', true);
      const matchFtm = (ftm || []).find((m: any) => m.full_name?.trim().toLowerCase() === name);
      if (matchFtm) {
        await supabase.from('factory_team_members').update({ is_active: false }).eq('id', matchFtm.id);
      }
    }

    await loadBusinesses();
    toast.success('Member removed');
  }, [currentBusinessId, user?.id]);

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

  const addExpense = useCallback(async (expense: { category: string; description: string; amount: number; recorded_by: string; expense_date: string; from_order_id?: string }) => {
    if (!currentBusinessId) return;
    const { error } = await supabase.from('business_expenses').insert({ ...expense, business_id: currentBusinessId } as any);
    if (error) { toast.error(error.message); return; }
    toast.success('Expense recorded!');
    await loadBusinessData();
  }, [currentBusinessId]);

  const deleteExpense = useCallback(async (id: string) => {
    const { error } = await supabase.from('business_expenses').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Expense deleted');
    setExpenses(prev => prev.filter(e => e.id !== id));
  }, []);

  const updateSalePayment = useCallback(async (saleId: string, amountPaid: number, paymentStatus: string) => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;
    const bal = Math.max(0, Number(sale.grand_total) - amountPaid);
    const status = bal <= 0 ? 'paid' : (amountPaid > 0 ? 'partial' : 'unpaid');
    const { error } = await supabase.from('sales').update({
      amount_paid: amountPaid, balance: bal, payment_status: status,
    }).eq('id', saleId);
    if (error) { toast.error(error.message); return; }
    setSales(prev => prev.map(s => s.id === saleId ? { ...s, amount_paid: amountPaid, balance: bal, payment_status: status } : s));
    // Auto-archive receipt when fully settled
    if (status === 'paid' && currentBusiness) {
      await saveReceipt({
        business_id: currentBusiness.id,
        receipt_type: 'sale',
        transaction_id: saleId,
        buyer_name: sale.customer_name,
        seller_name: sale.recorded_by,
        grand_total: Number(sale.grand_total),
        items: sale.items.map(i => ({ itemName: i.item_name, category: i.category, quality: i.quality, quantity: i.quantity, priceType: i.price_type, unitPrice: Number(i.unit_price), subtotal: Number(i.subtotal) })),
        business_info: { name: currentBusiness.name, address: currentBusiness.address, contact: currentBusiness.contact, email: currentBusiness.email },
        code: sale.from_order_code || null,
      });
      toast.success('✅ Debt settled! Receipt archived.');
    } else {
      toast.success('Payment updated!');
    }
  }, [sales, currentBusiness]);

  const updatePurchasePayment = useCallback(async (purchaseId: string, amountPaid: number, paymentStatus: string) => {
    const purchase = purchases.find(p => p.id === purchaseId);
    if (!purchase) return;
    const bal = Math.max(0, Number(purchase.grand_total) - amountPaid);
    const status = bal <= 0 ? 'paid' : (amountPaid > 0 ? 'partial' : 'unpaid');
    const { error } = await supabase.from('purchases').update({
      amount_paid: amountPaid, balance: bal, payment_status: status,
    } as any).eq('id', purchaseId);
    if (error) { toast.error(error.message); return; }
    setPurchases(prev => prev.map(p => p.id === purchaseId ? { ...p, amount_paid: amountPaid, balance: bal, payment_status: status } : p));
    // Auto-archive receipt when fully settled
    if (status === 'paid' && currentBusiness) {
      await saveReceipt({
        business_id: currentBusiness.id,
        receipt_type: 'purchase',
        transaction_id: purchaseId,
        buyer_name: currentBusiness.name,
        seller_name: purchase.supplier,
        grand_total: Number(purchase.grand_total),
        items: purchase.items.map(i => ({ itemName: i.item_name, category: i.category, quality: i.quality, quantity: i.quantity, priceType: 'purchase', unitPrice: Number(i.unit_price), subtotal: Number(i.subtotal) })),
        business_info: { name: currentBusiness.name, address: currentBusiness.address, contact: currentBusiness.contact, email: currentBusiness.email },
        code: null,
      });
      toast.success('✅ Debt settled! Receipt archived.');
    } else {
      toast.success('Payment updated!');
    }
  }, [purchases, currentBusiness]);

  const updateServicePayment = useCallback(async (serviceId: string, amountPaid: number, paymentStatus: string) => {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;
    const bal = Math.max(0, Number(service.cost) - amountPaid);
    const status = bal <= 0 ? 'paid' : (amountPaid > 0 ? 'partial' : 'unpaid');
    const { error } = await supabase.from('services').update({
      amount_paid: amountPaid, balance: bal, payment_status: status,
    }).eq('id', serviceId);
    if (error) { toast.error(error.message); return; }
    setServices(prev => prev.map(s => s.id === serviceId ? { ...s, amount_paid: amountPaid, balance: bal, payment_status: status } : s));
    // Auto-archive receipt when fully settled
    if (status === 'paid' && currentBusiness) {
      await saveReceipt({
        business_id: currentBusiness.id,
        receipt_type: 'service',
        transaction_id: serviceId,
        buyer_name: service.customer_name,
        seller_name: service.seller_name,
        grand_total: Number(service.cost),
        items: [{ itemName: service.service_name, category: 'Service', quality: service.description || '-', quantity: 1, priceType: 'service', unitPrice: Number(service.cost), subtotal: Number(service.cost) }],
        business_info: { name: currentBusiness.name, address: currentBusiness.address, contact: currentBusiness.contact, email: currentBusiness.email },
        code: null,
      });
    }
    toast.success('Service payment updated!');
  }, [services, currentBusiness]);

  const refreshData = useCallback(async () => {
    await loadBusinessData();
  }, [currentBusinessId]);

  return (
    <BusinessContext.Provider value={{
      currentBusiness, businesses, memberships, userRole,
      stock, sales, purchases, orders, services, expenses, notifications, loading,
      setCurrentBusinessId, createBusiness, deleteBusiness, updateBusiness,
      addStockItem, updateStockItem, deleteStockItem, restoreStockItem, permanentDeleteStockItem,
      addSale, addPurchase, addOrder, updateOrder, completeOrderToSale,
      addService, updateServicePayment, saveReceipt, getReceipts,
      addExpense, deleteExpense,
      updateSalePayment, updatePurchasePayment,
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
