import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import ImageUpload from '@/components/ImageUpload';
import { useBusiness } from '@/context/BusinessContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, Trash2, Stamp } from 'lucide-react';
import ReceiptWatermarkOverlay from '@/components/ReceiptWatermarkOverlay';
import CollapsibleSection from '@/components/CollapsibleSection';

export default function ReceiptCustomization() {
  const { currentBusiness, updateBusiness } = useBusiness() as any;
  const [imageUrl, setImageUrl] = useState<string>('');
  const [text, setText] = useState<string>('');
  const [size, setSize] = useState<number>(120);
  const [opacity, setOpacity] = useState<number>(0.08);
  const [repeat, setRepeat] = useState<number>(6);
  const [rotation, setRotation] = useState<number>(-30);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!currentBusiness) return;
    setImageUrl(currentBusiness.receipt_watermark_url || '');
    setText(currentBusiness.receipt_watermark_text || '');
    setSize(currentBusiness.receipt_watermark_size ?? 120);
    setOpacity(Number(currentBusiness.receipt_watermark_opacity ?? 0.08));
    setRepeat(currentBusiness.receipt_watermark_repeat ?? 6);
    setRotation(currentBusiness.receipt_watermark_rotation ?? -30);
  }, [currentBusiness?.id]);

  async function save() {
    if (!currentBusiness) return;
    setSaving(true);
    try {
      await updateBusiness({
        receipt_watermark_url: imageUrl || null,
        receipt_watermark_text: text?.trim() || null,
        receipt_watermark_size: size,
        receipt_watermark_opacity: opacity,
        receipt_watermark_repeat: repeat,
        receipt_watermark_rotation: rotation,
      } as any);
    } finally {
      setSaving(false);
    }
  }


  async function clearAll() {
    setImageUrl('');
    setText('');
  }

  if (!currentBusiness) return null;

  return (
    <Card className="shadow-card border-primary/20">
      <CardContent className="p-4 space-y-4">
        <CollapsibleSection
          title={<span className="flex items-center gap-2"><Stamp className="h-5 w-5 text-primary" /><span className="text-base font-semibold">Receipt Watermark</span></span>}
        >
        <p className="text-xs text-muted-foreground">
          Add a logo or text watermark that will appear faintly tiled across every receipt and invoice you issue — without covering the details.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Watermark image (optional)</Label>
            <ImageUpload
              bucket="business-logos"
              path={`watermarks/${currentBusiness.id}`}
              currentUrl={imageUrl}
              onUploaded={(url) => setImageUrl(url)}
              onRemoved={() => setImageUrl('')}
              size="md"
              label=""
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Watermark text (optional)</Label>
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={currentBusiness.name}
              maxLength={40}
            />
            <p className="text-[10px] text-muted-foreground">
              Use either an image, text, or both. Leave both empty to disable.
            </p>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs">
              <Label>Size</Label><span className="text-muted-foreground">{size}px</span>
            </div>
            <Slider value={[size]} min={40} max={260} step={4} onValueChange={(v) => setSize(v[0])} />
          </div>
          <div>
            <div className="flex justify-between text-xs">
              <Label>Opacity (faintness)</Label><span className="text-muted-foreground">{Math.round(opacity * 100)}%</span>
            </div>
            <Slider value={[opacity * 100]} min={3} max={35} step={1} onValueChange={(v) => setOpacity(v[0] / 100)} />
          </div>
          <div>
            <div className="flex justify-between text-xs">
              <Label>Repeat (tiles)</Label><span className="text-muted-foreground">{repeat}</span>
            </div>
            <Slider value={[repeat]} min={1} max={20} step={1} onValueChange={(v) => setRepeat(v[0])} />
          </div>
          <div>
            <div className="flex justify-between text-xs">
              <Label>Rotation</Label><span className="text-muted-foreground">{rotation}°</span>
            </div>
            <Slider value={[rotation]} min={-90} max={90} step={5} onValueChange={(v) => setRotation(v[0])} />
          </div>
        </div>

        <Separator />

        <div>
          <Label className="text-xs text-muted-foreground">Preview</Label>
          <div className="relative h-56 rounded-lg border bg-card overflow-hidden mt-1">
            <ReceiptWatermarkOverlay
              imageUrl={imageUrl}
              text={text || currentBusiness.name}
              size={size}
              opacity={opacity}
              repeat={repeat}
              rotation={rotation}
            />
            <div className="relative z-10 p-3 text-xs space-y-1">
              <p className="font-bold text-sm">{currentBusiness.name}</p>
              <p className="text-muted-foreground">RECEIPT · Sample</p>
              <p>Item A × 2 — 4,000</p>
              <p>Item B × 1 — 1,500</p>
              <p className="font-bold">TOTAL — 5,500</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={save} disabled={saving} className="flex-1">
            <Save className="h-4 w-4 mr-2" />{saving ? 'Saving…' : 'Save'}
          </Button>
          <Button onClick={clearAll} variant="outline">
            <Trash2 className="h-4 w-4 mr-2" />Clear
          </Button>
        </div>
        </CollapsibleSection>
      </CardContent>
    </Card>
  );
}
