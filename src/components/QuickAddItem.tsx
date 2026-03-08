import React, { useState, useRef } from 'react';
import { useBusiness } from '@/context/BusinessContext';
import { useCurrency } from '@/hooks/useCurrency';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, Upload, Plus, X, Loader2, Package } from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import WebcamCapture from '@/components/WebcamCapture';

interface QuickAddItemProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function QuickAddItem({ open, onOpenChange }: QuickAddItemProps) {
  const { stock, addStockItem, updateStockItem, currentBusiness } = useBusiness();
  const { fmt } = useCurrency();
  const isMobile = useIsMobile();
  const activeStock = stock.filter(s => !s.deleted_at);

  const [mode, setMode] = useState<'existing' | 'new'>('new');
  const [selectedStockId, setSelectedStockId] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [webcamOpen, setWebcamOpen] = useState(false);
  const [form, setForm] = useState({
    name: '', category: '', quality: '',
    buying_price: '', wholesale_price: '', retail_price: '', quantity: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) { toast.error('Select an image'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5MB'); return; }
    if (images.length >= 3) { toast.error('Max 3 images'); return; }

    setUploading(true);
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `${currentBusiness?.id || 'item'}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
    try {
      const { error } = await supabase.storage.from('item-images').upload(fileName, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('item-images').getPublicUrl(fileName);
      setImages(prev => [...prev, publicUrl]);
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function removeImage(idx: number) {
    setImages(prev => prev.filter((_, i) => i !== idx));
  }

  function handleCameraClick() {
    if (isMobile) {
      cameraInputRef.current?.click();
    } else {
      setWebcamOpen(true);
    }
  }

  async function handleSubmit() {
    if (mode === 'existing') {
      if (!selectedStockId) { toast.error('Select an item'); return; }
      const updates: any = {};
      if (images[0]) updates.image_url_1 = images[0];
      if (images[1]) updates.image_url_2 = images[1];
      if (images[2]) updates.image_url_3 = images[2];
      if (Object.keys(updates).length === 0) { toast.error('Add at least one image'); return; }
      await updateStockItem(selectedStockId, updates);
      toast.success('Images added to item!');
    } else {
      if (!form.name.trim()) { toast.error('Name required'); return; }
      await addStockItem({
        name: form.name.trim(),
        category: form.category.trim(),
        quality: form.quality.trim(),
        buying_price: Number(form.buying_price) || 0,
        wholesale_price: Number(form.wholesale_price) || 0,
        retail_price: Number(form.retail_price) || 0,
        quantity: Number(form.quantity) || 0,
        min_stock_level: 5,
        image_url_1: images[0] || '',
        image_url_2: images[1] || '',
        image_url_3: images[2] || '',
      } as any);
      toast.success('Item added to stock with images!');
    }
    setImages([]);
    setForm({ name: '', category: '', quality: '', buying_price: '', wholesale_price: '', retail_price: '', quantity: '' });
    setSelectedStockId('');
    onOpenChange(false);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" /> Add Item with Photos
            </DialogTitle>
          </DialogHeader>

          {/* Image upload area */}
          <div className="space-y-3">
            <Label>Photos (up to 3)</Label>
            <div className="flex gap-3 flex-wrap">
              {images.map((url, i) => (
                <div key={i} className="relative h-24 w-24 rounded-lg overflow-hidden border">
                  <img src={url} alt={`Item ${i + 1}`} className="h-full w-full object-cover" />
                  <button onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {images.length < 3 && (
                <div className="h-24 w-24 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1">
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  ) : (
                    <>
                      <div className="flex gap-1">
                        <button onClick={handleCameraClick} className="p-1.5 rounded-md bg-primary/10 hover:bg-primary/20">
                          <Camera className="h-4 w-4 text-primary" />
                        </button>
                        <button onClick={() => fileInputRef.current?.click()} className="p-1.5 rounded-md bg-primary/10 hover:bg-primary/20">
                          <Upload className="h-4 w-4 text-primary" />
                        </button>
                      </div>
                      <span className="text-[10px] text-muted-foreground">Add</span>
                    </>
                  )}
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
              onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = ''; }} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
              onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = ''; }} />
          </div>

          {/* Mode selector */}
          <div className="flex gap-2">
            <Button size="sm" variant={mode === 'existing' ? 'default' : 'outline'} onClick={() => setMode('existing')} className="flex-1">
              <Package className="h-3 w-3 mr-1" /> Existing Item
            </Button>
            <Button size="sm" variant={mode === 'new' ? 'default' : 'outline'} onClick={() => setMode('new')} className="flex-1">
              <Plus className="h-3 w-3 mr-1" /> New Item
            </Button>
          </div>

          {mode === 'existing' ? (
            <div className="space-y-2">
              <Label>Select Stock Item</Label>
              <Select value={selectedStockId} onValueChange={setSelectedStockId}>
                <SelectTrigger><SelectValue placeholder="Choose item..." /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {activeStock.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} {item.category && `· ${item.category}`} {item.quality && `· ${item.quality}`} (Qty: {item.quantity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <div><Label>Item Name *</Label><Input placeholder="e.g. Screen Protector" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Category</Label><Input placeholder="e.g. Phone Parts" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} /></div>
                <div><Label>Quality</Label><Input placeholder="e.g. Original" value={form.quality} onChange={e => setForm(f => ({ ...f, quality: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label>Shopping Price</Label><Input type="number" placeholder="0" value={form.buying_price} onChange={e => setForm(f => ({ ...f, buying_price: e.target.value }))} /></div>
                <div><Label>Wholesale</Label><Input type="number" placeholder="0" value={form.wholesale_price} onChange={e => setForm(f => ({ ...f, wholesale_price: e.target.value }))} /></div>
                <div><Label>Retail</Label><Input type="number" placeholder="0" value={form.retail_price} onChange={e => setForm(f => ({ ...f, retail_price: e.target.value }))} /></div>
              </div>
              <div><Label>Quantity</Label><Input type="number" placeholder="0" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} /></div>
            </div>
          )}

          <Button onClick={handleSubmit} disabled={uploading} className="w-full">
            {mode === 'existing' ? 'Save Images to Item' : 'Add Item to Stock'}
          </Button>
        </DialogContent>
      </Dialog>

      <WebcamCapture open={webcamOpen} onOpenChange={setWebcamOpen} onCapture={handleFile} />
    </>
  );
}
