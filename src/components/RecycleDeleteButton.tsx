import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useBusiness } from '@/context/BusinessContext';
import { softDeleteRecord, applyStockReversal, type RecyclableTable } from '@/lib/recycleBin';

interface Props {
  table: RecyclableTable;
  recordId: string;
  label?: string;
  onDeleted?: () => void;
  size?: 'sm' | 'icon' | 'default';
  variant?: 'ghost' | 'outline' | 'destructive';
  confirmText?: string;
}

/**
 * Soft-delete a record into the Recycle Bin (Settings → Recycle Bin).
 * Any team member can use this; only owners/admins can permanently delete.
 * Stock side-effects are reversed automatically.
 */
export default function RecycleDeleteButton({
  table, recordId, label, onDeleted, size = 'sm', variant = 'ghost', confirmText,
}: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { refreshData } = useBusiness();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    const msg = confirmText ?? t('recycleBin.moveConfirm');
    if (!window.confirm(msg)) return;
    setBusy(true);
    try {
      await applyStockReversal(table, recordId);
      const ok = await softDeleteRecord(table, recordId, {
        userId: user?.id,
        userName: user?.user_metadata?.full_name || user?.email || 'Member',
      });
      if (ok) {
        toast.success(t('recycleBin.moved'));
        await refreshData();
        onDeleted?.();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button size={size} variant={variant} disabled={busy} onClick={onClick} className="text-destructive hover:text-destructive hover:bg-destructive/10">
      <Trash2 className="h-3.5 w-3.5" />
      {label && <span className="ml-1">{label}</span>}
    </Button>
  );
}
