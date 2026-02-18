import { useState } from 'react';
import { useBusiness } from '@/context/BusinessContext';
import { useCurrency } from '@/hooks/useCurrency';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Send, CheckCircle, Clock, FileText, Pencil, Receipt as ReceiptIcon, AlertTriangle, MessageSquare } from 'lucide-react';
import Receipt from '@/components/Receipt';
import type { Order, OrderItem } from '@/context/BusinessContext';

function toSentenceCase(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export default function OrdersPage() {
  const { stock, orders, addOrder, updateOrder, completeOrderToSale, currentBusiness } = useBusiness();
  const { fmt } = useCurrency();
  const [tab, setTab] = useState('my_orders');
  const [customerName, setCustomerName] = useState('');
  const [items, setItems] = useState<{ item_name: string; category: string; quality: string; quantity: number; price_type: string; unit_price: number }[]>([]);
  const [form, setForm] = useState({ name: '', category: '', quality: '', quantity: '1', priceType: 'retail' as string, unitPrice: '' });
  const [requestComment, setRequestComment] = useState('');
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editItems, setEditItems] = useState<OrderItem[]>([]);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [pricingOrder, setPricingOrder] = useState<Order | null>(null);
  const [pricingItems, setPricingItems] = useState<OrderItem[]>([]);

  const myOrders = orders.filter(o => o.type === 'my_order');
  const inboxOrders = orders.filter(o => o.type === 'inbox');
  const requestOrders = orders.filter(o => o.type === 'request');

  const suggestions = stock.map(s => s.name);
  const existingCategories = [...new Set(stock.map(s => s.category).filter(Boolean))];
  const existingQualities = [...new Set(stock.map(s => s.quality).filter(Boolean))];

  function applyCase(field: 'name' | 'category' | 'quality') {
    setForm(f => ({ ...f, [field]: toSentenceCase(f[field]) }));
  }

  function addItem(isRequest = false) {
    if (!form.name.trim()) return;
    const stockItem = stock.find(s =>
      s.name.toLowerCase() === form.name.toLowerCase() &&
      (!form.category || s.category.toLowerCase() === form.category.toLowerCase()) &&
      (!form.quality || s.quality.toLowerCase() === form.quality.toLowerCase())
    ) || stock.find(s => s.name.toLowerCase() === form.name.toLowerCase());

    const unitPrice = isRequest ? 0 : (
      form.unitPrice ? parseFloat(form.unitPrice) : (
        stockItem ? (form.priceType === 'wholesale' ? Number(stockItem.wholesale_price) : Number(stockItem.retail_price)) : 0
      )
    );

    setItems(prev => [...prev, {
      item_name: toSentenceCase(form.name.trim()),
      category: toSentenceCase(form.category) || stockItem?.category || '',
      quality: toSentenceCase(form.quality) || stockItem?.quality || '',
      quantity: parseInt(form.quantity) || 1,
      price_type: isRequest ? 'pending' : form.priceType,
      unit_price: unitPrice,
    }]);
    setForm({ name: '', category: '', quality: '', quantity: '1', priceType: 'retail', unitPrice: '' });
  }

  function removeItem(idx: number) { setItems(prev => prev.filter((_, i) => i !== idx)); }
  const grandTotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  async function handleCreateOrder(type: string) {
    if (items.length === 0) return;
    const comment = type === 'request' && requestComment.trim() ? requestComment.trim() : undefined;
    const name = customerName.trim() || (comment ? `Comment: ${comment}` : 'Walk-in Customer');
    await addOrder(
      type, name,
      items.map(item => ({ ...item, subtotal: item.quantity * item.unit_price })),
      grandTotal, type === 'request' ? 'pending' : 'confirmed'
    );
    setItems([]);
    setCustomerName('');
    setRequestComment('');
  }

  function openEditOrder(order: Order) {
    if (order.status === 'completed' || order.transferred_to_sale) return;
    setEditingOrder(order);
    setEditItems([...order.items]);
  }

  async function saveEditOrder() {
    if (!editingOrder) return;
    const newTotal = editItems.reduce((sum, item) => sum + Number(item.subtotal), 0);
    await updateOrder(editingOrder.id, editItems, newTotal);
    setEditingOrder(null);
    setEditItems([]);
  }

  function updateEditItemQty(idx: number, qty: number) {
    setEditItems(prev => prev.map((item, i) => i === idx ? { ...item, quantity: qty, subtotal: qty * Number(item.unit_price) } : item));
  }
  function removeEditItem(idx: number) { setEditItems(prev => prev.filter((_, i) => i !== idx)); }

  function openPricing(order: Order) {
    setPricingOrder(order);
    setPricingItems(order.items.map(item => {
      const stockItem = stock.find(s =>
        s.name.toLowerCase() === item.item_name.toLowerCase() &&
        s.category.toLowerCase() === item.category.toLowerCase() &&
        s.quality.toLowerCase() === item.quality.toLowerCase()
      ) || stock.find(s => s.name.toLowerCase() === item.item_name.toLowerCase());
      const unitPrice = stockItem ? (item.price_type === 'wholesale' ? Number(stockItem.wholesale_price) : Number(stockItem.retail_price)) : Number(item.unit_price);
      return { ...item, unit_price: unitPrice, subtotal: item.quantity * unitPrice, category: stockItem?.category || item.category };
    }));
  }

  function updatePricingItemPrice(idx: number, price: number) {
    setPricingItems(prev => prev.map((item, i) => i === idx ? { ...item, unit_price: price, subtotal: item.quantity * price } : item));
  }

  function removePricingItem(idx: number) { setPricingItems(prev => prev.filter((_, i) => i !== idx)); }

  async function savePricing() {
    if (!pricingOrder) return;
    const newTotal = pricingItems.reduce((sum, item) => sum + Number(item.subtotal), 0);
    await updateOrder(pricingOrder.id, pricingItems, newTotal, 'priced');
    setPricingOrder(null);
    setPricingItems([]);
  }

  function getStockStatus(itemName: string, category: string, quality: string) {
    const stockItem = stock.find(s =>
      s.name.toLowerCase() === itemName.toLowerCase() &&
      s.category.toLowerCase() === category.toLowerCase() &&
      s.quality.toLowerCase() === quality.toLowerCase()
    ) || stock.find(s => s.name.toLowerCase() === itemName.toLowerCase());
    if (!stockItem) return 'not-found';
    if (stockItem.quantity === 0) return 'out-of-stock';
    if (stockItem.quantity <= stockItem.min_stock_level) return 'low';
    return 'ok';
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'pending': return <Clock className="h-3.5 w-3.5 text-warning" />;
      case 'priced': return <CheckCircle className="h-3.5 w-3.5 text-accent" />;
      case 'confirmed': return <CheckCircle className="h-3.5 w-3.5 text-success" />;
      case 'completed': return <CheckCircle className="h-3.5 w-3.5 text-primary" />;
      default: return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  }

  function OrderCard({ order }: { order: Order }) {
    const isRequest = order.type === 'request';
    return (
      <div className="border rounded-lg p-3 space-y-2">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              {getStatusIcon(order.status)}
              <span className="font-medium text-sm">{order.customer_name}</span>
              {order.transferred_to_sale && <span className="text-xs bg-success/10 text-success px-1.5 py-0.5 rounded-full">Sold</span>}
              <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full capitalize">{order.status}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Code: {order.code} · {new Date(order.created_at).toLocaleString()}</p>
          </div>
          <span className="font-bold">{isRequest && order.grand_total === 0 ? 'Price Pending' : fmt(Number(order.grand_total))}</span>
        </div>
        <div className="text-sm text-muted-foreground space-y-1">
          {order.items.map((item, i) => {
            const status = getStockStatus(item.item_name, item.category, item.quality);
            return (
              <div key={i} className="flex justify-between items-start">
                <span className="flex items-start gap-1 flex-wrap">
                  <span>
                    {item.item_name} × {item.quantity}
                    {item.category && <span className="text-xs ml-1">· {item.category}</span>}
                    {item.quality && <span className="text-xs ml-1">· {item.quality}</span>}
                  </span>
                  {status === 'out-of-stock' && <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />}
                  {status === 'not-found' && <AlertTriangle className="h-3 w-3 text-warning shrink-0" />}
                  {status === 'low' && <AlertTriangle className="h-3 w-3 text-warning shrink-0" />}
                </span>
                <span>{isRequest && item.unit_price === 0 ? '—' : fmt(Number(item.subtotal))}</span>
              </div>
            );
          })}
        </div>
        <div className="flex gap-2 pt-1 flex-wrap">
          {!order.transferred_to_sale && order.status !== 'completed' && order.status !== 'cancelled' && (
            <>
              <Button size="sm" variant="outline" onClick={() => openEditOrder(order)}><Pencil className="h-3.5 w-3.5 mr-1" />Edit</Button>
              {order.type === 'inbox' && order.status === 'pending' && (
                <Button size="sm" variant="outline" onClick={() => openPricing(order)}>Tag Prices</Button>
              )}
              {(order.status === 'priced' || order.status === 'confirmed') && (
                <Button size="sm" onClick={() => completeOrderToSale(order.id)}>
                  <CheckCircle className="h-3.5 w-3.5 mr-1" />Complete & Transfer to Sale
                </Button>
              )}
            </>
          )}
          {(order.status === 'completed' || order.transferred_to_sale) && (
            <Button size="sm" variant="ghost" onClick={() => setReceiptOrder(order)}>
              <ReceiptIcon className="h-3.5 w-3.5 mr-1" />Receipt
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Determine if current form is for a request order (to hide pricing fields)
  const [orderMode, setOrderMode] = useState<'my_order' | 'inbox' | 'request'>('my_order');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Orders</h1>

      <Card className="shadow-card">
        <CardContent className="p-4 space-y-4">
          <h2 className="text-base font-semibold">Create Order</h2>

          {/* Order type selector */}
          <div className="flex gap-2">
            {(['my_order', 'inbox', 'request'] as const).map(mode => (
              <Button
                key={mode}
                size="sm"
                variant={orderMode === mode ? 'default' : 'outline'}
                onClick={() => { setOrderMode(mode); setItems([]); }}
              >
                {mode === 'my_order' ? '📋 My Order' : mode === 'inbox' ? '📥 Inbox' : '📨 Request'}
              </Button>
            ))}
          </div>

          {orderMode === 'request' && (
            <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground border border-border">
              <strong>Request Order:</strong> You are ordering without setting prices. The supplier will fill in prices and send back for your approval.
            </div>
          )}

          <div><Label>Customer / Your Name</Label><Input value={customerName} onChange={e => setCustomerName(e.target.value)} onBlur={() => setCustomerName(toSentenceCase(customerName))} placeholder="Name..." /></div>

          {orderMode === 'request' && (
            <div>
              <Label className="flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> Comment (optional)</Label>
              <Textarea value={requestComment} onChange={e => setRequestComment(e.target.value)} placeholder="Add any notes or special requests..." className="min-h-[60px]" />
            </div>
          )}

          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[150px]">
              <Label>Item</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} onBlur={() => applyCase('name')} list="order-suggestions" placeholder="Item name..." />
              <datalist id="order-suggestions">{suggestions.map(s => <option key={s} value={s} />)}</datalist>
            </div>
            <div className="w-28">
              <Label>Category</Label>
              <Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} onBlur={() => applyCase('category')} placeholder="Category..." list="cat-suggestions" />
              <datalist id="cat-suggestions">{existingCategories.map(c => <option key={c} value={c} />)}</datalist>
            </div>
            <div className="w-24">
              <Label>Quality</Label>
              <Input value={form.quality} onChange={e => setForm(f => ({ ...f, quality: e.target.value }))} onBlur={() => applyCase('quality')} placeholder="Quality..." list="qual-suggestions" />
              <datalist id="qual-suggestions">{existingQualities.map(q => <option key={q} value={q} />)}</datalist>
            </div>
            <div className="w-20"><Label>Qty</Label><Input type="number" min="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} /></div>
            {orderMode !== 'request' && (
              <>
                <div className="w-24"><Label>Price</Label><Input type="number" min="0" step="0.01" value={form.unitPrice} onChange={e => setForm(f => ({ ...f, unitPrice: e.target.value }))} placeholder="Auto" /></div>
              </>
            )}
            <Button onClick={() => addItem(orderMode === 'request')} disabled={!form.name.trim()}><Plus className="h-4 w-4 mr-1" />Add</Button>
          </div>

          {items.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead><TableHead>Category</TableHead><TableHead>Quality</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      {orderMode !== 'request' && <TableHead className="text-right">Price</TableHead>}
                      {orderMode !== 'request' && <TableHead className="text-right">Subtotal</TableHead>}
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, i) => {
                      const status = getStockStatus(item.item_name, item.category, item.quality);
                      return (
                        <TableRow key={i}>
                          <TableCell className="font-medium">
                            {item.item_name}
                            {status === 'out-of-stock' && <span className="ml-1 text-xs text-destructive">(Out of Stock)</span>}
                            {status === 'not-found' && <span className="ml-1 text-xs text-warning">(Not in Stock)</span>}
                            {status === 'low' && <span className="ml-1 text-xs text-warning">(Low Stock)</span>}
                          </TableCell>
                          <TableCell>{item.category}</TableCell>
                          <TableCell>{item.quality}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          {orderMode !== 'request' && <TableCell className="text-right">{fmt(item.unit_price)}</TableCell>}
                          {orderMode !== 'request' && <TableCell className="text-right font-semibold">{fmt(item.quantity * item.unit_price)}</TableCell>}
                          <TableCell><Button variant="ghost" size="icon" onClick={() => removeItem(i)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></TableCell>
                        </TableRow>
                      );
                    })}
                    {orderMode !== 'request' && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-right font-bold">Grand Total</TableCell>
                        <TableCell className="text-right font-bold text-lg">{fmt(grandTotal)}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <Button onClick={() => handleCreateOrder(orderMode)} className="w-full">
                {orderMode === 'my_order' && <><FileText className="h-4 w-4 mr-2" />Save My Order — {fmt(grandTotal)}</>}
                {orderMode === 'inbox' && <><Send className="h-4 w-4 mr-2" />Save Inbox Order — {fmt(grandTotal)}</>}
                {orderMode === 'request' && <><Send className="h-4 w-4 mr-2" />Send Request Order ({items.length} items)</>}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

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
          <p className="text-xs text-muted-foreground mb-2">Inbox orders are received for price tagging. Use auto-prices from stock or adjust manually, then send back.</p>
          {inboxOrders.length === 0 ? <p className="text-sm text-muted-foreground">No inbox orders.</p> : inboxOrders.map(o => <OrderCard key={o.id} order={o} />)}
        </TabsContent>
        <TabsContent value="requests" className="space-y-3 mt-4">
          <p className="text-xs text-muted-foreground mb-2">Request orders were sent without prices. Once priced by the supplier, confirm or modify items based on your budget.</p>
          {requestOrders.length === 0 ? <p className="text-sm text-muted-foreground">No requests.</p> : requestOrders.map(o => <OrderCard key={o.id} order={o} />)}
        </TabsContent>
      </Tabs>

      {/* Edit Order Dialog */}
      <Dialog open={!!editingOrder} onOpenChange={o => { if (!o) setEditingOrder(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Order — {editingOrder?.code}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {editItems.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <div className="flex-1">
                  <p className="font-medium">{item.item_name}</p>
                  {(item.category || item.quality) && <p className="text-xs text-muted-foreground">{[item.category, item.quality].filter(Boolean).join(' · ')}</p>}
                </div>
                <Input type="number" min="1" className="w-20" value={item.quantity} onChange={e => updateEditItemQty(i, parseInt(e.target.value) || 1)} />
                <span className="w-20 text-right">{fmt(item.quantity * Number(item.unit_price))}</span>
                <Button variant="ghost" size="icon" onClick={() => removeEditItem(i)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
              </div>
            ))}
            <div className="flex justify-between font-bold pt-2 border-t">
              <span>Total</span><span>{fmt(editItems.reduce((s, i) => s + i.quantity * Number(i.unit_price), 0))}</span>
            </div>
            <Button onClick={saveEditOrder} className="w-full">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pricing Dialog */}
      <Dialog open={!!pricingOrder} onOpenChange={o => { if (!o) setPricingOrder(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Tag Prices — {pricingOrder?.code}</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">Prices are auto-filled from stock. Adjust if needed. Remove out-of-stock items.</p>
          <div className="space-y-3">
            {pricingItems.map((item, i) => {
              const status = getStockStatus(item.item_name, item.category, item.quality);
              return (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <div className="flex-1">
                    <span className="font-medium">{item.item_name}</span>
                    <span className="text-xs text-muted-foreground ml-1">×{item.quantity}</span>
                    {item.category && <span className="text-xs text-muted-foreground ml-1">· {item.category}</span>}
                    {item.quality && <span className="text-xs text-muted-foreground ml-1">· {item.quality}</span>}
                    {status === 'out-of-stock' && <span className="text-xs text-destructive ml-1">(Out of Stock!)</span>}
                    {status === 'not-found' && <span className="text-xs text-warning ml-1">(Not in Stock)</span>}
                    {status === 'low' && <span className="text-xs text-warning ml-1">(Low Stock)</span>}
                  </div>
                  <Input type="number" min="0" step="0.01" className="w-24" value={item.unit_price || ''} onChange={e => updatePricingItemPrice(i, parseFloat(e.target.value) || 0)} placeholder="Price" />
                  <span className="w-20 text-right font-medium">{fmt(item.quantity * Number(item.unit_price))}</span>
                  <Button variant="ghost" size="icon" onClick={() => removePricingItem(i)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              );
            })}
            <div className="flex justify-between font-bold pt-2 border-t">
              <span>Total</span><span>{fmt(pricingItems.reduce((s, i) => s + Number(i.subtotal), 0))}</span>
            </div>
            <Button onClick={savePricing} className="w-full">Confirm Prices & Send Back</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={!!receiptOrder} onOpenChange={o => { if (!o) setReceiptOrder(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Receipt</DialogTitle></DialogHeader>
          {receiptOrder && (
            <Receipt
              items={receiptOrder.items.map(i => ({
                itemName: i.item_name,
                category: i.category,
                quality: i.quality,
                quantity: i.quantity,
                priceType: i.price_type,
                unitPrice: Number(i.unit_price),
                subtotal: Number(i.subtotal),
              }))}
              grandTotal={Number(receiptOrder.grand_total)}
              customerName={receiptOrder.customer_name}
              code={receiptOrder.code}
              date={receiptOrder.created_at}
              type="order"
              businessInfo={currentBusiness ? { name: currentBusiness.name, address: currentBusiness.address, contact: currentBusiness.contact, email: currentBusiness.email } : undefined}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
