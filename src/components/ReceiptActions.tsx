import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Share2, Download, Image, FileText, Printer, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { triggerInterstitial } from '@/lib/interstitialAd';
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
  const cachedPagesRef = useRef<HTMLCanvasElement[] | null>(null);

  /** Find each paginated page element; fall back to the container itself. */
  const getPageElements = useCallback((): HTMLElement[] => {
    if (!receiptRef.current) return [];
    const pages = Array.from(
      receiptRef.current.querySelectorAll<HTMLElement>('[data-receipt-page]')
    );
    return pages.length ? pages : [receiptRef.current];
  }, [receiptRef]);

  const getPageCanvases = useCallback(async (): Promise<HTMLCanvasElement[]> => {
    if (cachedPagesRef.current) return cachedPagesRef.current;
    const elements = getPageElements();
    const canvases: HTMLCanvasElement[] = [];
    for (const el of elements) {
      const canvas = await html2canvas(el, {
        scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false,
      });
      canvases.push(canvas);
    }
    cachedPagesRef.current = canvases;
    return canvases;
  }, [getPageElements]);

  /** Stitch all pages vertically into one tall PNG (for single-image share/save). */
  const getStitchedImageBlob = useCallback(async (): Promise<Blob | null> => {
    const pages = await getPageCanvases();
    if (!pages.length) return null;
    if (pages.length === 1) {
      return new Promise<Blob | null>(r => pages[0].toBlob(r, 'image/png'));
    }
    const width = Math.max(...pages.map(c => c.width));
    const gap = 24; // separator between pages in the stitched image
    const height = pages.reduce((s, c) => s + c.height, 0) + gap * (pages.length - 1);
    const out = document.createElement('canvas');
    out.width = width; out.height = height;
    const ctx = out.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    let y = 0;
    for (let i = 0; i < pages.length; i++) {
      const c = pages[i];
      ctx.drawImage(c, Math.floor((width - c.width) / 2), y);
      y += c.height + gap;
    }
    return new Promise<Blob | null>(r => out.toBlob(r, 'image/png'));
  }, [getPageCanvases]);

  /** Multi-page PDF — one PDF page per receipt page, 80mm receipt width. */
  const getPDFBlob = useCallback(async (): Promise<Blob | null> => {
    const pages = await getPageCanvases();
    if (!pages.length) return null;
    const pdfW = 80;
    let pdf: jsPDF | null = null;
    for (let i = 0; i < pages.length; i++) {
      const canvas = pages[i];
      const imgData = canvas.toDataURL('image/png');
      const pdfH = (canvas.height * pdfW) / canvas.width;
      const pageFormat: [number, number] = [pdfW, pdfH + 10];
      if (!pdf) {
        pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: pageFormat });
      } else {
        pdf.addPage(pageFormat, 'portrait');
      }
      pdf.addImage(imgData, 'PNG', 0, 5, pdfW, pdfH);
    }
    return pdf ? pdf.output('blob') : null;
  }, [getPageCanvases]);

  function reportSave(result: DownloadResult, label: string) {
    if (result === 'shared') toast.success(`${label} ready — choose where to save it.`);
    else if (result === 'native-download') toast.success(`${label} downloading to your device…`);
    else if (result === 'browser-download') toast.success(`${label} saved!`);
    else toast.error(`Could not save the ${label.toLowerCase()}. Check your connection and try again.`);
  }

  async function handleShareAsImage() {
    setBusy(true);
    try {
      const blob = await getStitchedImageBlob();
      if (!blob) { toast.error('Failed to generate image'); return; }
      reportSave(await shareFile(blob, `${fileName}.png`, 'image/png'), 'Image');
      triggerInterstitial('export-share-image');
    } catch { toast.error('Share failed'); }
    finally { setBusy(false); }
  }

  async function handleShareAsPDF() {
    setBusy(true);
    try {
      const blob = await getPDFBlob();
      if (!blob) { toast.error('Failed to generate PDF'); return; }
      reportSave(await shareFile(blob, `${fileName}.pdf`, 'application/pdf'), 'PDF');
      triggerInterstitial('export-share-pdf');
    } catch { toast.error('Share failed'); }
    finally { setBusy(false); }
  }

  async function handleSaveImage() {
    setBusy(true);
    try {
      const blob = await getStitchedImageBlob();
      if (!blob) { toast.error('Failed'); return; }
      reportSave(await saveFile(blob, `${fileName}.png`, 'image/png'), 'Image');
      triggerInterstitial('export-save-image');
    } catch { toast.error('Save failed'); }
    finally { setBusy(false); }
  }

  async function handleSavePDF() {
    setBusy(true);
    try {
      const blob = await getPDFBlob();
      if (!blob) { toast.error('Failed'); return; }
      reportSave(await saveFile(blob, `${fileName}.pdf`, 'application/pdf'), 'PDF');
      triggerInterstitial('export-save-pdf');
    } catch { toast.error('Save failed'); }
    finally { setBusy(false); }
  }


  async function handlePrint() {
    setBusy(true);
    try {
      const blob = await getStitchedImageBlob();
      if (blob) {
        const shared = await nativeFileShare(blob, `${fileName}.png`, 'image/png');
        if (shared) { triggerInterstitial('export-print'); setBusy(false); return; }
      }
      const pages = await getPageCanvases();
      if (!pages.length) { toast.error('Failed to generate receipt'); setBusy(false); return; }
      const imgs = pages.map(c => c.toDataURL('image/png'));
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const body = imgs.map(src => `<img src="${src}" />`).join('<div class="pb"></div>');
        printWindow.document.write(`<!DOCTYPE html><html><head><title>Receipt</title>
          <style>*{margin:0;padding:0}body{background:#fff;display:flex;flex-direction:column;align-items:center;min-height:100vh}
          img{max-width:100%;height:auto;display:block}
          .pb{page-break-after:always}
          @media print{@page{size:80mm auto;margin:0}body{margin:0}img{width:80mm}}</style>
          </head><body onload="setTimeout(function(){window.print()},500)">${body}</body></html>`);
        printWindow.document.close();
      } else if (blob) {
        downloadBlob(blob, `${fileName}.png`);
        toast.info('Receipt saved — open and print from your gallery/files app.');
      }
      triggerInterstitial('export-print');
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
