import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import type { BusinessData, StockItem, Sale, Purchase, Order, ServiceRecord, BusinessInfo, OrderItem } from '@/types/business';

const defaultBusinessInfo: BusinessInfo = {
  name: 'My Business',
  address: '123 Main Street',
  contact: '+1 234 567 890',
  email: 'info@mybusiness.com',
  totalCapital: 0,
};

const defaultData: BusinessData = {
  businessInfo: defaultBusinessInfo,
  stock: [],
  sales: [],
  purchases: [],
  orders: [],
  services: [],
};

function loadData(): BusinessData {
  try {
    const raw = localStorage.getItem('biztrack_data');
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure totalCapital exists
      if (parsed.businessInfo && parsed.businessInfo.totalCapital === undefined) {
        parsed.businessInfo.totalCapital = 0;
      }
      return parsed;
    }
  } catch {}
  return defaultData;
}

function saveData(data: BusinessData) {
  localStorage.setItem('biztrack_data', JSON.stringify(data));
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

function generateCode(): string {
  return 'ORD-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

interface BusinessContextType {
  data: BusinessData;
  updateBusinessInfo: (info: BusinessInfo) => void;
  addStockItem: (item: Omit<StockItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateStockItem: (id: string, updates: Partial<StockItem>) => void;
  deleteStockItem: (id: string) => void;
  addSale: (sale: Omit<Sale, 'id' | 'timestamp'>) => void;
  addPurchase: (purchase: Omit<Purchase, 'id' | 'timestamp'>) => void;
  addOrder: (order: Omit<Order, 'id' | 'timestamp' | 'code'>) => void;
  updateOrder: (id: string, updates: Partial<Order>) => void;
  updateOrderStatus: (id: string, status: Order['status']) => void;
  completeOrderToSale: (orderId: string) => void;
  addService: (service: Omit<ServiceRecord, 'id' | 'timestamp'>) => void;
  getTopSellingItems: () => { name: string; totalSold: number }[];
  getLowStockItems: () => StockItem[];
  getOutOfStockItems: () => StockItem[];
  getTodayRevenue: () => number;
  getExpectedRevenue: () => { wholesale: number; retail: number; totalProfit: number };
}

const BusinessContext = createContext<BusinessContextType | null>(null);

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<BusinessData>(loadData);

  useEffect(() => {
    saveData(data);
  }, [data]);

  const updateBusinessInfo = useCallback((info: BusinessInfo) => {
    setData(prev => ({ ...prev, businessInfo: info }));
  }, []);

  const addStockItem = useCallback((item: Omit<StockItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    setData(prev => ({
      ...prev,
      stock: [...prev.stock, { ...item, id: generateId(), createdAt: now, updatedAt: now }],
    }));
  }, []);

  const updateStockItem = useCallback((id: string, updates: Partial<StockItem>) => {
    setData(prev => ({
      ...prev,
      stock: prev.stock.map(item =>
        item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item
      ),
    }));
  }, []);

  const deleteStockItem = useCallback((id: string) => {
    setData(prev => ({
      ...prev,
      stock: prev.stock.filter(item => item.id !== id),
    }));
  }, []);

  const addSale = useCallback((sale: Omit<Sale, 'id' | 'timestamp'>) => {
    const now = new Date().toISOString();
    setData(prev => {
      const newStock = [...prev.stock];
      sale.items.forEach(saleItem => {
        const idx = newStock.findIndex(s => s.id === saleItem.stockItemId);
        if (idx >= 0) {
          newStock[idx] = {
            ...newStock[idx],
            quantity: Math.max(0, newStock[idx].quantity - saleItem.quantity),
            updatedAt: now,
          };
        }
      });
      return {
        ...prev,
        stock: newStock,
        sales: [...prev.sales, { ...sale, id: generateId(), timestamp: now }],
      };
    });
  }, []);

  const addPurchase = useCallback((purchase: Omit<Purchase, 'id' | 'timestamp'>) => {
    const now = new Date().toISOString();
    setData(prev => {
      const newStock = [...prev.stock];
      const addedItems: string[] = [];
      const updatedItems: string[] = [];
      
      purchase.items.forEach(purchaseItem => {
        const idx = newStock.findIndex(
          s => s.name.toLowerCase() === purchaseItem.itemName.toLowerCase()
        );
        if (idx >= 0) {
          newStock[idx] = {
            ...newStock[idx],
            quantity: newStock[idx].quantity + purchaseItem.quantity,
            updatedAt: now,
          };
          updatedItems.push(`${purchaseItem.itemName} (+${purchaseItem.quantity})`);
        } else {
          newStock.push({
            id: generateId(),
            name: purchaseItem.itemName,
            category: purchaseItem.category,
            quality: purchaseItem.quality,
            wholesalePrice: purchaseItem.unitPrice,
            retailPrice: purchaseItem.unitPrice,
            quantity: purchaseItem.quantity,
            minStockLevel: 5,
            createdAt: now,
            updatedAt: now,
          });
          addedItems.push(`${purchaseItem.itemName} (${purchaseItem.quantity})`);
        }
      });

      // Notify about stock changes
      if (updatedItems.length > 0) {
        toast.success('Stock Updated', { description: updatedItems.join(', ') });
      }
      if (addedItems.length > 0) {
        toast.info('New Items Added to Stock', { description: addedItems.join(', ') });
      }

      return {
        ...prev,
        stock: newStock,
        purchases: [...prev.purchases, { ...purchase, id: generateId(), timestamp: now }],
      };
    });
  }, []);

  const addOrder = useCallback((order: Omit<Order, 'id' | 'timestamp' | 'code'>) => {
    setData(prev => ({
      ...prev,
      orders: [...prev.orders, { ...order, id: generateId(), timestamp: new Date().toISOString(), code: generateCode() }],
    }));
  }, []);

  const updateOrder = useCallback((id: string, updates: Partial<Order>) => {
    setData(prev => ({
      ...prev,
      orders: prev.orders.map(o => (o.id === id ? { ...o, ...updates } : o)),
    }));
  }, []);

  const updateOrderStatus = useCallback((id: string, status: Order['status']) => {
    setData(prev => ({
      ...prev,
      orders: prev.orders.map(o => (o.id === id ? { ...o, status } : o)),
    }));
  }, []);

  const completeOrderToSale = useCallback((orderId: string) => {
    const now = new Date().toISOString();
    setData(prev => {
      const order = prev.orders.find(o => o.id === orderId);
      if (!order || order.transferredToSale) return prev;

      // Deduct from stock
      const newStock = [...prev.stock];
      order.items.forEach(orderItem => {
        const idx = newStock.findIndex(s => s.name.toLowerCase() === orderItem.itemName.toLowerCase());
        if (idx >= 0) {
          newStock[idx] = {
            ...newStock[idx],
            quantity: Math.max(0, newStock[idx].quantity - orderItem.quantity),
            updatedAt: now,
          };
        }
      });

      const saleItems = order.items.map(item => ({
        id: generateId(),
        stockItemId: '',
        itemName: item.itemName,
        category: item.category,
        quality: item.quality,
        quantity: item.quantity,
        priceType: item.priceType,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
        timestamp: now,
      }));

      const newSale: Sale = {
        id: generateId(),
        items: saleItems,
        grandTotal: order.grandTotal,
        timestamp: now,
        recordedBy: 'Order Transfer',
        fromOrderId: order.id,
        fromOrderCode: order.code,
      };

      toast.success('Order Transferred to Sales', {
        description: `Order ${order.code} (${order.customerName}) — $${order.grandTotal.toFixed(2)}`,
      });

      return {
        ...prev,
        stock: newStock,
        orders: prev.orders.map(o => o.id === orderId ? { ...o, status: 'completed' as const, transferredToSale: true } : o),
        sales: [...prev.sales, newSale],
      };
    });
  }, []);

  const addService = useCallback((service: Omit<ServiceRecord, 'id' | 'timestamp'>) => {
    setData(prev => ({
      ...prev,
      services: [...prev.services, { ...service, id: generateId(), timestamp: new Date().toISOString() }],
    }));
  }, []);

  const getTopSellingItems = useCallback(() => {
    const counts: Record<string, { name: string; totalSold: number }> = {};
    data.sales.forEach(sale => {
      sale.items.forEach(item => {
        if (!counts[item.itemName]) counts[item.itemName] = { name: item.itemName, totalSold: 0 };
        counts[item.itemName].totalSold += item.quantity;
      });
    });
    return Object.values(counts).sort((a, b) => b.totalSold - a.totalSold).slice(0, 10);
  }, [data.sales]);

  const getLowStockItems = useCallback(() => {
    return data.stock.filter(item => item.quantity > 0 && item.quantity <= item.minStockLevel);
  }, [data.stock]);

  const getOutOfStockItems = useCallback(() => {
    return data.stock.filter(item => item.quantity === 0);
  }, [data.stock]);

  const getTodayRevenue = useCallback(() => {
    const today = new Date().toDateString();
    return data.sales
      .filter(s => new Date(s.timestamp).toDateString() === today)
      .reduce((sum, s) => sum + s.grandTotal, 0);
  }, [data.sales]);

  const getExpectedRevenue = useCallback(() => {
    let wholesale = 0;
    let retail = 0;
    let totalCost = 0;

    data.stock.forEach(item => {
      wholesale += item.quantity * item.wholesalePrice;
      retail += item.quantity * item.retailPrice;
    });

    // Estimate cost from purchases
    data.purchases.forEach(p => {
      totalCost += p.grandTotal;
    });

    return {
      wholesale,
      retail,
      totalProfit: retail - totalCost,
    };
  }, [data.stock, data.purchases]);

  return (
    <BusinessContext.Provider
      value={{
        data,
        updateBusinessInfo,
        addStockItem,
        updateStockItem,
        deleteStockItem,
        addSale,
        addPurchase,
        addOrder,
        updateOrder,
        updateOrderStatus,
        completeOrderToSale,
        addService,
        getTopSellingItems,
        getLowStockItems,
        getOutOfStockItems,
        getTodayRevenue,
        getExpectedRevenue,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error('useBusiness must be used within BusinessProvider');
  return ctx;
}
