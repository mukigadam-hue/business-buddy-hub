import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/context/BusinessContext';
import { useCurrency } from '@/hooks/useCurrency';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useSubmitLock } from '@/hooks/useSubmitLock';
import { dbCall, isOfflineError } from '@/lib/offlineSubmit';
import { addToOfflineQueue } from '@/lib/offlineStore';

export type InvoiceSource = 'sale' | 'purchase' | 'order' | 'booking';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sourceType: InvoiceSource;
  sourceId: string;
  grandTotal: number;
  amountPaid: number;
  onSaved?: () => void;
}

export default function RecordPaymentDialog({ open, onOpenChange, sourceType, sourceId, grandTotal, amountPaid, onSaved }: Props) {
  const { t } = useTranslation();
  const { currentBusiness } = useBusiness();
  const { fmt } = useCurrency();
  const { locked, withLock } = useSubmitLock();
  const balance = Math.max(grandTotal - amountPaid, 0);
  const [amount, setAmount] = useState(String(balance));
  const [method, setMethod] = useState('cash');
  const [recordedBy, setRecordedBy] = useState('');
  const [notes, setNotes] = useState('');

  async function save() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error(t('invoice.invalidAmount')); return; }
    if (amt > balance + 0.01) { toast.error(t('invoice.exceedsBalance')); return; }
    if (!currentBusiness) return;
    const payment = {
      business_id: currentBusiness.id,
      source_type: sourceType,
      source_id: sourceId,
      amount: amt,
      payment_method: method,
      recorded_by: recordedBy.trim() || 'Staff',
      notes: notes.trim(),
    };
    const { error } = await dbCall(supabase.from('invoice_payments').insert(payment as any));
    if (error && isOfflineError(error)) {
      await addToOfflineQueue({ action: 'create_invoice_payment', payload: { payment }, optimisticIds: [] });
      toast.success(t('invoice.paymentSavedOffline', 'Payment saved offline — will sync when online'));
      setAmount('0'); setNotes(''); setRecordedBy('');
      onOpenChange(false);
      onSaved?.();
      return;
    }
    if (error) { toast.error(error.message); return; }
    toast.success(t('invoice.paymentRecorded'));
    setAmount('0'); setNotes(''); setRecordedBy('');
    onOpenChange(false);
    onSaved?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('invoice.recordPayment')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs bg-muted/40 rounded-lg p-2">
            <div><span className="text-muted-foreground">{t('invoice.total')}: </span><span className="font-bold tabular-nums">{fmt(grandTotal)}</span></div>
            <div><span className="text-muted-foreground">{t('invoice.paid')}: </span><span className="font-bold tabular-nums text-success">{fmt(amountPaid)}</span></div>
            <div className="col-span-2"><span className="text-muted-foreground">{t('invoice.balance')}: </span><span className="font-bold tabular-nums text-destructive">{fmt(balance)}</span></div>
          </div>
          <div>
            <Label>{t('invoice.amount')}</Label>
            <Input type="number" min="0.01" step="0.01" max={balance} value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div>
            <Label>{t('invoice.method')}</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">{t('invoice.methods.cash')}</SelectItem>
                <SelectItem value="mobile_money">{t('invoice.methods.mobileMoney')}</SelectItem>
                <SelectItem value="bank">{t('invoice.methods.bank')}</SelectItem>
                <SelectItem value="card">{t('invoice.methods.card')}</SelectItem>
                <SelectItem value="other">{t('invoice.methods.other')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t('invoice.recordedBy')}</Label>
            <Input value={recordedBy} onChange={e => setRecordedBy(e.target.value)} placeholder={t('invoice.recordedByPh')} />
          </div>
          <div>
            <Label>{t('invoice.notes')}</Label>
            <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={locked}>{t('invoice.cancel')}</Button>
          <Button onClick={() => withLock(save)} disabled={locked}>{locked ? t('invoice.saving') : t('invoice.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
