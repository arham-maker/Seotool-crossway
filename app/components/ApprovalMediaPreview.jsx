"use client";

import { isApprovalVideoPath } from "../../lib/approvalMedia";

/**
 * Inline approval media: image or muted video thumbnail (no controls unless enabled).
 */
export default function ApprovalMediaPreview({
  src,
  alt = "",
  className = "",
  videoControls = false,
  videoMuted,
  videoLoop = false,
}) {
  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-neutral-800 text-sm text-neutral-400 ${className}`}>
        No preview
      </div>
    );
  }

  if (isApprovalVideoPath(src)) {
    return (
      <video
        src={src}
        className={className}
        controls={videoControls}
        playsInline
        preload="metadata"
        muted={videoMuted !== undefined ? videoMuted : !videoControls}
        loop={videoLoop}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} />
  );
}
