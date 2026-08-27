import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { languages } from '@/i18n';
import { useBusiness } from '@/context/BusinessContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, ScanLine, Trash2, CheckCircle2, Sparkles, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import WebcamCapture from '@/components/WebcamCapture';
import ImageUpload from '@/components/ImageUpload';
import { compressImage } from '@/lib/compressImage';
import { pickImage, canUseWebcam } from '@/lib/nativeCamera';

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
  quantity: string; // string to allow proper editing including empty
  image_url?: string;
  bbox?: [number, number, number, number]; // [ymin,xmin,ymax,xmax] 0-1000
}

async function cropFromBbox(
  sourceBlob: Blob,
  bbox: [number, number, number, number],
): Promise<Blob | null> {
  try {
    const bmp = await createImageBitmap(sourceBlob);
    const [ymin, xmin, ymax, xmax] = bbox;
    // Clamp and validate
    const y1 = Math.max(0, Math.min(1000, ymin));
    const x1 = Math.max(0, Math.min(1000, xmin));
    const y2 = Math.max(0, Math.min(1000, ymax));
    const x2 = Math.max(0, Math.min(1000, xmax));
    if (x2 <= x1 || y2 <= y1) { bmp.close(); return null; }
    const sx = (x1 / 1000) * bmp.width;
    const sy = (y1 / 1000) * bmp.height;
    const sw = ((x2 - x1) / 1000) * bmp.width;
    const sh = ((y2 - y1) / 1000) * bmp.height;
    if (sw < 8 || sh < 8) { bmp.close(); return null; }
    // Scale to <= 512px longest side
    const maxDim = 512;
    const ratio = Math.min(1, maxDim / Math.max(sw, sh));
    const dw = Math.round(sw * ratio);
    const dh = Math.round(sh * ratio);
    const canvas = new OffscreenCanvas(dw, dh);
    const ctx = canvas.getContext('2d');
    if (!ctx) { bmp.close(); return null; }
    ctx.drawImage(bmp, sx, sy, sw, sh, 0, 0, dw, dh);
    bmp.close();
    return await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.75 });
  } catch {
    return null;
  }
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
  const { t, i18n } = useTranslation();
  const langCode = (i18n.language || 'en').split('-')[0];
  const langName = languages.find(l => l.code === langCode)?.name || 'English';
  const { currentBusiness, addStockItem } = useBusiness();
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [webcamOpen, setWebcamOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [items, setItems] = useState<DetectedItem[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [shelfPhotoUrl, setShelfPhotoUrl] = useState<string>('');

  function reset() {
    setItems(null);
    setScanning(false);
    setSaving(false);
    setShelfPhotoUrl('');
  }

  async function openCamera() {
    if (!isMobile && canUseWebcam()) {
      setWebcamOpen(true);
      return;
    }
    const file = await pickImage('camera');
    if (file) handleImage(file);
  }

  async function openGallery() {
    const file = await pickImage('gallery');
    if (file) handleImage(file);
  }

  async function uploadShelfPhoto(file: File | Blob): Promise<string> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const uid = user?.id || 'anon';
      const fileName = `${uid}/mass-scan/${Date.now()}.jpg`;
      const { error } = await supabase.storage.from('item-images').upload(fileName, file, { upsert: true, contentType: 'image/jpeg' });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('item-images').getPublicUrl(fileName);
      return publicUrl;
    } catch {
      return '';
    }
  }

  async function handleImage(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error(t('massScan.chooseImage'));
      return;
    }
    setScanning(true);
    setItems(null);
    try {
      const compressed = await compressImage(file).catch(() => file);
      const [dataUrl, publicUrl] = await Promise.all([
        fileToDataUrl(compressed),
        uploadShelfPhoto(compressed),
      ]);
      setShelfPhotoUrl(publicUrl);

      const { data, error } = await supabase.functions.invoke('mass-inventory-scan', {
        body: {
          image: dataUrl,
          businessName: currentBusiness?.name || '',
          businessType: (currentBusiness as any)?.business_type || '',
          language: langCode,
          languageName: langName,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const detected: any[] = Array.isArray(data?.items) ? data.items : [];
      if (detected.length === 0) {
        toast.error(t('massScan.noneDetected'));
        setScanning(false);
        return;
      }

      setScanning(true); // keep spinner while cropping
      const { data: { user } } = await supabase.auth.getUser();
      const uid = user?.id || 'anon';

      const normalized: DetectedItem[] = await Promise.all(
        detected.map(async (it, idx) => {
          const bbox = Array.isArray(it.bbox) && it.bbox.length === 4
            ? (it.bbox.map((n: any) => Number(n)) as [number, number, number, number])
            : undefined;
          let itemImageUrl = publicUrl; // fallback: whole shelf photo
          if (bbox) {
            const cropped = await cropFromBbox(compressed, bbox);
            if (cropped) {
              const fname = `${uid}/mass-scan/item-${Date.now()}-${idx}.jpg`;
              const { error: upErr } = await supabase.storage
                .from('item-images')
                .upload(fname, cropped, { upsert: true, contentType: 'image/jpeg' });
              if (!upErr) {
                const { data: { publicUrl: itemUrl } } = supabase.storage
                  .from('item-images')
                  .getPublicUrl(fname);
                itemImageUrl = itemUrl;
              }
            }
          }
          return {
            item_name: it.item_name || '',
            category: it.category || '',
            quality: it.quality || '',
            unit_type: it.unit_type || 'Pieces',
            cost_per_unit: Number(it.cost_per_unit) || 0,
            wholesale: Number(it.wholesale) || 0,
            retail: Number(it.retail) || 0,
            serial_number: it.serial_number || '',
            bulk_packaging: !!it.bulk_packaging,
            quantity: String(Number(it.quantity) || 1),
            image_url: itemImageUrl,
            bbox,
          };
        }),
      );
      setItems(normalized);
      toast.success(t('massScan.detected', { count: normalized.length }));
    } catch (err: any) {
      toast.error(err?.message || t('massScan.scanFailed'));
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
      toast.error(t('massScan.needName'));
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
          quantity: Number(it.quantity) || 0,
          min_stock_level: 5,
          image_url_1: it.image_url || shelfPhotoUrl || '',
          image_url_2: '',
          image_url_3: '',
        } as any);
      }
      toast.success(t('massScan.addedItems', { count: valid.length }));
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || t('massScan.saveFailed'));
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
              <Sparkles className="h-5 w-5 text-primary" /> {t('massScan.dialogTitle')}
            </DialogTitle>
            <DialogDescription>{t('massScan.dialogDesc')}</DialogDescription>
          </DialogHeader>

          {!scanning && !items && (
            <div className="space-y-3">
              <Button onClick={openCamera} className="w-full" size="lg">
                <ScanLine className="h-5 w-5 mr-2" /> {t('massScan.openCamera')}
              </Button>
              <Button onClick={openGallery} variant="outline" className="w-full" size="lg">
                <Upload className="h-5 w-5 mr-2" /> {t('massScan.chooseFromGallery')}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                {t('massScan.cameraHint')}
              </p>
              <p className="text-[11px] text-muted-foreground text-center">
                🌍 {t('massScan.resultsLanguage')}: <span className="font-medium text-foreground">{langName}</span>
              </p>
            </div>
          )}

          {scanning && (
            <div className="py-10 flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="font-medium">{t('massScan.scanning')}</p>
              <p className="text-xs text-muted-foreground">{t('massScan.scanningHint')}</p>
            </div>
          )}

          {items && !scanning && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {t('massScan.reviewHint')}
                </p>
                <Button variant="outline" size="sm" onClick={openCamera}>
                  {t('massScan.rescan')}
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
                        aria-label={t('massScan.remove')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex gap-3">
                      <ImageUpload
                        bucket="item-images"
                        path={`mass-scan-item-${idx}`}
                        currentUrl={it.image_url}
                        onUploaded={(url) => updateItem(idx, { image_url: url })}
                        onRemoved={() => updateItem(idx, { image_url: '' })}
                        size="sm"
                        label={t('massScan.photo')}
                      />
                      <div className="flex-1">
                        <Label className="text-xs">{t('stock.name')}</Label>
                        <Input
                          value={it.item_name}
                          onChange={(e) => updateItem(idx, { item_name: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">{t('stock.category')}</Label>
                        <Input
                          value={it.category}
                          onChange={(e) => updateItem(idx, { category: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">{t('stock.quality')}</Label>
                        <Input
                          value={it.quality}
                          onChange={(e) => updateItem(idx, { quality: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">{t('massScan.unitType', 'Unit Type')}</Label>
                        <Input
                          value={it.unit_type}
                          onChange={(e) => updateItem(idx, { unit_type: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">{t('stock.quantity')}</Label>
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          value={it.quantity}
                          onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                          onFocus={(e) => e.target.select()}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs">{t('stock.buyingPrice')}</Label>
                        <Input
                          type="number"
                          value={it.cost_per_unit}
                          onChange={(e) => updateItem(idx, { cost_per_unit: Number(e.target.value) || 0 })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">{t('stock.wholesalePrice')}</Label>
                        <Input
                          type="number"
                          value={it.wholesale}
                          onChange={(e) => updateItem(idx, { wholesale: Number(e.target.value) || 0 })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">{t('stock.retailPrice')}</Label>
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
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t('massScan.savingItems', { count: items.length })}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5 mr-2" /> {t('massScan.saveAll')}
                  </>
                )}
              </Button>
            </div>
          )}

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
