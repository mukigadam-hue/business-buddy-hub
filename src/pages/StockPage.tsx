import { useState } from 'react';
import { useBusiness } from '@/context/BusinessContext';
import { useCurrency } from '@/hooks/useCurrency';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import type { StockItem } from '@/context/BusinessContext';

function toSentenceCase(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export default function StockPage() {
  const { stock, addStockItem, updateStockItem, deleteStockItem } = useBusiness();
  const { fmt } = useCurrency();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<StockItem | null>(null);
  const [form, setForm] = useState({
    name: '', category: '', quality: '',
    wholesale_price: '', retail_price: '', quantity: '', min_stock_level: '5',
  });

  const filtered = stock.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.category.toLowerCase().includes(search.toLowerCase())
  );

  const existingCategories = [...new Set(stock.map(s => s.category).filter(Boolean))];

  function resetForm() {
    setForm({ name: '', category: '', quality: '', wholesale_price: '', retail_price: '', quantity: '', min_stock_level: '5' });
    setEditItem(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const itemData = {
      name: toSentenceCase(form.name.trim()),
      category: toSentenceCase(form.category.trim()),
      quality: toSentenceCase(form.quality.trim()),
      wholesale_price: parseFloat(form.wholesale_price) || 0,
      retail_price: parseFloat(form.retail_price) || 0,
      quantity: parseInt(form.quantity) || 0,
      min_stock_level: parseInt(form.min_stock_level) || 5,
    };
    if (editItem) {
      await updateStockItem(editItem.id, itemData);
    } else {
      await addStockItem(itemData);
    }
    resetForm();
    setOpen(false);
  }

  function openEdit(item: StockItem) {
    setEditItem(item);
    setForm({
      name: item.name,
      category: item.category,
      quality: item.quality,
      wholesale_price: String(item.wholesale_price),
      retail_price: String(item.retail_price),
      quantity: String(item.quantity),
      min_stock_level: String(item.min_stock_level),
    });
    setOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Stock</h1>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Item</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editItem ? 'Edit Item' : 'Add New Item'}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <Label>Item Name</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} onBlur={() => setForm(f => ({ ...f, name: toSentenceCase(f.name) }))} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Category</Label>
                  <Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} onBlur={() => setForm(f => ({ ...f, category: toSentenceCase(f.category) }))} placeholder="Type category..." list="stock-cat-suggestions" />
                  <datalist id="stock-cat-suggestions">{existingCategories.map(c => <option key={c} value={c} />)}</datalist>
                </div>
                <div>
                  <Label>Quality</Label>
                  <Input value={form.quality} onChange={e => setForm(f => ({ ...f, quality: e.target.value }))} onBlur={() => setForm(f => ({ ...f, quality: toSentenceCase(f.quality) }))} placeholder="e.g. New, Grade A..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Wholesale Price</Label><Input type="number" min="0" step="0.01" value={form.wholesale_price} onChange={e => setForm(f => ({ ...f, wholesale_price: e.target.value }))} required /></div>
                <div><Label>Retail Price</Label><Input type="number" min="0" step="0.01" value={form.retail_price} onChange={e => setForm(f => ({ ...f, retail_price: e.target.value }))} required /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Quantity</Label><Input type="number" min="0" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} required /></div>
                <div><Label>Min Stock Level</Label><Input type="number" min="0" value={form.min_stock_level} onChange={e => setForm(f => ({ ...f, min_stock_level: e.target.value }))} /></div>
              </div>
              <Button type="submit" className="w-full">{editItem ? 'Update Item' : 'Add Item'}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search items..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card className="shadow-card overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Quality</TableHead>
                  <TableHead className="text-right">Wholesale</TableHead>
                  <TableHead className="text-right">Retail</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No items found. Add your first stock item.</TableCell></TableRow>
                ) : (
                  filtered.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                       <TableCell>{item.category}</TableCell>
                       <TableCell>{item.quality}</TableCell>
                       <TableCell className="text-right">{fmt(Number(item.wholesale_price))}</TableCell>
                       <TableCell className="text-right">{fmt(Number(item.retail_price))}</TableCell>
                       <TableCell className="text-right font-semibold">{item.quantity}</TableCell>
                      <TableCell>
                        {item.quantity === 0 ? (
                          <span className="text-xs font-semibold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">Out</span>
                        ) : item.quantity <= item.min_stock_level ? (
                          <span className="text-xs font-semibold text-warning bg-warning/10 px-2 py-0.5 rounded-full">Low</span>
                        ) : (
                          <span className="text-xs font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full">OK</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteStockItem(item.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
