import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import RecycleDeleteButton from '@/components/RecycleDeleteButton';
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
  const { t } = useTranslation();
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

  // Load waste records from expenses with waste categories — exclude order allocation expenses
  const wasteExpenses = expenses.filter(e => 
    (WASTE_TYPES.includes(e.category) || e.category === 'Waste') &&
    !e.from_order_id
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

    toast.success(`${form.waste_type} ${t('waste.recordedToast')}`);
    setForm({
      stock_item_id: '', item_name: '', category: '', quantity: '1',
      waste_type: 'Expired', reason: '', recorded_by: '',
      date: new Date().toISOString().slice(0, 10),
    });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <AlertTriangle className="h-6 w-6" /> {t('waste.title')}
      </h1>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="shadow-card">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">{t('waste.todayWaste')}</p>
            <p className="text-lg font-bold text-destructive tabular-nums">{fmt(todayWasteValue)}</p>
            <p className="text-[10px] text-muted-foreground">{todayWaste.length} {t('waste.items')}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">{t('waste.totalWasteLoss')}</p>
            <p className="text-lg font-bold text-destructive tabular-nums">{fmt(totalWasteValue)}</p>
            <p className="text-[10px] text-muted-foreground">{wasteExpenses.length} {t('waste.records')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Type breakdown */}
      {Object.keys(typeTotals).length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {Object.entries(typeTotals).map(([type, data]) => (
            <div key={type} className="px-3 py-1.5 rounded-lg bg-destructive/5 border border-destructive/20 text-xs">
              <span className="font-semibold">{t(`waste.${type.toLowerCase()}`, type)}</span>: {data.count} {t('waste.items')} · {fmt(data.value)}
            </div>
          ))}
        </div>
      )}

      <AdSpace variant="banner" />

      {/* Record Form */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <h2 className="text-base font-semibold mb-3">{t('waste.recordWasteItem')}</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('waste.selectFromStock')}</Label>
                <Select value={form.stock_item_id || '__manual__'} onValueChange={v => {
                  if (v === '__manual__') setForm(f => ({ ...f, stock_item_id: '' }));
                  else selectStockItem(v);
                }}>
                  <SelectTrigger><SelectValue placeholder={t('waste.chooseItem')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__manual__">{t('waste.enterManually')}</SelectItem>
                    {activeStock.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}{s.category ? ` · ${s.category}` : ''} ({t('waste.qty')}: {s.quantity})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('waste.wasteType')} *</Label>
                <Select value={form.waste_type} onValueChange={v => setForm(f => ({ ...f, waste_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {WASTE_TYPES.map(tp => <SelectItem key={tp} value={tp}>{t(`waste.${tp.toLowerCase()}`, tp)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>{t('waste.itemName')} *</Label>
                <Input value={form.item_name} onChange={e => setForm(f => ({ ...f, item_name: e.target.value }))} 
                  placeholder={t('waste.itemNamePh')} required />
              </div>
              <div>
                <Label>{t('waste.category')}</Label>
                <Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder={t('waste.category')} />
              </div>
              <div>
                <Label>{t('waste.quantity')} *</Label>
                <Input type="number" min="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('waste.reasonNotes')}</Label>
                <Input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder={t('waste.reasonPh')} />
              </div>
              <div>
                <Label>{t('waste.recordedBy')}</Label>
                <Input value={form.recorded_by} onChange={e => setForm(f => ({ ...f, recorded_by: e.target.value }))} placeholder={t('waste.namePh')} />
              </div>
            </div>

            <div>
              <Label>{t('waste.date')}</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>

            <Button type="submit" className="w-full" variant="destructive" disabled={!form.item_name.trim() || !form.quantity}>
              <Trash2 className="h-4 w-4 mr-2" /> {t('waste.recordWasteBtn')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <AdSpace variant="inline" />

      {/* History */}
      <div className="flex gap-2">
        <button onClick={() => setActiveTab('today')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'today' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
          {t('waste.today')} ({todayWaste.length})
        </button>
        <button onClick={() => setActiveTab('previous')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'previous' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
          {t('waste.previous')} ({prevWaste.length})
        </button>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-4">
          {(activeTab === 'today' ? todayWaste : prevWaste).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{t('waste.noWasteYet')}</p>
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
                        {e.recorded_by && ` · ${t('waste.by')}: ${e.recorded_by}`}
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
