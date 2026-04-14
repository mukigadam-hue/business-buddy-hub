import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Share2, Download, Image, FileText, Printer, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ReceiptActionsProps {
  receiptRef: React.RefObject<HTMLDivElement>;
  fileName?: string;
  canShare?: boolean;
  canDownload?: boolean;
  canPrint?: boolean;
}

export default function ReceiptActions({ receiptRef, fileName = 'receipt', canShare = true, canDownload = true, canPrint = true }: ReceiptActionsProps) {
  const [busy, setBusy] = useState(false);
  const cachedBlobRef = useRef<Blob | null>(null);
  const cachedCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Pre-render on mount so sharing is instant
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (!receiptRef.current || cancelled) return;
      try {
        const canvas = await html2canvas(receiptRef.current, {
          scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false,
        });
        if (cancelled) return;
        cachedCanvasRef.current = canvas;
        const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/png'));
        if (!cancelled && blob) cachedBlobRef.current = blob;
      } catch { /* silent pre-render failure */ }
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [receiptRef]);

  const getCanvas = useCallback(async () => {
    if (cachedCanvasRef.current) return cachedCanvasRef.current;
    if (!receiptRef.current) return null;
    const canvas = await html2canvas(receiptRef.current, {
      scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false,
    });
    cachedCanvasRef.current = canvas;
    return canvas;
  }, [receiptRef]);

  const getImageBlob = useCallback(async (): Promise<Blob | null> => {
    if (cachedBlobRef.current) return cachedBlobRef.current;
    const canvas = await getCanvas();
    if (!canvas) return null;
    const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/png'));
    if (blob) cachedBlobRef.current = blob;
    return blob;
  }, [getCanvas]);

  const getPDFBlob = useCallback(async (): Promise<Blob | null> => {
    const canvas = await getCanvas();
    if (!canvas) return null;
    const imgData = canvas.toDataURL('image/png');
    const pdfW = 80;
    const pdfH = (canvas.height * pdfW) / canvas.width;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [pdfW, pdfH + 10] });
    pdf.addImage(imgData, 'PNG', 0, 5, pdfW, pdfH);
    return pdf.output('blob');
  }, [getCanvas]);

  function downloadBlob(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  /** Share a file using native share API — sends the actual file, not a URL */
  async function nativeFileShare(blob: Blob, name: string, mime: string): Promise<boolean> {
    try {
      const file = new File([blob], name, { type: mime });
      // IMPORTANT: only pass `files` — no title/text/url so platforms show the image/pdf directly
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
        return true;
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return true; // user cancelled, not an error
    }
    return false;
  }

  async function handleShareAsImage() {
    setBusy(true);
    try {
      const blob = await getImageBlob();
      if (!blob) { toast.error('Failed to generate image'); return; }
      const shared = await nativeFileShare(blob, `${fileName}.png`, 'image/png');
      if (!shared) {
        downloadBlob(blob, `${fileName}.png`);
        toast.success('Image downloaded — share it from your gallery!');
      }
    } catch { toast.error('Share failed'); }
    finally { setBusy(false); }
  }

  async function handleShareAsPDF() {
    setBusy(true);
    try {
      const blob = await getPDFBlob();
      if (!blob) { toast.error('Failed to generate PDF'); return; }
      const shared = await nativeFileShare(blob, `${fileName}.pdf`, 'application/pdf');
      if (!shared) {
        downloadBlob(blob, `${fileName}.pdf`);
        toast.success('PDF downloaded — share it from your files!');
      }
    } catch { toast.error('Share failed'); }
    finally { setBusy(false); }
  }

  async function handleSaveImage() {
    setBusy(true);
    try {
      const blob = await getImageBlob();
      if (!blob) { toast.error('Failed'); return; }
      downloadBlob(blob, `${fileName}.png`);
      toast.success('Image saved!');
    } catch { toast.error('Save failed'); }
    finally { setBusy(false); }
  }

  async function handleSavePDF() {
    setBusy(true);
    try {
      const blob = await getPDFBlob();
      if (!blob) { toast.error('Failed'); return; }
      downloadBlob(blob, `${fileName}.pdf`);
      toast.success('PDF saved!');
    } catch { toast.error('Save failed'); }
    finally { setBusy(false); }
  }

  async function handlePrint() {
    setBusy(true);
    try {
      // Strategy 1: native share to printer apps (mobile)
      const blob = await getImageBlob();
      if (blob) {
        const shared = await nativeFileShare(blob, `${fileName}.png`, 'image/png');
        if (shared) { setBusy(false); return; }
      }

      // Strategy 2: Download as image + prompt user to print from gallery (best mobile compatibility)
      const canvas = await getCanvas();
      if (!canvas) { toast.error('Failed to generate receipt'); setBusy(false); return; }
      const imgData = canvas.toDataURL('image/png');

      // Try opening a new window with the image for printing
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`<!DOCTYPE html><html><head><title>Receipt</title>
          <style>*{margin:0;padding:0}body{background:#fff;display:flex;justify-content:center;align-items:flex-start;min-height:100vh}
          img{max-width:100%;height:auto}@media print{@page{size:80mm auto;margin:0}body{margin:0}img{width:80mm}}</style>
          </head><body><img src="${imgData}" onload="setTimeout(function(){window.print()},400)" /></body></html>`);
        printWindow.document.close();
      } else {
        // Fallback: download the image so user can print from gallery
        if (blob) {
          downloadBlob(blob, `${fileName}.png`);
          toast.info('Receipt saved — open and print from your gallery/files app.');
        } else {
          // Generate blob from canvas as last resort
          const fallbackBlob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/png'));
          if (fallbackBlob) {
            downloadBlob(fallbackBlob, `${fileName}.png`);
            toast.info('Receipt saved — open and print from your gallery/files app.');
          } else {
            toast.error('Could not generate receipt for printing.');
          }
        }
      }
    } catch { toast.error('Print failed'); }
    finally { setBusy(false); }
  }

  const premiumToast = () => toast.info('Premium feature — upgrade for $52/year to unlock.');

  return (
    <div className="flex gap-2 justify-center pt-3 flex-wrap">
      {canShare ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1.5" disabled={busy}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Share2 className="h-3.5 w-3.5" />} Share
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center">
            <DropdownMenuItem onClick={handleShareAsImage} className="gap-2">
              <Image className="h-4 w-4" /> Share as Image
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleShareAsPDF} className="gap-2">
              <FileText className="h-4 w-4" /> Share as PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button size="sm" variant="outline" className="gap-1.5 opacity-60" onClick={premiumToast}>
          <Share2 className="h-3.5 w-3.5" /> Share 🔒
        </Button>
      )}

      {canDownload ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1.5" disabled={busy}>
              <Download className="h-3.5 w-3.5" /> Save
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center">
            <DropdownMenuItem onClick={handleSaveImage} className="gap-2">
              <Image className="h-4 w-4" /> Save as Image
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSavePDF} className="gap-2">
              <FileText className="h-4 w-4" /> Save as PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button size="sm" variant="outline" className="gap-1.5 opacity-60" onClick={premiumToast}>
          <Download className="h-3.5 w-3.5" /> Save 🔒
        </Button>
      )}

      {canPrint ? (
        <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5" disabled={busy}>
          <Printer className="h-3.5 w-3.5" /> Print
        </Button>
      ) : (
        <Button size="sm" variant="outline" className="gap-1.5 opacity-60" onClick={premiumToast}>
          <Printer className="h-3.5 w-3.5" /> Print 🔒
        </Button>
      )}
    </div>
  );
}
