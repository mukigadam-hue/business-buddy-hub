import { useState, useRef, useEffect } from 'react';
import { useBusiness } from '@/context/BusinessContext';
import { useCurrency } from '@/hooks/useCurrency';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Send, CheckCircle, Clock, FileText, Pencil, Receipt as ReceiptIcon, MessageSquare, Smartphone, CreditCard, Upload, ScanLine, Search, Building2, Package, Flame } from 'lucide-react';
import { toast } from 'sonner';
import Receipt from '@/components/Receipt';
import BarcodeScanner from '@/components/BarcodeScanner';
import type { Order, OrderItem } from '@/context/BusinessContext';

function toSentenceCase(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export default function OrdersPage() {
  const { stock, orders, addOrder, updateOrder, completeOrderToSale, saveReceipt, currentBusiness, addStockItem, addExpense, refreshData } = useBusiness();
  const { fmt } = useCurrency();
  const [tab, setTab] = useState('live_orders');
  const [customerName, setCustomerName] = useState('');
  const [sellerName, setSellerName] = useState('');
  const [items, setItems] = useState<{ item_name: string; category: string; quality: string; quantity: number; price_type: string; unit_price: number }[]>([]);
  const [form, setForm] = useState({ name: '', category: '', quality: '', quantity: '1', priceType: 'retail' as string, unitPrice: '' });
  const [requestComment, setRequestComment] = useState('');
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editItems, setEditItems] = useState<OrderItem[]>([]);
  const [editNewItem, setEditNewItem] = useState({ name: '', category: '', quality: '', quantity: '1', price: '' });
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [pricingOrder, setPricingOrder] = useState<Order | null>(null);
  const [pricingItems, setPricingItems] = useState<OrderItem[]>([]);
  const [pricingComment, setPricingComment] = useState('');
  const [completeDialog, setCompleteDialog] = useState<Order | null>(null);
  const [completeBuyer, setCompleteBuyer] = useState('');
  const [completeSeller, setCompleteSeller] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'mobile_money' | 'card'>('mobile_money');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Recipient selection for requests
  const [contacts, setContacts] = useState<{ id: string; contact_business_id: string; nickname: string; business_name?: string; business_code?: string }[]>([]);
  const [recipientMode, setRecipientMode] = useState<'contact' | 'code'>('contact');
  const [selectedContactBusinessId, setSelectedContactBusinessId] = useState<string>('');
  const [recipientCode, setRecipientCode] = useState('');
  const [recipientLookup, setRecipientLookup] = useState<{ id: string; name: string } | null>(null);
  const [lookingUp, setLookingUp] = useState(false);

  // Allocation dialog state
  const [allocateOrder, setAllocateOrder] = useState<Order | null>(null);
  const [allocations, setAllocations] = useState<Record<number, 'stock' | 'expense'>>({});
  const [expenseCategory, setExpenseCategory] = useState<Record<number, string>>({});
  const [allocating, setAllocating] = useState(false);
  const isFactory = currentBusiness?.business_type === 'factory';

  const EXPENSE_CATEGORIES = isFactory
    ? ['Electricity', 'Water', 'Gas', 'Machinery Repair', 'Building Repair', 'Lubricants', 'Cleaning Supplies', 'Safety Gear', 'Factory Rent', 'Transport Costs', 'Insurance', 'Other']
    : ['Rent', 'Electricity', 'Water', 'Internet', 'Cleaning Equipment', 'Food for Workers', 'Transport', 'Repairs & Maintenance', 'Office Supplies', 'Security', 'Other'];

  const liveOrders = orders.filter(o => o.type === 'my_order');
  const inboxOrders = orders.filter(o => o.type === 'inbox');
  const myRequests = orders.filter(o => o.type === 'request');

  const activeStock = stock.filter(s => !s.deleted_at);
  const suggestions = activeStock.map(s => s.name);
  const existingCategories = [...new Set(activeStock.map(s => s.category).filter(Boolean))];
  const existingQualities = [...new Set(activeStock.map(s => s.quality).filter(Boolean))];

  const [scannerOpen, setScannerOpen] = useState(false);
  const [orderMode, setOrderMode] = useState<'my_order' | 'inbox' | 'request'>('my_order');

  // Load contacts for recipient selection
  useEffect(() => {
    if (!currentBusiness) return;
    async function loadContacts() {
      const { data } = await supabase
        .from('business_contacts')
        .select('id, contact_business_id, nickname')
        .eq('business_id', currentBusiness!.id);
      if (data) {
        // Fetch business names for contacts
        const contactIds = data.map(c => c.contact_business_id);
        if (contactIds.length > 0) {
          const { data: bizData } = await supabase
            .from('businesses')
            .select('id, name, business_code')
            .in('id', contactIds);
          const enriched = data.map(c => {
            const biz = bizData?.find(b => b.id === c.contact_business_id);
            return { ...c, business_name: biz?.name || '', business_code: biz?.business_code || '' };
          });
          setContacts(enriched);
        } else {
          setContacts(data.map(c => ({ ...c, business_name: '', business_code: '' })));
        }
      }
    }
    loadContacts();
  }, [currentBusiness]);

  async function lookupRecipientByCode() {
    if (!recipientCode.trim()) return;
    setLookingUp(true);
    try {
      const { data } = await supabase.rpc('lookup_business_by_code', { _code: recipientCode.trim().toUpperCase() });
      if (data && data.length > 0) {
        setRecipientLookup({ id: data[0].id, name: data[0].name });
        toast.success(`Found: ${data[0].name}`);
      } else {
        setRecipientLookup(null);
        toast.error('No business found with that code');
      }
    } finally {
      setLookingUp(false);
    }
  }

  function applyCase(field: 'name' | 'category' | 'quality') {
    setForm(f => ({ ...f, [field]: toSentenceCase(f[field]) }));
  }

  function addItem() {
    if (!form.name.trim()) return;
    const isRequest = orderMode === 'request';
    const stockItem = activeStock.find(s =>
      s.name.toLowerCase() === form.name.toLowerCase() &&
      (!form.category || s.category.toLowerCase() === form.category.toLowerCase()) &&
      (!form.quality || s.quality.toLowerCase() === form.quality.toLowerCase())
    ) || activeStock.find(s => s.name.toLowerCase() === form.name.toLowerCase());

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
      price_type: form.priceType,
      unit_price: unitPrice,
    }]);
    setForm({ name: '', category: '', quality: '', quantity: '1', priceType: 'retail', unitPrice: '' });
  }

  function removeItem(idx: number) { setItems(prev => prev.filter((_, i) => i !== idx)); }
  const grandTotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  async function handleCreateOrder(type: string) {
    if (items.length === 0) return;
    
    // For requests, require a recipient
    let recipientBusinessId: string | undefined;
    if (type === 'request') {
      if (recipientMode === 'contact') {
        if (!selectedContactBusinessId) { toast.error('Please select a recipient business'); return; }
        recipientBusinessId = selectedContactBusinessId;
      } else {
        if (!recipientLookup) { toast.error('Please look up a valid business code first'); return; }
        recipientBusinessId = recipientLookup.id;
      }
      // Don't send to yourself
      if (recipientBusinessId === currentBusiness?.id) { toast.error("You can't send an order to yourself"); return; }
    }

    const comment = type === 'request' && requestComment.trim() ? requestComment.trim() : undefined;
    const name = customerName.trim() || (comment ? `Comment: ${comment}` : 'Walk-in');
    await addOrder(
      type, name,
      items.map(item => ({ ...item, subtotal: item.quantity * item.unit_price })),
      grandTotal, type === 'request' ? 'pending' : 'confirmed',
      recipientBusinessId, comment
    );
    setItems([]);
    setCustomerName('');
    setSellerName('');
    setRequestComment('');
    setSelectedContactBusinessId('');
    setRecipientCode('');
    setRecipientLookup(null);
  }

  function openEditOrder(order: Order) {
    if (order.status === 'completed' || order.transferred_to_sale) return;
    setEditingOrder(order);
    setEditItems([...order.items]);
    setEditNewItem({ name: '', category: '', quality: '', quantity: '1', price: '' });
  }

  async function saveEditOrder() {
    if (!editingOrder) return;
    const newTotal = editItems.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unit_price), 0);
    await updateOrder(editingOrder.id, editItems, newTotal);
    setEditingOrder(null);
    setEditItems([]);
  }

  function updateEditItemQty(idx: number, qty: number) {
    setEditItems(prev => prev.map((item, i) => i === idx ? { ...item, quantity: qty, subtotal: qty * Number(item.unit_price) } : item));
  }
  function updateEditItemPrice(idx: number, price: number) {
    setEditItems(prev => prev.map((item, i) => i === idx ? { ...item, unit_price: price, subtotal: item.quantity * price } : item));
  }
  function removeEditItem(idx: number) { setEditItems(prev => prev.filter((_, i) => i !== idx)); }

  function addEditItem() {
    if (!editNewItem.name.trim()) return;
    const stockItem = activeStock.find(s => s.name.toLowerCase() === editNewItem.name.toLowerCase());
    const price = parseFloat(editNewItem.price) || (stockItem ? Number(stockItem.retail_price) : 0);
    const qty = parseInt(editNewItem.quantity) || 1;
    setEditItems(prev => [...prev, {
      id: '',
      order_id: editingOrder?.id || '',
      item_name: toSentenceCase(editNewItem.name.trim()),
      category: toSentenceCase(editNewItem.category) || stockItem?.category || '',
      quality: toSentenceCase(editNewItem.quality) || stockItem?.quality || '',
      quantity: qty,
      price_type: 'retail',
      unit_price: price,
      subtotal: qty * price,
      created_at: new Date().toISOString(),
    }]);
    setEditNewItem({ name: '', category: '', quality: '', quantity: '1', price: '' });
  }

  // Reject dialog state
  const [rejectComment, setRejectComment] = useState('');
  const [rejectingOrder, setRejectingOrder] = useState<Order | null>(null);
  const [syncing, setSyncing] = useState(false);

  function openPricing(order: Order) {
    setPricingOrder(order);
    setPricingComment('');
    setPricingItems(order.items.map(item => {
      const stockItem = activeStock.find(s =>
        s.name.toLowerCase() === item.item_name.toLowerCase() &&
        s.category.toLowerCase() === item.category.toLowerCase() &&
        s.quality.toLowerCase() === item.quality.toLowerCase()
      ) || activeStock.find(s => s.name.toLowerCase() === item.item_name.toLowerCase());
      const unitPrice = stockItem ? Number(stockItem.retail_price) : Number(item.unit_price);
      return { ...item, unit_price: unitPrice, subtotal: item.quantity * unitPrice };
    }));
  }

  function updatePricingItemPrice(idx: number, price: number) {
    setPricingItems(prev => prev.map((item, i) => i === idx ? { ...item, unit_price: price, subtotal: item.quantity * price } : item));
  }
  function updatePricingItemQty(idx: number, qty: number) {
    setPricingItems(prev => prev.map((item, i) => i === idx ? { ...item, quantity: qty, subtotal: qty * Number(item.unit_price) } : item));
  }
  function removePricingItem(idx: number) { setPricingItems(prev => prev.filter((_, i) => i !== idx)); }

  async function savePricing() {
    if (!pricingOrder) return;
    setSyncing(true);
    try {
      const newTotal = pricingItems.reduce((sum, item) => sum + Number(item.subtotal), 0);
      const itemsPayload = pricingItems.map(item => ({
        item_name: item.item_name,
        category: item.category,
        quality: item.quality,
        quantity: item.quantity,
        price_type: item.price_type,
        unit_price: Number(item.unit_price),
        subtotal: Number(item.subtotal),
      }));

      // Use edge function to sync prices to requester's order
      const res = await supabase.functions.invoke('sync-order-prices', {
        body: {
          inboxOrderId: pricingOrder.id,
          action: 'send_prices',
          items: itemsPayload,
          grandTotal: newTotal,
          comment: pricingComment || '',
        },
      });

      if (res.error || res.data?.error) {
        // Fallback: just update locally if sync fails (e.g. not a B2B order)
        await updateOrder(pricingOrder.id, pricingItems, newTotal, 'priced');
      } else {
        toast.success('Prices sent to buyer for confirmation!');
        await refreshData();
      }
      setPricingOrder(null);
      setPricingItems([]);
      setPricingComment('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save pricing');
    } finally {
      setSyncing(false);
    }
  }

  async function confirmPrices(order: Order) {
    setSyncing(true);
    try {
      const res = await supabase.functions.invoke('sync-order-prices', {
        body: { inboxOrderId: order.id, action: 'confirm_prices' },
      });
      if (res.error || res.data?.error) {
        toast.error(res.data?.error || 'Failed to confirm');
      } else {
        toast.success('Prices confirmed! You can now submit payment.');
        await refreshData();
      }
    } finally {
      setSyncing(false);
    }
  }

  async function rejectPrices(order: Order) {
    setSyncing(true);
    try {
      const res = await supabase.functions.invoke('sync-order-prices', {
        body: { inboxOrderId: order.id, action: 'reject_prices', comment: rejectComment },
      });
      if (res.error || res.data?.error) {
        toast.error(res.data?.error || 'Failed to reject');
      } else {
        toast.success('Prices rejected. Supplier will re-price.');
        setRejectingOrder(null);
        setRejectComment('');
        await refreshData();
      }
    } finally {
      setSyncing(false);
    }
  }

  async function confirmPaymentReceived(order: Order) {
    setSyncing(true);
    try {
      const res = await supabase.functions.invoke('sync-order-prices', {
        body: { inboxOrderId: order.id, action: 'confirm_payment' },
      });
      if (res.error || res.data?.error) {
        toast.error(res.data?.error || 'Failed to confirm payment');
      } else {
        toast.success('Payment confirmed!');
        await refreshData();
      }
    } finally {
      setSyncing(false);
    }
  }

  function getStockStatus(itemName: string, category: string, quality: string) {
    const stockItem = activeStock.find(s =>
      s.name.toLowerCase() === itemName.toLowerCase() &&
      s.category.toLowerCase() === category.toLowerCase() &&
      s.quality.toLowerCase() === quality.toLowerCase()
    ) || activeStock.find(s => s.name.toLowerCase() === itemName.toLowerCase());
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
      case 'paid': return <CheckCircle className="h-3.5 w-3.5 text-success" />;
      case 'payment_submitted': return <Clock className="h-3.5 w-3.5 text-info" />;
      default: return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('File must be under 5MB'); return; }
    setProofFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setProofPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleCompleteOrder() {
    if (!completeDialog || !completeBuyer.trim() || !completeSeller.trim()) return;
    if (paymentMethod === 'mobile_money' && !proofFile) {
      toast.error('Please upload payment proof screenshot');
      return;
    }

    setCompleting(true);
    try {
      let proofUrl: string | null = null;

      // Upload proof if mobile money
      if (paymentMethod === 'mobile_money' && proofFile) {
        const ext = proofFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('payment-proofs')
          .upload(fileName, proofFile);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('payment-proofs')
          .getPublicUrl(fileName);
        proofUrl = urlData.publicUrl;
      }

      // Update order with payment info
      await supabase.from('orders').update({
        payment_method: paymentMethod,
        proof_url: proofUrl,
        status: paymentMethod === 'card' ? 'paid' : 'pending',
      } as any).eq('id', completeDialog.id);

      // Complete order to sale
      await completeOrderToSale(completeDialog.id, toSentenceCase(completeBuyer.trim()), toSentenceCase(completeSeller.trim()));
      
      // Save receipt
      if (currentBusiness) {
        await saveReceipt({
          business_id: currentBusiness.id,
          receipt_type: 'order',
          transaction_id: completeDialog.id,
          buyer_name: toSentenceCase(completeBuyer.trim()),
          seller_name: toSentenceCase(completeSeller.trim()),
          grand_total: completeDialog.grand_total,
          items: completeDialog.items.map(i => ({
            itemName: i.item_name, category: i.category, quality: i.quality,
            quantity: i.quantity, priceType: i.price_type, unitPrice: Number(i.unit_price), subtotal: Number(i.subtotal),
          })),
          business_info: { name: currentBusiness.name, address: currentBusiness.address, contact: currentBusiness.contact, email: currentBusiness.email },
          code: completeDialog.code,
        });
      }

      toast.success(
        paymentMethod === 'mobile_money'
          ? 'Order completed! Payment proof submitted for verification.'
          : 'Order completed and paid!'
      );
      setCompleteDialog(null);
      setCompleteBuyer('');
      setCompleteSeller('');
      setProofFile(null);
      setProofPreview(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete order');
    } finally {
      setCompleting(false);
    }
  }

  function OrderCard({ order, showStockStatus = false }: { order: Order; showStockStatus?: boolean }) {
    const isRequest = order.type === 'request';
    return (
      <div className="border rounded-lg p-3 space-y-2">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {getStatusIcon(order.status)}
              <span className="font-medium text-sm">{order.customer_name}</span>
              {order.transferred_to_sale && <span className="text-xs bg-success/10 text-success px-1.5 py-0.5 rounded-full">Sold</span>}
              <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full capitalize">{order.status}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Code: {order.code} · {new Date(order.created_at).toLocaleString()}</p>
          </div>
          <span className="font-bold tabular-nums text-sm">
            {isRequest && order.grand_total === 0 ? 'Price Pending' : <span className="text-success bg-success/10 px-2 py-0.5 rounded-md">{fmt(Number(order.grand_total))}</span>}
          </span>
        </div>
        <div className="text-sm text-muted-foreground space-y-1 max-h-40 overflow-y-auto">
          {order.items.map((item, i) => {
            const status = showStockStatus ? getStockStatus(item.item_name, item.category, item.quality) : 'ok';
            return (
              <div key={i} className="flex justify-between items-start">
                <span className="flex items-start gap-1 flex-wrap">
                  <span>
                    {item.item_name} × {item.quantity}
                    {item.category && <span className="text-xs ml-1">· {item.category}</span>}
                    {item.quality && <span className="text-xs ml-1">· {item.quality}</span>}
                    {showStockStatus && status === 'out-of-stock' && <span className="text-xs text-destructive ml-1">(Out!)</span>}
                    {showStockStatus && status === 'not-found' && <span className="text-xs text-warning ml-1">(Not in stock)</span>}
                    {showStockStatus && status === 'low' && <span className="text-xs text-warning ml-1">(Low)</span>}
                  </span>
                </span>
                <span className="tabular-nums ml-2">{isRequest && item.unit_price === 0 ? '—' : fmt(Number(item.subtotal))}</span>
              </div>
            );
          })}
        </div>
        <div className="flex gap-2 pt-1 flex-wrap">
          {!order.transferred_to_sale && order.status !== 'completed' && order.status !== 'cancelled' && order.status !== 'paid' && (
            <>
              {/* Edit: only when pending */}
              {order.status === 'pending' && (
                <Button size="sm" variant="outline" onClick={() => openEditOrder(order)}><Pencil className="h-3.5 w-3.5 mr-1" />Edit</Button>
              )}

              {/* INBOX ORDER ACTIONS (Supplier side) */}
              {order.type === 'inbox' && order.status === 'pending' && (
                <Button size="sm" variant="outline" onClick={() => openPricing(order)}>💰 Tag Prices</Button>
              )}
              {order.type === 'inbox' && order.status === 'payment_submitted' && (
                <Button size="sm" className="bg-success hover:bg-success/90 text-success-foreground" onClick={() => confirmPaymentReceived(order)} disabled={syncing}>
                  <CheckCircle className="h-3.5 w-3.5 mr-1" />{syncing ? 'Confirming...' : 'Confirm Payment Received'}
                </Button>
              )}

              {/* REQUEST ORDER ACTIONS (Buyer side) */}
              {order.type === 'request' && order.status === 'priced' && (
                <>
                  <Button size="sm" className="bg-success hover:bg-success/90 text-success-foreground" onClick={() => confirmPrices(order)} disabled={syncing}>
                    <CheckCircle className="h-3.5 w-3.5 mr-1" />{syncing ? 'Confirming...' : 'Confirm Prices'}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => { setRejectingOrder(order); setRejectComment(''); }} disabled={syncing}>
                    🔄 Reject & Re-price
                  </Button>
                </>
              )}
              {order.type === 'request' && order.status === 'confirmed' && (
                <Button size="sm" onClick={() => { setCompleteDialog(order); setCompleteBuyer(order.customer_name); setCompleteSeller(''); }}>
                  <CreditCard className="h-3.5 w-3.5 mr-1" />Submit Payment
                </Button>
              )}

              {/* LIVE ORDER ACTIONS (no B2B) */}
              {order.type === 'my_order' && (order.status === 'confirmed' || order.status === 'priced') && (
                <Button size="sm" onClick={() => { setCompleteDialog(order); setCompleteBuyer(order.customer_name); setCompleteSeller(''); }}>
                  <CheckCircle className="h-3.5 w-3.5 mr-1" />Complete & Give Receipt
                </Button>
              )}
            </>
          )}

          {/* Completed/Paid actions */}
          {(order.status === 'completed' || order.status === 'paid' || order.transferred_to_sale) && (
            <>
              <Button size="sm" variant="ghost" onClick={() => setReceiptOrder(order)}>
                <ReceiptIcon className="h-3.5 w-3.5 mr-1" />Receipt
              </Button>
              {order.type === 'inbox' && (
                <Button size="sm" variant="outline" onClick={() => openAllocateDialog(order)}>
                  <Package className="h-3.5 w-3.5 mr-1" />Allocate Items
                </Button>
              )}
            </>
          )}

          {/* Supplier can complete receipt after payment confirmed */}
          {order.type === 'inbox' && order.status === 'paid' && !order.transferred_to_sale && (
            <Button size="sm" onClick={() => { setCompleteDialog(order); setCompleteBuyer(order.customer_name); setCompleteSeller(''); }}>
              <ReceiptIcon className="h-3.5 w-3.5 mr-1" />Issue Receipt
            </Button>
          )}

          {/* Allocate for confirmed/priced inbox orders */}
          {order.type === 'inbox' && (order.status === 'priced' || order.status === 'confirmed' || order.status === 'payment_submitted') && !order.transferred_to_sale && (
            <Button size="sm" variant="outline" onClick={() => openAllocateDialog(order)}>
              <Package className="h-3.5 w-3.5 mr-1" />Allocate Items
            </Button>
          )}
        </div>
      </div>
    );
  }

  function handleBarcodeScan(code: string) {
    const match = activeStock.find(s => s.barcode && s.barcode === code);
    if (match) {
      setForm(f => ({ ...f, name: match.name, category: match.category, quality: match.quality }));
      toast.success(`Found: ${match.name}`);
    } else {
      toast.error(`No stock item found for barcode: ${code}`);
    }
  }
  function openAllocateDialog(order: Order) {
    setAllocateOrder(order);
    const defaultAllocations: Record<number, 'stock' | 'expense'> = {};
    const defaultCategories: Record<number, string> = {};
    order.items.forEach((_, i) => {
      defaultAllocations[i] = 'stock';
      defaultCategories[i] = 'Other';
    });
    setAllocations(defaultAllocations);
    setExpenseCategory(defaultCategories);
  }

  async function handleAllocateItems() {
    if (!allocateOrder || !currentBusiness) return;
    setAllocating(true);
    try {
      for (let i = 0; i < allocateOrder.items.length; i++) {
        const item = allocateOrder.items[i];
        const target = allocations[i] || 'stock';

        if (target === 'stock') {
          // Add to stock (business stock or factory input stock)
          if (isFactory) {
            await supabase.from('factory_raw_materials').insert({
              business_id: currentBusiness.id,
              name: item.item_name,
              category: item.category || '',
              unit_type: 'Pieces',
              quantity: item.quantity,
              unit_cost: Number(item.unit_price),
              min_stock_level: 5,
              supplier: allocateOrder.customer_name,
            });
          } else {
            // Check if item already exists in stock
            const existing = activeStock.find(s =>
              s.name.toLowerCase() === item.item_name.toLowerCase() &&
              s.category.toLowerCase() === (item.category || '').toLowerCase() &&
              s.quality.toLowerCase() === (item.quality || '').toLowerCase()
            );
            if (existing) {
              await supabase.from('stock_items').update({
                quantity: existing.quantity + item.quantity,
                buying_price: Number(item.unit_price),
              }).eq('id', existing.id);
            } else {
              await supabase.from('stock_items').insert({
                business_id: currentBusiness.id,
                name: item.item_name,
                category: item.category || '',
                quality: item.quality || '',
                buying_price: Number(item.unit_price),
                wholesale_price: Number(item.unit_price),
                retail_price: Number(item.unit_price),
                quantity: item.quantity,
                min_stock_level: 5,
              });
            }
          }
        } else {
          // Record as expense
          const cat = expenseCategory[i] || 'Other';
          if (isFactory) {
            await supabase.from('factory_expenses').insert({
              business_id: currentBusiness.id,
              category: cat,
              description: `${item.item_name} × ${item.quantity} from order ${allocateOrder.code}`,
              amount: Number(item.subtotal),
              recorded_by: allocateOrder.customer_name || 'Order',
              expense_date: new Date().toISOString().slice(0, 10),
              from_order_id: allocateOrder.id,
            });
          } else {
            await addExpense({
              category: cat,
              description: `${item.item_name} × ${item.quantity} from order ${allocateOrder.code}`,
              amount: Number(item.subtotal),
              recorded_by: allocateOrder.customer_name || 'Order',
              expense_date: new Date().toISOString().slice(0, 10),
              from_order_id: allocateOrder.id,
            });
          }
        }
      }
      toast.success('Items allocated successfully!');
      setAllocateOrder(null);
    } catch (err: any) {
      toast.error(err.message || 'Allocation failed');
    } finally {
      setAllocating(false);
    }
  }

  return (
    <div className="space-y-6">
      <BarcodeScanner open={scannerOpen} onOpenChange={setScannerOpen} onScan={handleBarcodeScan} />
      <h1 className="text-2xl font-bold">Orders</h1>

      {/* Tab selector at top */}
      <div className="flex gap-2 flex-wrap">
        {(['my_order', 'inbox', 'request'] as const).map(mode => (
          <Button
            key={mode}
            size="sm"
            variant={orderMode === mode ? 'default' : 'outline'}
            onClick={() => { setOrderMode(mode); setItems([]); setCustomerName(''); }}
          >
            {mode === 'my_order' ? '📋 Live Order' : mode === 'inbox' ? '📥 Inbox' : '📨 My Request'}
          </Button>
        ))}
      </div>

      {/* Input section — only for my_order and request. Inbox only shows list */}
      {(orderMode === 'my_order' || orderMode === 'request') && (
        <Card className="shadow-card">
          <CardContent className="p-4 space-y-4">
            <h2 className="text-base font-semibold">
              {orderMode === 'my_order' ? 'Create Live Order' : 'Send Request Order'}
            </h2>

            {orderMode === 'request' && (
              <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground border">
                <strong>My Request:</strong> You are ordering without setting prices. The supplier will fill in prices and send back for your approval.
              </div>
            )}

            {/* Recipient selector for requests */}
            {orderMode === 'request' && (
              <div className="border rounded-lg p-3 space-y-3">
                <p className="text-xs font-medium flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> Send To (Recipient Business)</p>
                <div className="flex gap-2">
                  <Button size="sm" variant={recipientMode === 'contact' ? 'default' : 'outline'} onClick={() => { setRecipientMode('contact'); setRecipientLookup(null); setRecipientCode(''); }}>
                    From Contacts
                  </Button>
                  <Button size="sm" variant={recipientMode === 'code' ? 'default' : 'outline'} onClick={() => { setRecipientMode('code'); setSelectedContactBusinessId(''); }}>
                    Enter Business Code
                  </Button>
                </div>

                {recipientMode === 'contact' && (
                  <div>
                    {contacts.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No contacts saved. Use a business code instead, or add contacts from the Contacts page.</p>
                    ) : (
                      <Select value={selectedContactBusinessId} onValueChange={setSelectedContactBusinessId}>
                        <SelectTrigger><SelectValue placeholder="Select a contact..." /></SelectTrigger>
                        <SelectContent>
                          {contacts.map(c => (
                            <SelectItem key={c.contact_business_id} value={c.contact_business_id}>
                              {c.nickname || c.business_name} {c.business_code ? `(${c.business_code})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}

                {recipientMode === 'code' && (
                  <div className="flex gap-2">
                    <Input
                      value={recipientCode}
                      onChange={e => { setRecipientCode(e.target.value.toUpperCase()); setRecipientLookup(null); }}
                      placeholder="Enter 8-char business code..."
                      className="flex-1 uppercase"
                      maxLength={8}
                    />
                    <Button size="sm" variant="outline" onClick={lookupRecipientByCode} disabled={lookingUp || recipientCode.length < 3}>
                      <Search className="h-3.5 w-3.5 mr-1" />{lookingUp ? 'Looking...' : 'Find'}
                    </Button>
                  </div>
                )}

                {recipientMode === 'code' && recipientLookup && (
                  <div className="p-2 bg-success/10 border border-success/20 rounded-md text-xs flex items-center gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-success" />
                    <span>Sending to: <strong>{recipientLookup.name}</strong></span>
                  </div>
                )}
              </div>
            )}

            <div><Label>Your Name / Customer Name</Label><Input value={customerName} onChange={e => setCustomerName(e.target.value)} onBlur={() => setCustomerName(toSentenceCase(customerName))} placeholder="Name..." /></div>

            {orderMode === 'request' && (
              <div>
                <Label className="flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> Comment (optional)</Label>
                <Textarea value={requestComment} onChange={e => setRequestComment(e.target.value)} placeholder="Add any notes or special requests..." className="min-h-[60px]" />
              </div>
            )}

            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[150px]">
                <Label>Item</Label>
                <div className="flex gap-1.5">
                  <Input className="flex-1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} onBlur={() => applyCase('name')} list="order-suggestions" placeholder="Item name..." />
                  <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={() => setScannerOpen(true)} title="Scan barcode">
                    <ScanLine className="h-4 w-4" />
                  </Button>
                </div>
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
              <div className="w-28">
                <Label>Price Type</Label>
                <Select value={form.priceType} onValueChange={v => setForm(f => ({ ...f, priceType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="wholesale">Wholesale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {orderMode !== 'request' && (
                <div className="w-24"><Label>Price</Label><Input type="number" min="0" step="0.01" value={form.unitPrice} onChange={e => setForm(f => ({ ...f, unitPrice: e.target.value }))} placeholder="Auto" /></div>
              )}
              <Button onClick={addItem} disabled={!form.name.trim()}><Plus className="h-4 w-4 mr-1" />Add</Button>
            </div>

            {items.length > 0 && (
              <>
                <div className="overflow-x-auto max-h-60 overflow-y-auto">
                  <Table>
                    <TableHeader>
                       <TableRow>
                        <TableHead>Item</TableHead><TableHead>Category</TableHead><TableHead>Quality</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        {orderMode !== 'request' && <TableHead className="text-right">Price</TableHead>}
                        {orderMode !== 'request' && <TableHead className="text-right">Subtotal</TableHead>}
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{item.item_name}</TableCell>
                          <TableCell>{item.category}</TableCell>
                          <TableCell>{item.quality}</TableCell>
                          <TableCell className="capitalize text-xs">{item.price_type}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          {orderMode !== 'request' && <TableCell className="text-right tabular-nums">{fmt(item.unit_price)}</TableCell>}
                          {orderMode !== 'request' && <TableCell className="text-right font-semibold tabular-nums">{fmt(item.quantity * item.unit_price)}</TableCell>}
                          <TableCell><Button variant="ghost" size="icon" onClick={() => removeItem(i)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></TableCell>
                        </TableRow>
                      ))}
                      {orderMode !== 'request' && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-right font-bold">Grand Total</TableCell>
                          <TableCell className="text-right font-bold text-lg text-success tabular-nums">{fmt(grandTotal)}</TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                <Button onClick={() => handleCreateOrder(orderMode)} className="w-full">
                  {orderMode === 'my_order' && <><FileText className="h-4 w-4 mr-2" />Save Live Order — {fmt(grandTotal)}</>}
                  {orderMode === 'request' && <><Send className="h-4 w-4 mr-2" />Send Request ({items.length} items)</>}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Orders Lists */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="live_orders">Live Orders ({liveOrders.length})</TabsTrigger>
          <TabsTrigger value="inbox">Inbox ({inboxOrders.length})</TabsTrigger>
          <TabsTrigger value="my_requests">My Requests ({myRequests.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="live_orders" className="space-y-3 mt-4 max-h-[500px] overflow-y-auto pr-1">
          {liveOrders.length === 0 ? <p className="text-sm text-muted-foreground">No live orders yet.</p> : liveOrders.map(o => <OrderCard key={o.id} order={o} />)}
        </TabsContent>
        <TabsContent value="inbox" className="space-y-3 mt-4">
          <p className="text-xs text-muted-foreground mb-2">Received orders awaiting price tagging. Auto-fill from stock, adjust if needed, then send back.</p>
          <div className="max-h-[500px] overflow-y-auto pr-1 space-y-3">
            {inboxOrders.length === 0 ? <p className="text-sm text-muted-foreground">No inbox orders.</p> : inboxOrders.map(o => <OrderCard key={o.id} order={o} showStockStatus />)}
          </div>
        </TabsContent>
        <TabsContent value="my_requests" className="space-y-3 mt-4 max-h-[500px] overflow-y-auto pr-1">
          <p className="text-xs text-muted-foreground mb-2">Orders sent without prices. Once priced by supplier, confirm or modify based on your budget.</p>
          {myRequests.length === 0 ? <p className="text-sm text-muted-foreground">No requests sent yet.</p> : myRequests.map(o => <OrderCard key={o.id} order={o} />)}
        </TabsContent>
      </Tabs>

      {/* Edit Order Dialog — allows adding items + changing qty/price */}
      <Dialog open={!!editingOrder} onOpenChange={o => { if (!o) setEditingOrder(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Order — {editingOrder?.code}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {editItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm border rounded-lg p-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.item_name}</p>
                    {(item.category || item.quality) && <p className="text-xs text-muted-foreground">{[item.category, item.quality].filter(Boolean).join(' · ')}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs text-muted-foreground">Qty:</span>
                    <Input type="number" min="1" className="w-16 h-7 text-xs" value={item.quantity} onChange={e => updateEditItemQty(i, parseInt(e.target.value) || 1)} />
                    <span className="text-xs text-muted-foreground">@</span>
                    <Input type="number" min="0" step="0.01" className="w-20 h-7 text-xs" value={item.unit_price} onChange={e => updateEditItemPrice(i, parseFloat(e.target.value) || 0)} />
                    <span className="text-xs font-medium w-20 text-right tabular-nums">{fmt(item.quantity * Number(item.unit_price))}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeEditItem(i)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add new item to edit */}
            <div className="border-t pt-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Add Item</p>
              <div className="flex flex-wrap gap-2">
                <Input className="flex-1 min-w-[120px] h-8 text-sm" placeholder="Item name" value={editNewItem.name} onChange={e => setEditNewItem(f => ({ ...f, name: e.target.value }))} list="edit-suggestions" />
                <datalist id="edit-suggestions">{suggestions.map(s => <option key={s} value={s} />)}</datalist>
                <Input className="w-28 h-8 text-sm" placeholder="Category" value={editNewItem.category} onChange={e => setEditNewItem(f => ({ ...f, category: e.target.value }))} />
                <Input className="w-24 h-8 text-sm" placeholder="Quality" value={editNewItem.quality} onChange={e => setEditNewItem(f => ({ ...f, quality: e.target.value }))} />
                <Input type="number" min="1" className="w-16 h-8 text-sm" placeholder="Qty" value={editNewItem.quantity} onChange={e => setEditNewItem(f => ({ ...f, quantity: e.target.value }))} />
                <Input type="number" min="0" step="0.01" className="w-24 h-8 text-sm" placeholder="Price" value={editNewItem.price} onChange={e => setEditNewItem(f => ({ ...f, price: e.target.value }))} />
                <Button size="sm" variant="outline" onClick={addEditItem} disabled={!editNewItem.name.trim()}><Plus className="h-3 w-3" /></Button>
              </div>
            </div>

            <div className="flex justify-between font-bold pt-2 border-t">
              <span>Total</span>
              <span className="text-success tabular-nums">{fmt(editItems.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0))}</span>
            </div>
            <Button onClick={saveEditOrder} className="w-full">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pricing Dialog for Inbox */}
      <Dialog open={!!pricingOrder} onOpenChange={o => { if (!o) setPricingOrder(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Tag Prices — {pricingOrder?.code}</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">Prices auto-filled from your stock. Adjust if needed. Remove out-of-stock items.</p>
          <div className="space-y-3">
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {pricingItems.map((item, i) => {
                const status = getStockStatus(item.item_name, item.category, item.quality);
                return (
                  <div key={i} className="flex items-center gap-2 text-sm border rounded-lg p-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.item_name} ×{item.quantity}</p>
                      {item.category && <span className="text-xs text-muted-foreground">· {item.category}</span>}
                      {item.quality && <span className="text-xs text-muted-foreground ml-1">· {item.quality}</span>}
                      {status === 'out-of-stock' && <span className="text-xs text-destructive ml-1">(Out of Stock!)</span>}
                      {status === 'not-found' && <span className="text-xs text-warning ml-1">(Not in Stock)</span>}
                      {status === 'low' && <span className="text-xs text-warning ml-1">(Low)</span>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Input type="number" min="1" className="w-16 h-7 text-xs" value={item.quantity} onChange={e => updatePricingItemQty(i, parseInt(e.target.value) || 1)} />
                      <Input type="number" min="0" step="0.01" className="w-24 h-7 text-xs" value={item.unit_price || ''} onChange={e => updatePricingItemPrice(i, parseFloat(e.target.value) || 0)} placeholder="Price" />
                      <span className="text-xs font-medium w-20 text-right tabular-nums">{fmt(item.quantity * Number(item.unit_price))}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removePricingItem(i)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div>
              <Label className="flex items-center gap-1 text-xs"><MessageSquare className="h-3 w-3" /> Supplier Comment (optional)</Label>
              <Textarea value={pricingComment} onChange={e => setPricingComment(e.target.value)} placeholder="Add a note for the customer e.g. some items out of stock..." className="min-h-[60px] text-sm" />
            </div>
            <div className="flex justify-between font-bold pt-2 border-t">
              <span>Total</span><span className="text-success tabular-nums">{fmt(pricingItems.reduce((s, i) => s + Number(i.subtotal), 0))}</span>
            </div>
            <Button onClick={savePricing} className="w-full">Confirm Prices & Send Back</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Complete Order Dialog with Payment */}
      <Dialog open={!!completeDialog} onOpenChange={o => { if (!o) { setCompleteDialog(null); setProofFile(null); setProofPreview(null); } }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Complete Order & Pay</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">Finalize the agreed order, select payment method, and issue receipt.</p>
          
          {completeDialog && (
            <div className="space-y-4">
              {/* Order summary */}
              <div className="p-3 bg-muted/40 rounded-lg border space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Order</span>
                  <span className="font-mono font-semibold">{completeDialog.code}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Items</span>
                  <span>{completeDialog.items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-success text-lg">{fmt(Number(completeDialog.grand_total))}</span>
                </div>
              </div>

              {/* Names */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-destructive">Buyer Name *</Label>
                  <Input value={completeBuyer} onChange={e => setCompleteBuyer(e.target.value)} onBlur={() => setCompleteBuyer(toSentenceCase(completeBuyer))} placeholder="Customer name" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-destructive">Seller Name *</Label>
                  <Input value={completeSeller} onChange={e => setCompleteSeller(e.target.value)} onBlur={() => setCompleteSeller(toSentenceCase(completeSeller))} placeholder="Your name" />
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <Label className="text-xs font-semibold mb-2 block">Payment Method</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPaymentMethod('mobile_money')}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-left ${
                      paymentMethod === 'mobile_money'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/30'
                    }`}
                  >
                    <Smartphone className="h-5 w-5 text-success shrink-0" />
                    <div>
                      <p className="font-semibold text-xs">Mobile Money</p>
                      <p className="text-[10px] text-muted-foreground">Upload proof</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('card')}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-left ${
                      paymentMethod === 'card'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/30'
                    }`}
                  >
                    <CreditCard className="h-5 w-5 text-info shrink-0" />
                    <div>
                      <p className="font-semibold text-xs">Card / Cash</p>
                      <p className="text-[10px] text-muted-foreground">Paid directly</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Mobile Money proof upload */}
              {paymentMethod === 'mobile_money' && (
                <div className="space-y-2 p-3 bg-muted/40 rounded-lg border">
                  <div>
                    <p className="text-xs font-medium">📱 Send payment to:</p>
                    <p className="text-xs text-muted-foreground">
                      {currentBusiness?.contact || 'Contact in settings'} — <span className="font-semibold">{currentBusiness?.name}</span>
                    </p>
                    <p className="text-base font-bold text-success mt-1">{fmt(Number(completeDialog.grand_total))}</p>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-destructive">Upload Payment Screenshot *</Label>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-1 border-2 border-dashed rounded-lg p-3 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    >
                      {proofPreview ? (
                        <img src={proofPreview} alt="Payment proof" className="max-h-32 mx-auto rounded-lg" />
                      ) : (
                        <div className="space-y-1">
                          <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">Tap to upload screenshot</p>
                        </div>
                      )}
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                    {proofFile && <p className="text-xs text-success mt-1">✓ {proofFile.name}</p>}
                  </div>
                </div>
              )}

              {paymentMethod === 'card' && (
                <div className="p-3 bg-info/5 rounded-lg border border-info/20">
                  <p className="text-xs text-muted-foreground">
                    💳 Confirm that card/cash payment of <span className="font-bold text-foreground">{fmt(Number(completeDialog.grand_total))}</span> has been received before completing.
                  </p>
                </div>
              )}

              <Button
                className="w-full h-11"
                disabled={completing || !completeBuyer.trim() || !completeSeller.trim() || (paymentMethod === 'mobile_money' && !proofFile)}
                onClick={handleCompleteOrder}
              >
                {completing ? 'Processing...' : (
                  <><CheckCircle className="h-4 w-4 mr-2" />Complete Order — {fmt(Number(completeDialog.grand_total))}</>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={!!receiptOrder} onOpenChange={o => { if (!o) setReceiptOrder(null); }}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Receipt</DialogTitle></DialogHeader>
          {receiptOrder && (
            <Receipt
              items={receiptOrder.items.map(i => ({
                itemName: i.item_name, category: i.category, quality: i.quality,
                quantity: i.quantity, priceType: i.price_type, unitPrice: Number(i.unit_price), subtotal: Number(i.subtotal),
              }))}
              grandTotal={Number(receiptOrder.grand_total)}
              buyerName={receiptOrder.customer_name}
              code={receiptOrder.code}
              date={receiptOrder.created_at}
              type="order"
              businessInfo={currentBusiness ? { name: currentBusiness.name, address: currentBusiness.address, contact: currentBusiness.contact, email: currentBusiness.email } : undefined}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Allocate Items Dialog */}
      <Dialog open={!!allocateOrder} onOpenChange={o => { if (!o) setAllocateOrder(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Allocate Order Items — {allocateOrder?.code}</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">
            Choose where each item goes: <strong>{isFactory ? 'Input Stock' : 'Stock'}</strong> or <strong>Expenses</strong>.
          </p>
          {allocateOrder && (
            <div className="space-y-3">
              {allocateOrder.items.map((item, i) => (
                <div key={i} className="border rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">{item.item_name} × {item.quantity}</p>
                      <p className="text-xs text-muted-foreground">{[item.category, item.quality].filter(Boolean).join(' · ')} — {fmt(Number(item.subtotal))}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAllocations(prev => ({ ...prev, [i]: 'stock' }))}
                      className={`flex-1 flex items-center justify-center gap-1.5 p-2 rounded-lg border-2 text-xs font-medium transition-all ${
                        allocations[i] === 'stock' ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-muted-foreground/30'
                      }`}
                    >
                      <Package className="h-3.5 w-3.5" />
                      {isFactory ? 'Input Stock' : 'Stock'}
                    </button>
                    <button
                      onClick={() => setAllocations(prev => ({ ...prev, [i]: 'expense' }))}
                      className={`flex-1 flex items-center justify-center gap-1.5 p-2 rounded-lg border-2 text-xs font-medium transition-all ${
                        allocations[i] === 'expense' ? 'border-destructive bg-destructive/10 text-destructive' : 'border-border hover:border-muted-foreground/30'
                      }`}
                    >
                      <Flame className="h-3.5 w-3.5" />
                      Expense
                    </button>
                  </div>
                  {allocations[i] === 'expense' && (
                    <Select value={expenseCategory[i] || 'Other'} onValueChange={v => setExpenseCategory(prev => ({ ...prev, [i]: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Expense category..." /></SelectTrigger>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              ))}

              <div className="border-t pt-3 space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>→ {isFactory ? 'Input Stock' : 'Stock'}: {Object.values(allocations).filter(v => v === 'stock').length} items</span>
                  <span>→ Expenses: {Object.values(allocations).filter(v => v === 'expense').length} items</span>
                </div>
              </div>

              <Button onClick={handleAllocateItems} className="w-full" disabled={allocating}>
                {allocating ? 'Allocating...' : <><CheckCircle className="h-4 w-4 mr-2" />Confirm Allocation</>}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
