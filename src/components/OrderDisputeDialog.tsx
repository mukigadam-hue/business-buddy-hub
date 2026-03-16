import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Camera, AlertTriangle, CheckCircle, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

interface OrderDisputeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderCode: string;
  supplierBusinessId: string;
  reporterBusinessId: string;
  onSubmitted: () => void;
}

export default function OrderDisputeDialog({
  open, onOpenChange, orderId, orderCode,
  supplierBusinessId, reporterBusinessId, onSubmitted
}: OrderDisputeDialogProps) {
  const [disputeType, setDisputeType] = useState('missing');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(f => f.type.startsWith('image/') && f.size <= 5 * 1024 * 1024);
    if (validFiles.length + photos.length > 5) {
      toast.error('Maximum 5 photos allowed');
      return;
    }
    setPhotos(prev => [...prev, ...validFiles]);
    validFiles.forEach(f => {
      const reader = new FileReader();
      reader.onload = ev => setPreviews(prev => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(f);
    });
  }

  function removePhoto(idx: number) {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit() {
    if (!description.trim()) { toast.error('Please describe the issue'); return; }
    setSubmitting(true);
    try {
      // Upload photos
      const photoUrls: string[] = [];
      for (const photo of photos) {
        const ext = photo.name.split('.').pop();
        const fileName = `disputes/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from('payment-proofs').upload(fileName, photo);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from('payment-proofs').getPublicUrl(fileName);
        photoUrls.push(urlData.publicUrl);
      }

      // Create dispute
      const { error } = await supabase.from('order_disputes').insert({
        order_id: orderId,
        business_id: supplierBusinessId,
        reporter_business_id: reporterBusinessId,
        dispute_type: disputeType,
        description: description.trim(),
        photo_urls: photoUrls,
      } as any);
      if (error) throw error;

      // Send notification to supplier
      await supabase.from('notifications').insert({
        business_id: supplierBusinessId,
        type: 'order_dispute',
        title: '⚠️ Order Dispute Raised',
        message: `Dispute on order ${orderCode}: ${disputeType} — "${description.trim().slice(0, 100)}"`,
      });

      toast.success('Dispute submitted! Supplier will be notified.');
      onOpenChange(false);
      setDescription('');
      setPhotos([]);
      setPreviews([]);
      setDisputeType('missing');
      onSubmitted();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit dispute');
    } finally {
      setSubmitting(false);
    }
  }

  const DISPUTE_TYPES = [
    { value: 'missing', label: '📦 Missing Items', desc: 'Some items were not delivered' },
    { value: 'damaged', label: '💔 Damaged Items', desc: 'Items arrived damaged or broken' },
    { value: 'faulty', label: '⚠️ Faulty/Defective', desc: 'Items don\'t work properly' },
    { value: 'fake', label: '🚫 Fake/Counterfeit', desc: 'Items are not genuine' },
    { value: 'wrong', label: '❌ Wrong Items', desc: 'Received items not ordered' },
    { value: 'quantity', label: '🔢 Wrong Quantity', desc: 'Quantity doesn\'t match order' },
    { value: 'other', label: '📝 Other', desc: 'Other issue' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" /> Report Issue — {orderCode}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs font-semibold">Issue Type *</Label>
            <Select value={disputeType} onValueChange={setDisputeType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DISPUTE_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>
                    <span className="flex items-center gap-2">{t.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {DISPUTE_TYPES.find(t => t.value === disputeType)?.desc}
            </p>
          </div>

          <div>
            <Label className="text-xs font-semibold text-destructive">Description *</Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe what's wrong in detail... e.g. 'Ordered 50 boxes but only received 45. 3 boxes had damaged items inside.'"
              className="min-h-[80px]"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold">📸 Photo Evidence (optional, max 5)</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              {previews.map((p, i) => (
                <div key={i} className="relative w-16 h-16">
                  <img src={p} alt="" className="w-full h-full object-cover rounded-lg border" />
                  <button onClick={() => removePhoto(i)} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-4 h-4 text-[10px] flex items-center justify-center">×</button>
                </div>
              ))}
              {photos.length < 5 && (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-16 h-16 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:border-primary/50 transition-colors"
                >
                  <Camera className="h-4 w-4" />
                  <span className="text-[8px]">Add</span>
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
          </div>

          <Button onClick={handleSubmit} className="w-full" disabled={submitting || !description.trim()}>
            {submitting ? 'Submitting...' : <><AlertTriangle className="h-4 w-4 mr-2" />Submit Dispute</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Viewer for supplier to respond to disputes
export function DisputeResponseDialog({
  open, onOpenChange, dispute, onResponded
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dispute: any;
  onResponded: () => void;
}) {
  const [response, setResponse] = useState(dispute?.supplier_response || '');
  const [resolution, setResolution] = useState(dispute?.resolution || 'compensate');
  const [submitting, setSubmitting] = useState(false);

  async function handleRespond() {
    if (!response.trim()) { toast.error('Please enter a response'); return; }
    setSubmitting(true);
    try {
      await supabase.from('order_disputes').update({
        supplier_response: response.trim(),
        resolution,
        status: 'responded',
      } as any).eq('id', dispute.id);

      // Notify reporter
      await supabase.from('notifications').insert({
        business_id: dispute.reporter_business_id,
        type: 'dispute_response',
        title: '💬 Dispute Response',
        message: `Supplier responded to your dispute: "${response.trim().slice(0, 80)}" — Resolution: ${resolution}`,
      });

      toast.success('Response sent!');
      onOpenChange(false);
      onResponded();
    } catch (err: any) {
      toast.error(err.message || 'Failed to respond');
    } finally {
      setSubmitting(false);
    }
  }

  const RESOLUTIONS = [
    { value: 'compensate', label: '💰 Compensate', desc: 'Refund or credit the buyer' },
    { value: 'exchange', label: '🔄 Exchange', desc: 'Replace with correct items' },
    { value: 'partial_refund', label: '💵 Partial Refund', desc: 'Refund part of the amount' },
    { value: 'reject_claim', label: '❌ Reject Claim', desc: 'Dispute the complaint' },
  ];

  if (!dispute) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" /> Respond to Dispute
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg text-sm space-y-1">
            <p className="font-semibold capitalize">⚠️ {dispute.dispute_type} issue</p>
            <p className="text-muted-foreground">{dispute.description}</p>
          </div>

          {dispute.photo_urls?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {(dispute.photo_urls as string[]).map((url: string, i: number) => (
                <img key={i} src={url} alt="" className="w-20 h-20 object-cover rounded-lg border cursor-pointer" onClick={() => window.open(url, '_blank')} />
              ))}
            </div>
          )}

          <div>
            <Label className="text-xs font-semibold">Resolution *</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {RESOLUTIONS.map(r => (
                <button key={r.value} onClick={() => setResolution(r.value)}
                  className={`p-2 rounded-lg border-2 text-left text-xs transition-all ${resolution === r.value ? 'border-primary bg-primary/5' : 'border-border'}`}>
                  <p className="font-semibold">{r.label}</p>
                  <p className="text-[10px] text-muted-foreground">{r.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold text-destructive">Your Response *</Label>
            <Textarea value={response} onChange={e => setResponse(e.target.value)}
              placeholder="Explain what you'll do to resolve this issue..."
              className="min-h-[80px]" />
          </div>

          <Button onClick={handleRespond} className="w-full" disabled={submitting || !response.trim()}>
            {submitting ? 'Sending...' : <><CheckCircle className="h-4 w-4 mr-2" />Send Response</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
