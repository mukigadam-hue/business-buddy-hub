import { useState } from 'react';
import { useBusiness } from '@/context/BusinessContext';
import { useCurrency } from '@/hooks/useCurrency';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Plus, AlertTriangle, RotateCcw, Package } from 'lucide-react';
import { toast } from 'sonner';
import AdSpace from '@/components/AdSpace';
import { toSentenceCase, toTitleCase } from '@/lib/utils';

const WASTE_TYPES = ['Expired', 'Faulty', 'Returned', 'Damaged', 'Spoiled', 'Other'];

interface WasteRecord {
  id: string;
  item_name: string;
  category: string;
  quantity: number;
  waste_type: string;
  reason: string;
  recorded_by: string;
  date: string;
  value_lost: number;
}

export default function WastePage() {
  const { stock, currentBusiness, expenses, addExpense } = useBusiness();
  const { fmt } = useCurrency();

  const activeStock = stock.filter(s => !s.deleted_at);

  const [wasteRecords, setWasteRecords] = useState<WasteRecord[]>([]);
  const [form, setForm] = useState({
    stock_item_id: '',
    item_name: '',
    category: '',
    quantity: '1',
    waste_type: 'Expired',
    reason: '',
    recorded_by: '',
    date: new Date().toISOString().slice(0, 10),
  });

  // Load waste records from expenses with category 'Waste'
  const wasteExpenses = expenses.filter(e => 
    e.category === 'Waste' || e.category === 'Expired' || e.category === 'Faulty' || 
    e.category === 'Returned' || e.category === 'Damaged' || e.category === 'Spoiled'
  );

  const todayWaste = wasteExpenses.filter(e => new Date(e.expense_date).toDateString() === new Date().toDateString());
  const prevWaste = wasteExpenses.filter(e => new Date(e.expense_date).toDateString() !== new Date().toDateString());
  const [activeTab, setActiveTab] = useState<'today' | 'previous'>('today');

  const totalWasteValue = wasteExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const todayWasteValue = todayWaste.reduce((sum, e) => sum + Number(e.amount), 0);

  // Group by type
  const typeTotals: Record<string, { count: number; value: number }> = {};
  wasteExpenses.forEach(e => {
    const type = e.category;
    if (!typeTotals[type]) typeTotals[type] = { count: 0, value: 0 };
    typeTotals[type].count++;
    typeTotals[type].value += Number(e.amount);
  });

  function selectStockItem(id: string) {
    const item = activeStock.find(s => s.id === id);
    if (item) {
      setForm(f => ({
        ...f,
        stock_item_id: id,
        item_name: item.name,
        category: item.category,
      }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.item_name.trim() || !form.quantity) return;

    const qty = parseInt(form.quantity) || 1;
    const stockItem = activeStock.find(s => s.id === form.stock_item_id);
    const valueLost = stockItem ? qty * Number(stockItem.buying_price || stockItem.retail_price) : 0;

    // Deduct from stock if linked
    if (stockItem && qty > 0) {
      const newQty = Math.max(0, stockItem.quantity - qty);
      await supabase.from('stock_items').update({ quantity: newQty } as any).eq('id', stockItem.id);
    }

    // Record as expense
    await addExpense({
      category: form.waste_type,
      description: `[${form.waste_type}] ${toSentenceCase(form.item_name.trim())}${form.category ? ` (${form.category})` : ''} × ${qty}${form.reason ? ` — ${form.reason}` : ''}`,
      amount: valueLost,
      recorded_by: toTitleCase(form.recorded_by.trim()) || 'Staff',
      expense_date: form.date,
    });

    toast.success(`${form.waste_type} item recorded & deducted from stock`);
    setForm({
      stock_item_id: '', item_name: '', category: '', quantity: '1',
      waste_type: 'Expired', reason: '', recorded_by: '',
      date: new Date().toISOString().slice(0, 10),
    });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <AlertTriangle className="h-6 w-6" /> Waste / Expired / Faulty / Returned
      </h1>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="shadow-card">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Today's Waste</p>
            <p className="text-lg font-bold text-destructive tabular-nums">{fmt(todayWasteValue)}</p>
            <p className="text-[10px] text-muted-foreground">{todayWaste.length} items</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Total Waste Loss</p>
            <p className="text-lg font-bold text-destructive tabular-nums">{fmt(totalWasteValue)}</p>
            <p className="text-[10px] text-muted-foreground">{wasteExpenses.length} records</p>
          </CardContent>
        </Card>
      </div>

      {/* Type breakdown */}
      {Object.keys(typeTotals).length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {Object.entries(typeTotals).map(([type, data]) => (
            <div key={type} className="px-3 py-1.5 rounded-lg bg-destructive/5 border border-destructive/20 text-xs">
              <span className="font-semibold">{type}</span>: {data.count} items · {fmt(data.value)}
            </div>
          ))}
        </div>
      )}

      <AdSpace variant="banner" />

      {/* Record Form */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <h2 className="text-base font-semibold mb-3">Record Waste Item</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Select from Stock</Label>
                <Select value={form.stock_item_id || '__manual__'} onValueChange={v => {
                  if (v === '__manual__') setForm(f => ({ ...f, stock_item_id: '' }));
                  else selectStockItem(v);
                }}>
                  <SelectTrigger><SelectValue placeholder="Choose item..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__manual__">Enter Manually</SelectItem>
                    {activeStock.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}{s.category ? ` · ${s.category}` : ''} (qty: {s.quantity})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Waste Type *</Label>
                <Select value={form.waste_type} onValueChange={v => setForm(f => ({ ...f, waste_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {WASTE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Item Name *</Label>
                <Input value={form.item_name} onChange={e => setForm(f => ({ ...f, item_name: e.target.value }))} 
                  placeholder="Item name" required />
              </div>
              <div>
                <Label>Category</Label>
                <Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Category" />
              </div>
              <div>
                <Label>Quantity *</Label>
                <Input type="number" min="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Reason / Notes</Label>
                <Input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="e.g. Past expiry date..." />
              </div>
              <div>
                <Label>Recorded By</Label>
                <Input value={form.recorded_by} onChange={e => setForm(f => ({ ...f, recorded_by: e.target.value }))} placeholder="Name" />
              </div>
            </div>

            <div>
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>

            <Button type="submit" className="w-full" variant="destructive" disabled={!form.item_name.trim() || !form.quantity}>
              <Trash2 className="h-4 w-4 mr-2" /> Record Waste Item
            </Button>
          </form>
        </CardContent>
      </Card>

      <AdSpace variant="inline" />

      {/* History */}
      <div className="flex gap-2">
        <button onClick={() => setActiveTab('today')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'today' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
          Today ({todayWaste.length})
        </button>
        <button onClick={() => setActiveTab('previous')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'previous' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
          Previous ({prevWaste.length})
        </button>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-4">
          {(activeTab === 'today' ? todayWaste : prevWaste).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No waste records yet.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {(activeTab === 'today' ? todayWaste : prevWaste).map(e => (
                <div key={e.id} className="border rounded-lg p-3 border-destructive/20 bg-destructive/5">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium">{e.description}</p>
                      <p className="text-xs text-muted-foreground">
                        📅 {new Date(e.expense_date).toLocaleDateString()}
                        {e.recorded_by && ` · By: ${e.recorded_by}`}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-destructive bg-destructive/10 px-2 py-0.5 rounded-md tabular-nums">
                      -{fmt(Number(e.amount))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
