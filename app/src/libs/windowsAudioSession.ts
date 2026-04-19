import { Logger } from "#libs/logger";
import { dlopen, FFIType, ptr } from "bun:ffi";
import { exec } from "node:child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const logger = new Logger("WindowsAudioSession");

interface MediaMetadata {
  title?: string;
  artist?: string;
  albumTitle?: string;
  thumbnail?: string; // Base64 encoded image or URL
  duration?: number; // in seconds
  playbackStatus?: "playing" | "paused" | "stopped" | "unknown";
}

interface AudioSession {
  processName: string;
  processId: number;
  displayName: string;
  state: "active" | "inactive" | "expired";
  volume: number;
  isMuted: boolean;
  mediaMetadata?: MediaMetadata;
}

interface CurrentAudioInfo {
  sessions: AudioSession[];
  activeSession?: AudioSession;
}

// Windows API constants
const MAX_PATH = 260;
const PROCESS_QUERY_INFORMATION = 0x0400;
const PROCESS_VM_READ = 0x0010;

// COM/WinRT constants
const S_OK = 0;
const COINIT_MULTITHREADED = 0x0;

/**
 * WindowsAudioSession utility class for extracting current audio session information
 * using Windows Core Audio APIs through Bun FFI
 */
export class WindowsAudioSession {
  private static instance: WindowsAudioSession;
  private isWindows: boolean;
  private user32: any;
  private kernel32: any;
  private psapi: any;
  private ole32: any;
  private combase: any;

  // Media metadata cache
  private mediaMetadataCache: MediaMetadata | null = null;
  private mediaMetadataCacheTime: number = 0;
  private mediaMetadataCacheDuration: number = 500; // Cache for 500ms
  private metadataFetchInProgress: boolean = false;

  private constructor() {
    this.isWindows = process.platform === "win32";
    if (!this.isWindows) {
      logger.warn("WindowsAudioSession is only available on Windows platform");
      return;
    }

    try {
      // Load User32.dll for window management
      this.user32 = dlopen("user32.dll", {
        GetForegroundWindow: {
          args: [],
          returns: FFIType.ptr,
        },
        GetWindowThreadProcessId: {
          args: [FFIType.ptr, FFIType.ptr],
          returns: FFIType.u32,
        },
        GetWindowTextW: {
          args: [FFIType.ptr, FFIType.ptr, FFIType.i32],
          returns: FFIType.i32,
        },
        EnumWindows: {
          args: [FFIType.ptr, FFIType.ptr],
          returns: FFIType.bool,
        },
        IsWindowVisible: {
          args: [FFIType.ptr],
          returns: FFIType.bool,
        },
      });

      // Load Kernel32.dll for process management
      this.kernel32 = dlopen("kernel32.dll", {
        OpenProcess: {
          args: [FFIType.u32, FFIType.bool, FFIType.u32],
          returns: FFIType.ptr,
        },
        CloseHandle: {
          args: [FFIType.ptr],
          returns: FFIType.bool,
        },
        QueryFullProcessImageNameW: {
          args: [FFIType.ptr, FFIType.u32, FFIType.ptr, FFIType.ptr],
          returns: FFIType.bool,
        },
      });

      // Load Psapi.dll for process information
      this.psapi = dlopen("psapi.dll", {
        GetProcessImageFileNameW: {
          args: [FFIType.ptr, FFIType.ptr, FFIType.u32],
          returns: FFIType.u32,
        },
        EnumProcesses: {
          args: [FFIType.ptr, FFIType.u32, FFIType.ptr],
          returns: FFIType.bool,
        },
      });

      // Load ole32.dll for COM initialization
      this.ole32 = dlopen("ole32.dll", {
        CoInitializeEx: {
          args: [FFIType.ptr, FFIType.u32],
          returns: FFIType.i32,
        },
        CoUninitialize: {
          args: [],
          returns: FFIType.void,
        },
        CoCreateInstance: {
          args: [FFIType.ptr, FFIType.ptr, FFIType.u32, FFIType.ptr, FFIType.ptr],
          returns: FFIType.i32,
        },
      });

      // Load combase.dll for WinRT APIs
      this.combase = dlopen("combase.dll", {
        RoInitialize: {
          args: [FFIType.u32],
          returns: FFIType.i32,
        },
        RoUninitialize: {
          args: [],
          returns: FFIType.void,
        },
        RoGetActivationFactory: {
          args: [FFIType.ptr, FFIType.ptr, FFIType.ptr],
          returns: FFIType.i32,
        },
        WindowsCreateString: {
          args: [FFIType.ptr, FFIType.u32, FFIType.ptr],
          returns: FFIType.i32,
        },
        WindowsDeleteString: {
          args: [FFIType.ptr],
          returns: FFIType.i32,
        },
      });

      // Initialize Windows Runtime
      const initResult = this.combase.symbols.RoInitialize(1); // RO_INIT_MULTITHREADED
      if (initResult === S_OK || initResult === 1) {
        // S_OK or S_FALSE (already initialized)
        logger.info("Windows Runtime initialized successfully");
      }

      logger.info("Windows Audio Session FFI initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize Windows FFI:", error);
    }
  }

  public static getInstance(): WindowsAudioSession {
    if (!WindowsAudioSession.instance) {
      WindowsAudioSession.instance = new WindowsAudioSession();
    }
    return WindowsAudioSession.instance;
  }

  /**
   * Gets all active audio sessions using Windows API through Bun FFI
   * @returns Promise with current audio session information
   */
  public async getAudioSessions(): Promise<CurrentAudioInfo> {
    if (!this.isWindows || !this.user32) {
      logger.warn("Audio session detection is only available on Windows");
      return { sessions: [] };
    }

    try {
      const sessions: AudioSession[] = [];

      // Get foreground window's process
      const foregroundSession = this.getForegroundWindowSession();
      if (foregroundSession) {
        sessions.push(foregroundSession);
      }

      // Enumerate all processes with windows
      const allProcesses = await this.enumerateProcessesWithWindows();
      sessions.push(...allProcesses);

      // Remove duplicates based on processId
      const uniqueSessions = sessions.filter(
        (session, index, self) => index === self.findIndex((s) => s.processId === session.processId),
      );

      const activeSession = uniqueSessions[0] || undefined;

      return {
        sessions: uniqueSessions,
        activeSession,
      };
    } catch (error) {
      logger.error("Failed to get audio sessions:", error);
      return { sessions: [] };
    }
  }

  /**
   * Gets the currently active audio session (foreground window)
   * @returns Promise with the active audio session or null
   */
  public async getActiveAudioSession(): Promise<AudioSession | null> {
    if (!this.isWindows || !this.user32) {
      return null;
    }

    try {
      const session = this.getForegroundWindowSession();
      if (session) {
        // Get media metadata with caching
        const metadata = await this.getMediaMetadata();
        session.mediaMetadata = metadata ?? undefined;
      }
      return session;
    } catch (error) {
      logger.error("Failed to get active audio session:", error);
      return null;
    }
  }

  /**
   * Gets audio session for a specific process
   * @param processName The name of the process to find
   * @returns Promise with the audio session or null
   */
  public async getAudioSessionByProcess(processName: string): Promise<AudioSession | null> {
    const info = await this.getAudioSessions();
    return info.sessions.find((s) => s.processName.toLowerCase().includes(processName.toLowerCase())) || null;
  }

  /**
   * Monitors audio sessions and calls callback when active session changes
   * @param callback Function to call when active session changes
   * @param intervalMs Polling interval in milliseconds (default: 1000)
   * @returns Function to stop monitoring
   */
  public monitorAudioSessions(callback: (session: AudioSession | null) => void, intervalMs: number = 1000): () => void {
    let lastActiveProcess: string | null = null;

    const interval = setInterval(async () => {
      try {
        const activeSession = await this.getActiveAudioSession();
        const currentProcess = activeSession?.processName || null;

        if (currentProcess !== lastActiveProcess) {
          lastActiveProcess = currentProcess;
          callback(activeSession);
        }
      } catch (error) {
        logger.error("Error monitoring audio sessions:", error);
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }

  /**
   * Monitors media metadata and calls callback when metadata changes
   * @param callback Function to call when metadata changes
   * @param intervalMs Polling interval in milliseconds (default: 1000)
   * @returns Function to stop monitoring
   */
  public monitorMediaMetadata(callback: (metadata: MediaMetadata | null) => void, intervalMs: number = 1000): () => void {
    let lastTitle: string | undefined = undefined;
    let lastArtist: string | undefined = undefined;
    // let lastPlaybackStatus: string | undefined = undefined;

    const interval = setInterval(async () => {
      try {
        const metadata = await this.getMediaMetadata();

        // Check if any significant metadata changed
        const titleChanged = metadata?.title !== lastTitle;
        const artistChanged = metadata?.artist !== lastArtist;
        // const statusChanged = metadata?.playbackStatus !== lastPlaybackStatus;

        if (titleChanged || artistChanged /* || statusChanged */) {
          lastTitle = metadata?.title;
          lastArtist = metadata?.artist;
          // lastPlaybackStatus = metadata?.playbackStatus;
          callback(metadata);
        }
      } catch (error) {
        logger.error("Error monitoring media metadata:", error);
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }

  private getForegroundWindowSession(): AudioSession | null {
    try {
      // Get the foreground window handle
      const hwnd = this.user32.symbols.GetForegroundWindow();
      if (!hwnd || Number(hwnd) === 0) {
        return null;
      }

      // Get process ID
      const processIdBuffer = new Uint32Array(1);
      this.user32.symbols.GetWindowThreadProcessId(hwnd, ptr(processIdBuffer));
      const processId = processIdBuffer[0];

      if (!processId) {
        return null;
      }

      // Get window title
      const titleBuffer = new Uint16Array(MAX_PATH);
      const titleLength = this.user32.symbols.GetWindowTextW(hwnd, ptr(titleBuffer), MAX_PATH);

      const displayName = titleLength > 0 ? this.utf16ToString(titleBuffer.slice(0, titleLength)) : "";

      // Get process name
      const processName = this.getProcessName(processId);

      return {
        processName,
        processId,
        displayName,
        state: "active",
        volume: 1.0,
        isMuted: false,
      };
    } catch (error) {
      logger.error("Error getting foreground window session:", error);
      return null;
    }
  }

  private getProcessName(processId: number): string {
    try {
      const hProcess = this.kernel32.symbols.OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, false, processId);

      if (!hProcess || Number(hProcess) === 0) {
        return `Process ${processId}`;
      }

      const pathBuffer = new Uint16Array(MAX_PATH);
      const sizeBuffer = new Uint32Array(1);
      sizeBuffer[0] = MAX_PATH;

      const success = this.kernel32.symbols.QueryFullProcessImageNameW(hProcess, 0, ptr(pathBuffer), ptr(sizeBuffer));

      this.kernel32.symbols.CloseHandle(hProcess);

      if (success) {
        const fullPath = this.utf16ToString(pathBuffer.slice(0, sizeBuffer[0]));
        const parts = fullPath.split("\\");
        return parts[parts.length - 1].replace(".exe", "");
      }

      return `Process ${processId}`;
    } catch (error) {
      return `Process ${processId}`;
    }
  }

  private async enumerateProcessesWithWindows(): Promise<AudioSession[]> {
    // This would require callback handling which is complex in Bun FFI
    // For now, return empty array - the foreground window is the most relevant anyway
    return [];
  }

  private utf16ToString(buffer: Uint16Array): string {
    const decoder = new TextDecoder("utf-16");
    return decoder.decode(buffer);
  }

  /**
   * Gets media metadata from Windows Media Session API
   * Includes title, artist, album, thumbnail, duration, and playback status
   * Uses PowerShell with aggressive caching to handle frequent calls
   * @returns Promise with media metadata or null
   */
  public async getMediaMetadata(): Promise<MediaMetadata | null> {
    if (!this.isWindows) {
      return null;
    }

    // Return cached data if still valid
    const now = Date.now();
    if (this.mediaMetadataCache && now - this.mediaMetadataCacheTime < this.mediaMetadataCacheDuration) {
      return this.mediaMetadataCache;
    }

    // If fetch is in progress, return cached data or null
    if (this.metadataFetchInProgress) {
      return this.mediaMetadataCache;
    }

    this.metadataFetchInProgress = true;

    try {
      // PowerShell script to access Windows Media Session API
      const psScript = `
        Add-Type -AssemblyName System.Runtime.WindowsRuntime

        $asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1' })[0]

        function Await($WinRtTask, $ResultType) {
            $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
            $netTask = $asTask.Invoke($null, @($WinRtTask))
            $netTask.Wait(-1) | Out-Null
            $netTask.Result
        }

        [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType=WindowsRuntime] | Out-Null

        $sessionManager = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])

        $currentSession = $sessionManager.GetCurrentSession()

        if ($currentSession) {
            $mediaProperties = Await ($currentSession.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
            $timelineProperties = $currentSession.GetTimelineProperties()
            $playbackInfo = $currentSession.GetPlaybackInfo()

            $thumbnail = $null
            if ($mediaProperties.Thumbnail) {
                try {
                    $stream = Await ($mediaProperties.Thumbnail.OpenReadAsync()) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])
                    $reader = [System.IO.BinaryReader]::new($stream.AsStreamForRead())
                    $bytes = $reader.ReadBytes([int]$stream.Size)
                    $reader.Close()
                    $stream.Close()
                    $thumbnail = [Convert]::ToBase64String($bytes)
                } catch {
                    $thumbnail = $null
                }
            }

            $status = switch ($playbackInfo.PlaybackStatus) {
                0 { 'closed' }
                1 { 'opened' }
                2 { 'changing' }
                3 { 'stopped' }
                4 { 'playing' }
                5 { 'paused' }
                default { 'unknown' }
            }

            @{
                Title = $mediaProperties.Title
                Artist = $mediaProperties.Artist
                AlbumTitle = $mediaProperties.AlbumTitle
                Thumbnail = $thumbnail
                Duration = $timelineProperties.EndTime.TotalSeconds
                PlaybackStatus = $status
            } | ConvertTo-Json -Compress
        } else {
            $null
        }
      `;

      // Encode script as base64 to avoid escaping issues
      const encodedScript = Buffer.from(psScript, "utf16le").toString("base64");
      const { stdout, stderr } = await execAsync(
        `powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand "${encodedScript}"`,
        { maxBuffer: 10 * 1024 * 1024 }, // 10MB buffer for thumbnail data
      );

      if (stderr && !stdout) {
        this.metadataFetchInProgress = false;
        return this.mediaMetadataCache; // Return old cache on error
      }

      if (!stdout || stdout.trim() === "" || stdout.trim() === "null") {
        this.metadataFetchInProgress = false;
        this.mediaMetadataCache = null;
        this.mediaMetadataCacheTime = now;
        return null;
      }

      const data = JSON.parse(stdout);

      this.mediaMetadataCache = {
        title: data.Title || undefined,
        artist: data.Artist || undefined,
        albumTitle: data.AlbumTitle || undefined,
        thumbnail: data.Thumbnail ? `data:image/jpeg;base64,${data.Thumbnail}` : undefined,
        duration: data.Duration || undefined,
        playbackStatus:
          data.PlaybackStatus === "playing" ? "playing"
          : data.PlaybackStatus === "paused" ? "paused"
          : data.PlaybackStatus === "stopped" ? "stopped"
          : "unknown",
      };

      this.mediaMetadataCacheTime = now;
      this.metadataFetchInProgress = false;

      return this.mediaMetadataCache;
    } catch (error) {
      logger.error("Failed to get media metadata:", error);
      this.metadataFetchInProgress = false;
      return this.mediaMetadataCache; // Return old cache on error
    }
  }

  /**
   * Set the cache duration for media metadata (in milliseconds)
   * Default is 500ms. Increase for less frequent PowerShell calls.
   * @param durationMs Cache duration in milliseconds
   */
  public setMetadataCacheDuration(durationMs: number): void {
    this.mediaMetadataCacheDuration = durationMs;
  }

  /**
   * Clear the media metadata cache to force fresh fetch
   */
  public clearMetadataCache(): void {
    this.mediaMetadataCache = null;
    this.mediaMetadataCacheTime = 0;
  }
}

export default WindowsAudioSession.getInstance();
