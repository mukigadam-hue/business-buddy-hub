import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFactory } from '@/context/FactoryContext';
import { useCurrency } from '@/hooks/useCurrency';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, Receipt, Flame } from 'lucide-react';
import AdSpace from '@/components/AdSpace';
import RecycleDeleteButton from '@/components/RecycleDeleteButton';

import { toSentenceCase, toTitleCase } from '@/lib/utils';

const EXPENSE_CATEGORIES = [
  'Electricity', 'Water', 'Gas', 'Machinery Repair', 'Building Repair',
  'Lubricants', 'Cleaning Supplies', 'Safety Gear', 'Factory Rent',
  'Property Tax', 'Advertisements', 'Transport Costs',
  'Research & Development', 'Insurance', 'Other',
];

// Waste categories share the expenses table but belong to the Waste module
// — exclude them from the operational expenses view and totals.
const WASTE_CATEGORIES = new Set(['Expired', 'Faulty', 'Returned', 'Damaged', 'Spoiled', 'Waste']);

export default function FactoryExpenses() {
  const { t } = useTranslation();
  const { expenses, addExpense, deleteExpense } = useFactory();
  const { fmt } = useCurrency();
  const [form, setForm] = useState({ category: '', description: '', amount: '', recorded_by: '', expense_date: new Date().toISOString().slice(0, 10) });

  const operationalExpenses = expenses.filter(e => !WASTE_CATEGORIES.has(e.category));
  const todayExpenses = operationalExpenses.filter(e => new Date(e.created_at).toDateString() === new Date().toDateString());
  const prevExpenses = operationalExpenses.filter(e => new Date(e.created_at).toDateString() !== new Date().toDateString());
  const [activeTab, setActiveTab] = useState<'today' | 'previous'>('today');

  const todayTotal = todayExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalAll = operationalExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  // Group by category
  const categoryTotals: Record<string, number> = {};
  operationalExpenses.forEach(e => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + Number(e.amount);
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.category || !form.amount) return;
    await addExpense({
      category: form.category,
      description: toSentenceCase(form.description.trim()),
      amount: parseFloat(form.amount) || 0,
      recorded_by: toTitleCase(form.recorded_by.trim()) || 'Staff',
      expense_date: form.expense_date,
    });
    setForm({ category: '', description: '', amount: '', recorded_by: '', expense_date: new Date().toISOString().slice(0, 10) });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Flame className="h-6 w-6" /> {t('expenses.title')}</h1>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="shadow-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t('factoryUI.todayExpenses')}</p>
            <p className="text-xl font-bold text-destructive tabular-nums">{fmt(todayTotal)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t('expenses.totalAllTime', 'Total Expenses (All Time)')}</p>
            <p className="text-xl font-bold tabular-nums">{fmt(totalAll)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Category breakdown */}
      {Object.keys(categoryTotals).length > 0 && (
        <Card className="shadow-card">
          <CardContent className="p-4">
            <h2 className="text-sm font-semibold mb-2">{t('expenses.breakdownByCategory', 'Expense Breakdown by Category')}</h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              {Object.entries(categoryTotals).sort(([, a], [, b]) => b - a).map(([cat, total]) => (
                <div key={cat} className="p-2 rounded-lg bg-muted/50 border">
                  <p className="text-xs text-muted-foreground">{cat}</p>
                  <p className="text-sm font-bold tabular-nums">{fmt(total)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Expense */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <h2 className="text-base font-semibold mb-3">{t('expenses.recordExpense', 'Record Expense')}</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('factoryUI.category')} *</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue placeholder={t('expenses.selectCategory', 'Select category...')} /></SelectTrigger>
                  <SelectContent position="popper" className="max-h-48 overflow-y-auto">{EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>{t('expenses.amount', 'Amount')} *</Label><Input type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required /></div>
            </div>
            <div><Label>{t('factoryUI.description')}</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder={t('expenses.detailsPh', 'Details...')} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('factoryUI.recordedBy')}</Label><Input value={form.recorded_by} onChange={e => setForm(f => ({ ...f, recorded_by: e.target.value }))} placeholder={t('expenses.yourNamePh', 'Your name')} /></div>
              <div><Label>{t('expenses.date', 'Date')}</Label><Input type="date" value={form.expense_date} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))} /></div>
            </div>
            <Button type="submit" className="w-full" disabled={!form.category || !form.amount}>
              <Plus className="h-4 w-4 mr-2" />{t('expenses.recordExpense', 'Record Expense')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <AdSpace variant="banner" />

      {/* History */}
      <div className="flex gap-2">
        <button onClick={() => setActiveTab('today')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'today' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
          {t('factoryUI.today')} ({todayExpenses.length})
        </button>
        <button onClick={() => setActiveTab('previous')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'previous' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
          {t('factoryUI.previous')} ({prevExpenses.length})
        </button>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-4">
          {(activeTab === 'today' ? todayExpenses : prevExpenses).length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('expenses.noneYet', { defaultValue: 'No expenses {{when}} yet.', when: activeTab === 'today' ? t('factoryUI.today').toLowerCase() : t('expenses.fromPrevious', 'from previous days') })}</p>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {(activeTab === 'today' ? todayExpenses : prevExpenses).map(e => (
                <div key={e.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold bg-muted px-2 py-0.5 rounded-full">{e.category}</span>
                    </div>
                    <p className="text-sm mt-0.5">{e.description || t('expenses.noDescription', 'No description')}</p>
                    <p className="text-xs text-muted-foreground">{new Date(e.expense_date).toLocaleDateString()} · {t('expenses.by', 'By')}: {e.recorded_by}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-destructive tabular-nums">{fmt(Number(e.amount))}</span>
                    <RecycleDeleteButton table="factory_expenses" recordId={e.id} />
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
