/**
 * Compress an image file to a target max dimension and quality.
 * Returns a smaller JPEG blob wrapped as a File, processed off-main-thread via createImageBitmap.
 */
export async function compressImage(
  file: File,
  maxDimension = 800,
  quality = 0.6
): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;

  let newW = width;
  let newH = height;
  if (width > maxDimension || height > maxDimension) {
    const ratio = Math.min(maxDimension / width, maxDimension / height);
    newW = Math.round(width * ratio);
    newH = Math.round(height * ratio);
  }

  const canvas = new OffscreenCanvas(newW, newH);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.drawImage(bitmap, 0, 0, newW, newH);
  bitmap.close();

  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
  return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
}
