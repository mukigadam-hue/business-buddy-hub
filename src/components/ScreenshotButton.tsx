import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { isDespiaShell, takeNativeScreenshot } from '@/lib/despiaScreenshot';
import { saveFile } from '@/lib/nativeDownload';

interface ScreenshotButtonProps {
  variant?: 'icon' | 'compact' | 'floating';
  className?: string;
}

/**
 * Universal screenshot button.
 * - In the Despia native shell: triggers `despia("takescreenshot://")` so the
 *   OS captures the screen and saves it to the gallery (works around web
 *   restrictions that block screenshots inside the app).
 * - On the web: falls back to capturing the current page with html2canvas
 *   and downloading it as a PNG.
 */
export default function ScreenshotButton({ variant = 'icon', className }: ScreenshotButtonProps) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    try {
      // Native shell — fastest, most reliable, saves to device gallery.
      if (isDespiaShell()) {
        const ok = takeNativeScreenshot();
        if (ok) {
          toast.success('Screenshot saved to your gallery');
          return;
        }
      }

      // Web fallback — render current viewport to PNG and trigger download.
      const html2canvas = (await import('html2canvas')).default;
      const target = document.body;
      const canvas = await html2canvas(target, {
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        scale: window.devicePixelRatio || 1,
      });
      const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/png'));
      if (!blob) {
        toast.error('Could not capture screenshot');
        return;
      }
      await saveFile(blob, `screenshot-${Date.now()}.png`, 'image/png');
      toast.success('Screenshot downloaded');
    } catch (err) {
      console.error('Screenshot failed:', err);
      toast.error('Screenshot failed');
    } finally {
      setBusy(false);
    }
  }

  if (variant === 'floating') {
    const button = (
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        title="Take a screenshot"
        aria-label="Take a screenshot"
        className={`fixed right-3 bottom-[calc(6rem+env(safe-area-inset-bottom,0px))] md:bottom-6 z-[9999] h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg ring-1 ring-primary/30 hover:bg-primary/90 active:scale-95 transition disabled:opacity-60 flex items-center justify-center pointer-events-auto ${className || ''}`}
      >
        <Camera className="h-5 w-5" />
      </button>
    );
    return createPortal(button, document.body);
  }

  if (variant === 'compact') {
    return (
      <Button
        variant="ghost"
        size="sm"
        className={`h-7 px-2 gap-1 text-xs ${className || ''}`}
        onClick={handleClick}
        disabled={busy}
        title="Take a screenshot"
      >
        <Camera className="h-3.5 w-3.5" /> Screenshot
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className={`h-8 w-8 ${className || ''}`}
      onClick={handleClick}
      disabled={busy}
      title="Take a screenshot"
      aria-label="Take a screenshot"
    >
      <Camera className="h-4 w-4" />
    </Button>
  );
}
