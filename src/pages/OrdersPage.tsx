import { useState } from 'react';
import { useBusiness } from '@/context/BusinessContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Send, CheckCircle, Clock, FileText } from 'lucide-react';
import type { OrderItem, Order } from '@/types/business';

export default function OrdersPage() {
  const { data, addOrder, updateOrderStatus } = useBusiness();
  const [tab, setTab] = useState('my_orders');
  const [customerName, setCustomerName] = useState('');
  const [items, setItems] = useState<Omit<OrderItem, 'id' | 'subtotal'>[]>([]);
  const [form, setForm] = useState({ name: '', category: '', quality: '', quantity: '1', priceType: 'retail' as 'wholesale' | 'retail', unitPrice: '' });

  const myOrders = data.orders.filter(o => o.type === 'my_order');
  const inboxOrders = data.orders.filter(o => o.type === 'inbox');
  const requestOrders = data.orders.filter(o => o.type === 'request');

  const suggestions = data.stock.map(s => s.name);

  function addItem() {
    if (!form.name.trim()) return;
    // Auto-fill price from stock if available
    const stockItem = data.stock.find(s => s.name.toLowerCase() === form.name.toLowerCase());
    const unitPrice = form.unitPrice ? parseFloat(form.unitPrice) : (stockItem ? (form.priceType === 'wholesale' ? stockItem.wholesalePrice : stockItem.retailPrice) : 0);

    setItems(prev => [...prev, {
      itemName: form.name.trim(),
      category: form.category || stockItem?.category || 'Other',
      quality: form.quality || stockItem?.quality || 'New',
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

  function getStatusIcon(status: Order['status']) {
    switch (status) {
      case 'pending': return <Clock className="h-3.5 w-3.5 text-warning" />;
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
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Code: {order.code} · {new Date(order.timestamp).toLocaleString()}</p>
          </div>
          <span className="font-bold">${order.grandTotal.toFixed(2)}</span>
        </div>
        <div className="text-sm text-muted-foreground space-y-0.5">
          {order.items.map(item => (
            <div key={item.id} className="flex justify-between">
              <span>{item.itemName} × {item.quantity} ({item.priceType})</span>
              <span>${item.subtotal.toFixed(2)}</span>
            </div>
          ))}
        </div>
        {order.status !== 'completed' && order.status !== 'cancelled' && (
          <div className="flex gap-2 pt-1">
            {order.status === 'pending' && (
              <Button size="sm" variant="outline" onClick={() => updateOrderStatus(order.id, 'priced')}>
                Tag Prices
              </Button>
            )}
            {(order.status === 'priced' || order.status === 'confirmed') && (
              <Button size="sm" onClick={() => updateOrderStatus(order.id, 'completed')}>
                <CheckCircle className="h-3.5 w-3.5 mr-1" />Complete
              </Button>
            )}
          </div>
        )}
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
                    <TableCell colSpan={4} className="text-right font-bold">Grand Total</TableCell>
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
                  <Send className="h-4 w-4 mr-2" />Request Order
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
          {inboxOrders.length === 0 ? <p className="text-sm text-muted-foreground">No inbox orders.</p> : inboxOrders.map(o => <OrderCard key={o.id} order={o} />)}
        </TabsContent>
        <TabsContent value="requests" className="space-y-3 mt-4">
          {requestOrders.length === 0 ? <p className="text-sm text-muted-foreground">No requests.</p> : requestOrders.map(o => <OrderCard key={o.id} order={o} />)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
