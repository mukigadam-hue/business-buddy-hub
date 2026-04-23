import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFactory } from '@/context/FactoryContext';
import { useCurrency } from '@/hooks/useCurrency';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit2, Trash2, Package } from 'lucide-react';
import { toast } from 'sonner';
import AdSpace from '@/components/AdSpace';
import BulkPackagingInfo, { BulkPackagingFields } from '@/components/BulkPackagingInfo';
import RecycleDeleteButton from '@/components/RecycleDeleteButton';

import { toSentenceCase, toTitleCase } from '@/lib/utils';

const UNIT_TYPES = ['Pieces', 'Kilograms', 'Litres', 'Metres', 'Tonnes', 'Rolls', 'Bags', 'Boxes', 'Pairs', 'Sets', 'Bundles', 'Gallons'];
const CATEGORIES = ['Chemicals', 'Fabrics', 'Metals', 'Plastics', 'Wood', 'Electronics', 'Agricultural', 'Packaging', 'Other'];

export default function FactoryInputStock() {
  const { t } = useTranslation();
  const { rawMaterials, addRawMaterial, updateRawMaterial, deleteRawMaterial } = useFactory();
  const { fmt } = useCurrency();
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', category: '', unit_type: 'Pieces', quantity: '', unit_cost: '', min_stock_level: '5', supplier: '', pieces_per_carton: '0', cartons_per_box: '0', boxes_per_container: '0' });

  const active = rawMaterials.filter(r => !r.deleted_at);
  const existingCategories = [...new Set(active.map(r => r.category).filter(Boolean))];
  const allCategories = [...new Set([...CATEGORIES, ...existingCategories])];

  function resetForm() {
    setForm({ name: '', category: '', unit_type: 'Pieces', quantity: '', unit_cost: '', min_stock_level: '5', supplier: '', pieces_per_carton: '0', cartons_per_box: '0', boxes_per_container: '0' });
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    await addRawMaterial({
      name: toSentenceCase(form.name.trim()),
      category: toSentenceCase(form.category.trim()),
      unit_type: form.unit_type,
      quantity: parseFloat(form.quantity) || 0,
      unit_cost: parseFloat(form.unit_cost) || 0,
      min_stock_level: parseFloat(form.min_stock_level) || 5,
      supplier: toTitleCase(form.supplier.trim()),
      pieces_per_carton: parseInt(form.pieces_per_carton) || 0,
      cartons_per_box: parseInt(form.cartons_per_box) || 0,
      boxes_per_container: parseInt(form.boxes_per_container) || 0,
    } as any);
    resetForm();
    setShowAdd(false);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editItem) return;
    await updateRawMaterial(editItem, {
      name: toSentenceCase(form.name.trim()),
      category: toSentenceCase(form.category.trim()),
      unit_type: form.unit_type,
      quantity: parseFloat(form.quantity) || 0,
      unit_cost: parseFloat(form.unit_cost) || 0,
      min_stock_level: parseFloat(form.min_stock_level) || 5,
      supplier: toTitleCase(form.supplier.trim()),
      pieces_per_carton: parseInt(form.pieces_per_carton) || 0,
      cartons_per_box: parseInt(form.cartons_per_box) || 0,
      boxes_per_container: parseInt(form.boxes_per_container) || 0,
    } as any);
    resetForm();
    setEditItem(null);
  }

  function openEdit(r: typeof active[0]) {
    setForm({
      name: r.name, category: r.category, unit_type: r.unit_type,
      quantity: String(r.quantity), unit_cost: String(r.unit_cost),
      min_stock_level: String(r.min_stock_level), supplier: r.supplier,
      pieces_per_carton: String((r as any).pieces_per_carton || 0),
      cartons_per_box: String((r as any).cartons_per_box || 0),
      boxes_per_container: String((r as any).boxes_per_container || 0),
    });
    setEditItem(r.id);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Package className="h-6 w-6" /> {t('factory.inputStock')}</h1>
        <Button onClick={() => { resetForm(); setShowAdd(true); }}><Plus className="h-4 w-4 mr-1" />{t('factoryUI.addMaterial')}</Button>
      </div>

      <AdSpace variant="banner" />

      <Card className="shadow-card">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground mb-3">{t('factoryUI.rawMaterialsInputs')} — {active.length} {t('factoryUI.items')}</p>
          {active.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t('factoryUI.noRawMaterials')}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('factoryUI.material')}</TableHead>
                    <TableHead>{t('factoryUI.category')}</TableHead>
                    <TableHead>{t('factoryUI.unitType')}</TableHead>
                    <TableHead className="text-right">{t('factoryUI.quantity')}</TableHead>
                    <TableHead className="text-right">{t('factoryUI.unitCost')}</TableHead>
                    <TableHead className="text-right">{t('factoryUI.totalValue')}</TableHead>
                    <TableHead>{t('factoryUI.supplier')}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {active.map(r => {
                    const isLow = Number(r.quantity) > 0 && Number(r.quantity) <= Number(r.min_stock_level);
                    const isOut = Number(r.quantity) === 0;
                    return (
                      <TableRow key={r.id} className={isOut ? 'bg-destructive/5' : isLow ? 'bg-warning/5' : ''}>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell>{r.category}</TableCell>
                        <TableCell className="capitalize">{r.unit_type}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          <div>{r.quantity}</div>
                          {isOut && <span className="text-xs text-destructive font-semibold">{t('factoryUI.out')}</span>}
                          {isLow && <span className="text-xs text-warning font-semibold">{t('factoryUI.low')}</span>}
                          <BulkPackagingInfo
                            quantity={Number(r.quantity)}
                            piecesPerCarton={(r as any).pieces_per_carton || 0}
                            cartonsPerBox={(r as any).cartons_per_box || 0}
                            boxesPerContainer={(r as any).boxes_per_container || 0}
                            compact
                          />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{fmt(Number(r.unit_cost))}</TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">{fmt(Number(r.quantity) * Number(r.unit_cost))}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.supplier}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Edit2 className="h-3.5 w-3.5" /></Button>
                            <RecycleDeleteButton table="factory_raw_materials" recordId={r.id} />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showAdd || !!editItem} onOpenChange={o => { if (!o) { setShowAdd(false); setEditItem(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editItem ? t('factoryUI.editMaterial') : t('factoryUI.addRawMaterial')}</DialogTitle></DialogHeader>
          <form onSubmit={editItem ? handleEdit : handleAdd} className="space-y-3">
            <div><Label>{t('factoryUI.materialName')} *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('factoryUI.category')}</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue placeholder={t('factoryUI.selectPh')} /></SelectTrigger>
                  <SelectContent>
                    {allCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('factoryUI.unitType')}</Label>
                <Select value={form.unit_type} onValueChange={v => setForm(f => ({ ...f, unit_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNIT_TYPES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <BulkPackagingFields
              piecesPerCarton={form.pieces_per_carton}
              cartonsPerBox={form.cartons_per_box}
              boxesPerContainer={form.boxes_per_container}
              onChange={(field, value) => setForm(f => ({ ...f, [field]: value }))}
              onQuantityCalculated={(total) => setForm(f => ({ ...f, quantity: String(total) }))}
              currentQuantity={form.quantity}
            />
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>{t('factoryUI.quantity')}</Label>
                <Input type="number" min="0" step="0.01" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                  readOnly={parseInt(form.pieces_per_carton) > 0}
                  className={parseInt(form.pieces_per_carton) > 0 ? 'bg-muted cursor-not-allowed' : ''} />
                {parseInt(form.pieces_per_carton) > 0 && <p className="text-[10px] text-muted-foreground mt-0.5">{t('factoryUI.autoCalcFromBulk')}</p>}
              </div>
              <div><Label>{t('factoryUI.unitCost')}</Label><Input type="number" min="0" step="0.01" value={form.unit_cost} onChange={e => setForm(f => ({ ...f, unit_cost: e.target.value }))} /></div>
              <div><Label>{t('factoryUI.minLevel')}</Label><Input type="number" min="0" value={form.min_stock_level} onChange={e => setForm(f => ({ ...f, min_stock_level: e.target.value }))} /></div>
            </div>
            <div><Label>{t('factoryUI.supplier')}</Label><Input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} placeholder={t('factoryUI.supplierPh')} /></div>
            <Button type="submit" className="w-full">{editItem ? t('factoryUI.saveChanges') : t('factoryUI.addMaterial')}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
