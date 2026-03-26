import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface ImageLightboxProps {
  images: string[];
  initialIndex?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
}

export default function ImageLightbox({ images, initialIndex = 0, open, onOpenChange, title }: ImageLightboxProps) {
  const [idx, setIdx] = useState(initialIndex);
  const validImages = images.filter(Boolean);
  if (validImages.length === 0) return null;

  const current = Math.min(idx, validImages.length - 1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none overflow-hidden">
        <button onClick={() => onOpenChange(false)} className="absolute top-3 right-3 z-50 h-9 w-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors">
          <X className="h-5 w-5" />
        </button>
        {title && <p className="absolute top-3 left-3 z-50 text-white text-sm font-medium bg-black/50 px-3 py-1 rounded-full">{title}</p>}
        
        <div className="flex items-center justify-center w-full h-[85vh] relative">
          <img
            src={validImages[current]}
            alt={title || 'Image'}
            className="max-w-full max-h-full object-contain select-none"
            draggable={false}
          />
          
          {validImages.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setIdx(i => (i - 1 + validImages.length) % validImages.length); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setIdx(i => (i + 1) % validImages.length); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {validImages.map((_, i) => (
                  <button key={i} onClick={() => setIdx(i)} className={`h-2 w-2 rounded-full transition-colors ${i === current ? 'bg-white' : 'bg-white/40'}`} />
                ))}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
