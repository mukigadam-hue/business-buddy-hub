import { useState } from 'react';
import { useBusiness } from '@/context/BusinessContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import type { StockItem } from '@/types/business';

const categories = ['Electronics', 'Food & Beverages', 'Clothing', 'Hardware', 'Stationery', 'Cosmetics', 'Other'];
const qualities = ['New', 'Grade A', 'Grade B', 'Grade C', 'Refurbished'];

export default function StockPage() {
  const { data, addStockItem, updateStockItem, deleteStockItem } = useBusiness();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<StockItem | null>(null);
  const [form, setForm] = useState({
    name: '', category: 'Other', quality: 'New',
    wholesalePrice: '', retailPrice: '', quantity: '', minStockLevel: '5',
  });

  const filtered = data.stock.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.category.toLowerCase().includes(search.toLowerCase())
  );

  function resetForm() {
    setForm({ name: '', category: 'Other', quality: 'New', wholesalePrice: '', retailPrice: '', quantity: '', minStockLevel: '5' });
    setEditItem(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const itemData = {
      name: form.name.trim(),
      category: form.category,
      quality: form.quality,
      wholesalePrice: parseFloat(form.wholesalePrice) || 0,
      retailPrice: parseFloat(form.retailPrice) || 0,
      quantity: parseInt(form.quantity) || 0,
      minStockLevel: parseInt(form.minStockLevel) || 5,
    };
    if (editItem) {
      updateStockItem(editItem.id, itemData);
    } else {
      addStockItem(itemData);
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
      wholesalePrice: String(item.wholesalePrice),
      retailPrice: String(item.retailPrice),
      quantity: String(item.quantity),
      minStockLevel: String(item.minStockLevel),
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
            <DialogHeader>
              <DialogTitle>{editItem ? 'Edit Item' : 'Add New Item'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <Label>Item Name</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Quality</Label>
                  <Select value={form.quality} onValueChange={v => setForm(f => ({ ...f, quality: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {qualities.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Wholesale Price</Label>
                  <Input type="number" min="0" step="0.01" value={form.wholesalePrice} onChange={e => setForm(f => ({ ...f, wholesalePrice: e.target.value }))} required />
                </div>
                <div>
                  <Label>Retail Price</Label>
                  <Input type="number" min="0" step="0.01" value={form.retailPrice} onChange={e => setForm(f => ({ ...f, retailPrice: e.target.value }))} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Quantity</Label>
                  <Input type="number" min="0" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} required />
                </div>
                <div>
                  <Label>Min Stock Level</Label>
                  <Input type="number" min="0" value={form.minStockLevel} onChange={e => setForm(f => ({ ...f, minStockLevel: e.target.value }))} />
                </div>
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
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No items found. Add your first stock item.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>{item.quality}</TableCell>
                      <TableCell className="text-right">${item.wholesalePrice.toFixed(2)}</TableCell>
                      <TableCell className="text-right">${item.retailPrice.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-semibold">{item.quantity}</TableCell>
                      <TableCell>
                        {item.quantity === 0 ? (
                          <span className="text-xs font-semibold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">Out</span>
                        ) : item.quantity <= item.minStockLevel ? (
                          <span className="text-xs font-semibold text-warning bg-warning/10 px-2 py-0.5 rounded-full">Low</span>
                        ) : (
                          <span className="text-xs font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full">OK</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteStockItem(item.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
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
