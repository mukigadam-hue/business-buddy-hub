import { useState } from 'react';
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
}

export default function ReceiptActions({ receiptRef, fileName = 'receipt' }: ReceiptActionsProps) {
  const [busy, setBusy] = useState(false);

  async function getCanvas() {
    if (!receiptRef.current) return null;
    return html2canvas(receiptRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });
  }

  async function generateBlob(): Promise<Blob | null> {
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

  async function shareFile(blob: Blob, name: string, type: string) {
    const file = new File([blob], name, { type });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Receipt', text: 'Here is your receipt' });
      toast.success('Shared successfully!');
    } else {
      // Fallback: open share URLs for common platforms
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.info('Share API not supported — file downloaded instead. You can share it manually via WhatsApp, email, etc.');
    }
  }

  async function handleShareAsImage() {
    setBusy(true);
    try {
      const blob = await generateBlob();
      if (!blob) { toast.error('Failed to generate image'); return; }
      await shareFile(blob, `${fileName}.png`, 'image/png');
    } catch (err: any) {
      if (err.name !== 'AbortError') toast.error('Share failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleShareAsPDF() {
    setBusy(true);
    try {
      const blob = await generatePDFBlob();
      if (!blob) { toast.error('Failed to generate PDF'); return; }
      await shareFile(blob, `${fileName}.pdf`, 'application/pdf');
    } catch (err: any) {
      if (err.name !== 'AbortError') toast.error('Share failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveImage() {
    setBusy(true);
    try {
      const blob = await generateBlob();
      if (!blob) { toast.error('Failed to generate image'); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${fileName}.png`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
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

  function handlePrint() {
    if (!receiptRef.current) return;
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) { toast.error('Pop-up blocked. Please allow pop-ups.'); return; }

    const styles = Array.from(document.styleSheets)
      .map(sheet => {
        try { return Array.from(sheet.cssRules).map(r => r.cssText).join('\n'); }
        catch { return ''; }
      }).join('\n');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head><title>Receipt</title>
      <style>
        ${styles}
        body { margin: 0; padding: 16px; background: white; }
        @media print { body { padding: 0; } }
      </style>
      </head><body>${receiptRef.current.innerHTML}</body></html>
    `);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.print(); printWindow.close(); };
  }

  return (
    <div className="flex gap-2 justify-center pt-3 flex-wrap">
      {/* Share dropdown: image or PDF */}
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

      {/* Save dropdown: image or PDF */}
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

      {/* Print */}
      <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5" disabled={busy}>
        <Printer className="h-3.5 w-3.5" /> Print
      </Button>
    </div>
  );
}
