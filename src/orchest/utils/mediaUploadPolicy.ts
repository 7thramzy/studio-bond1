export type MediaKind = "image" | "audio" | "video";

export const MAX_MEDIA_UPLOAD_BYTES = 30 * 1024 * 1024;
export const MAX_IMAGE_UPLOAD_BYTES = 2 * 1024 * 1024;

const allowedImageTypes = new Set(["image/webp", "image/jpeg", "image/png"]);
const allowedAudioTypes = new Set([
  "audio/mpeg",
  "audio/mp4",
  "audio/aac",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/webm",
]);

export function validateMediaUpload(
  kind: string,
  contentType: string,
  size: number,
): string | null {
  const validKind = kind === "image" || kind === "audio" || kind === "video";
  const validType =
    (kind === "image" && allowedImageTypes.has(contentType)) ||
    (kind === "audio" && allowedAudioTypes.has(contentType)) ||
    (kind === "video" && contentType === "video/mp4");
  const maxSize = kind === "image" ? MAX_IMAGE_UPLOAD_BYTES : MAX_MEDIA_UPLOAD_BYTES;

  if (!validKind || !validType || !Number.isSafeInteger(size) || size < 1 || size > maxSize) {
    return "نوع الملف أو حجمه غير مدعوم.";
  }

  return null;
}
