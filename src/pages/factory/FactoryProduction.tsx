import { useState } from 'react';
import { useFactory } from '@/context/FactoryContext';
import { useBusiness } from '@/context/BusinessContext';
import { useCurrency } from '@/hooks/useCurrency';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Factory, AlertTriangle } from 'lucide-react';
import AdSpace from '@/components/AdSpace';

function toSentenceCase(str: string) { return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : str; }

const WASTE_UNITS = ['Pieces', 'Kilograms', 'Litres', 'Metres', 'Tonnes', 'Rolls'];

export default function FactoryProduction() {
  const { rawMaterials, production, addProduction, updateRawMaterial, refreshFactory } = useFactory();
  const { stock, addStockItem, updateStockItem } = useBusiness();
  const { fmt } = useCurrency();

  const activeRM = rawMaterials.filter(r => !r.deleted_at);
  const activeProducts = stock.filter(s => !s.deleted_at);

  const generateBatchNumber = () => {
    const date = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `B${date}-${rand}`;
  };

  const [form, setForm] = useState({
    product_name: '', product_stock_id: '', quantity_produced: '',
    waste_quantity: '0', waste_unit: 'Pieces',
    production_date: new Date().toISOString().slice(0, 10),
    expiry_date: '',
    recorded_by: '', notes: '', batch_number: generateBatchNumber(),
  });

  // Materials used in this production
  const [materialsUsed, setMaterialsUsed] = useState<{ material_id: string; name: string; quantity: number; unit_type: string }[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [materialQty, setMaterialQty] = useState('1');

  function addMaterial() {
    const mat = activeRM.find(r => r.id === selectedMaterial);
    if (!mat) return;
    const qty = parseFloat(materialQty) || 1;
    setMaterialsUsed(prev => [...prev, { material_id: mat.id, name: mat.name, quantity: qty, unit_type: mat.unit_type }]);
    setSelectedMaterial(''); setMaterialQty('1');
  }

  function removeMaterial(idx: number) { setMaterialsUsed(prev => prev.filter((_, i) => i !== idx)); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.product_name.trim() || !form.quantity_produced) return;

    const qtyProduced = parseInt(form.quantity_produced) || 0;

    // Deduct materials from raw materials stock
    for (const mat of materialsUsed) {
      const rm = activeRM.find(r => r.id === mat.material_id);
      if (rm) {
        await updateRawMaterial(rm.id, { quantity: Math.max(0, Number(rm.quantity) - mat.quantity) });
      }
    }

    // Add to product stock
    if (form.product_stock_id) {
      const existing = activeProducts.find(p => p.id === form.product_stock_id);
      if (existing) {
        await updateStockItem(existing.id, { quantity: existing.quantity + qtyProduced });
      }
    } else {
      // Create new product in stock
      await addStockItem({
        name: toSentenceCase(form.product_name.trim()),
        category: '', quality: '',
        quantity: qtyProduced,
        buying_price: 0, wholesale_price: 0, retail_price: 0,
        min_stock_level: 5, barcode: '',
        image_url_1: '', image_url_2: '', image_url_3: '',
      });
    }

    // Record production
    await addProduction({
      product_name: toSentenceCase(form.product_name.trim()),
      product_stock_id: form.product_stock_id || null,
      quantity_produced: qtyProduced,
      materials_used: materialsUsed,
      waste_quantity: parseFloat(form.waste_quantity) || 0,
      waste_unit: form.waste_unit,
      production_date: form.production_date,
      expiry_date: form.expiry_date || null,
      recorded_by: toSentenceCase(form.recorded_by.trim()) || 'Staff',
      notes: form.notes.trim(),
      batch_number: form.batch_number.trim(),
    });

    setForm({
      product_name: '', product_stock_id: '', quantity_produced: '',
      waste_quantity: '0', waste_unit: 'Pieces',
      production_date: new Date().toISOString().slice(0, 10),
      expiry_date: '', recorded_by: '', notes: '', batch_number: generateBatchNumber(),
    });
    setMaterialsUsed([]);
    refreshFactory();
  }

  // Expired products alert
  const today = new Date().toISOString().slice(0, 10);
  const expiringSoon = production.filter(p => p.expiry_date && p.expiry_date <= today);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Factory className="h-6 w-6" /> Production</h1>

      {expiringSoon.length > 0 && (
        <Card className="shadow-card border-warning/30">
          <CardContent className="p-4">
            <h2 className="text-sm font-semibold text-warning flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4" /> Expired or Expiring Products ({expiringSoon.length})
            </h2>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {expiringSoon.map(p => (
                <div key={p.id} className="flex justify-between text-sm p-1.5 rounded bg-warning/5">
                  <span>{p.product_name} — {p.quantity_produced} units</span>
                  <span className="text-xs text-warning font-semibold">Exp: {new Date(p.expiry_date!).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-card">
        <CardContent className="p-4">
          <h2 className="text-base font-semibold mb-3">Record Production</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Product Name *</Label>
                <Input value={form.product_name} onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))}
                  placeholder="Product name" list="product-suggestions" required />
                <datalist id="product-suggestions">{activeProducts.map(p => <option key={p.id} value={p.name} />)}</datalist>
              </div>
              <div>
                <Label>Link to Existing Product</Label>
                <Select value={form.product_stock_id || '__new__'} onValueChange={v => setForm(f => ({ ...f, product_stock_id: v === '__new__' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Optional..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__new__">New Product</SelectItem>
                    {activeProducts.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div><Label>Qty Produced *</Label><Input type="number" min="1" value={form.quantity_produced} onChange={e => setForm(f => ({ ...f, quantity_produced: e.target.value }))} required /></div>
              <div><Label>Waste Qty</Label><Input type="number" min="0" step="0.01" value={form.waste_quantity} onChange={e => setForm(f => ({ ...f, waste_quantity: e.target.value }))} /></div>
              <div>
                <Label>Waste Unit</Label>
                <Select value={form.waste_unit} onValueChange={v => setForm(f => ({ ...f, waste_unit: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{WASTE_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Recorded By</Label><Input value={form.recorded_by} onChange={e => setForm(f => ({ ...f, recorded_by: e.target.value }))} placeholder="Name" /></div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div><Label>Batch Number *</Label><Input value={form.batch_number} onChange={e => setForm(f => ({ ...f, batch_number: e.target.value }))} placeholder="B240308-XK2A" required /></div>
              <div><Label>Production Date *</Label><Input type="date" value={form.production_date} onChange={e => setForm(f => ({ ...f, production_date: e.target.value }))} required /></div>
              <div><Label>Expiry Date</Label><Input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} /></div>
            </div>

            {/* Materials Used */}
            <div className="border rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Materials Used</p>
              <div className="flex flex-wrap gap-2 items-end">
                <div className="flex-1 min-w-[180px]">
                  <Label className="text-xs">Material</Label>
                  <Select value={selectedMaterial} onValueChange={setSelectedMaterial}>
                    <SelectTrigger><SelectValue placeholder="Choose material..." /></SelectTrigger>
                    <SelectContent>
                      {activeRM.filter(r => Number(r.quantity) > 0).map(r => (
                        <SelectItem key={r.id} value={r.id}>{r.name} ({r.quantity} {r.unit_type})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-20"><Label className="text-xs">Qty</Label><Input type="number" min="0.01" step="0.01" value={materialQty} onChange={e => setMaterialQty(e.target.value)} /></div>
                <Button type="button" size="sm" variant="outline" onClick={addMaterial} disabled={!selectedMaterial}><Plus className="h-3.5 w-3.5 mr-1" />Add</Button>
              </div>
              {materialsUsed.length > 0 && (
                <div className="space-y-1 mt-2">
                  {materialsUsed.map((m, i) => (
                    <div key={i} className="flex items-center justify-between text-sm bg-muted/30 rounded px-2 py-1">
                      <span>{m.name} × {m.quantity} {m.unit_type}</span>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeMaterial(i)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any notes..." /></div>

            <Button type="submit" className="w-full" disabled={!form.product_name.trim() || !form.quantity_produced}>
              <Factory className="h-4 w-4 mr-2" />Record Production
            </Button>
          </form>
        </CardContent>
      </Card>

      <AdSpace variant="banner" />

      {/* Production History */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <h2 className="text-base font-semibold mb-3">Production History</h2>
          {production.length === 0 ? (
            <p className="text-sm text-muted-foreground">No production records yet.</p>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {production.map(p => (
                <div key={p.id} className="border rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{p.product_name}</p>
                        {p.batch_number && (
                          <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                            {p.batch_number}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        📅 Produced: {new Date(p.production_date).toLocaleDateString()}
                        {p.expiry_date && ` · Expires: ${new Date(p.expiry_date).toLocaleDateString()}`}
                      </p>
                      {p.notes && <p className="text-xs text-muted-foreground mt-0.5">{p.notes}</p>}
                      {Array.isArray(p.materials_used) && p.materials_used.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Materials: {p.materials_used.map((m: any) => `${m.name} ×${m.quantity}`).join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md">{p.quantity_produced} produced</span>
                      {Number(p.waste_quantity) > 0 && (
                        <p className="text-xs text-warning mt-1">Waste: {p.waste_quantity} {p.waste_unit}</p>
                      )}
                    </div>
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
