import { describe, expect, it } from "vitest";
import {
  MAX_IMAGE_UPLOAD_BYTES,
  MAX_MEDIA_UPLOAD_BYTES,
  validateMediaUpload,
} from "./mediaUploadPolicy";

describe("validateMediaUpload", () => {
  it("accepts MP4 video up to the storage limit", () => {
    expect(validateMediaUpload("video", "video/mp4", MAX_MEDIA_UPLOAD_BYTES)).toBeNull();
    expect(validateMediaUpload("video", "video/mp4", MAX_MEDIA_UPLOAD_BYTES + 1)).not.toBeNull();
  });

  it("rejects other video formats and cross-kind MIME types", () => {
    expect(validateMediaUpload("video", "video/webm", 100)).not.toBeNull();
    expect(validateMediaUpload("audio", "video/mp4", 100)).not.toBeNull();
    expect(validateMediaUpload("image", "video/mp4", 100)).not.toBeNull();
  });

  it("preserves existing audio and image size rules", () => {
    expect(validateMediaUpload("audio", "audio/mpeg", MAX_MEDIA_UPLOAD_BYTES)).toBeNull();
    expect(validateMediaUpload("image", "image/png", MAX_IMAGE_UPLOAD_BYTES)).toBeNull();
    expect(validateMediaUpload("image", "image/png", MAX_IMAGE_UPLOAD_BYTES + 1)).not.toBeNull();
  });

  it("rejects invalid sizes and unknown media kinds", () => {
    expect(validateMediaUpload("video", "video/mp4", 0)).not.toBeNull();
    expect(validateMediaUpload("video", "video/mp4", Number.POSITIVE_INFINITY)).not.toBeNull();
    expect(validateMediaUpload("document", "application/pdf", 100)).not.toBeNull();
  });
});
