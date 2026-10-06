import sharp from "sharp";
import { imageType } from "./blog.ts";

export async function optimizeImage(bytes: Buffer) {
  const contentType = imageType(bytes);
  if (!contentType) throw new Error("Choose a JPEG, PNG, WebP, or GIF image.");
  let metadata;
  let optimized;
  try {
    const image = sharp(bytes, { animated: true, limitInputPixels: 40_000_000 });
    metadata = await image.metadata();
    optimized = await image.autoOrient()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 }).toBuffer();
  } catch {
    throw new Error("Unable to process this image. Choose a valid image with no more than 40 million total pixels.");
  }
  if (optimized.length >= bytes.length && (metadata.width || 0) <= 1600 && (metadata.pageHeight || metadata.height || 0) <= 1600 && (!metadata.orientation || metadata.orientation === 1)) {
    return { bytes, contentType };
  }
  if (optimized.length > 3 * 1024 * 1024) throw new Error("The optimized image must be 3 MB or smaller.");
  return { bytes: optimized, contentType: "image/webp" };
}
