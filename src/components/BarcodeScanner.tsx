import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScanLine, X, Lock } from 'lucide-react';
import { usePremium } from '@/hooks/usePremium';
import { toast } from 'sonner';

interface BarcodeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (code: string) => void;
}

// All supported 1D + 2D formats for maximum compatibility
const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
  Html5QrcodeSupportedFormats.AZTEC,
  Html5QrcodeSupportedFormats.PDF_417,
];

// Generate a short beep sound on successful scan
function playBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(1800, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.15);
    setTimeout(() => ctx.close(), 200);
  } catch {
    // Audio not available
  }
}

// Trigger haptic feedback
function triggerHaptic() {
  try {
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  } catch {
    // Vibration not available
  }
}

export default function BarcodeScanner({ open, onOpenChange, onScan }: BarcodeScannerProps) {
  const { canUseScanner } = usePremium();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const hasScannedRef = useRef(false);

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
      hasScannedRef.current = false;
      return;
    }

    const timeout = setTimeout(async () => {
      setError(null);
      hasScannedRef.current = false;
      try {
        const scanner = new Html5Qrcode('barcode-reader', {
          formatsToSupport: SUPPORTED_FORMATS,
          verbose: false,
        });
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 15,
            qrbox: { width: 260, height: 260 },
            aspectRatio: 1.0,
            disableFlip: false,
          },
          (decodedText) => {
            if (hasScannedRef.current) return;
            hasScannedRef.current = true;

            // Haptic + beep feedback
            triggerHaptic();
            playBeep();

            // Show success toast
            toast.success('Scanned successfully!', {
              description: decodedText.length > 40 ? decodedText.slice(0, 40) + '…' : decodedText,
              duration: 2000,
            });

            // Callback
            onScan(decodedText);

            // Close after brief delay for feedback
            setTimeout(() => {
              stopScanner();
              onOpenChange(false);
            }, 300);
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
            <p className="text-sm text-muted-foreground">Barcode scanning is available on the Premium plan ($52/year).</p>
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
            <ScanLine className="h-4 w-4 text-primary" /> Scan Barcode / QR Code
          </DialogTitle>
        </DialogHeader>
        <div className="px-3 pb-3">
          {/* Scanner container with viewfinder overlay */}
          <div className="relative w-full rounded-lg overflow-hidden bg-black min-h-[300px]">
            <div id="barcode-reader" className="w-full" />
            
            {/* Centered viewfinder overlay */}
            {scanning && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {/* Semi-transparent overlay around scan region */}
                <div className="absolute inset-0 bg-black/40" />
                
                {/* Clear scan window */}
                <div className="relative z-10 w-[260px] h-[260px]">
                  {/* Cut-out effect using box-shadow */}
                  <div className="absolute inset-0 rounded-lg" style={{
                    boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
                  }} />
                  
                  {/* Corner brackets */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] border-primary rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] border-primary rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[3px] border-l-[3px] border-primary rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[3px] border-r-[3px] border-primary rounded-br-lg" />
                  
                  {/* Animated scan line */}
                  <div className="absolute left-2 right-2 h-[2px] bg-primary/80 animate-scan-line rounded-full" />
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-2 text-sm text-destructive bg-destructive/10 rounded-lg p-2">
              {error}
            </div>
          )}
          <p className="text-xs text-muted-foreground text-center mt-2">
            Align barcode or QR code within the viewfinder
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
