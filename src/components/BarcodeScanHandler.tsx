import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, Plus, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';
import { useBusiness } from '@/context/BusinessContext';
import { useCurrency } from '@/hooks/useCurrency';
import { useSubmitLock } from '@/hooks/useSubmitLock';
import { toSentenceCase } from '@/lib/utils';
import BarcodeScanner from '@/components/BarcodeScanner';
import type { StockItem } from '@/context/BusinessContext';

const UNIT_TYPES = ['Pieces', 'Kilograms', 'Litres', 'Metres', 'Tonnes', 'Rolls', 'Bags', 'Boxes', 'Pairs', 'Sets', 'Bundles', 'Gallons'];

const DEFAULT_CATEGORIES = [
  'Chargers', 'Cables', 'Cases', 'Screen Protectors', 'Batteries',
  'Headphones', 'Adapters', 'Speakers', 'Electronics', 'Phone Parts',
  'Accessories', 'Tools', 'Packaging', 'Other',
];

type ScanMode = 'stock' | 'purchase' | 'sale';

interface BarcodeScanHandlerProps {
  scannerOpen: boolean;
  onScannerOpenChange: (open: boolean) => void;
  mode: ScanMode;
  /** Called when an existing item is found — passes item + quantity entered */
  onExistingItemFound?: (item: StockItem, quantity: number) => void;
  /** Called when a new item is created from the form */
  onNewItemCreated?: (item: StockItem) => void;
}

export default function BarcodeScanHandler({
  scannerOpen,
  onScannerOpenChange,
  mode,
  onExistingItemFound,
  onNewItemCreated,
}: BarcodeScanHandlerProps) {
  const { stock, addStockItem } = useBusiness();
  const { fmt } = useCurrency();
  const { locked, withLock } = useSubmitLock();
  const activeStock = stock.filter(s => !s.deleted_at);
  const existingCategories = [...new Set(activeStock.map(s => s.category).filter(Boolean))];
  const allCategories = [...new Set([...DEFAULT_CATEGORIES, ...existingCategories])].sort();

  // State for found item dialog
  const [foundItem, setFoundItem] = useState<StockItem | null>(null);
  const [quantityInput, setQuantityInput] = useState('1');

  // State for new item form
  const [showNewForm, setShowNewForm] = useState(false);
  const [autoHint, setAutoHint] = useState('');
  const [newForm, setNewForm] = useState({
    name: '', category: '', quality: '', unit_type: 'Pieces', barcode: '',
    buying_price: '', wholesale_price: '', retail_price: '', quantity: '',
    min_stock_level: '5', tax_rate: '0', supplier: '',
  });

  function resetAll() {
    setFoundItem(null);
    setQuantityInput('1');
    setShowNewForm(false);
    setAutoHint('');
    setNewForm({
      name: '', category: '', quality: '', unit_type: 'Pieces', barcode: '',
      buying_price: '', wholesale_price: '', retail_price: '', quantity: '',
      min_stock_level: '5', tax_rate: '0', supplier: '',
    });
  }

  function handleScan(code: string) {
    // Check database for existing item by barcode
    const match = activeStock.find(s => s.barcode && s.barcode === code);

    if (match) {
      // EXISTING ITEM FOUND
      setFoundItem(match);
      setQuantityInput('1');
      toast.success(`Found: ${match.name}`);
    } else {
      // NEW ITEM — open create form with barcode pre-filled
      setShowNewForm(true);
      setNewForm(f => ({ ...f, barcode: code }));

      // Auto-naming hint for Tecno ASN codes
      if (code.startsWith('1433')) {
        setAutoHint('Is this a Tecno Accessory?');
      } else {
        setAutoHint('');
      }

      toast.info('Item not in inventory — create it now');
    }
  }

  // Handle confirming an existing item
  function handleConfirmExisting() {
    if (!foundItem) return;
    const qty = parseInt(quantityInput) || 1;
    onExistingItemFound?.(foundItem, qty);
    resetAll();
  }

  // Handle saving a new item
  async function handleSaveNewItem() {
    if (!newForm.name.trim()) {
      toast.error('Item name is required');
      return;
    }

    const taxRate = parseFloat(newForm.tax_rate) || 0;
    const retailPrice = parseFloat(newForm.retail_price) || 0;

    const itemData = {
      name: toSentenceCase(newForm.name.trim()),
      category: toSentenceCase(newForm.category.trim()),
      quality: toSentenceCase(newForm.quality.trim()),
      unit_type: newForm.unit_type,
      barcode: newForm.barcode.trim(),
      buying_price: parseFloat(newForm.buying_price) || 0,
      wholesale_price: parseFloat(newForm.wholesale_price) || 0,
      retail_price: retailPrice,
      quantity: parseInt(newForm.quantity) || 0,
      min_stock_level: parseInt(newForm.min_stock_level) || 5,
      tax_rate: taxRate,
      image_url_1: '',
      image_url_2: '',
      image_url_3: '',
    };

    await addStockItem(itemData as any);
    toast.success(`${itemData.name} added to inventory!`);
    onNewItemCreated?.(itemData as any);
    resetAll();
  }

  // Tax-inclusive price calculation
  const taxRate = parseFloat(newForm.tax_rate) || 0;
  const retailPrice = parseFloat(newForm.retail_price) || 0;
  const totalWithTax = retailPrice * (1 + taxRate / 100);

  return (
    <>
      {/* The actual camera scanner */}
      <BarcodeScanner
        open={scannerOpen}
        onOpenChange={onScannerOpenChange}
        onScan={handleScan}
      />

      {/* EXISTING ITEM FOUND — Quantity prompt */}
      <Dialog open={!!foundItem} onOpenChange={o => { if (!o) { setFoundItem(null); setQuantityInput('1'); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" /> Item Found in Inventory
            </DialogTitle>
          </DialogHeader>
          {foundItem && (
            <div className="space-y-3">
              <div className="bg-muted/40 rounded-lg p-3 space-y-1">
                <p className="font-semibold">{foundItem.name}</p>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  {foundItem.category && <span>📂 {foundItem.category}</span>}
                  {foundItem.quality && <span>⭐ {foundItem.quality}</span>}
                </div>
                <div className="flex gap-3 text-sm mt-1">
                  <span>In stock: <strong>{foundItem.quantity}</strong></span>
                  <span>Cost: <strong>{fmt(Number(foundItem.buying_price))}</strong></span>
                  <span>Retail: <strong>{fmt(Number(foundItem.retail_price))}</strong></span>
                </div>
              </div>

              <div>
                <Label>{mode === 'purchase' ? 'Quantity Received' : mode === 'sale' ? 'Quantity to Sell' : 'Update Quantity'}</Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={quantityInput}
                  onChange={e => setQuantityInput(e.target.value)}
                  autoFocus
                />
              </div>

              <Button onClick={handleConfirmExisting} className="w-full">
                {mode === 'purchase' ? '📦 Add to Purchase' : mode === 'sale' ? '🛒 Add to Sale' : '✅ Update Stock'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* NEW ITEM FORM */}
      <Dialog open={showNewForm} onOpenChange={o => { if (!o) resetAll(); }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" /> Create New Item
            </DialogTitle>
          </DialogHeader>

          {/* Auto-naming hint */}
          {autoHint && (
            <div className="flex items-center gap-2 p-2 bg-warning/10 border border-warning/30 rounded-lg text-sm">
              <Lightbulb className="h-4 w-4 text-warning shrink-0" />
              <span className="text-warning-foreground">{autoHint}</span>
            </div>
          )}

          <div className="space-y-3">
            {/* Barcode — pre-filled & read-only */}
            <div>
              <Label>Barcode / ASN Code</Label>
              <Input value={newForm.barcode} readOnly className="bg-muted font-mono text-sm" />
            </div>

            <div>
              <Label>Item Name *</Label>
              <Input
                value={newForm.name}
                onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))}
                onBlur={() => setNewForm(f => ({ ...f, name: toSentenceCase(f.name) }))}
                placeholder="e.g. Tecno Charger"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select
                  value={newForm.category}
                  onValueChange={v => setNewForm(f => ({ ...f, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allCategories.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quality</Label>
                <Input
                  value={newForm.quality}
                  onChange={e => setNewForm(f => ({ ...f, quality: e.target.value }))}
                  onBlur={() => setNewForm(f => ({ ...f, quality: toSentenceCase(f.quality) }))}
                  placeholder="e.g. Original"
                />
              </div>
            </div>

            <div>
              <Label>Unit Type</Label>
              <Select value={newForm.unit_type} onValueChange={v => setNewForm(f => ({ ...f, unit_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{UNIT_TYPES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Unit Cost</Label>
                <Input type="number" min="0" step="0.01" value={newForm.buying_price}
                  onChange={e => setNewForm(f => ({ ...f, buying_price: e.target.value }))}
                  placeholder="0.00" />
              </div>
              <div>
                <Label>Wholesale</Label>
                <Input type="number" min="0" step="0.01" value={newForm.wholesale_price}
                  onChange={e => setNewForm(f => ({ ...f, wholesale_price: e.target.value }))}
                  placeholder="0.00" />
              </div>
              <div>
                <Label>Selling Price</Label>
                <Input type="number" min="0" step="0.01" value={newForm.retail_price}
                  onChange={e => setNewForm(f => ({ ...f, retail_price: e.target.value }))}
                  placeholder="0.00" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Tax Rate (%)</Label>
                <Input type="number" min="0" step="0.1" value={newForm.tax_rate}
                  onChange={e => setNewForm(f => ({ ...f, tax_rate: e.target.value }))}
                  placeholder="0" />
              </div>
              <div>
                <Label>Quantity</Label>
                <Input type="number" min="0" step="1" value={newForm.quantity}
                  onChange={e => setNewForm(f => ({ ...f, quantity: e.target.value }))}
                  placeholder="0" />
              </div>
              <div>
                <Label>Min Stock</Label>
                <Input type="number" min="0" value={newForm.min_stock_level}
                  onChange={e => setNewForm(f => ({ ...f, min_stock_level: e.target.value }))}
                  placeholder="5" />
              </div>
            </div>

            {/* Tax calculation preview */}
            {taxRate > 0 && retailPrice > 0 && (
              <div className="bg-muted/40 rounded-lg p-2 text-sm">
                <span className="text-muted-foreground">Price incl. tax ({taxRate}%): </span>
                <span className="font-bold text-primary">{fmt(totalWithTax)}</span>
              </div>
            )}

            <div>
              <Label>Supplier</Label>
              <Input value={newForm.supplier} onChange={e => setNewForm(f => ({ ...f, supplier: e.target.value }))}
                placeholder="Supplier name (optional)" />
            </div>

            <Button onClick={() => withLock(handleSaveNewItem)} className="w-full" disabled={locked}>
              {locked ? 'Saving...' : '✅ Save & Add to Inventory'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
