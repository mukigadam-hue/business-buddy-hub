import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Share2, Download, Printer } from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ReceiptActionsProps {
  receiptRef: React.RefObject<HTMLDivElement>;
  fileName?: string;
}

export default function ReceiptActions({ receiptRef, fileName = 'receipt' }: ReceiptActionsProps) {

  async function getCanvas() {
    if (!receiptRef.current) return null;
    return html2canvas(receiptRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });
  }

  async function handleShareImage() {
    try {
      const canvas = await getCanvas();
      if (!canvas) return;
      const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'));
      if (!blob) { toast.error('Failed to generate image'); return; }

      const file = new File([blob], `${fileName}.png`, { type: 'image/png' });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Receipt', text: 'Here is your receipt' });
        toast.success('Shared successfully!');
      } else {
        // Fallback: download the image
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${fileName}.png`;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
        toast.success('Receipt image downloaded!');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') toast.error('Share failed');
    }
  }

  async function handleDownloadPDF() {
    try {
      const canvas = await getCanvas();
      if (!canvas) return;
      const imgData = canvas.toDataURL('image/png');
      const imgW = canvas.width;
      const imgH = canvas.height;

      // A4-ish width in mm, scale height proportionally
      const pdfW = 80; // receipt width in mm (thermal-style)
      const pdfH = (imgH * pdfW) / imgW;

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [pdfW, pdfH + 10] });
      pdf.addImage(imgData, 'PNG', 0, 5, pdfW, pdfH);
      pdf.save(`${fileName}.pdf`);
      toast.success('PDF downloaded!');
    } catch {
      toast.error('PDF generation failed');
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
    <div className="flex gap-2 justify-center pt-3">
      <Button size="sm" variant="outline" onClick={handleShareImage} className="gap-1.5">
        <Share2 className="h-3.5 w-3.5" /> Share
      </Button>
      <Button size="sm" variant="outline" onClick={handleDownloadPDF} className="gap-1.5">
        <Download className="h-3.5 w-3.5" /> PDF
      </Button>
      <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5">
        <Printer className="h-3.5 w-3.5" /> Print
      </Button>
    </div>
  );
}
