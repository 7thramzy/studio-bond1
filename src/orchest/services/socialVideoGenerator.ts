import {
  AudioBufferSource,
  BufferTarget,
  CanvasSource,
  Mp4OutputFormat,
  Output,
  QUALITY_MEDIUM,
  canEncodeAudio,
  canEncodeVideo,
} from "mediabunny";

const WIDTH = 720;
const HEIGHT = 1280;
const FRAME_RATE = 30;
const MAX_SOURCE_BYTES = 30 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 30 * 1024 * 1024;
const VIDEO_BITRATE = 2_400_000;
const AUDIO_BITRATE = 160_000;

export interface SocialVideoRequest {
  /** Direct HTTPS/same-origin URL for the original audio master file (not a YouTube page). */
  audioUrl: string;
  /** Direct HTTPS/same-origin URL for the cover image. */
  coverUrl: string;
  title: string;
  artist: string;
  signal?: AbortSignal;
  /** Progress percentage from 0 to 100. */
  onProgress?: (progress: number) => void;
}

export interface SocialVideoSupport {
  supported: boolean;
  video: boolean;
  audio: boolean;
  reason?: string;
}

/** Checks that the current browser can produce the exact H.264/AAC output required by the service. */
export async function checkSocialVideoSupport(): Promise<SocialVideoSupport> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return {
      supported: false,
      video: false,
      audio: false,
      reason: "إنشاء الفيديو متاح داخل متصفح حديث فقط.",
    };
  }

  let video = false;
  let audio = false;
  try {
    video = await canEncodeVideo("avc", {
      width: WIDTH,
      height: HEIGHT,
      frameRate: FRAME_RATE,
      bitrate: VIDEO_BITRATE,
    });
  } catch {
    video = false;
  }

  try {
    audio = await canEncodeAudio("aac");
    if (!audio) {
      const { registerAacEncoder } = await import("@mediabunny/aac-encoder");
      registerAacEncoder();
      audio = await canEncodeAudio("aac");
    }
  } catch {
    audio = false;
  }

  const reason = !video
    ? "هذا المتصفح لا يدعم ترميز الفيديو H.264 بالمقاس المطلوب (720×1280، 30 إطاراً/ث)."
    : !audio
      ? "تعذر تفعيل مرمّز الصوت AAC في هذا المتصفح."
      : undefined;
  return { supported: video && audio, video, audio, ...(reason ? { reason } : {}) };
}

/**
 * Normalizes and validates a media URL. Exported to keep the URL policy independently testable.
 * Relative URLs are allowed only when they resolve to the current origin.
 */
export function validateSocialVideoUrl(value: string, currentOrigin?: string): string {
  let url: URL;
  try {
    url = new URL(value, currentOrigin);
  } catch {
    throw new Error("رابط ملف الوسائط غير صالح.");
  }

  const sameOrigin = Boolean(currentOrigin) && url.origin === currentOrigin;
  if (url.username || url.password) {
    throw new Error("روابط الوسائط التي تحتوي بيانات دخول غير مسموح بها.");
  }
  if (url.protocol !== "https:" && !sameOrigin) {
    throw new Error("يجب أن يكون رابط الوسائط عبر HTTPS أو من نفس الموقع.");
  }

  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "youtu.be" ||
    hostname === "youtube.com" ||
    hostname.endsWith(".youtube.com") ||
    hostname === "youtube-nocookie.com" ||
    hostname.endsWith(".youtube-nocookie.com")
  ) {
    throw new Error(
      "استخدم رابط ملف الصوت الأصلي (master)؛ لا يمكن استخراج الصوت من روابط يوتيوب.",
    );
  }

  return url.href;
}

function checkAbort(signal?: AbortSignal): void {
  if (signal?.aborted) throw new Error("تم إلغاء إنشاء الفيديو.");
}

function getBrowserOrigin(): string {
  if (typeof window === "undefined" || !window.location?.origin) {
    throw new Error("إنشاء الفيديو متاح داخل متصفح حديث فقط.");
  }
  return window.location.origin;
}

async function fetchSource(
  url: string,
  label: "الصوت" | "الغلاف",
  signal?: AbortSignal,
): Promise<Blob> {
  let response: Response;
  try {
    response = await fetch(url, { credentials: "omit", ...(signal ? { signal } : {}) });
  } catch (error) {
    if (signal?.aborted) throw new Error("تم إلغاء إنشاء الفيديو.");
    throw new Error(`تعذر تحميل ملف ${label}. تحقق من الرابط وإتاحة الوصول إليه من المتصفح.`);
  }

  if (!response.ok) throw new Error(`تعذر تحميل ملف ${label} (HTTP ${response.status}).`);
  if (response.url) validateSocialVideoUrl(response.url, getBrowserOrigin());

  const announcedSize = Number(response.headers.get("content-length"));
  if (Number.isFinite(announcedSize) && announcedSize > MAX_SOURCE_BYTES) {
    throw new Error(`حجم ملف ${label} يتجاوز الحد الأقصى المسموح (30 ميغابايت).`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    let blob: Blob;
    try {
      blob = await response.blob();
    } catch {
      throw new Error(`تعذر قراءة ملف ${label}.`);
    }
    if (blob.size > MAX_SOURCE_BYTES) {
      throw new Error(`حجم ملف ${label} يتجاوز الحد الأقصى المسموح (30 ميغابايت).`);
    }
    return blob;
  }

  const chunks: ArrayBuffer[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_SOURCE_BYTES) {
        await reader.cancel();
        throw new Error(`حجم ملف ${label} يتجاوز الحد الأقصى المسموح (30 ميغابايت).`);
      }
      const copy = new ArrayBuffer(value.byteLength);
      new Uint8Array(copy).set(value);
      chunks.push(copy);
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("حجم ملف")) throw error;
    if (signal?.aborted) throw new Error("تم إلغاء إنشاء الفيديو.");
    throw new Error(`تعذر قراءة ملف ${label}.`);
  }
  return new Blob(chunks, { type: response.headers.get("content-type") ?? "" });
}

function drawCover(
  canvas: HTMLCanvasElement,
  cover: ImageBitmap,
  title: string,
  artist: string,
): void {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("تعذر تجهيز لوحة رسم الفيديو في هذا المتصفح.");

  const scale = Math.max(WIDTH / cover.width, HEIGHT / cover.height);
  const drawWidth = cover.width * scale;
  const drawHeight = cover.height * scale;
  context.fillStyle = "#111827";
  context.fillRect(0, 0, WIDTH, HEIGHT);
  context.drawImage(
    cover,
    (WIDTH - drawWidth) / 2,
    (HEIGHT - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );

  const shade = context.createLinearGradient(0, HEIGHT * 0.52, 0, HEIGHT);
  shade.addColorStop(0, "rgba(0, 0, 0, 0)");
  shade.addColorStop(0.38, "rgba(0, 0, 0, 0.48)");
  shade.addColorStop(1, "rgba(0, 0, 0, 0.82)");
  context.fillStyle = shade;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  const safeTitle = title.trim() || "بدون عنوان";
  const safeArtist = artist.trim() || "فنان غير معروف";
  const left = 54;
  const maxWidth = WIDTH - left * 2;
  context.direction = "rtl";
  context.textAlign = "right";
  context.textBaseline = "alphabetic";
  context.fillStyle = "#ffffff";
  context.font = "700 46px Arial, sans-serif";

  const titleLines = wrapCanvasText(context, safeTitle, maxWidth, 2);
  let y = HEIGHT - 170 - (titleLines.length - 1) * 58;
  for (const line of titleLines) {
    context.fillText(line, WIDTH - left, y, maxWidth);
    y += 58;
  }
  context.globalAlpha = 0.88;
  context.font = "400 30px Arial, sans-serif";
  context.fillText(artistLine(context, safeArtist, maxWidth), WIDTH - left, HEIGHT - 72, maxWidth);
  context.globalAlpha = 1;
}

function wrapCanvasText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && context.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines - 1) break;
    } else {
      line = candidate;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);

  const consumed = lines.join(" ").length;
  if (consumed < text.length && lines.length) {
    let finalLine = lines[lines.length - 1] ?? "";
    while (finalLine && context.measureText(`${finalLine}…`).width > maxWidth) {
      finalLine = finalLine.slice(0, -1);
    }
    lines[lines.length - 1] = `${finalLine.trimEnd()}…`;
  }
  return lines.length ? lines : [text];
}

function artistLine(context: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (context.measureText(text).width <= maxWidth) return text;
  let line = text;
  while (line && context.measureText(`${line}…`).width > maxWidth) line = line.slice(0, -1);
  return `${line.trimEnd()}…`;
}

/** Encodes the provided master audio and cover art locally in the browser; it never uploads or publishes the result. */
export async function generateSocialVideo(request: SocialVideoRequest): Promise<Blob> {
  const origin = getBrowserOrigin();
  const audioUrl = validateSocialVideoUrl(request.audioUrl, origin);
  const coverUrl = validateSocialVideoUrl(request.coverUrl, origin);
  checkAbort(request.signal);

  const support = await checkSocialVideoSupport();
  if (!support.video) {
    throw new Error(support.reason ?? "هذا المتصفح لا يدعم ترميز H.264 المطلوب.");
  }
  if (!support.audio) {
    throw new Error(support.reason ?? "تعذر تفعيل مرمّز الصوت AAC في هذا المتصفح.");
  }
  checkAbort(request.signal);

  const [audioBlob, coverBlob] = await Promise.all([
    fetchSource(audioUrl, "الصوت", request.signal),
    fetchSource(coverUrl, "الغلاف", request.signal),
  ]);
  if (!coverBlob.type.startsWith("image/")) {
    throw new Error("ملف الغلاف ليس صورة مدعومة.");
  }

  let cover: ImageBitmap;
  try {
    cover = await createImageBitmap(coverBlob);
  } catch {
    throw new Error("تعذر فتح صورة الغلاف؛ استخدم ملف صورة مدعوماً.");
  }

  const AudioContextConstructor = window.AudioContext;
  if (!AudioContextConstructor) {
    cover.close();
    throw new Error("واجهة فك ترميز الصوت غير متاحة في هذا المتصفح.");
  }

  let audioContext: AudioContext | null = null;
  try {
    audioContext = new AudioContextConstructor();
    let audioBuffer: AudioBuffer;
    try {
      audioBuffer = await audioContext.decodeAudioData(await audioBlob.arrayBuffer());
    } catch {
      throw new Error(
        "تعذر فك ترميز ملف الصوت؛ تحقق من أن الملف الصوتي الأصلي بصيغة يدعمها المتصفح.",
      );
    }
    checkAbort(request.signal);

    const duration = audioBuffer.duration;
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new Error("مدة ملف الصوت غير صالحة أو أن الملف لا يحتوي على صوت قابل للقراءة.");
    }

    const canvas = document.createElement("canvas");
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    drawCover(canvas, cover, request.title, request.artist);

    const target = new BufferTarget();
    const output = new Output({ format: new Mp4OutputFormat(), target });
    let videoBytes = 0;
    let audioBytes = 0;
    let tooLarge = false;
    const checkOutputSize = () => {
      if (videoBytes + audioBytes > MAX_OUTPUT_BYTES) tooLarge = true;
    };

    const videoSource = new CanvasSource(canvas, {
      codec: "avc",
      bitrate: VIDEO_BITRATE,
      quality: QUALITY_MEDIUM,
      keyFrameInterval: 2,
      transform: { frameRate: FRAME_RATE, width: WIDTH, height: HEIGHT, fit: "cover" },
      onEncodedPacket: (packet) => {
        videoBytes += packet.data.byteLength;
        checkOutputSize();
      },
    });
    const audioSource = new AudioBufferSource({
      codec: "aac",
      bitrate: AUDIO_BITRATE,
      onEncodedPacket: (packet) => {
        audioBytes += packet.data.byteLength;
        checkOutputSize();
      },
    });
    let sourcesClosed = false;
    const closeSources = () => {
      if (sourcesClosed) return;
      sourcesClosed = true;
      videoSource.close();
      audioSource.close();
    };
    output.addVideoTrack(videoSource, { frameRate: FRAME_RATE });
    output.addAudioTrack(audioSource);

    let outputStarted = false;
    let finalized = false;
    const cancelOnAbort = () => {
      if (outputStarted && !finalized) void output.cancel().catch(() => undefined);
    };
    request.signal?.addEventListener("abort", cancelOnAbort, { once: true });
    try {
      checkAbort(request.signal);
      await output.start();
      outputStarted = true;
      checkAbort(request.signal);
      request.onProgress?.(5);

      await audioSource.add(audioBuffer);
      checkAbort(request.signal);
      if (tooLarge)
        throw new Error(
          "حجم الفيديو الناتج سيتجاوز الحد الأقصى للتخزين (30 ميغابايت). قلّل مدة الصوت وحاول مجدداً.",
        );
      request.onProgress?.(10);

      const frameDuration = 1 / FRAME_RATE;
      const frameCount = Math.ceil(duration * FRAME_RATE);
      for (let frame = 0; frame < frameCount; frame += 1) {
        checkAbort(request.signal);
        const timestamp = frame * frameDuration;
        const remaining = duration - timestamp;
        await videoSource.add(timestamp, Math.min(frameDuration, remaining));
        if (tooLarge) {
          throw new Error(
            "حجم الفيديو الناتج سيتجاوز الحد الأقصى للتخزين (30 ميغابايت). قلّل مدة الصوت وحاول مجدداً.",
          );
        }
        if (frame % 15 === 0 || frame === frameCount - 1) {
          request.onProgress?.(10 + Math.round(((frame + 1) / frameCount) * 85));
        }
      }

      checkAbort(request.signal);
      closeSources();
      request.onProgress?.(97);
      await output.finalize();
      finalized = true;
      checkAbort(request.signal);

      const buffer = target.buffer;
      if (!buffer) throw new Error("تعذر تجهيز ملف الفيديو النهائي.");
      if (buffer.byteLength > MAX_OUTPUT_BYTES) {
        throw new Error(
          "حجم الفيديو الناتج يتجاوز الحد الأقصى للتخزين (30 ميغابايت). قلّل مدة الصوت وحاول مجدداً.",
        );
      }
      request.onProgress?.(100);
      return new Blob([buffer], { type: "video/mp4" });
    } catch (error) {
      if (request.signal?.aborted) throw new Error("تم إلغاء إنشاء الفيديو.");
      if (error instanceof Error && error.message.startsWith("حجم الفيديو الناتج")) throw error;
      if (error instanceof Error && error.message.startsWith("تعذر فك ترميز ملف الصوت"))
        throw error;
      throw new Error(
        "تعذر إنشاء الفيديو في هذا المتصفح. تحقق من دعم الترميز وذاكرة الجهاز، ثم حاول مجدداً.",
      );
    } finally {
      request.signal?.removeEventListener("abort", cancelOnAbort);
      closeSources();
      if (outputStarted && !finalized) await output.cancel().catch(() => undefined);
    }
  } finally {
    cover.close();
    if (audioContext && audioContext.state !== "closed")
      await audioContext.close().catch(() => undefined);
  }
}
