export type WindowsMediaPlaybackStatus = "closed" | "opened" | "changing" | "stopped" | "playing" | "paused";

export interface WindowsMedia {
  title: string;
  artist: string;
  albumTitle: string;
  albumArtist: string;
  subtitle: string;
  trackNumber: number;
  playbackStatus: WindowsMediaPlaybackStatus;
  duration: number;
  sourceAppUserModelId: string;
  /** Browser-ready data URL for the Windows media thumbnail. */
  albumArt: string | null;
  /** Browser-ready data URL for the Windows application icon. */
  appIcon: string | null;
}
