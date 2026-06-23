import { useRef, useState } from 'react';
import { useBusiness } from '@/context/BusinessContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, ScanLine, Trash2, CheckCircle2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import WebcamCapture from '@/components/WebcamCapture';
import { compressImage } from '@/lib/compressImage';

interface MassInventoryScanProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DetectedItem {
  item_name: string;
  category: string;
  quality: string;
  unit_type: string;
  cost_per_unit: number;
  wholesale: number;
  retail: number;
  serial_number?: string;
  bulk_packaging?: boolean;
  quantity: number;
}

function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function MassInventoryScan({ open, onOpenChange }: MassInventoryScanProps) {
  const { currentBusiness, addStockItem } = useBusiness();
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [webcamOpen, setWebcamOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [items, setItems] = useState<DetectedItem[] | null>(null);
  const [saving, setSaving] = useState(false);

  function reset() {
    setItems(null);
    setScanning(false);
    setSaving(false);
  }

  function openCamera() {
    if (isMobile) {
      fileInputRef.current?.click();
    } else {
      setWebcamOpen(true);
    }
  }

  async function handleImage(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image');
      return;
    }
    setScanning(true);
    setItems(null);
    try {
      const compressed = await compressImage(file).catch(() => file);
      const dataUrl = await fileToDataUrl(compressed);

      const { data, error } = await supabase.functions.invoke('mass-inventory-scan', {
        body: {
          image: dataUrl,
          businessName: currentBusiness?.name || '',
          businessType: (currentBusiness as any)?.business_type || '',
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const detected: DetectedItem[] = Array.isArray(data?.items) ? data.items : [];
      if (detected.length === 0) {
        toast.error('No items detected. Try a clearer photo.');
        setScanning(false);
        return;
      }

      // Normalize
      const normalized = detected.map((it) => ({
        item_name: it.item_name || '',
        category: it.category || '',
        quality: it.quality || '',
        unit_type: it.unit_type || 'Pieces',
        cost_per_unit: Number(it.cost_per_unit) || 0,
        wholesale: Number(it.wholesale) || 0,
        retail: Number(it.retail) || 0,
        serial_number: it.serial_number || '',
        bulk_packaging: !!it.bulk_packaging,
        quantity: Number(it.quantity) || 1,
      }));
      setItems(normalized);
      toast.success(`AI detected ${normalized.length} item${normalized.length === 1 ? '' : 's'}`);
    } catch (err: any) {
      toast.error(err?.message || 'Scan failed');
    } finally {
      setScanning(false);
    }
  }

  function updateItem(idx: number, patch: Partial<DetectedItem>) {
    setItems((prev) => (prev ? prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)) : prev));
  }
  function removeItem(idx: number) {
    setItems((prev) => (prev ? prev.filter((_, i) => i !== idx) : prev));
  }

  async function saveAll() {
    if (!items || items.length === 0) return;
    const valid = items.filter((it) => it.item_name.trim().length > 0);
    if (valid.length === 0) {
      toast.error('Give at least one item a name');
      return;
    }
    setSaving(true);
    try {
      for (const it of valid) {
        await addStockItem({
          name: it.item_name.trim(),
          category: it.category.trim(),
          quality: it.quality.trim(),
          unit_type: it.unit_type || 'Pieces',
          buying_price: it.cost_per_unit || 0,
          wholesale_price: it.wholesale || 0,
          retail_price: it.retail || 0,
          quantity: it.quantity || 0,
          min_stock_level: 5,
          image_url_1: '',
          image_url_2: '',
          image_url_3: '',
        } as any);
      }
      toast.success(`Added ${valid.length} item${valid.length === 1 ? '' : 's'} to live stock`);
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save some items');
    } finally {
      setSaving(false);
    }
  }

  function handleOpenChange(o: boolean) {
    if (!o) reset();
    onOpenChange(o);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Mass AI Inventory Scan
            </DialogTitle>
            <DialogDescription>
              Snap a photo of your shelves or wall display to automatically list all items using Google Gemini AI.
            </DialogDescription>
          </DialogHeader>

          {/* Step 1: capture */}
          {!scanning && !items && (
            <div className="space-y-3">
              <Button onClick={openCamera} className="w-full" size="lg">
                <ScanLine className="h-5 w-5 mr-2" /> Open Camera & Scan Shelf
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Hold the camera steady. Capture the full shelf in good light for best results.
              </p>
            </div>
          )}

          {/* Step 2: loading */}
          {scanning && (
            <div className="py-10 flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="font-medium">Google AI is scanning your stock...</p>
              <p className="text-xs text-muted-foreground">This usually takes 5-15 seconds</p>
            </div>
          )}

          {/* Step 3: bulk review */}
          {items && !scanning && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Review and edit before saving. Set prices and quantities.
                </p>
                <Button variant="outline" size="sm" onClick={openCamera}>
                  Rescan
                </Button>
              </div>

              <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                {items.map((it, idx) => (
                  <div key={idx} className="border rounded-lg p-3 space-y-2 bg-card">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">
                        #{idx + 1}
                      </span>
                      <button
                        onClick={() => removeItem(idx)}
                        className="text-destructive hover:opacity-70"
                        aria-label="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div>
                      <Label className="text-xs">Item Name</Label>
                      <Input
                        value={it.item_name}
                        onChange={(e) => updateItem(idx, { item_name: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Category</Label>
                        <Input
                          value={it.category}
                          onChange={(e) => updateItem(idx, { category: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Quality</Label>
                        <Input
                          value={it.quality}
                          onChange={(e) => updateItem(idx, { quality: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Unit Type</Label>
                        <Input
                          value={it.unit_type}
                          onChange={(e) => updateItem(idx, { unit_type: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Quantity</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={it.quantity}
                          onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs">Cost</Label>
                        <Input
                          type="number"
                          value={it.cost_per_unit}
                          onChange={(e) => updateItem(idx, { cost_per_unit: Number(e.target.value) || 0 })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Wholesale</Label>
                        <Input
                          type="number"
                          value={it.wholesale}
                          onChange={(e) => updateItem(idx, { wholesale: Number(e.target.value) || 0 })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Retail</Label>
                        <Input
                          type="number"
                          value={it.retail}
                          onChange={(e) => updateItem(idx, { retail: Number(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Button onClick={saveAll} disabled={saving} className="w-full" size="lg">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving {items.length} item
                    {items.length === 1 ? '' : 's'}...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5 mr-2" /> Save and Add to Live Stock
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Hidden mobile camera input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImage(f);
              e.target.value = '';
            }}
          />
        </DialogContent>
      </Dialog>

      <WebcamCapture open={webcamOpen} onOpenChange={setWebcamOpen} onCapture={handleImage} />
    </>
  );
}
