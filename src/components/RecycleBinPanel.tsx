import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { RotateCcw, Trash2, RefreshCw } from 'lucide-react';
import { useBusiness } from '@/context/BusinessContext';
import { useCurrency } from '@/hooks/useCurrency';
import {
  loadRecycleBin,
  restoreRecord,
  permanentDeleteRecord,
  undoStockReversal,
  type RecycledRecord,
} from '@/lib/recycleBin';

export default function RecycleBinPanel() {
  const { currentBusiness, userRole, refreshData } = useBusiness();
  const { fmt } = useCurrency();
  const [records, setRecords] = useState<RecycledRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const canPermanentDelete = userRole === 'owner' || userRole === 'admin';

  const load = useCallback(async () => {
    if (!currentBusiness?.id) return;
    setLoading(true);
    try {
      setRecords(await loadRecycleBin(currentBusiness.id));
    } finally {
      setLoading(false);
    }
  }, [currentBusiness?.id]);

  useEffect(() => { load(); }, [load]);

  async function onRestore(r: RecycledRecord) {
    setBusyId(r.id);
    try {
      // Undo any stock side-effects applied on soft-delete
      await undoStockReversal(r.table, r.id);
      const ok = await restoreRecord(r.table, r.id);
      if (ok) {
        toast.success('Restored from Recycle Bin');
        setRecords(prev => prev.filter(x => x.id !== r.id));
        await refreshData();
      }
    } finally {
      setBusyId(null);
    }
  }

  async function onPermanentDelete(r: RecycledRecord) {
    if (!canPermanentDelete) {
      toast.error('Only the owner or admin can permanently delete records');
      return;
    }
    if (!window.confirm(`Permanently delete this record? This cannot be undone.\n\n${r.title}`)) return;
    setBusyId(r.id);
    try {
      const ok = await permanentDeleteRecord(r.table, r.id);
      if (ok) {
        toast.success('Permanently deleted');
        setRecords(prev => prev.filter(x => x.id !== r.id));
      }
    } finally {
      setBusyId(null);
    }
  }

  if (!currentBusiness) return null;

  return (
    <Card className="shadow-card border-destructive/20">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold flex items-center gap-2 text-destructive">
            🗑️ Recycle Bin {records.length > 0 && `(${records.length})`}
          </h2>
          <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Any team member can delete records (they land here). Only the owner/admin can permanently remove them. Use this to monitor who deleted what.
        </p>

        {loading && records.length === 0 && (
          <p className="text-xs text-muted-foreground italic">Loading…</p>
        )}

        {!loading && records.length === 0 && (
          <p className="text-xs text-muted-foreground italic">No deleted records. Everything is clean ✨</p>
        )}

        <div className="space-y-2 max-h-[480px] overflow-y-auto">
          {records.map(r => {
            const deletedAt = new Date(r.deleted_at);
            return (
              <div
                key={`${r.table}-${r.id}`}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-destructive/10"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-through text-muted-foreground">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{r.subtitle}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {r.amount !== undefined && <span className="font-semibold">{fmt(r.amount)} · </span>}
                    deleted {deletedAt.toLocaleDateString()} {deletedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {r.deleted_by_name && ` by ${r.deleted_by_name}`}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{r.table.replace(/_/g, ' ')}</p>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === r.id}
                    onClick={() => onRestore(r)}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />Restore
                  </Button>
                  {canPermanentDelete && (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busyId === r.id}
                      onClick={() => onPermanentDelete(r)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />Delete
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
