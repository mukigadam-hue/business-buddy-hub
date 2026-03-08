import { useState } from 'react';
import { useBusiness } from '@/context/BusinessContext';
import { useCurrency } from '@/hooks/useCurrency';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit2, Trash2, RotateCcw, Package, Image as ImageIcon, ScanLine } from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';
import BarcodeScanner from '@/components/BarcodeScanner';
import { toast } from 'sonner';

function toSentenceCase(str: string) { return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : str; }

export default function FactoryProductStock() {
  const { stock, addStockItem, updateStockItem, deleteStockItem, restoreStockItem } = useBusiness();
  const { fmt } = useCurrency();
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<string | null>(null);
  const [viewGallery, setViewGallery] = useState<string | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [form, setForm] = useState({
    name: '', category: '', quality: '', quantity: '0', barcode: '',
    buying_price: '', wholesale_price: '', retail_price: '', min_stock_level: '5',
    image_url_1: '', image_url_2: '', image_url_3: '',
  });

  const active = stock.filter(s => !s.deleted_at);
  const deleted = stock.filter(s => s.deleted_at);

  function resetForm() {
    setForm({ name: '', category: '', quality: '', quantity: '0', barcode: '', buying_price: '', wholesale_price: '', retail_price: '', min_stock_level: '5', image_url_1: '', image_url_2: '', image_url_3: '' });
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    await addStockItem({
      name: toSentenceCase(form.name.trim()), category: toSentenceCase(form.category.trim()),
      quality: toSentenceCase(form.quality.trim()), quantity: parseInt(form.quantity) || 0,
      buying_price: parseFloat(form.buying_price) || 0, wholesale_price: parseFloat(form.wholesale_price) || 0,
      retail_price: parseFloat(form.retail_price) || 0, min_stock_level: parseInt(form.min_stock_level) || 5,
      barcode: form.barcode.trim(),
      image_url_1: form.image_url_1, image_url_2: form.image_url_2, image_url_3: form.image_url_3,
    });
    resetForm(); setShowAdd(false);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editItem) return;
    await updateStockItem(editItem, {
      name: toSentenceCase(form.name.trim()), category: toSentenceCase(form.category.trim()),
      quality: toSentenceCase(form.quality.trim()), quantity: parseInt(form.quantity) || 0,
      buying_price: parseFloat(form.buying_price) || 0, wholesale_price: parseFloat(form.wholesale_price) || 0,
      retail_price: parseFloat(form.retail_price) || 0, min_stock_level: parseInt(form.min_stock_level) || 5,
      image_url_1: form.image_url_1, image_url_2: form.image_url_2, image_url_3: form.image_url_3,
    });
    resetForm(); setEditItem(null);
  }

  function openEdit(item: typeof active[0]) {
    setForm({
      name: item.name, category: item.category, quality: item.quality, quantity: String(item.quantity),
      barcode: item.barcode || '',
      buying_price: String(item.buying_price), wholesale_price: String(item.wholesale_price),
      retail_price: String(item.retail_price), min_stock_level: String(item.min_stock_level),
      image_url_1: item.image_url_1 || '', image_url_2: item.image_url_2 || '', image_url_3: item.image_url_3 || '',
    });
    setEditItem(item.id);
  }

  const galleryItem = viewGallery ? active.find(i => i.id === viewGallery) : null;
  const galleryImages = galleryItem ? [galleryItem.image_url_1, galleryItem.image_url_2, galleryItem.image_url_3].filter(Boolean) : [];

  return (
    <div className="space-y-6">
      <BarcodeScanner open={scannerOpen} onOpenChange={setScannerOpen} onScan={(code) => {
        const match = active.find(s => s.barcode && s.barcode === code);
        if (match) { toast.success(`Found: ${match.name}`); }
        else { toast.error(`No product found for barcode: ${code}`); }
      }} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Package className="h-6 w-6" /> Product Stock</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => setScannerOpen(true)} title="Scan barcode"><ScanLine className="h-4 w-4" /></Button>
          <Button onClick={() => { resetForm(); setShowAdd(true); }}><Plus className="h-4 w-4 mr-1" />Add Product</Button>
        </div>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground mb-3">Finished goods — {active.length} products</p>
          {active.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No products yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead></TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Quality</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Wholesale</TableHead>
                    <TableHead className="text-right">Retail</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {active.map(item => {
                    const hasImages = item.image_url_1 || item.image_url_2 || item.image_url_3;
                    const isLow = item.quantity > 0 && item.quantity <= item.min_stock_level;
                    const isOut = item.quantity === 0;
                    return (
                      <TableRow key={item.id} className={isOut ? 'bg-destructive/5' : isLow ? 'bg-warning/5' : ''}>
                        <TableCell>
                          {hasImages ? (
                            <button onClick={() => setViewGallery(item.id)} className="h-10 w-10 rounded-lg overflow-hidden border">
                              <img src={item.image_url_1 || item.image_url_2 || item.image_url_3} alt="" className="h-full w-full object-cover" />
                            </button>
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center"><ImageIcon className="h-4 w-4 text-muted-foreground" /></div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>{item.quality}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {item.quantity}
                          {isOut && <span className="ml-1 text-xs text-destructive font-semibold">OUT</span>}
                          {isLow && <span className="ml-1 text-xs text-warning font-semibold">LOW</span>}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{fmt(Number(item.wholesale_price))}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmt(Number(item.retail_price))}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Edit2 className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteStockItem(item.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
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

      {deleted.length > 0 && (
        <Card className="shadow-card border-destructive/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-destructive">🗑️ Recycle Bin ({deleted.length})</h2>
              <Button size="sm" variant="ghost" onClick={() => setShowDeleted(v => !v)}>{showDeleted ? 'Hide' : 'Show'}</Button>
            </div>
            {showDeleted && deleted.map(item => (
              <div key={item.id} className="flex items-center justify-between p-2 rounded border mb-1">
                <span className="text-sm line-through text-muted-foreground">{item.name}</span>
                <Button size="sm" variant="outline" onClick={() => restoreStockItem(item.id)}><RotateCcw className="h-3 w-3 mr-1" />Restore</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showAdd || !!editItem} onOpenChange={o => { if (!o) { setShowAdd(false); setEditItem(null); resetForm(); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editItem ? 'Edit Product' : 'Add Finished Product'}</DialogTitle></DialogHeader>
          <form onSubmit={editItem ? handleEdit : handleAdd} className="space-y-3">
            <div><Label>Product Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Category</Label><Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} /></div>
              <div><Label>Quality</Label><Input value={form.quality} onChange={e => setForm(f => ({ ...f, quality: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Quantity</Label><Input type="number" min="0" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} /></div>
              <div><Label>Min Level</Label><Input type="number" min="0" value={form.min_stock_level} onChange={e => setForm(f => ({ ...f, min_stock_level: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Buying Price</Label><Input type="number" min="0" step="0.01" value={form.buying_price} onChange={e => setForm(f => ({ ...f, buying_price: e.target.value }))} /></div>
              <div><Label>Wholesale</Label><Input type="number" min="0" step="0.01" value={form.wholesale_price} onChange={e => setForm(f => ({ ...f, wholesale_price: e.target.value }))} /></div>
              <div><Label>Retail</Label><Input type="number" min="0" step="0.01" value={form.retail_price} onChange={e => setForm(f => ({ ...f, retail_price: e.target.value }))} /></div>
            </div>
            <div className="space-y-2">
              <Label>Product Images (up to 3)</Label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map(n => (
                  <ImageUpload key={n} bucket="item-images" path={`product-${editItem || 'new'}-${n}`}
                    currentUrl={form[`image_url_${n}` as keyof typeof form] as string}
                    onUploaded={url => setForm(f => ({ ...f, [`image_url_${n}`]: url }))}
                    onRemoved={() => setForm(f => ({ ...f, [`image_url_${n}`]: '' }))}
                    size="sm" label={`Photo ${n}`} />
                ))}
              </div>
            </div>
            <Button type="submit" className="w-full">{editItem ? 'Save Changes' : 'Add Product'}</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Gallery Dialog */}
      <Dialog open={!!viewGallery} onOpenChange={o => { if (!o) setViewGallery(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{galleryItem?.name}</DialogTitle></DialogHeader>
          {galleryItem && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                {galleryItem.category && <span>{galleryItem.category}</span>}
                {galleryItem.quality && <span> · {galleryItem.quality}</span>}
                <span> · Qty: {galleryItem.quantity}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {galleryImages.map((url, i) => (
                  <img key={i} src={url} alt="" className="rounded-lg w-full aspect-square object-cover" />
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
