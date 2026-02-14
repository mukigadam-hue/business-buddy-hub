export interface StockItem {
  id: string;
  name: string;
  category: string;
  quality: string;
  wholesalePrice: number;
  retailPrice: number;
  quantity: number;
  minStockLevel: number;
  createdAt: string;
  updatedAt: string;
}

export interface SaleItem {
  id: string;
  stockItemId: string;
  itemName: string;
  category: string;
  quality: string;
  quantity: number;
  priceType: 'wholesale' | 'retail';
  unitPrice: number;
  subtotal: number;
  timestamp: string;
}

export interface Sale {
  id: string;
  items: SaleItem[];
  grandTotal: number;
  timestamp: string;
  recordedBy: string;
}

export interface PurchaseItem {
  id: string;
  itemName: string;
  category: string;
  quality: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Purchase {
  id: string;
  items: PurchaseItem[];
  grandTotal: number;
  supplier: string;
  timestamp: string;
  recordedBy: string;
}

export interface OrderItem {
  id: string;
  itemName: string;
  category: string;
  quality: string;
  quantity: number;
  priceType: 'wholesale' | 'retail';
  unitPrice: number;
  subtotal: number;
}

export interface Order {
  id: string;
  type: 'my_order' | 'inbox' | 'request';
  customerName: string;
  items: OrderItem[];
  grandTotal: number;
  status: 'pending' | 'priced' | 'confirmed' | 'completed' | 'cancelled';
  timestamp: string;
  code: string;
}

export interface ServiceRecord {
  id: string;
  serviceName: string;
  description: string;
  cost: number;
  customerName: string;
  timestamp: string;
}

export interface BusinessInfo {
  name: string;
  address: string;
  contact: string;
  email: string;
}

export interface BusinessData {
  businessInfo: BusinessInfo;
  stock: StockItem[];
  sales: Sale[];
  purchases: Purchase[];
  orders: Order[];
  services: ServiceRecord[];
}
