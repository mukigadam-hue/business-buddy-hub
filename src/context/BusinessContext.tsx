import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

// Types matching the database schema
export interface StockItem {
  id: string;
  business_id: string;
  name: string;
  category: string;
  quality: string;
  wholesale_price: number;
  retail_price: number;
  quantity: number;
  min_stock_level: number;
  created_at: string;
  updated_at: string;
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

export interface ServiceRecord {
  id: string;
  business_id: string;
  service_name: string;
  description: string;
  cost: number;
  customer_name: string;
  created_at: string;
}

export interface Business {
  id: string;
  name: string;
  address: string;
  contact: string;
  email: string;
  total_capital: number;
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
  loading: boolean;
  setCurrentBusinessId: (id: string) => void;
  createBusiness: (name: string, address: string, contact: string, email: string) => Promise<void>;
  updateBusiness: (updates: Partial<Business>) => Promise<void>;
  addStockItem: (item: Omit<StockItem, 'id' | 'business_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateStockItem: (id: string, updates: Partial<StockItem>) => Promise<void>;
  deleteStockItem: (id: string) => Promise<void>;
  addSale: (items: { stock_item_id?: string; item_name: string; category: string; quality: string; quantity: number; price_type: string; unit_price: number; subtotal: number; customer_name?: string }[], grandTotal: number, recordedBy: string, fromOrderId?: string, fromOrderCode?: string) => Promise<void>;
  addPurchase: (items: { item_name: string; category: string; quality: string; quantity: number; unit_price: number; wholesale_price?: number; retail_price?: number; subtotal: number }[], grandTotal: number, supplier: string, recordedBy: string) => Promise<void>;
  addOrder: (type: string, customerName: string, items: { item_name: string; category: string; quality: string; quantity: number; price_type: string; unit_price: number; subtotal: number }[], grandTotal: number, status: string) => Promise<void>;
  updateOrder: (id: string, items: OrderItem[], grandTotal: number, status?: string) => Promise<void>;
  completeOrderToSale: (orderId: string) => Promise<void>;
  addService: (service: Omit<ServiceRecord, 'id' | 'business_id' | 'created_at'>) => Promise<void>;
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
  const [loading, setLoading] = useState(true);

  const currentBusiness = businesses.find(b => b.id === currentBusinessId) || null;
  const userRole = memberships.find(m => m.business_id === currentBusinessId)?.role || null;

  // Save current business to localStorage
  useEffect(() => {
    if (currentBusinessId) {
      localStorage.setItem('biztrack_current_business', currentBusinessId);
    }
  }, [currentBusinessId]);

  // Load businesses and memberships
  useEffect(() => {
    if (!user) {
      setBusinesses([]);
      setMemberships([]);
      setLoading(false);
      return;
    }
    loadBusinesses();
  }, [user]);

  // Load business data when current business changes
  useEffect(() => {
    if (currentBusinessId && user) {
      loadBusinessData();
      setupRealtimeSubscriptions();
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
    
    const [stockRes, salesRes, purchasesRes, ordersRes, servicesRes] = await Promise.all([
      supabase.from('stock_items').select('*').eq('business_id', currentBusinessId).order('name'),
      supabase.from('sales').select('*').eq('business_id', currentBusinessId).order('created_at', { ascending: false }),
      supabase.from('purchases').select('*').eq('business_id', currentBusinessId).order('created_at', { ascending: false }),
      supabase.from('orders').select('*').eq('business_id', currentBusinessId).order('created_at', { ascending: false }),
      supabase.from('services').select('*').eq('business_id', currentBusinessId).order('created_at', { ascending: false }),
    ]);

    setStock((stockRes.data || []) as StockItem[]);
    
    // Load sale items for each sale
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

    const channel = supabase
      .channel(`business-${currentBusinessId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_items', filter: `business_id=eq.${currentBusinessId}` }, () => {
        loadBusinessData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales', filter: `business_id=eq.${currentBusinessId}` }, () => {
        loadBusinessData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchases', filter: `business_id=eq.${currentBusinessId}` }, () => {
        loadBusinessData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `business_id=eq.${currentBusinessId}` }, () => {
        loadBusinessData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services', filter: `business_id=eq.${currentBusinessId}` }, () => {
        loadBusinessData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

  const addStockItem = useCallback(async (item: Omit<StockItem, 'id' | 'business_id' | 'created_at' | 'updated_at'>) => {
    if (!currentBusinessId) return;
    const { error } = await supabase.from('stock_items').insert({ ...item, business_id: currentBusinessId });
    if (error) { toast.error(error.message); return; }
    toast.success('Item added to stock!');
  }, [currentBusinessId]);

  const updateStockItem = useCallback(async (id: string, updates: Partial<StockItem>) => {
    const { error } = await supabase.from('stock_items').update(updates).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Stock item updated!');
  }, []);

  const deleteStockItem = useCallback(async (id: string) => {
    const { error } = await supabase.from('stock_items').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Stock item deleted!');
  }, []);

  const addSale = useCallback(async (
    items: { stock_item_id?: string; item_name: string; category: string; quality: string; quantity: number; price_type: string; unit_price: number; subtotal: number; customer_name?: string }[],
    grandTotal: number, recordedBy: string, fromOrderId?: string, fromOrderCode?: string
  ) => {
    if (!currentBusinessId) return;
    const { data: saleData, error: saleError } = await supabase.from('sales').insert({
      business_id: currentBusinessId, grand_total: grandTotal, recorded_by: recordedBy,
      from_order_id: fromOrderId || null, from_order_code: fromOrderCode || null,
    }).select().single();
    if (saleError || !saleData) { toast.error(saleError?.message || 'Failed'); return; }

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

    // Deduct from stock — match by id first, then by name+category+quality
    for (const item of items) {
      // Skip service items
      if (item.price_type === 'service') continue;
      if (item.stock_item_id) {
        const stockItem = stock.find(s => s.id === item.stock_item_id);
        if (stockItem) {
          await supabase.from('stock_items').update({
            quantity: Math.max(0, stockItem.quantity - item.quantity),
          }).eq('id', item.stock_item_id);
        }
      } else {
        const stockItem = stock.find(s =>
          s.name.toLowerCase() === item.item_name.toLowerCase() &&
          s.category.toLowerCase() === (item.category || '').toLowerCase() &&
          s.quality.toLowerCase() === (item.quality || '').toLowerCase()
        ) || stock.find(s => s.name.toLowerCase() === item.item_name.toLowerCase());
        if (stockItem) {
          await supabase.from('stock_items').update({
            quantity: Math.max(0, stockItem.quantity - item.quantity),
          }).eq('id', stockItem.id);
        }
      }
    }
    toast.success('Sale recorded!');
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

    // Update stock — match by name + category + quality for uniqueness
    for (const item of items) {
      const existingStock = stock.find(s =>
        s.name.toLowerCase() === item.item_name.toLowerCase() &&
        s.category.toLowerCase() === item.category.toLowerCase() &&
        s.quality.toLowerCase() === item.quality.toLowerCase()
      ) || stock.find(s => s.name.toLowerCase() === item.item_name.toLowerCase() && !item.category && !item.quality);

      const ws = item.wholesale_price ?? item.unit_price;
      const ret = item.retail_price ?? item.unit_price;

      if (existingStock) {
        await supabase.from('stock_items').update({
          quantity: existingStock.quantity + item.quantity,
          wholesale_price: ws,
          retail_price: ret,
        }).eq('id', existingStock.id);
        toast.success(`Stock Updated: ${item.item_name} (+${item.quantity})`);
      } else {
        await supabase.from('stock_items').insert({
          business_id: currentBusinessId, name: item.item_name, category: item.category,
          quality: item.quality, wholesale_price: ws, retail_price: ret,
          quantity: item.quantity, min_stock_level: 5,
        });
        toast.info(`New Item Added to Stock: ${item.item_name}`);
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
    await supabase.from('order_items').insert(orderItems);
    toast.success('Order updated!');
    await loadBusinessData();
  }, [currentBusinessId]);

  const completeOrderToSale = useCallback(async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order || order.transferred_to_sale) return;

    // Mark order as completed
    await supabase.from('orders').update({ status: 'completed', transferred_to_sale: true }).eq('id', orderId);

    // Create sale from order
    await addSale(
      order.items.map(item => ({
        item_name: item.item_name, category: item.category, quality: item.quality,
        quantity: item.quantity, price_type: item.price_type, unit_price: item.unit_price,
        subtotal: item.subtotal,
      })),
      order.grand_total,
      'Order Transfer',
      order.id,
      order.code
    );

    toast.success(`Order ${order.code} transferred to sales!`);
    await loadBusinessData();
  }, [orders, addSale]);

  const addService = useCallback(async (service: Omit<ServiceRecord, 'id' | 'business_id' | 'created_at'>) => {
    if (!currentBusinessId) return;
    const { error } = await supabase.from('services').insert({ ...service, business_id: currentBusinessId });
    if (error) { toast.error(error.message); return; }
    toast.success('Service recorded!');
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
      return {
        user_id: m.user_id,
        role: m.role,
        email: profile?.email || '',
        full_name: profile?.full_name || '',
      };
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
    // Delete and re-insert since we can't update role easily with RLS
    await supabase.from('business_memberships').delete()
      .eq('user_id', userId).eq('business_id', currentBusinessId);
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
      stock, sales, purchases, orders, services, loading,
      setCurrentBusinessId, createBusiness, updateBusiness,
      addStockItem, updateStockItem, deleteStockItem,
      addSale, addPurchase, addOrder, updateOrder, completeOrderToSale,
      addService, generateInviteCode, redeemInviteCode,
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
