import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScanLine, X, FlashlightOff, Flashlight, Lock } from 'lucide-react';
import { usePremium } from '@/hooks/usePremium';
import { toast } from 'sonner';

interface BarcodeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (code: string) => void;
}

export default function BarcodeScanner({ open, onOpenChange, onScan }: BarcodeScannerProps) {
  const { canUseScanner } = usePremium();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch {
        // ignore cleanup errors
      }
      scannerRef.current = null;
    }
    setScanning(false);
  }, []);

  useEffect(() => {
    if (!open) {
      stopScanner();
      return;
    }

    const timeout = setTimeout(async () => {
      setError(null);
      try {
        const scanner = new Html5Qrcode('barcode-reader');
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 120 },
            aspectRatio: 1.5,
          },
          (decodedText) => {
            onScan(decodedText);
            stopScanner();
            onOpenChange(false);
          },
          () => {
            // ignore scan failures (no barcode in frame)
          }
        );
        setScanning(true);
      } catch (err: any) {
        setError(err?.message || 'Could not access camera. Please allow camera permission.');
      }
    }, 300);

    return () => {
      clearTimeout(timeout);
      stopScanner();
    };
  }, [open]);

  if (!canUseScanner && open) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xs text-center">
          <div className="py-6 space-y-3">
            <Lock className="h-8 w-8 mx-auto text-amber-500" />
            <p className="font-semibold">Premium Feature</p>
            <p className="text-sm text-muted-foreground">Barcode scanning is available on the Premium plan ($52/month).</p>
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) stopScanner(); onOpenChange(o); }}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        <DialogHeader className="p-3 pb-0">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <ScanLine className="h-4 w-4 text-primary" /> Scan Barcode
          </DialogTitle>
        </DialogHeader>
        <div className="px-3 pb-3">
          <div
            id="barcode-reader"
            className="w-full rounded-lg overflow-hidden bg-black min-h-[200px]"
          />
          {error && (
            <div className="mt-2 text-sm text-destructive bg-destructive/10 rounded-lg p-2">
              {error}
            </div>
          )}
          <p className="text-xs text-muted-foreground text-center mt-2">
            Point your camera at a barcode on the product
          </p>
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-2"
            onClick={() => { stopScanner(); onOpenChange(false); }}
          >
            <X className="h-3.5 w-3.5 mr-1" /> Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
