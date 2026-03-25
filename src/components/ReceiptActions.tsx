import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Share2, Download, Image, FileText, Printer, Loader2, MessageCircle, Mail, Send } from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface ReceiptActionsProps {
  receiptRef: React.RefObject<HTMLDivElement>;
  fileName?: string;
  canShare?: boolean;
  canDownload?: boolean;
  canPrint?: boolean;
}

export default function ReceiptActions({ receiptRef, fileName = 'receipt', canShare = true, canDownload = true, canPrint = true }: ReceiptActionsProps) {
  const [busy, setBusy] = useState(false);
  const [shareDialog, setShareDialog] = useState<{ blob: Blob; name: string; type: 'image' | 'pdf'; url?: string } | null>(null);

  async function getCanvas() {
    if (!receiptRef.current) return null;
    return html2canvas(receiptRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });
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

  async function uploadShareFile(blob: Blob, name: string) {
    const ext = name.split('.').pop() || (blob.type === 'application/pdf' ? 'pdf' : 'png');
    const path = `receipts/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('payment-proofs').upload(path, blob, {
      contentType: blob.type || 'application/octet-stream',
      upsert: false,
    });
    if (error) throw error;
    return supabase.storage.from('payment-proofs').getPublicUrl(path).data.publicUrl;
  }

  async function tryNativeShare(blob: Blob, name: string, type: string): Promise<boolean> {
    try {
      const file = new File([blob], name, { type });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Receipt', text: 'Here is your receipt' });
        toast.success('Shared successfully!');
        return true;
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return true; // user cancelled, don't show fallback
    }
    return false;
  }

  async function handleShareAsImage() {
    setBusy(true);
    try {
      const blob = await generateImageBlob();
      if (!blob) { toast.error('Failed to generate image'); return; }
      const shared = await tryNativeShare(blob, `${fileName}.png`, 'image/png');
      if (!shared) {
        setShareDialog({ blob, name: `${fileName}.png`, type: 'image' });
      }
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
      const shared = await tryNativeShare(blob, `${fileName}.pdf`, 'application/pdf');
      if (!shared) {
        setShareDialog({ blob, name: `${fileName}.pdf`, type: 'pdf' });
      }
    } catch {
      toast.error('Share failed');
    } finally {
      setBusy(false);
    }
  }

  async function handlePlatformShare(platform: string) {
    if (!shareDialog) return;
    setBusy(true);
    try {
      const shareUrl = shareDialog.url || await uploadShareFile(shareDialog.blob, shareDialog.name);
      setShareDialog(current => current ? { ...current, url: shareUrl } : current);

      const message = encodeURIComponent(`Here is your receipt 🧾\n${shareUrl}`);
      const shareUrlEncoded = encodeURIComponent(shareUrl);
      let url = '';

      switch (platform) {
        case 'whatsapp':
          url = `https://wa.me/?text=${message}`;
          break;
        case 'telegram':
          url = `https://t.me/share/url?url=${shareUrlEncoded}&text=${encodeURIComponent('Here is your receipt 🧾')}`;
          break;
        case 'email':
          url = `mailto:?subject=${encodeURIComponent('Receipt')}&body=${message}`;
          break;
        case 'x':
          url = `https://x.com/intent/tweet?text=${encodeURIComponent('Here is your receipt 🧾')}&url=${shareUrlEncoded}`;
          break;
        case 'facebook':
          url = `https://www.facebook.com/sharer/sharer.php?u=${shareUrlEncoded}`;
          break;
      }

      if (url) window.open(url, '_blank', 'noopener,noreferrer');
      toast.success('Receipt file link is ready and included in the share.');
      setShareDialog(null);
    } catch {
      downloadBlob(shareDialog.blob, shareDialog.name);
      toast.error('Could not create a shareable receipt link, so the file was downloaded instead.');
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

  const socialPlatforms = [
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: 'bg-green-500 hover:bg-green-600 text-white' },
    { id: 'telegram', label: 'Telegram', icon: Send, color: 'bg-blue-500 hover:bg-blue-600 text-white' },
    { id: 'facebook', label: 'Facebook', icon: Share2, color: 'bg-blue-700 hover:bg-blue-800 text-white' },
    { id: 'x', label: 'X (Twitter)', icon: Share2, color: 'bg-gray-900 hover:bg-black text-white' },
    { id: 'email', label: 'Email', icon: Mail, color: 'bg-amber-500 hover:bg-amber-600 text-white' },
  ];

  const premiumToast = () => toast.info('Premium feature — upgrade for $52/year to unlock.');

  return (
    <>
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

      {/* Social media share dialog (fallback when native share isn't available) */}
      <Dialog open={!!shareDialog} onOpenChange={(open) => !open && setShareDialog(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-center">Share Receipt</DialogTitle>
            <DialogDescription className="text-center text-sm text-muted-foreground">
                Choose a platform. The exact JPG or PDF receipt file will be shared through a direct file link.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 pt-2">
            {socialPlatforms.map((p) => (
              <Button
                key={p.id}
                size="sm"
                className={`gap-2 ${p.color}`}
                  disabled={busy}
                onClick={() => handlePlatformShare(p.id)}
              >
                <p.icon className="h-4 w-4" />
                {p.label}
              </Button>
            ))}
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="mt-1"
            onClick={() => {
              if (shareDialog) downloadBlob(shareDialog.blob, shareDialog.name);
              toast.success('File downloaded!');
              setShareDialog(null);
            }}
          >
            <Download className="h-4 w-4 mr-1.5" /> Just download
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
