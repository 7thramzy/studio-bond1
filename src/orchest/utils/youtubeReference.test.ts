import { describe, expect, it } from "vitest";
import { getYouTubeEmbedUrl, parseYouTubeVideoId } from "./youtubeReference";

const videoId = "dQw4w9WgXcQ";

describe("YouTube reference URLs", () => {
  it("accepts standard watch, short, embed, and Shorts URLs", () => {
    expect(parseYouTubeVideoId(`https://www.youtube.com/watch?v=${videoId}&t=12`)).toBe(videoId);
    expect(parseYouTubeVideoId(`https://youtu.be/${videoId}`)).toBe(videoId);
    expect(parseYouTubeVideoId(`https://youtube.com/embed/${videoId}`)).toBe(videoId);
    expect(parseYouTubeVideoId(`https://m.youtube.com/shorts/${videoId}`)).toBe(videoId);
  });

  it("rejects unrelated hosts, malformed IDs, and playlist-only URLs", () => {
    expect(parseYouTubeVideoId(`https://youtube.com.evil.example/watch?v=${videoId}`)).toBeNull();
    expect(parseYouTubeVideoId("https://youtu.be/short")).toBeNull();
    expect(parseYouTubeVideoId("https://www.youtube.com/playlist?list=PL1234567890")).toBeNull();
    expect(parseYouTubeVideoId("javascript:alert(1)")).toBeNull();
    expect(parseYouTubeVideoId(`https://user@youtube.com/watch?v=${videoId}`)).toBeNull();
  });

  it("builds an official privacy-enhanced embed URL only for valid IDs", () => {
    expect(getYouTubeEmbedUrl(videoId)).toBe(
      `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`,
    );
    expect(getYouTubeEmbedUrl("bad-id")).toBeNull();
  });
});
