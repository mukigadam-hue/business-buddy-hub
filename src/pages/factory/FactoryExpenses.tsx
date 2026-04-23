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

export default function FactoryExpenses() {
  const { t } = useTranslation();
  const { expenses, addExpense, deleteExpense } = useFactory();
  const { fmt } = useCurrency();
  const [form, setForm] = useState({ category: '', description: '', amount: '', recorded_by: '', expense_date: new Date().toISOString().slice(0, 10) });

  const todayExpenses = expenses.filter(e => new Date(e.created_at).toDateString() === new Date().toDateString());
  const prevExpenses = expenses.filter(e => new Date(e.created_at).toDateString() !== new Date().toDateString());
  const [activeTab, setActiveTab] = useState<'today' | 'previous'>('today');

  const todayTotal = todayExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalAll = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  // Group by category
  const categoryTotals: Record<string, number> = {};
  expenses.forEach(e => {
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
            <p className="text-xs text-muted-foreground">Today's Expenses</p>
            <p className="text-xl font-bold text-destructive tabular-nums">{fmt(todayTotal)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Expenses (All Time)</p>
            <p className="text-xl font-bold tabular-nums">{fmt(totalAll)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Category breakdown */}
      {Object.keys(categoryTotals).length > 0 && (
        <Card className="shadow-card">
          <CardContent className="p-4">
            <h2 className="text-sm font-semibold mb-2">Expense Breakdown by Category</h2>
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
          <h2 className="text-base font-semibold mb-3">Record Expense</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category *</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select category..." /></SelectTrigger>
                  <SelectContent position="popper" className="max-h-48 overflow-y-auto">{EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Amount *</Label><Input type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required /></div>
            </div>
            <div><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Details..." /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Recorded By</Label><Input value={form.recorded_by} onChange={e => setForm(f => ({ ...f, recorded_by: e.target.value }))} placeholder="Your name" /></div>
              <div><Label>Date</Label><Input type="date" value={form.expense_date} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))} /></div>
            </div>
            <Button type="submit" className="w-full" disabled={!form.category || !form.amount}>
              <Plus className="h-4 w-4 mr-2" />Record Expense
            </Button>
          </form>
        </CardContent>
      </Card>

      <AdSpace variant="banner" />

      {/* History */}
      <div className="flex gap-2">
        <button onClick={() => setActiveTab('today')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'today' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
          Today ({todayExpenses.length})
        </button>
        <button onClick={() => setActiveTab('previous')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'previous' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
          Previous ({prevExpenses.length})
        </button>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-4">
          {(activeTab === 'today' ? todayExpenses : prevExpenses).length === 0 ? (
            <p className="text-sm text-muted-foreground">No expenses {activeTab === 'today' ? 'today' : 'from previous days'} yet.</p>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {(activeTab === 'today' ? todayExpenses : prevExpenses).map(e => (
                <div key={e.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold bg-muted px-2 py-0.5 rounded-full">{e.category}</span>
                    </div>
                    <p className="text-sm mt-0.5">{e.description || 'No description'}</p>
                    <p className="text-xs text-muted-foreground">{new Date(e.expense_date).toLocaleDateString()} · By: {e.recorded_by}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-destructive tabular-nums">{fmt(Number(e.amount))}</span>
                    <Button variant="ghost" size="icon" onClick={() => deleteExpense(e.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
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
