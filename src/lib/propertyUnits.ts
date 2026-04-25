/**
 * Treats `total_rooms > 0` as a multi-unit asset (e.g. a building with 50 rooms).
 * Multi-unit assets are always considered "bookable" at the asset level — the
 * actual capacity check happens via `check_booking_conflict` against the
 * `total_rooms` count. Single-unit assets honor the `is_available` flag.
 */
export function isAssetBookable(asset: { is_available?: boolean | null; total_rooms?: number | null } | null | undefined): boolean {
  if (!asset) return false;
  const totalRooms = asset.total_rooms || 0;
  if (totalRooms > 1) return true;
  return asset.is_available !== false;
}

/**
 * Returns true if an asset's `is_available` flag should be flipped to false
 * after a booking starts. Only applies to single-unit assets.
 */
export function shouldMarkAssetOccupied(asset: { total_rooms?: number | null } | null | undefined): boolean {
  if (!asset) return true;
  return (asset.total_rooms || 0) <= 1;
}
