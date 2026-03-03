import React, { useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ImageUploadProps {
  bucket: string;
  path: string;
  currentUrl?: string;
  onUploaded: (url: string) => void;
  onRemoved?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export default function ImageUpload({ bucket, path, currentUrl, onUploaded, onRemoved, className = '', size = 'md', label }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const dimensions = size === 'sm' ? 'h-20 w-20' : size === 'lg' ? 'h-40 w-40' : 'h-28 w-28';
  const displayUrl = preview || currentUrl;

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }

    setUploading(true);
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `${path}/${Date.now()}.${ext}`;

    try {
      const { error } = await supabase.storage.from(bucket).upload(fileName, file, { upsert: true });
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);
      setPreview(publicUrl);
      onUploaded(publicUrl);
      toast.success('Image uploaded!');
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function handleRemove() {
    setPreview(null);
    onRemoved?.();
  }

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      {label && <p className="text-xs text-muted-foreground font-medium">{label}</p>}
      <div className={`relative ${dimensions} rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center overflow-hidden bg-muted/20`}>
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}
        {displayUrl ? (
          <>
            <img src={displayUrl} alt="Upload" className="h-full w-full object-cover" />
            {onRemoved && (
              <button onClick={handleRemove} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 z-10">
                <X className="h-3 w-3" />
              </button>
            )}
          </>
        ) : (
          <Camera className="h-6 w-6 text-muted-foreground/50" />
        )}
      </div>
      <div className="flex gap-1.5">
        <Button type="button" size="sm" variant="outline" className="text-xs h-7 px-2" disabled={uploading}
          onClick={() => cameraInputRef.current?.click()}>
          <Camera className="h-3 w-3 mr-1" />Photo
        </Button>
        <Button type="button" size="sm" variant="outline" className="text-xs h-7 px-2" disabled={uploading}
          onClick={() => fileInputRef.current?.click()}>
          <Upload className="h-3 w-3 mr-1" />Upload
        </Button>
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = ''; }} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = ''; }} />
    </div>
  );
}
