import { useState } from 'react';
import { useBusiness } from '@/context/BusinessContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Send, CheckCircle, Clock, FileText, Pencil, Receipt as ReceiptIcon, AlertTriangle } from 'lucide-react';
import type { OrderItem, Order } from '@/types/business';
import Receipt from '@/components/Receipt';

export default function OrdersPage() {
  const { data, addOrder, updateOrder, updateOrderStatus, completeOrderToSale } = useBusiness();
  const [tab, setTab] = useState('my_orders');
  const [customerName, setCustomerName] = useState('');
  const [items, setItems] = useState<Omit<OrderItem, 'id' | 'subtotal'>[]>([]);
  const [form, setForm] = useState({ name: '', category: '', quality: '', quantity: '1', priceType: 'retail' as 'wholesale' | 'retail', unitPrice: '' });
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editItems, setEditItems] = useState<OrderItem[]>([]);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [pricingOrder, setPricingOrder] = useState<Order | null>(null);
  const [pricingItems, setPricingItems] = useState<OrderItem[]>([]);

  const myOrders = data.orders.filter(o => o.type === 'my_order');
  const inboxOrders = data.orders.filter(o => o.type === 'inbox');
  const requestOrders = data.orders.filter(o => o.type === 'request');

  const suggestions = data.stock.map(s => s.name);

  function addItem() {
    if (!form.name.trim()) return;
    const stockItem = data.stock.find(s => s.name.toLowerCase() === form.name.toLowerCase());
    const unitPrice = form.unitPrice ? parseFloat(form.unitPrice) : (stockItem ? (form.priceType === 'wholesale' ? stockItem.wholesalePrice : stockItem.retailPrice) : 0);

    setItems(prev => [...prev, {
      itemName: form.name.trim(),
      category: form.category || stockItem?.category || '',
      quality: form.quality || stockItem?.quality || '',
      quantity: parseInt(form.quantity) || 1,
      priceType: form.priceType,
      unitPrice,
    }]);
    setForm({ name: '', category: '', quality: '', quantity: '1', priceType: 'retail', unitPrice: '' });
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx));
  }

  const grandTotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  function handleCreateOrder(type: Order['type']) {
    if (items.length === 0) return;
    addOrder({
      type,
      customerName: customerName.trim() || 'Walk-in Customer',
      items: items.map(item => ({ ...item, id: '', subtotal: item.quantity * item.unitPrice })),
      grandTotal,
      status: type === 'request' ? 'pending' : 'confirmed',
    });
    setItems([]);
    setCustomerName('');
  }

  function openEditOrder(order: Order) {
    if (order.status === 'completed' || order.transferredToSale) return;
    setEditingOrder(order);
    setEditItems([...order.items]);
  }

  function saveEditOrder() {
    if (!editingOrder) return;
    const newTotal = editItems.reduce((sum, item) => sum + item.subtotal, 0);
    updateOrder(editingOrder.id, {
      items: editItems,
      grandTotal: newTotal,
    });
    setEditingOrder(null);
    setEditItems([]);
  }

  function updateEditItemQty(idx: number, qty: number) {
    setEditItems(prev => prev.map((item, i) => i === idx ? { ...item, quantity: qty, subtotal: qty * item.unitPrice } : item));
  }

  function removeEditItem(idx: number) {
    setEditItems(prev => prev.filter((_, i) => i !== idx));
  }

  // Inbox pricing workflow
  function openPricing(order: Order) {
    setPricingOrder(order);
    setPricingItems(order.items.map(item => {
      const stockItem = data.stock.find(s => s.name.toLowerCase() === item.itemName.toLowerCase());
      return {
        ...item,
        unitPrice: stockItem ? (item.priceType === 'wholesale' ? stockItem.wholesalePrice : stockItem.retailPrice) : item.unitPrice,
        subtotal: 0,
        category: stockItem?.category || item.category,
      };
    }).map(item => ({ ...item, subtotal: item.quantity * item.unitPrice })));
  }

  function updatePricingItemPrice(idx: number, price: number) {
    setPricingItems(prev => prev.map((item, i) => i === idx ? { ...item, unitPrice: price, subtotal: item.quantity * price } : item));
  }

  function savePricing() {
    if (!pricingOrder) return;
    const newTotal = pricingItems.reduce((sum, item) => sum + item.subtotal, 0);
    updateOrder(pricingOrder.id, {
      items: pricingItems,
      grandTotal: newTotal,
      status: 'priced',
    });
    setPricingOrder(null);
    setPricingItems([]);
  }

  function getStockStatus(itemName: string) {
    const stockItem = data.stock.find(s => s.name.toLowerCase() === itemName.toLowerCase());
    if (!stockItem) return 'not-found';
    if (stockItem.quantity === 0) return 'out-of-stock';
    if (stockItem.quantity <= stockItem.minStockLevel) return 'low';
    return 'ok';
  }

  function getStatusIcon(status: Order['status']) {
    switch (status) {
      case 'pending': return <Clock className="h-3.5 w-3.5 text-warning" />;
      case 'priced': return <CheckCircle className="h-3.5 w-3.5 text-accent" />;
      case 'confirmed': return <CheckCircle className="h-3.5 w-3.5 text-success" />;
      case 'completed': return <CheckCircle className="h-3.5 w-3.5 text-primary" />;
      default: return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  }

  function OrderCard({ order }: { order: Order }) {
    return (
      <div className="border rounded-lg p-3 space-y-2">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              {getStatusIcon(order.status)}
              <span className="font-medium text-sm">{order.customerName}</span>
              {order.transferredToSale && (
                <span className="text-xs bg-success/10 text-success px-1.5 py-0.5 rounded-full">Sold</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Code: {order.code} · {new Date(order.timestamp).toLocaleString()}</p>
          </div>
          <span className="font-bold">${order.grandTotal.toFixed(2)}</span>
        </div>
        <div className="text-sm text-muted-foreground space-y-0.5">
          {order.items.map((item, i) => {
            const status = getStockStatus(item.itemName);
            return (
              <div key={i} className="flex justify-between items-center">
                <span className="flex items-center gap-1">
                  {item.itemName} × {item.quantity} ({item.priceType})
                  {status === 'out-of-stock' && <AlertTriangle className="h-3 w-3 text-destructive" />}
                  {status === 'not-found' && <AlertTriangle className="h-3 w-3 text-warning" />}
                </span>
                <span>${item.subtotal.toFixed(2)}</span>
              </div>
            );
          })}
        </div>
        <div className="flex gap-2 pt-1 flex-wrap">
          {!order.transferredToSale && order.status !== 'completed' && order.status !== 'cancelled' && (
            <>
              <Button size="sm" variant="outline" onClick={() => openEditOrder(order)}>
                <Pencil className="h-3.5 w-3.5 mr-1" />Edit
              </Button>
              {order.type === 'inbox' && order.status === 'pending' && (
                <Button size="sm" variant="outline" onClick={() => openPricing(order)}>
                  Tag Prices
                </Button>
              )}
              {(order.status === 'priced' || order.status === 'confirmed') && (
                <Button size="sm" onClick={() => completeOrderToSale(order.id)}>
                  <CheckCircle className="h-3.5 w-3.5 mr-1" />Complete & Transfer to Sale
                </Button>
              )}
            </>
          )}
          {(order.status === 'completed' || order.transferredToSale) && (
            <Button size="sm" variant="ghost" onClick={() => setReceiptOrder(order)}>
              <ReceiptIcon className="h-3.5 w-3.5 mr-1" />Receipt
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Orders</h1>

      {/* Create Order Form */}
      <Card className="shadow-card">
        <CardContent className="p-4 space-y-4">
          <h2 className="text-base font-semibold">Create Order</h2>
          <div>
            <Label>Customer Name</Label>
            <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Customer name..." />
          </div>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[150px]">
              <Label>Item</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} list="order-suggestions" placeholder="Item name..." />
              <datalist id="order-suggestions">
                {suggestions.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
            <div className="w-28">
              <Label>Category</Label>
              <Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Type category..." list="cat-suggestions" />
              <datalist id="cat-suggestions">
                {[...new Set(data.stock.map(s => s.category))].map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div className="w-20">
              <Label>Qty</Label>
              <Input type="number" min="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div className="w-28">
              <Label>Type</Label>
              <Select value={form.priceType} onValueChange={v => setForm(f => ({ ...f, priceType: v as 'wholesale' | 'retail' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="wholesale">Wholesale</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-24">
              <Label>Price</Label>
              <Input type="number" min="0" step="0.01" value={form.unitPrice} onChange={e => setForm(f => ({ ...f, unitPrice: e.target.value }))} placeholder="Auto" />
            </div>
            <Button onClick={addItem} disabled={!form.name.trim()}><Plus className="h-4 w-4 mr-1" />Add</Button>
          </div>

          {items.length > 0 && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{item.itemName}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell className="capitalize">{item.priceType}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">${item.unitPrice.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-semibold">${(item.quantity * item.unitPrice).toFixed(2)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeItem(i)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={5} className="text-right font-bold">Grand Total</TableCell>
                    <TableCell className="text-right font-bold text-lg">${grandTotal.toFixed(2)}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <div className="flex gap-2">
                <Button onClick={() => handleCreateOrder('my_order')} className="flex-1">
                  <FileText className="h-4 w-4 mr-2" />My Order
                </Button>
                <Button onClick={() => handleCreateOrder('inbox')} variant="outline" className="flex-1">
                  <Send className="h-4 w-4 mr-2" />Inbox Order
                </Button>
                <Button onClick={() => handleCreateOrder('request')} variant="secondary" className="flex-1">
                  <Send className="h-4 w-4 mr-2" />Request (No Prices)
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Orders Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="my_orders">My Orders ({myOrders.length})</TabsTrigger>
          <TabsTrigger value="inbox">Inbox ({inboxOrders.length})</TabsTrigger>
          <TabsTrigger value="requests">Requests ({requestOrders.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="my_orders" className="space-y-3 mt-4">
          {myOrders.length === 0 ? <p className="text-sm text-muted-foreground">No orders yet.</p> : myOrders.map(o => <OrderCard key={o.id} order={o} />)}
        </TabsContent>
        <TabsContent value="inbox" className="space-y-3 mt-4">
          <p className="text-xs text-muted-foreground mb-2">Inbox orders are received for price confirmation. Tag prices and send back.</p>
          {inboxOrders.length === 0 ? <p className="text-sm text-muted-foreground">No inbox orders.</p> : inboxOrders.map(o => <OrderCard key={o.id} order={o} />)}
        </TabsContent>
        <TabsContent value="requests" className="space-y-3 mt-4">
          <p className="text-xs text-muted-foreground mb-2">Request orders are sent without prices for the seller to tag.</p>
          {requestOrders.length === 0 ? <p className="text-sm text-muted-foreground">No requests.</p> : requestOrders.map(o => <OrderCard key={o.id} order={o} />)}
        </TabsContent>
      </Tabs>

      {/* Edit Order Dialog */}
      <Dialog open={!!editingOrder} onOpenChange={o => { if (!o) setEditingOrder(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Order — {editingOrder?.code}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {editItems.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="flex-1 font-medium">{item.itemName}</span>
                <Input
                  type="number"
                  min="1"
                  className="w-20"
                  value={item.quantity}
                  onChange={e => updateEditItemQty(i, parseInt(e.target.value) || 1)}
                />
                <span className="w-20 text-right">${(item.quantity * item.unitPrice).toFixed(2)}</span>
                <Button variant="ghost" size="icon" onClick={() => removeEditItem(i)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            ))}
            <div className="flex justify-between font-bold pt-2 border-t">
              <span>Total</span>
              <span>${editItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0).toFixed(2)}</span>
            </div>
            <Button onClick={saveEditOrder} className="w-full">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pricing Dialog for Inbox */}
      <Dialog open={!!pricingOrder} onOpenChange={o => { if (!o) setPricingOrder(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Tag Prices — {pricingOrder?.code}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">Fill in prices for each item. Stock matches are auto-filled.</p>
          <div className="space-y-3">
            {pricingItems.map((item, i) => {
              const status = getStockStatus(item.itemName);
              return (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <div className="flex-1">
                    <span className="font-medium">{item.itemName}</span>
                    <span className="text-xs text-muted-foreground ml-1">×{item.quantity}</span>
                    {status === 'out-of-stock' && <span className="text-xs text-destructive ml-1">(Out of Stock!)</span>}
                    {status === 'not-found' && <span className="text-xs text-warning ml-1">(Not in Stock)</span>}
                    {status === 'low' && <span className="text-xs text-warning ml-1">(Low Stock)</span>}
                  </div>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-24"
                    value={item.unitPrice || ''}
                    onChange={e => updatePricingItemPrice(i, parseFloat(e.target.value) || 0)}
                    placeholder="Price"
                  />
                  <span className="w-20 text-right font-medium">${(item.quantity * item.unitPrice).toFixed(2)}</span>
                </div>
              );
            })}
            <div className="flex justify-between font-bold pt-2 border-t">
              <span>Total</span>
              <span>${pricingItems.reduce((s, i) => s + i.subtotal, 0).toFixed(2)}</span>
            </div>
            <Button onClick={savePricing} className="w-full">Confirm Prices & Send Back</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={!!receiptOrder} onOpenChange={o => { if (!o) setReceiptOrder(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Receipt</DialogTitle>
          </DialogHeader>
          {receiptOrder && (
            <Receipt
              items={receiptOrder.items}
              grandTotal={receiptOrder.grandTotal}
              customerName={receiptOrder.customerName}
              code={receiptOrder.code}
              date={receiptOrder.timestamp}
              type="order"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
