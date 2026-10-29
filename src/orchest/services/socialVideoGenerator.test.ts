import { describe, expect, it } from "vitest";
import { validateSocialVideoUrl } from "./socialVideoGenerator";

describe("validateSocialVideoUrl", () => {
  it("allows secure external URLs and same-origin relative URLs", () => {
    expect(validateSocialVideoUrl("https://cdn.example/audio.wav", "https://app.example")).toBe(
      "https://cdn.example/audio.wav",
    );
    expect(validateSocialVideoUrl("/media/cover.jpg", "http://localhost:5173")).toBe(
      "http://localhost:5173/media/cover.jpg",
    );
  });

  it("rejects insecure external URLs and malformed inputs", () => {
    expect(() =>
      validateSocialVideoUrl("http://cdn.example/audio.wav", "https://app.example"),
    ).toThrow("HTTPS");
    expect(() =>
      validateSocialVideoUrl("https://admin:secret@cdn.example/audio.wav", "https://app.example"),
    ).toThrow("بيانات دخول");
    expect(() => validateSocialVideoUrl("javascript:alert(1)", "https://app.example")).toThrow(
      "HTTPS",
    );
  });

  it("rejects YouTube pages instead of attempting audio extraction", () => {
    expect(() =>
      validateSocialVideoUrl("https://www.youtube.com/watch?v=123", "https://app.example"),
    ).toThrow("لا يمكن استخراج الصوت من روابط يوتيوب");
    expect(() => validateSocialVideoUrl("https://youtu.be/123", "https://app.example")).toThrow(
      "لا يمكن استخراج الصوت من روابط يوتيوب",
    );
  });
});
