import { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Video, Square, X, Loader2 } from 'lucide-react';

interface ProofVideoRecorderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  requestMessage?: string;
  maxDurationSec?: number;
}

export default function ProofVideoRecorder({
  open, onOpenChange, onComplete,
  requestMessage = 'Video proof requested',
  maxDurationSec = 120,
}: ProofVideoRecorderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [ready, setReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const stopStream = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    setReady(false);
    setRecording(false);
    setElapsed(0);
  }, []);

  const startCamera = useCallback(async () => {
    stopStream();
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setReady(true);
      }
    } catch {
      setError('Could not access camera/microphone. Please allow permissions.');
    }
  }, [stopStream]);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => startCamera(), 200);
      return () => { clearTimeout(t); stopStream(); };
    } else {
      stopStream();
    }
  }, [open]);

  // Auto-stop at max duration
  useEffect(() => {
    if (elapsed >= maxDurationSec && recording) {
      handleStop();
    }
  }, [elapsed, maxDurationSec, recording]);

  function handleStartRecording() {
    if (!streamRef.current) return;
    chunksRef.current = [];

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : 'video/mp4';

    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      saveToDevice();
    };
    recorder.start(1000); // collect data every second
    mediaRecorderRef.current = recorder;
    setRecording(true);
    setElapsed(0);

    timerRef.current = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
  }

  function handleStop() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  }

  function saveToDevice() {
    if (chunksRef.current.length === 0) return;
    const blob = new Blob(chunksRef.current, { type: chunksRef.current[0].type || 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proof-video-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    
    stopStream();
    onComplete();
    onOpenChange(false);
  }

  function handleCancel() {
    stopStream();
    chunksRef.current = [];
    onOpenChange(false);
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const progress = (elapsed / maxDurationSec) * 100;

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) handleCancel(); else onOpenChange(o); }}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        <DialogHeader className="p-3 pb-0">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Video className="h-4 w-4 text-destructive" />
            📹 Proof Video Recording
          </DialogTitle>
        </DialogHeader>
        <div className="px-3 pb-3">
          {requestMessage && (
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-2 mb-2">
              <p className="text-xs text-warning font-medium">📋 Request: {requestMessage}</p>
            </div>
          )}

          <div className="relative w-full rounded-lg overflow-hidden bg-black min-h-[200px] flex items-center justify-center">
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
            {recording && (
              <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-destructive text-destructive-foreground px-2 py-1 rounded-full text-xs font-bold animate-pulse">
                <span className="h-2 w-2 rounded-full bg-destructive-foreground" />
                REC {formatTime(elapsed)}
              </div>
            )}
          </div>

          {recording && (
            <div className="mt-2">
              <Progress value={progress} className="h-2" />
              <p className="text-[10px] text-muted-foreground text-center mt-1">
                {formatTime(elapsed)} / {formatTime(maxDurationSec)} — Video saves directly to your device
              </p>
            </div>
          )}

          <div className="flex gap-2 mt-2">
            {!recording ? (
              <Button size="sm" className="flex-1 bg-destructive hover:bg-destructive/90" onClick={handleStartRecording} disabled={!ready}>
                <Video className="h-3.5 w-3.5 mr-1" /> Start Recording
              </Button>
            ) : (
              <Button size="sm" variant="outline" className="flex-1 border-destructive text-destructive" onClick={handleStop}>
                <Square className="h-3.5 w-3.5 mr-1" /> Stop & Save
              </Button>
            )}
          </div>
          <Button variant="outline" size="sm" className="w-full mt-2" onClick={handleCancel}>
            <X className="h-3.5 w-3.5 mr-1" /> Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
