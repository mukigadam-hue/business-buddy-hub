interface Props {
  imageUrl?: string | null;
  text?: string | null;
  size?: number | null;
  opacity?: number | null;
  repeat?: number | null;
  rotation?: number | null;
}

/**
 * Renders watermark tiles absolutely-positioned to fill its parent.
 * Parent MUST be `position: relative` and `overflow: hidden`.
 * Content layered above should use `relative z-10`.
 */
export default function ReceiptWatermarkOverlay({
  imageUrl, text, size, opacity, repeat, rotation,
}: Props) {
  const hasImg = !!imageUrl;
  const hasTxt = !!(text && text.trim());
  if (!hasImg && !hasTxt) return null;

  const px = Math.max(40, Math.min(400, size ?? 120));
  const op = Math.max(0.02, Math.min(0.4, opacity ?? 0.08));
  const n = Math.max(1, Math.min(30, repeat ?? 6));
  const rot = rotation ?? -30;

  // Distribute tiles roughly in a grid.
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  const tiles: Array<{ top: string; left: string }> = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (tiles.length >= n) break;
      tiles.push({
        top: `${((r + 0.5) / rows) * 100}%`,
        left: `${((c + 0.5) / cols) * 100}%`,
      });
    }
  }

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden>
      {tiles.map((t, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            top: t.top,
            left: t.left,
            transform: `translate(-50%, -50%) rotate(${rot}deg)`,
            opacity: op,
          }}
        >
          {hasImg ? (
            <img
              src={imageUrl!}
              alt=""
              style={{ width: px, height: px, objectFit: 'contain' }}
              draggable={false}
            />
          ) : (
            <span
              style={{
                fontSize: Math.max(12, px / 6),
                fontWeight: 800,
                color: 'currentColor',
                whiteSpace: 'nowrap',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              {text}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
