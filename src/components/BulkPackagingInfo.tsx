import { useCurrency } from '@/hooks/useCurrency';

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
 * Form fields for configuring bulk packaging on stock items
 */
export function BulkPackagingFields({
  piecesPerCarton, cartonsPerBox, boxesPerContainer,
  onChange,
}: {
  piecesPerCarton: string; cartonsPerBox: string; boxesPerContainer: string;
  onChange: (field: string, value: string) => void;
}) {
  return (
    <div className="border rounded-lg p-3 space-y-2 bg-muted/20">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
        📦 Bulk Packaging (Optional)
      </p>
      <p className="text-[10px] text-muted-foreground">
        Set how items are packed: Container → Boxes → Cartons → Pieces. Leave at 0 to skip a level.
      </p>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] font-medium text-muted-foreground">Pieces per Carton</label>
          <input
            type="number" min="0" value={piecesPerCarton}
            onChange={e => onChange('pieces_per_carton', e.target.value)}
            className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="e.g. 12"
          />
        </div>
        <div>
          <label className="text-[10px] font-medium text-muted-foreground">Cartons per Box</label>
          <input
            type="number" min="0" value={cartonsPerBox}
            onChange={e => onChange('cartons_per_box', e.target.value)}
            className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="e.g. 10"
          />
        </div>
        <div>
          <label className="text-[10px] font-medium text-muted-foreground">Boxes per Container</label>
          <input
            type="number" min="0" value={boxesPerContainer}
            onChange={e => onChange('boxes_per_container', e.target.value)}
            className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="e.g. 20"
          />
        </div>
      </div>
      {parseInt(piecesPerCarton) > 0 && (
        <p className="text-[10px] text-muted-foreground italic">
          ℹ️ 1 Carton = {piecesPerCarton} pcs
          {parseInt(cartonsPerBox) > 0 && ` · 1 Box = ${cartonsPerBox} cartons (${parseInt(piecesPerCarton) * parseInt(cartonsPerBox)} pcs)`}
          {parseInt(cartonsPerBox) > 0 && parseInt(boxesPerContainer) > 0 && ` · 1 Container = ${boxesPerContainer} boxes (${parseInt(piecesPerCarton) * parseInt(cartonsPerBox) * parseInt(boxesPerContainer)} pcs)`}
        </p>
      )}
    </div>
  );
}
