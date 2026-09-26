import type { WindowsMedia, WindowsMediaPlaybackStatus } from "#types/WindowsMedia";
import { PlaybackStatus, SMTCMonitor, type MediaInfo } from "@coooookies/windows-smtc-monitor";
// @ts-ignore
import powershellScript from "../external/app-icon.ps1" with { type: "text" };

const MAX_ALBUM_ART_BYTES = 8 * 1024 * 1024;
const MAX_CACHE_ENTRIES = 32;

const STATUS_NAMES: Record<number, WindowsMediaPlaybackStatus> = {
  [PlaybackStatus.CLOSED]: "closed",
  [PlaybackStatus.OPENED]: "opened",
  [PlaybackStatus.CHANGING]: "changing",
  [PlaybackStatus.STOPPED]: "stopped",
  [PlaybackStatus.PLAYING]: "playing",
  [PlaybackStatus.PAUSED]: "paused",
};

const albumArtCache = new Map<string, string | null>();
const appIconCache = new Map<string, string | null>();

function matchesAllowedApp(sourceAppId: string, allowedApps: readonly string[]): boolean {
  if (allowedApps.length === 0) {
    return true;
  }

  const source = sourceAppId.trim().toLowerCase();
  if (!source) {
    return false;
  }

  return allowedApps.some((app) => {
    const filter = app.trim().toLowerCase();
    return filter.length > 0 && source.includes(filter);
  });
}

function statusName(value: number): WindowsMediaPlaybackStatus {
  return STATUS_NAMES[value] ?? "changing";
}

function getAlbumArtCacheKey(media: MediaInfo): string {
  return JSON.stringify([
    media.sourceAppId,
    media.media.title,
    media.media.artist,
    media.media.albumTitle,
    media.media.trackNumber,
  ]);
}

function detectImageMimeType(bytes: Uint8Array): string | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  if (bytes.length >= 6) {
    const signature = new TextDecoder("ascii").decode(bytes.subarray(0, 6));
    if (signature === "GIF87a" || signature === "GIF89a") {
      return "image/gif";
    }
  }

  if (bytes.length >= 12) {
    const riff = new TextDecoder("ascii").decode(bytes.subarray(0, 4));
    const webp = new TextDecoder("ascii").decode(bytes.subarray(8, 12));
    if (riff === "RIFF" && webp === "WEBP") {
      return "image/webp";
    }
  }

  if (bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d) {
    return "image/bmp";
  }

  return null;
}

function encodeAlbumArt(media: MediaInfo): string | null {
  const thumbnail = media.media.thumbnail;
  if (!thumbnail || thumbnail.length === 0 || thumbnail.length > MAX_ALBUM_ART_BYTES) {
    return null;
  }

  const mimeType = detectImageMimeType(thumbnail);
  if (!mimeType) {
    return null;
  }

  return `data:${mimeType};base64,${Buffer.from(thumbnail).toString("base64")}`;
}

function getCachedAlbumArt(media: MediaInfo): string | null {
  const key = getAlbumArtCacheKey(media);
  if (albumArtCache.has(key)) {
    return albumArtCache.get(key) ?? null;
  }

  const value = encodeAlbumArt(media);
  albumArtCache.set(key, value);

  while (albumArtCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = albumArtCache.keys().next().value;
    if (oldestKey === undefined) {
      break;
    }
    albumArtCache.delete(oldestKey);
  }

  return value;
}

export async function getAppIconDataUrl(sourceAppId: string, size = 64): Promise<string | null> {
  if (!sourceAppId) return null;

  const key = `${sourceAppId}\0${size}`;

  const cached = appIconCache.get(key);

  if (cached !== undefined) return cached;

  const bootstrap = "$script = [Console]::In.ReadToEnd(); " + "& ([ScriptBlock]::Create($script))";

  const proc = Bun.spawn(
    ["powershell.exe", "-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", bootstrap],
    {
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
      windowsHide: true,

      env: {
        ...process.env,
        BUN_APP_ID: sourceAppId,
        BUN_ICON_SIZE: String(size),
      },
    },
  );

  proc.stdin.write(powershellScript);
  proc.stdin.end();

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  if (exitCode !== 0) {
    const error = stderr.trim();

    if (error) {
      console.error(`[AppIcon] ${sourceAppId}: ${error}`);
    }

    appIconCache.set(key, null);

    return null;
  }

  const result = stdout.trim() || null;

  appIconCache.set(key, result);

  return result;
}

async function toWindowsMedia(media: MediaInfo): Promise<WindowsMedia> {
  return {
    title: media.media.title ?? "",
    artist: media.media.artist ?? "",
    albumTitle: media.media.albumTitle ?? "",
    albumArtist: media.media.albumArtist ?? "",
    subtitle: "",
    trackNumber: Number(media.media.trackNumber ?? 0),
    playbackStatus: statusName(Number(media.playback.playbackStatus)),
    sourceAppUserModelId: media.sourceAppId ?? "",
    albumArt: getCachedAlbumArt(media),
    duration: media.timeline.duration,
    appIcon: await getAppIconDataUrl(media.sourceAppId),
  };
}

function selectSession(
  sessions: readonly MediaInfo[],
  currentSession: MediaInfo | null,
  allowedApps: readonly string[],
  playingOnly: boolean,
): MediaInfo | null {
  const matches = (session: MediaInfo): boolean => {
    if (!matchesAllowedApp(session.sourceAppId, allowedApps)) {
      return false;
    }

    return !playingOnly || Number(session.playback.playbackStatus) === PlaybackStatus.PLAYING;
  };

  if (currentSession && matches(currentSession)) {
    return currentSession;
  }

  return sessions.find(matches) ?? null;
}

export interface GetCurrentWindowsMediaOptions {
  allowedApps?: readonly string[];
  playingOnly?: boolean;
  monitor?: SMTCMonitor;
}

/**
 * Reads the currently relevant GSMTC session using the native SMTC monitor package.
 * The optional monitor allows the long-running watcher to reuse one native monitor.
 */
export async function getCurrentWindowsMedia(options: GetCurrentWindowsMediaOptions = {}): Promise<WindowsMedia | null> {
  if (process.platform !== "win32") {
    throw new Error("Windows media support is only available on Windows");
  }

  const monitor = options.monitor ?? new SMTCMonitor();
  const ownsMonitor = !options.monitor;

  try {
    const sessions = monitor.sessions;
    const currentSession = SMTCMonitor.getCurrentMediaSession();
    const selected = selectSession(sessions, currentSession, options.allowedApps ?? [], options.playingOnly ?? false);

    return selected ? await toWindowsMedia(selected) : null;
  } finally {
    if (ownsMonitor) {
      monitor.destroy();
    }
  }
}

export interface WindowsMediaWatcherOptions {
  /** Fallback reconciliation interval. Native session events drive normal updates. */
  intervalMs?: number;
  allowedApps?: readonly string[];
  playingOnly?: boolean;
  onChange: (media: WindowsMedia | null) => void | Promise<void>;
  onError?: (error: unknown) => void;
}

export class WindowsMediaWatcher {
  private monitor: SMTCMonitor | null = null;
  private running = false;
  private refreshInProgress = false;
  private refreshQueued = false;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private lastSerialized: string | null = null;

  private readonly onChange: WindowsMediaWatcherOptions["onChange"];
  private readonly onError: NonNullable<WindowsMediaWatcherOptions["onError"]>;
  private readonly intervalMs: number;
  private readonly allowedApps: readonly string[];
  private readonly playingOnly: boolean;

  constructor(options: WindowsMediaWatcherOptions) {
    this.onChange = options.onChange;
    this.onError = options.onError ?? (() => {});
    this.intervalMs = Math.max(250, options.intervalMs ?? 5000);
    this.allowedApps = options.allowedApps ?? [];
    this.playingOnly = options.playingOnly ?? false;
  }

  start(): void {
    if (this.running) {
      return;
    }

    if (process.platform !== "win32") {
      throw new Error("Windows media support is only available on Windows");
    }

    this.running = true;

    try {
      this.monitor = new SMTCMonitor();
      this.bindEvents(this.monitor);

      // Event-driven updates are the primary mechanism. This timer is only a
      // low-frequency reconciliation pass in case a native event is missed.
      this.refreshTimer = setInterval(() => {
        this.queueRefresh();
      }, this.intervalMs);

      this.queueRefresh();
    } catch (error) {
      this.running = false;
      this.monitor?.destroy();
      this.monitor = null;
      throw error;
    }
  }

  stop(): void {
    this.running = false;

    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }

    this.monitor?.destroy();
    this.monitor = null;
  }

  private bindEvents(monitor: SMTCMonitor): void {
    const refresh = () => this.queueRefresh();

    monitor.on("session-media-changed", refresh);
    monitor.on("session-playback-changed", refresh);
    monitor.on("session-added", refresh);
    monitor.on("session-removed", refresh);
    monitor.on("current-session-changed", refresh);
  }

  private queueRefresh(): void {
    if (!this.running || !this.monitor) {
      return;
    }

    if (this.refreshInProgress) {
      this.refreshQueued = true;
      return;
    }

    this.refreshInProgress = true;
    void this.refresh().finally(() => {
      this.refreshInProgress = false;

      if (this.refreshQueued) {
        this.refreshQueued = false;
        this.queueRefresh();
      }
    });
  }

  private async refresh(): Promise<void> {
    const monitor = this.monitor;
    if (!monitor || !this.running) {
      return;
    }

    try {
      const media = await getCurrentWindowsMedia({
        monitor,
        allowedApps: this.allowedApps,
        playingOnly: this.playingOnly,
      });

      const serialized = JSON.stringify(media);
      if (serialized === this.lastSerialized) {
        return;
      }

      this.lastSerialized = serialized;
      await this.onChange(media);
    } catch (error) {
      this.onError(error);
    }
  }
}
