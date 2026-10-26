const MAX_AUDIO_BYTES = 30 * 1024 * 1024;
const DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const GOOGLE_API_SCRIPT_ID = "orchest-google-api";
const GOOGLE_IDENTITY_SCRIPT_ID = "orchest-google-identity";
const GOOGLE_API_SCRIPT = "https://apis.google.com/js/api.js";
const GOOGLE_IDENTITY_SCRIPT = "https://accounts.google.com/gsi/client";
const PICKER_AUDIO_MIME_TYPES =
  "audio/mpeg,audio/mp4,audio/aac,audio/wav,audio/x-wav,audio/ogg,audio/webm";

interface GoogleDrivePickerConfig {
  apiKey: string;
  clientId: string;
  appId: string;
}

interface GoogleDriveDocument {
  id: string;
  name: string;
  mimeType?: string;
}

interface GooglePickerResponse {
  action?: string;
  docs?: GoogleDriveDocument[];
}

interface GoogleTokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
}

interface GoogleTokenClient {
  requestAccessToken(options?: { prompt?: string }): void;
}

interface GoogleDocsView {
  setMimeTypes(mimeTypes: string): GoogleDocsView;
  setIncludeFolders(include: boolean): GoogleDocsView;
}

interface GooglePickerInstance {
  setVisible(visible: boolean): void;
}

interface GooglePickerBuilder {
  setAppId(appId: string): GooglePickerBuilder;
  setDeveloperKey(apiKey: string): GooglePickerBuilder;
  setOAuthToken(token: string): GooglePickerBuilder;
  setTitle(title: string): GooglePickerBuilder;
  setLocale(locale: string): GooglePickerBuilder;
  addView(view: GoogleDocsView): GooglePickerBuilder;
  setCallback(callback: (data: GooglePickerResponse) => void): GooglePickerBuilder;
  build(): GooglePickerInstance;
}

interface GooglePickerNamespace {
  ViewId: { DOCS: string };
  Action: { PICKED: string; CANCEL: string };
  DocsView: new (viewId: string) => GoogleDocsView;
  PickerBuilder: new () => GooglePickerBuilder;
}

interface GoogleApiNamespace {
  load(library: string, callback: () => void): void;
}

interface GoogleIdentityNamespace {
  picker?: GooglePickerNamespace;
  accounts: {
    oauth2: {
      initTokenClient(options: {
        client_id: string;
        scope: string;
        callback: (response: GoogleTokenResponse) => void;
        error_callback?: (error: { type?: string }) => void;
      }): GoogleTokenClient;
    };
  };
}

declare global {
  interface Window {
    gapi?: GoogleApiNamespace;
    google?: GoogleIdentityNamespace;
  }
}

let pickerLoadPromise: Promise<void> | null = null;
let cachedAccessToken: { token: string; expiresAt: number } | null = null;
let hasPriorConsent = false;

function getConfig(): GoogleDrivePickerConfig | null {
  const apiKey = import.meta.env["VITE_GOOGLE_DRIVE_API_KEY"]?.trim();
  const clientId = import.meta.env["VITE_GOOGLE_DRIVE_CLIENT_ID"]?.trim();
  const appId = import.meta.env["VITE_GOOGLE_DRIVE_APP_ID"]?.trim();
  if (!apiKey || !clientId || !appId) return null;
  return { apiKey, clientId, appId };
}

export function isGoogleDrivePickerConfigured(): boolean {
  return getConfig() !== null;
}

function loadScript(id: string, source: string): Promise<void> {
  const existing = document.getElementById(id) as HTMLScriptElement | null;
  if (existing?.dataset["loaded"] === "true") return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = existing ?? document.createElement("script");
    const onLoad = () => {
      script.dataset["loaded"] = "true";
      resolve();
    };
    const onError = () => reject(new Error("تعذر تحميل مكتبات Google Drive."));

    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });
    if (!existing) {
      script.id = id;
      script.src = source;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  });
}

export async function preloadGoogleDrivePicker(): Promise<void> {
  if (!getConfig()) throw new Error("لم يتم إعداد ربط Google Drive لهذا الموقع بعد.");
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("اختيار Google Drive متاح من المتصفح فقط.");
  }
  if (window.google?.picker && window.google.accounts?.oauth2) return;

  if (!pickerLoadPromise) {
    pickerLoadPromise = (async () => {
      await Promise.all([
        loadScript(GOOGLE_API_SCRIPT_ID, GOOGLE_API_SCRIPT),
        loadScript(GOOGLE_IDENTITY_SCRIPT_ID, GOOGLE_IDENTITY_SCRIPT),
      ]);

      if (!window.gapi || !window.google?.accounts?.oauth2) {
        throw new Error("لم تكتمل تهيئة أدوات Google Drive.");
      }

      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(
          () => reject(new Error("انتهت مهلة تحميل نافذة Google Drive.")),
          15_000,
        );
        window.gapi?.load("picker", () => {
          window.clearTimeout(timeout);
          resolve();
        });
      });

      if (!window.google?.picker) throw new Error("تعذر تهيئة Google Picker.");
    })().catch((error: unknown) => {
      pickerLoadPromise = null;
      throw error;
    });
  }

  await pickerLoadPromise;
}

export function normalizeDriveAudioMimeType(mimeType: string, filename: string): string | null {
  const normalizedType = mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
  const aliases: Record<string, string> = {
    "audio/mp3": "audio/mpeg",
    "audio/x-m4a": "audio/mp4",
  };
  const supportedTypes = new Set([
    "audio/mpeg",
    "audio/mp4",
    "audio/aac",
    "audio/wav",
    "audio/x-wav",
    "audio/ogg",
    "audio/webm",
  ]);
  const resolvedType = aliases[normalizedType] ?? normalizedType;
  if (supportedTypes.has(resolvedType)) return resolvedType;

  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  const typeByExtension: Record<string, string> = {
    mp3: "audio/mpeg",
    m4a: "audio/mp4",
    mp4: "audio/mp4",
    aac: "audio/aac",
    wav: "audio/wav",
    ogg: "audio/ogg",
    webm: "audio/webm",
  };
  return typeByExtension[extension] ?? null;
}

async function downloadDriveAudioFile(document: GoogleDriveDocument, token: string): Promise<File> {
  const headers = { Authorization: `Bearer ${token}` };
  const metadataUrl = new URL(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(document.id)}`,
  );
  metadataUrl.searchParams.set("fields", "id,name,mimeType,size,capabilities(canDownload)");
  metadataUrl.searchParams.set("supportsAllDrives", "true");
  const metadataResponse = await fetch(metadataUrl, { headers });
  if (!metadataResponse.ok) {
    if (metadataResponse.status === 403 || metadataResponse.status === 404) {
      throw new Error("لا يمكن الوصول إلى الملف المحدد. تحقق من صلاحيات حساب Google.");
    }
    throw new Error("تعذر قراءة بيانات الملف من Google Drive.");
  }

  const metadata = (await metadataResponse.json()) as {
    name?: string;
    mimeType?: string;
    size?: string;
    capabilities?: { canDownload?: boolean };
  };
  if (metadata.capabilities?.canDownload === false) {
    throw new Error("لا تسمح إعدادات هذا الملف بتنزيله من Google Drive.");
  }
  const name = metadata.name?.trim() || document.name || "drive-audio";
  const mimeType = normalizeDriveAudioMimeType(metadata.mimeType ?? document.mimeType ?? "", name);
  if (!mimeType) {
    throw new Error("صيغة الملف غير مدعومة. اختر MP3 أو M4A أو WAV أو OGG.");
  }

  const fileSize = Number(metadata.size ?? 0);
  if (Number.isFinite(fileSize) && fileSize > MAX_AUDIO_BYTES) {
    throw new Error("حجم الملف الصوتي يتجاوز الحد الأقصى وهو 30 ميجابايت.");
  }

  const downloadResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(document.id)}?alt=media&supportsAllDrives=true`,
    { headers },
  );
  if (!downloadResponse.ok) {
    if (downloadResponse.status === 403 || downloadResponse.status === 404) {
      throw new Error("رفض Google Drive تنزيل الملف المحدد. أعد اختياره أو تحقق من صلاحياته.");
    }
    throw new Error("تعذر تنزيل الملف من Google Drive.");
  }

  const blob = await downloadResponse.blob();
  if (blob.size < 1) throw new Error("الملف المحدد فارغ.");
  if (blob.size > MAX_AUDIO_BYTES) {
    throw new Error("حجم الملف الصوتي يتجاوز الحد الأقصى وهو 30 ميجابايت.");
  }
  return new File([blob], name, { type: mimeType });
}

export function pickAudioFileFromGoogleDrive(): Promise<File | null> {
  const config = getConfig();
  if (!config) return Promise.reject(new Error("لم يتم إعداد ربط Google Drive لهذا الموقع بعد."));
  if (!window.google?.picker || !window.google.accounts?.oauth2) {
    return Promise.reject(new Error("Google Drive غير جاهز. أغلق النافذة وحاول مرة أخرى."));
  }

  return new Promise<File | null>((resolve, reject) => {
    const openPicker = (accessToken: string, expiresInSeconds = 3600) => {
      cachedAccessToken = {
        token: accessToken,
        expiresAt: Date.now() + Math.max(0, expiresInSeconds - 60) * 1000,
      };
      const pickerApi = window.google?.picker;
      if (!pickerApi) {
        reject(new Error("تعذر فتح نافذة Google Drive."));
        return;
      }

      const view = new pickerApi.DocsView(pickerApi.ViewId.DOCS)
        .setMimeTypes(PICKER_AUDIO_MIME_TYPES)
        .setIncludeFolders(false);
      const picker = new pickerApi.PickerBuilder()
        .setAppId(config.appId)
        .setDeveloperKey(config.apiKey)
        .setOAuthToken(accessToken)
        .setTitle("اختيار ملف صوتي من Google Drive")
        .setLocale("ar")
        .addView(view)
        .setCallback((response) => {
          if (response.action === pickerApi.Action.CANCEL) {
            resolve(null);
            return;
          }
          if (response.action !== pickerApi.Action.PICKED) return;
          const document = response.docs?.[0];
          if (!document?.id) {
            reject(new Error("لم يتم العثور على ملف صوتي صالح في الاختيار."));
            return;
          }
          void downloadDriveAudioFile(document, accessToken).then(resolve, reject);
        })
        .build();
      picker.setVisible(true);
    };

    const cached = cachedAccessToken;
    if (cached && cached.expiresAt > Date.now()) {
      openPicker(cached.token);
      return;
    }

    const tokenClient = window.google?.accounts.oauth2.initTokenClient({
      client_id: config.clientId,
      scope: DRIVE_FILE_SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          cachedAccessToken = null;
          reject(new Error("لم يكتمل إذن الوصول إلى الملف في Google Drive."));
          return;
        }
        hasPriorConsent = true;
        openPicker(response.access_token, response.expires_in);
      },
      error_callback: () => {
        reject(new Error("أُغلق تسجيل الدخول إلى Google قبل منح الإذن."));
      },
    });
    if (!tokenClient) {
      reject(new Error("تعذر بدء المصادقة مع Google."));
      return;
    }
    tokenClient.requestAccessToken({ prompt: hasPriorConsent ? "" : "consent" });
  });
}
