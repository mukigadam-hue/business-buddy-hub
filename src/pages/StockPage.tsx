import { useState } from 'react';
import { useBusiness } from '@/context/BusinessContext';
import { useCurrency } from '@/hooks/useCurrency';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Pencil, Trash2, RotateCcw, AlertTriangle, Image, X } from 'lucide-react';
import type { StockItem } from '@/context/BusinessContext';

function toSentenceCase(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function ItemGalleryDialog({ item, open, onOpenChange }: { item: StockItem; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { fmt } = useCurrency();
  const images = [item.image_url_1, item.image_url_2, item.image_url_3].filter(Boolean) as string[];
  const [activeImg, setActiveImg] = useState(0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Image className="h-4 w-4" /> {item.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {images.length > 0 ? (
            <>
              <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                <img src={images[activeImg] || images[0]} alt={item.name} className="w-full h-full object-cover" />
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 justify-center">
                  {images.map((img, i) => (
                    <button key={i} onClick={() => setActiveImg(i)}
                      className={`w-16 h-16 rounded-md overflow-hidden border-2 transition-colors ${i === activeImg ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                      <img src={img} alt={`${item.name} ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="aspect-square rounded-lg bg-muted flex items-center justify-center">
              <p className="text-sm text-muted-foreground">No photos uploaded</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-muted/40 rounded-lg p-2">
              <p className="text-xs text-muted-foreground">Category</p>
              <p className="font-medium">{item.category || '-'}</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-2">
              <p className="text-xs text-muted-foreground">Quality</p>
              <p className="font-medium">{item.quality || '-'}</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-2">
              <p className="text-xs text-muted-foreground">In Stock</p>
              <p className="font-bold text-lg">{item.quantity}</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-2">
              <p className="text-xs text-muted-foreground">Retail Price</p>
              <p className="font-bold text-success">{fmt(Number(item.retail_price))}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function StockPage() {
  const { stock, addStockItem, updateStockItem, deleteStockItem, restoreStockItem, permanentDeleteStockItem } = useBusiness();
  const { fmt } = useCurrency();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<StockItem | null>(null);
  const [showBuyingPrice, setShowBuyingPrice] = useState(false);
  const [showRecycleBin, setShowRecycleBin] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [viewGalleryItem, setViewGalleryItem] = useState<StockItem | null>(null);
  const [form, setForm] = useState({
    name: '', category: '', quality: '',
    buying_price: '', wholesale_price: '', retail_price: '', quantity: '', min_stock_level: '5',
  });

  const activeStock = stock.filter(s => !s.deleted_at);
  const deletedStock = stock.filter(s => s.deleted_at);

  const filtered = activeStock.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.category.toLowerCase().includes(search.toLowerCase()) ||
    item.quality.toLowerCase().includes(search.toLowerCase())
  );

  // Items with photos for gallery view
  const itemsWithPhotos = activeStock.filter(s => s.image_url_1 || s.image_url_2 || s.image_url_3);

  const existingCategories = [...new Set(stock.map(s => s.category).filter(Boolean))];

  function resetForm() {
    setForm({ name: '', category: '', quality: '', buying_price: '', wholesale_price: '', retail_price: '', quantity: '', min_stock_level: '5' });
    setEditItem(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const itemData = {
      name: toSentenceCase(form.name.trim()),
      category: toSentenceCase(form.category.trim()),
      quality: toSentenceCase(form.quality.trim()),
      buying_price: parseFloat(form.buying_price) || 0,
      wholesale_price: parseFloat(form.wholesale_price) || 0,
      retail_price: parseFloat(form.retail_price) || 0,
      quantity: parseInt(form.quantity) || 0,
      min_stock_level: parseInt(form.min_stock_level) || 5,
      image_url_1: editItem?.image_url_1 || '',
      image_url_2: editItem?.image_url_2 || '',
      image_url_3: editItem?.image_url_3 || '',
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
      name: item.name, category: item.category, quality: item.quality,
      buying_price: String(item.buying_price), wholesale_price: String(item.wholesale_price), retail_price: String(item.retail_price),
      quantity: String(item.quantity), min_stock_level: String(item.min_stock_level),
    });
    setOpen(true);
  }

  async function handleSoftDelete(id: string) {
    setConfirmDelete(null);
    await deleteStockItem(id);
  }

  return (
    <div className="space-y-4">
      <div className="sticky top-0 space-y-1.5 pb-2 bg-background z-20 -mx-3 px-3 sm:-mx-4 sm:px-4 md:-mx-6 md:px-6 -mt-3 pt-2 sm:-mt-4 sm:pt-3 md:-mt-6 md:pt-4 border-b border-border/40">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-bold">My Stock</h1>
          <div className="flex gap-1.5 flex-wrap">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowBuyingPrice(v => !v)}>
              {showBuyingPrice ? '← Hide' : '💰'} Buy Price
            </Button>
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-7 text-xs"><Plus className="h-3.5 w-3.5 mr-1" /> Add</Button>
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
                      <Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} onBlur={() => setForm(f => ({ ...f, category: toSentenceCase(f.category) }))} list="stock-cat-suggestions" />
                      <datalist id="stock-cat-suggestions">{existingCategories.map(c => <option key={c} value={c} />)}</datalist>
                    </div>
                    <div>
                      <Label>Quality</Label>
                      <Input value={form.quality} onChange={e => setForm(f => ({ ...f, quality: e.target.value }))} onBlur={() => setForm(f => ({ ...f, quality: toSentenceCase(f.quality) }))} placeholder="e.g. New, Grade A..." />
                    </div>
                  </div>
                  <div>
                    <Label>Buying/Shopping Price (Cost from supplier)</Label>
                    <Input type="number" min="0" step="0.01" value={form.buying_price} onChange={e => setForm(f => ({ ...f, buying_price: e.target.value }))} required placeholder="Price you buy at" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Wholesale Price (Selling)</Label><Input type="number" min="0" step="0.01" value={form.wholesale_price} onChange={e => setForm(f => ({ ...f, wholesale_price: e.target.value }))} required placeholder="Sell to wholesalers" /></div>
                    <div><Label>Retail Price (Selling)</Label><Input type="number" min="0" step="0.01" value={form.retail_price} onChange={e => setForm(f => ({ ...f, retail_price: e.target.value }))} required placeholder="Sell to customers" /></div>
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
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search by name, category, quality..." className="pl-8 h-8 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Photo Gallery - Compact Horizontal Scroll */}
        {itemsWithPhotos.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
            {itemsWithPhotos.map(item => {
              const thumb = item.image_url_1 || item.image_url_2 || item.image_url_3;
              return (
                <button key={item.id} onClick={() => setViewGalleryItem(item)} className="group shrink-0 w-14 text-left">
                  <div className="w-14 h-14 rounded-md overflow-hidden bg-muted border border-border group-hover:border-primary transition-colors">
                    <img src={thumb!} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <p className="text-[10px] font-semibold truncate mt-0.5 leading-tight">{item.name}</p>
                  <p className="text-[9px] text-muted-foreground truncate leading-tight">{[item.category, item.quality].filter(Boolean).join(' · ')}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Gallery Dialog */}
      {viewGalleryItem && (
        <ItemGalleryDialog item={viewGalleryItem} open={!!viewGalleryItem} onOpenChange={o => { if (!o) setViewGalleryItem(null); }} />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!confirmDelete} onOpenChange={o => { if (!o) setConfirmDelete(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-warning" />Confirm Delete</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This item will be moved to the Recycle Bin. You can restore it later from Settings.</p>
          <div className="flex gap-3 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="destructive" className="flex-1" onClick={() => confirmDelete && handleSoftDelete(confirmDelete)}>Move to Bin</Button>
          </div>
        </DialogContent>
      </Dialog>



      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <Card className="shadow-card"><CardContent className="p-6 text-center text-muted-foreground">No items found. Add your first stock item.</CardContent></Card>
        ) : (
          filtered.map(item => {
            const thumb = item.image_url_1 || item.image_url_2 || item.image_url_3;
            return (
              <Card key={item.id} className="shadow-card">
                <CardContent className="p-3">
                  <div className="flex gap-3">
                    {thumb ? (
                      <button onClick={() => setViewGalleryItem(item)} className="w-14 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
                        <img src={thumb} alt="" className="w-full h-full object-cover" />
                      </button>
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Image className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{[item.category, item.quality].filter(Boolean).join(' · ')}</p>
                        </div>
                        {item.quantity === 0 ? (
                          <span className="text-[10px] font-semibold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full shrink-0">Out</span>
                        ) : item.quantity <= item.min_stock_level ? (
                          <span className="text-[10px] font-semibold text-warning bg-warning/10 px-2 py-0.5 rounded-full shrink-0">Low</span>
                        ) : (
                          <span className="text-[10px] font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full shrink-0">OK</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex gap-3 text-xs">
                          <span className="tabular-nums"><span className="text-muted-foreground">Retail:</span> <span className="font-semibold">{fmt(Number(item.retail_price))}</span></span>
                          <span className="tabular-nums"><span className="text-muted-foreground">Qty:</span> <span className="font-bold">{item.quantity}</span></span>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setConfirmDelete(item.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                        </div>
                      </div>
                      {showBuyingPrice && (
                        <p className="text-xs mt-1"><span className="text-info font-medium">💰 Buy: {fmt(Number(item.buying_price))}</span> · <span className="text-muted-foreground">Wholesale: {fmt(Number(item.wholesale_price))}</span></p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Desktop Table View */}
      <Card className="shadow-card overflow-hidden hidden md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead></TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Quality</TableHead>
                  {showBuyingPrice && <TableHead className="text-right bg-info/10 text-info font-semibold">💰 Buying Price</TableHead>}
                  <TableHead className="text-right">Wholesale</TableHead>
                  <TableHead className="text-right">Retail</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={showBuyingPrice ? 10 : 9} className="text-center text-muted-foreground py-8">No items found. Add your first stock item.</TableCell></TableRow>
                ) : (
                  filtered.map(item => {
                    const thumb = item.image_url_1 || item.image_url_2 || item.image_url_3;
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="w-10 pr-0">
                          {thumb ? (
                            <button onClick={() => setViewGalleryItem(item)} className="w-8 h-8 rounded overflow-hidden bg-muted hover:ring-2 ring-primary transition-all">
                              <img src={thumb} alt="" className="w-full h-full object-cover" />
                            </button>
                          ) : (
                            <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                              <Image className="h-3 w-3 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>{item.quality}</TableCell>
                        {showBuyingPrice && (
                          <TableCell className="text-right bg-info/5">
                            <span className="font-semibold text-info tabular-nums">{fmt(Number(item.buying_price))}</span>
                          </TableCell>
                        )}
                        <TableCell className="text-right tabular-nums">{fmt(Number(item.wholesale_price))}</TableCell>
                        <TableCell className="text-right tabular-nums font-medium">{fmt(Number(item.retail_price))}</TableCell>
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
                            <Button variant="ghost" size="icon" onClick={() => setConfirmDelete(item.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Recycle Bin Section */}
      {deletedStock.length > 0 && (
        <Card className="shadow-card border-destructive/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold flex items-center gap-2 text-destructive">
                🗑️ Recycle Bin ({deletedStock.length} items)
              </h2>
              <Button size="sm" variant="ghost" onClick={() => setShowRecycleBin(v => !v)}>
                {showRecycleBin ? 'Hide' : 'Show'}
              </Button>
            </div>
            {showRecycleBin && (
              <div className="space-y-2">
                {deletedStock.map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 border border-destructive/10">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-through text-muted-foreground">{item.name}</p>
                      {(item.category || item.quality) && <p className="text-xs text-muted-foreground">{[item.category, item.quality].filter(Boolean).join(' · ')}</p>}
                      <p className="text-xs text-muted-foreground">Deleted: {new Date(item.deleted_at!).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => restoreStockItem(item.id)}>
                        <RotateCcw className="h-3 w-3 mr-1" />Restore
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => permanentDeleteStockItem(item.id)}>
                        <Trash2 className="h-3 w-3 mr-1" />Delete Forever
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
