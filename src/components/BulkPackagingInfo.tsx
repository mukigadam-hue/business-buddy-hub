import { useState, useEffect, useCallback } from 'react';
import { Switch } from '@/components/ui/switch';

interface PackagingProps {
  quantity: number;
  piecesPerCarton: number;
  cartonsPerBox: number;
  boxesPerContainer: number;
  compact?: boolean;
}

/**
 * Displays stock breakdown: Containers → Boxes → Cartons → Pieces
 * Only shows levels that are configured (> 0)
 */
export default function BulkPackagingInfo({
  quantity, piecesPerCarton, cartonsPerBox, boxesPerContainer, compact = false,
}: PackagingProps) {
  const hasPackaging = piecesPerCarton > 0;
  if (!hasPackaging) return null;

  let remaining = quantity;
  let containers = 0, boxes = 0, cartons = 0, pieces = 0;

  const piecesPerBox = piecesPerCarton * (cartonsPerBox || 1);
  const piecesPerContainer = piecesPerBox * (boxesPerContainer || 1);

  if (boxesPerContainer > 0 && cartonsPerBox > 0) {
    containers = Math.floor(remaining / piecesPerContainer);
    remaining = remaining % piecesPerContainer;
  }

  if (cartonsPerBox > 0) {
    boxes = Math.floor(remaining / piecesPerBox);
    remaining = remaining % piecesPerBox;
  }

  cartons = Math.floor(remaining / piecesPerCarton);
  pieces = remaining % piecesPerCarton;

  const parts: string[] = [];
  if (containers > 0) parts.push(`${containers} container${containers !== 1 ? 's' : ''}`);
  if (boxes > 0) parts.push(`${boxes} box${boxes !== 1 ? 'es' : ''}`);
  if (cartons > 0) parts.push(`${cartons} carton${cartons !== 1 ? 's' : ''}`);
  if (pieces > 0) parts.push(`${pieces} pc${pieces !== 1 ? 's' : ''}`);

  if (parts.length === 0) return null;

  if (compact) {
    return (
      <span className="text-[10px] text-muted-foreground">
        ({parts.join(' + ')})
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5 mt-0.5">
      {containers > 0 && (
        <span className="text-[10px] font-medium bg-accent/10 text-accent px-1.5 py-0.5 rounded">
          📦 {containers} Container{containers !== 1 ? 's' : ''}
        </span>
      )}
      {boxes > 0 && (
        <span className="text-[10px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded">
          📦 {boxes} Box{boxes !== 1 ? 'es' : ''}
        </span>
      )}
      {cartons > 0 && (
        <span className="text-[10px] font-medium bg-warning/10 text-warning px-1.5 py-0.5 rounded">
          📋 {cartons} Carton{cartons !== 1 ? 's' : ''}
        </span>
      )}
      {pieces > 0 && (
        <span className="text-[10px] font-medium bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
          🔹 {pieces} Piece{pieces !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}

/**
 * Form fields for configuring bulk packaging on stock items.
 * When bulk mode is ON, user fills containers/boxes/cartons/loose pieces
 * and total quantity is auto-calculated.
 * When OFF, user fills quantity directly.
 */
export function BulkPackagingFields({
  piecesPerCarton, cartonsPerBox, boxesPerContainer,
  onChange,
  onQuantityCalculated,
  currentQuantity,
}: {
  piecesPerCarton: string; cartonsPerBox: string; boxesPerContainer: string;
  onChange: (field: string, value: string) => void;
  onQuantityCalculated?: (totalPieces: number) => void;
  currentQuantity?: string;
}) {
  const ppc = parseInt(piecesPerCarton) || 0;
  const cpb = parseInt(cartonsPerBox) || 0;
  const bpc = parseInt(boxesPerContainer) || 0;
  const isBulkConfigured = ppc > 0;

  const [bulkEnabled, setBulkEnabled] = useState(isBulkConfigured);
  const [bulkQty, setBulkQty] = useState({ containers: '0', boxes: '0', cartons: '0', loosePieces: '0' });

  // When bulk config changes externally (e.g. editing existing item), sync state
  useEffect(() => {
    if (ppc > 0) {
      setBulkEnabled(true);
      // Reverse-calculate bulk quantities from current total quantity
      if (currentQuantity) {
        const total = parseInt(currentQuantity) || 0;
        let rem = total;
        let c = 0, b = 0, ct = 0;
        const piecesPerBox = ppc * (cpb || 1);
        const piecesPerContainer = piecesPerBox * (bpc || 1);
        if (bpc > 0 && cpb > 0) { c = Math.floor(rem / piecesPerContainer); rem %= piecesPerContainer; }
        if (cpb > 0) { b = Math.floor(rem / piecesPerBox); rem %= piecesPerBox; }
        ct = Math.floor(rem / ppc);
        const loose = rem % ppc;
        setBulkQty({ containers: String(c), boxes: String(b), cartons: String(ct), loosePieces: String(loose) });
      }
    }
  // Only run on mount/edit open
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recalcTotal = useCallback((ppcVal: number, cpbVal: number, bpcVal: number, qty: typeof bulkQty) => {
    if (ppcVal <= 0) return;
    const piecesPerBox = ppcVal * (cpbVal || 1);
    const piecesPerContainer = piecesPerBox * (bpcVal || 1);
    const total =
      (parseInt(qty.containers) || 0) * piecesPerContainer +
      (parseInt(qty.boxes) || 0) * piecesPerBox +
      (parseInt(qty.cartons) || 0) * ppcVal +
      (parseInt(qty.loosePieces) || 0);
    onQuantityCalculated?.(total);
  }, [onQuantityCalculated]);

  function handleBulkQtyChange(field: keyof typeof bulkQty, value: string) {
    const next = { ...bulkQty, [field]: value };
    setBulkQty(next);
    recalcTotal(ppc, cpb, bpc, next);
  }

  function handlePackagingChange(field: string, value: string) {
    onChange(field, value);
    // Recalc with new packaging values
    const newPpc = field === 'pieces_per_carton' ? (parseInt(value) || 0) : ppc;
    const newCpb = field === 'cartons_per_box' ? (parseInt(value) || 0) : cpb;
    const newBpc = field === 'boxes_per_container' ? (parseInt(value) || 0) : bpc;
    if (bulkEnabled && newPpc > 0) {
      recalcTotal(newPpc, newCpb, newBpc, bulkQty);
    }
  }

  function handleToggle(on: boolean) {
    setBulkEnabled(on);
    if (!on) {
      onChange('pieces_per_carton', '0');
      onChange('cartons_per_box', '0');
      onChange('boxes_per_container', '0');
    }
  }

  return (
    <div className="border rounded-lg p-3 space-y-2 bg-muted/20">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
          📦 Bulk Packaging
        </p>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">{bulkEnabled ? 'ON' : 'OFF'}</span>
          <Switch checked={bulkEnabled} onCheckedChange={handleToggle} />
        </div>
      </div>

      {!bulkEnabled && (
        <p className="text-[10px] text-muted-foreground">
          Bulk packaging is off. Fill quantity directly above.
        </p>
      )}

      {bulkEnabled && (
        <>
          <p className="text-[10px] text-muted-foreground">
            Define packaging structure, then fill how many of each you have. Total pieces auto-calculates.
          </p>

          {/* Packaging structure definition */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] font-medium text-muted-foreground">Pieces / Carton</label>
              <input
                type="number" min="1" value={piecesPerCarton}
                onChange={e => handlePackagingChange('pieces_per_carton', e.target.value)}
                className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="e.g. 12"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground">Cartons / Box</label>
              <input
                type="number" min="0" value={cartonsPerBox}
                onChange={e => handlePackagingChange('cartons_per_box', e.target.value)}
                className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="e.g. 10"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground">Boxes / Container</label>
              <input
                type="number" min="0" value={boxesPerContainer}
                onChange={e => handlePackagingChange('boxes_per_container', e.target.value)}
                className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="e.g. 20"
              />
            </div>
          </div>

          {ppc > 0 && (
            <p className="text-[10px] text-muted-foreground italic">
              ℹ️ 1 Carton = {ppc} pcs
              {cpb > 0 && ` · 1 Box = ${cpb} cartons (${ppc * cpb} pcs)`}
              {cpb > 0 && bpc > 0 && ` · 1 Container = ${bpc} boxes (${ppc * cpb * bpc} pcs)`}
            </p>
          )}

          {/* Quantity entry by bulk units */}
          {ppc > 0 && (
            <div className="border-t border-border pt-2 space-y-1.5">
              <p className="text-[10px] font-semibold text-foreground">How many do you have?</p>
              <div className="grid grid-cols-2 gap-2">
                {bpc > 0 && cpb > 0 && (
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground">🚛 Containers</label>
                    <input
                      type="number" min="0" value={bulkQty.containers}
                      onChange={e => handleBulkQtyChange('containers', e.target.value)}
                      className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                )}
                {cpb > 0 && (
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground">📦 Boxes</label>
                    <input
                      type="number" min="0" value={bulkQty.boxes}
                      onChange={e => handleBulkQtyChange('boxes', e.target.value)}
                      className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                )}
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground">📋 Cartons</label>
                  <input
                    type="number" min="0" value={bulkQty.cartons}
                    onChange={e => handleBulkQtyChange('cartons', e.target.value)}
                    className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground">🔹 Loose Pieces</label>
                  <input
                    type="number" min="0" value={bulkQty.loosePieces}
                    onChange={e => handleBulkQtyChange('loosePieces', e.target.value)}
                    className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>
              {/* Show calculated total */}
              {currentQuantity !== undefined && (
                <div className="bg-primary/10 text-primary rounded-md px-3 py-1.5 text-sm font-semibold text-center">
                  Total: {currentQuantity} pieces (auto-calculated)
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
