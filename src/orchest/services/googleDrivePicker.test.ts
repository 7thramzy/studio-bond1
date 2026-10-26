import { describe, expect, it } from "vitest";
import { normalizeDriveAudioMimeType } from "./googleDrivePicker";

describe("normalizeDriveAudioMimeType", () => {
  it("accepts supported Google Drive audio MIME types", () => {
    expect(normalizeDriveAudioMimeType("audio/mpeg", "track.mp3")).toBe("audio/mpeg");
    expect(normalizeDriveAudioMimeType("audio/mp4", "track.m4a")).toBe("audio/mp4");
    expect(normalizeDriveAudioMimeType("audio/wav", "track.wav")).toBe("audio/wav");
  });

  it("normalizes common aliases and MIME parameters", () => {
    expect(normalizeDriveAudioMimeType("audio/mp3; charset=binary", "track.mp3")).toBe(
      "audio/mpeg",
    );
    expect(normalizeDriveAudioMimeType("audio/x-m4a", "track.m4a")).toBe("audio/mp4");
  });

  it("falls back to a supported filename extension when Drive reports a generic MIME type", () => {
    expect(normalizeDriveAudioMimeType("application/octet-stream", "track.ogg")).toBe("audio/ogg");
    expect(normalizeDriveAudioMimeType("", "track.webm")).toBe("audio/webm");
  });

  it("rejects unsupported and non-audio files", () => {
    expect(normalizeDriveAudioMimeType("application/pdf", "document.pdf")).toBeNull();
    expect(normalizeDriveAudioMimeType("audio/flac", "track.flac")).toBeNull();
  });
});
