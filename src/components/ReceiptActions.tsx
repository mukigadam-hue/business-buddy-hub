import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Share2, Download, Image, FileText, Printer, Loader2, MessageCircle, Mail, Send } from 'lucide-react';
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
  // Pre-generate canvas on mount for instant sharing
  const cachedCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // Pre-render canvas after a short delay to ensure receipt is painted
    const timer = setTimeout(async () => {
      if (receiptRef.current) {
        try {
          cachedCanvasRef.current = await html2canvas(receiptRef.current, {
            scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false,
          });
        } catch { /* silent */ }
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [receiptRef]);

  async function getCanvas() {
    if (cachedCanvasRef.current) return cachedCanvasRef.current;
    if (!receiptRef.current) return null;
    const canvas = await html2canvas(receiptRef.current, {
      scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false,
    });
    cachedCanvasRef.current = canvas;
    return canvas;
  }

  async function generateImageBlob(): Promise<Blob | null> {
    const canvas = await getCanvas();
    if (!canvas) return null;
    return new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'));
  }

  async function generatePDFBlob(): Promise<Blob | null> {
    const canvas = await getCanvas();
    if (!canvas) return null;
    const imgData = canvas.toDataURL('image/png');
    const pdfW = 80;
    const pdfH = (canvas.height * pdfW) / canvas.width;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [pdfW, pdfH + 10] });
    pdf.addImage(imgData, 'PNG', 0, 5, pdfW, pdfH);
    return pdf.output('blob');
  }

  function downloadBlob(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleShareAsImage() {
    setBusy(true);
    try {
      const blob = await generateImageBlob();
      if (!blob) { toast.error('Failed to generate image'); return; }
      const file = new File([blob], `${fileName}.png`, { type: 'image/png' });
      
      // Always try native file share first — sends actual image file, not a link
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'Receipt' });
          toast.success('Shared successfully!');
          return;
        } catch (err: any) {
          if (err.name === 'AbortError') return;
        }
      }
      
      // Fallback: download the file directly
      downloadBlob(blob, `${fileName}.png`);
      toast.success('Receipt image downloaded — share it from your gallery!');
    } catch {
      toast.error('Share failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleShareAsPDF() {
    setBusy(true);
    try {
      const blob = await generatePDFBlob();
      if (!blob) { toast.error('Failed to generate PDF'); return; }
      const file = new File([blob], `${fileName}.pdf`, { type: 'application/pdf' });
      
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'Receipt' });
          toast.success('Shared successfully!');
          return;
        } catch (err: any) {
          if (err.name === 'AbortError') return;
        }
      }
      
      downloadBlob(blob, `${fileName}.pdf`);
      toast.success('Receipt PDF downloaded — share it from your files!');
    } catch {
      toast.error('Share failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveImage() {
    setBusy(true);
    try {
      const blob = await generateImageBlob();
      if (!blob) { toast.error('Failed to generate image'); return; }
      downloadBlob(blob, `${fileName}.png`);
      toast.success('Image saved!');
    } catch {
      toast.error('Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleSavePDF() {
    setBusy(true);
    try {
      const canvas = await getCanvas();
      if (!canvas) return;
      const imgData = canvas.toDataURL('image/png');
      const pdfW = 80;
      const pdfH = (canvas.height * pdfW) / canvas.width;
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [pdfW, pdfH + 10] });
      pdf.addImage(imgData, 'PNG', 0, 5, pdfW, pdfH);
      pdf.save(`${fileName}.pdf`);
      toast.success('PDF saved!');
    } catch {
      toast.error('PDF save failed');
    } finally {
      setBusy(false);
    }
  }

  async function handlePrint() {
    if (!receiptRef.current) return;
    setBusy(true);
    try {
      const canvas = await getCanvas();
      if (!canvas) { toast.error('Failed to generate receipt for printing'); return; }
      const imgData = canvas.toDataURL('image/png');

      // Try native share first — this allows sharing to printer apps on mobile
      const blob = await generateImageBlob();
      if (blob) {
        const file = new File([blob], `${fileName}.png`, { type: 'image/png' });
        if (navigator.canShare?.({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: 'Print Receipt' });
            toast.success('Receipt sent to printer app!');
            return;
          } catch (err: any) {
            if (err.name === 'AbortError') return;
            // Fall through to window.print approach
          }
        }
      }

      // Fallback: open in new window and trigger print
      const printWindow = window.open('', '_blank', 'width=400,height=600');
      if (printWindow) {
        printWindow.document.write(`<!DOCTYPE html><html><head><title>Receipt</title>
          <style>*{margin:0;padding:0}body{display:flex;justify-content:center;background:#fff}img{max-width:100%;height:auto}@media print{body{margin:0}img{width:80mm}}</style>
          </head><body><img src="${imgData}" onload="setTimeout(function(){window.print();window.close()},200)" /></body></html>`);
        printWindow.document.close();
      } else {
        // Pop-up blocked: download instead
        if (blob) {
          downloadBlob(blob, `${fileName}.png`);
          toast.info('Pop-up blocked. Receipt downloaded — open it and print from your gallery.');
        }
      }
    } catch {
      toast.error('Print failed');
    } finally {
      setBusy(false);
    }
  }

  const premiumToast = () => toast.info('Premium feature — upgrade for $52/year to unlock.');

  return (
    <div className="flex gap-2 justify-center pt-3 flex-wrap">
      {/* Share dropdown */}
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

      {/* Save dropdown */}
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

      {/* Print */}
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
