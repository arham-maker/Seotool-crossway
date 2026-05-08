/**
 * Approval uploads store a public URL in `imagePath` (legacy field name).
 * Detect video vs image by file extension so we render <video> vs <img> correctly.
 */

const VIDEO_EXT = /\.(mp4|webm|mov|mpeg|mkv)$/i;

export function isApprovalVideoPath(src) {
  if (!src || typeof src !== "string") return false;
  const base = src.split("?")[0].split("#")[0];
  return VIDEO_EXT.test(base);
}
