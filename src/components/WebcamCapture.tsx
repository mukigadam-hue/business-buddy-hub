import { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, X, SwitchCamera, Loader2 } from 'lucide-react';

interface WebcamCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (file: File) => void;
}

export default function WebcamCapture({ open, onOpenChange, onCapture }: WebcamCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setReady(false);
  }, []);

  const startStream = useCallback(async (facing: 'user' | 'environment') => {
    stopStream();
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setReady(true);
      }
    } catch {
      setError('Could not access camera. Please allow camera permission.');
    }
  }, [stopStream]);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => startStream(facingMode), 200);
      return () => { clearTimeout(t); stopStream(); };
    } else {
      stopStream();
    }
  }, [open]);

  function handleFlip() {
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    startStream(next);
  }

  function handleCapture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(blob => {
      if (blob) {
        const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCapture(file);
        stopStream();
        onOpenChange(false);
      }
    }, 'image/jpeg', 0.85);
  }

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) stopStream(); onOpenChange(o); }}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        <DialogHeader className="p-3 pb-0">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Camera className="h-4 w-4 text-primary" /> Take Photo
          </DialogTitle>
        </DialogHeader>
        <div className="px-3 pb-3">
          <div className="relative w-full rounded-lg overflow-hidden bg-black min-h-[240px] flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-auto rounded-lg"
              style={{ display: ready ? 'block' : 'none' }}
            />
            {!ready && !error && (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            )}
            {error && (
              <p className="text-sm text-destructive p-4 text-center">{error}</p>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <div className="flex gap-2 mt-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={handleFlip} disabled={!ready}>
              <SwitchCamera className="h-3.5 w-3.5 mr-1" /> Flip
            </Button>
            <Button size="sm" className="flex-1" onClick={handleCapture} disabled={!ready}>
              <Camera className="h-3.5 w-3.5 mr-1" /> Capture
            </Button>
          </div>
          <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => { stopStream(); onOpenChange(false); }}>
            <X className="h-3.5 w-3.5 mr-1" /> Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
