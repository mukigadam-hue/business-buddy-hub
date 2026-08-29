/**
 * Compress an image file to a target max dimension and quality.
 *
 * Old / low-end Android WebViews (which is what the native shell uses) do NOT
 * always support `OffscreenCanvas` or `createImageBitmap`. Previously an
 * unsupported device threw, the caller fell back to the ORIGINAL multi-megabyte
 * camera photo, and turning that into a base64 data URL blew up the WebView's
 * memory (the app appeared to "crash" when taking a photo).
 *
 * The implementation below therefore always has a DOM-canvas fallback and never
 * returns an uncompressed original.
 */

async function decode(file: Blob): Promise<
  | { kind: 'bitmap'; bmp: ImageBitmap; width: number; height: number }
  | { kind: 'img'; img: HTMLImageElement; url: string; width: number; height: number }
> {
  // The DOM image path is deliberately tried first. Several Android WebView
  // releases expose createImageBitmap but terminate the renderer while
  // decoding large camera JPEGs with it. Object URLs avoid an extra base64 or
  // ArrayBuffer copy and have proved considerably more stable in native shells.
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not read this image'));
      el.src = url;
    });
    return { kind: 'img', img, url, width: img.naturalWidth || img.width, height: img.naturalHeight || img.height };
  } catch {
    try { URL.revokeObjectURL(url); } catch {}
  }

  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file);
      return { kind: 'bitmap', bmp, width: bmp.width, height: bmp.height };
    } catch {
      /* fall through to <img> decoding */
    }
  }
  throw new Error('Could not read this image');
}

async function drawToJpeg(
  source: CanvasImageSource,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  dw: number,
  dh: number,
  quality: number,
): Promise<Blob> {
  // Use a DOM canvas consistently. OffscreenCanvas is nominally present in
  // some Android WebViews but its hardware-backed conversion can crash the
  // renderer instead of throwing a catchable JavaScript error.
  const canvas = document.createElement('canvas');
  canvas.width = dw;
  canvas.height = dh;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported on this device');
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, dw, dh);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/jpeg', quality),
  );
  if (!blob) throw new Error('Could not compress this image');
  return blob;
}

export async function compressImage(
  file: File,
  maxDimension = 800,
  quality = 0.6,
): Promise<File> {
  const decoded = await decode(file);
  const { width, height } = decoded;
  let newW = width;
  let newH = height;
  if (width > maxDimension || height > maxDimension) {
    const ratio = Math.min(maxDimension / width, maxDimension / height);
    newW = Math.max(1, Math.round(width * ratio));
    newH = Math.max(1, Math.round(height * ratio));
  }
  const source: CanvasImageSource = decoded.kind === 'bitmap' ? decoded.bmp : decoded.img;
  try {
    const blob = await drawToJpeg(source, 0, 0, width, height, newW, newH, quality);
    return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg') || 'photo.jpg', {
      type: 'image/jpeg',
    });
  } finally {
    if (decoded.kind === 'bitmap') { try { decoded.bmp.close(); } catch {} }
    else { try { URL.revokeObjectURL(decoded.url); } catch {} }
  }
}

/**
 * Crop a normalized (0–1000) [ymin, xmin, ymax, xmax] region out of an image
 * and return a small JPEG. Returns null when the region is unusable or the
 * device cannot decode/draw the image — callers fall back to the full photo.
 */
export async function cropNormalizedRegion(
  source: Blob,
  bbox: [number, number, number, number],
  maxDim = 512,
  quality = 0.75,
): Promise<Blob | null> {
  try {
    const decoded = await decode(source);
    try {
      const [ymin, xmin, ymax, xmax] = bbox;
      const y1 = Math.max(0, Math.min(1000, ymin));
      const x1 = Math.max(0, Math.min(1000, xmin));
      const y2 = Math.max(0, Math.min(1000, ymax));
      const x2 = Math.max(0, Math.min(1000, xmax));
      if (!(x2 > x1) || !(y2 > y1)) return null;
      const sx = (x1 / 1000) * decoded.width;
      const sy = (y1 / 1000) * decoded.height;
      const sw = ((x2 - x1) / 1000) * decoded.width;
      const sh = ((y2 - y1) / 1000) * decoded.height;
      if (sw < 8 || sh < 8) return null;
      const ratio = Math.min(1, maxDim / Math.max(sw, sh));
      const dw = Math.max(1, Math.round(sw * ratio));
      const dh = Math.max(1, Math.round(sh * ratio));
      const el: CanvasImageSource = decoded.kind === 'bitmap' ? decoded.bmp : decoded.img;
      return await drawToJpeg(el, sx, sy, sw, sh, dw, dh, quality);
    } finally {
      if (decoded.kind === 'bitmap') { try { decoded.bmp.close(); } catch {} }
      else { try { URL.revokeObjectURL(decoded.url); } catch {} }
    }
  } catch {
    return null;
  }
}
