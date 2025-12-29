<script lang="ts">
  import type { NowPlaying } from "$lib/types/NowPlaying";

  import { getSocketIo } from "$lib/socket-io.svelte";
  import { getWidgets } from "$lib/widgets.svelte";
  import AudioMotionAnalyzer from "audiomotion-analyzer";

  const widgets = getWidgets();
  const socketIo = getSocketIo();

  let visualizerContainer: HTMLDivElement | null = $state(null);
  let analyzerInstance: AudioMotionAnalyzer | null = $state(null);
  let audioStream: MediaStream | null = $state(null);
  let cardEl: HTMLDivElement | null = $state(null);
  let resizeObserver: ResizeObserver | null = $state(null);

  function updateVisualizerPosition() {
    if (!cardEl || !visualizerContainer) return;
    const cardH = cardEl.offsetHeight || parseFloat(getComputedStyle(cardEl).height) || 0;
    const offset = Math.max(0, Math.round(cardH));
    visualizerContainer.style.bottom = `${offset}px`;
  }

  $effect(() => {
    (async () => {
      try {
        if (!visualizerContainer) {
          return;
        }

        await navigator.mediaDevices.getUserMedia({ audio: true });

        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioDevice = devices.find(
          (device) => device.kind === "audioinput" && device.label.toLowerCase().includes("vaio3"),
        );
        if (!audioDevice) {
          throw new Error('Audio device "vaio3" not found');
        }

        audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            noiseSuppression: false,
            echoCancellation: false,
            autoGainControl: false,
            frameRate: { ideal: 60 },
            sampleRate: 48000,
            sampleSize: 24,
            backgroundBlur: false,
            deviceId: audioDevice.deviceId,
            channelCount: 2,
          },
        });

        analyzerInstance = new AudioMotionAnalyzer(visualizerContainer, {
          mode: 5,
          volume: 0,
          channelLayout: "single",
          showScaleX: false,
          showBgColor: false,
          overlay: true,
          showPeaks: false,
          roundBars: true,
          ansiBands: false,
          gradient: "steelblue",
          frequencyScale: "log",
          smoothing: 0.5,
        });

        analyzerInstance.registerGradient("colorSchema", {
          colorStops: ["#1a1a1a", "#2a2a2a", "#ffffff"],
        });
        analyzerInstance.gradient = "colorSchema";

        const source = analyzerInstance.audioCtx.createMediaStreamSource(audioStream);
        analyzerInstance.connectInput(source);

        // position the visualizer dynamically based on element size
        updateVisualizerPosition();
        if (cardEl || visualizerContainer) {
          resizeObserver = new ResizeObserver(updateVisualizerPosition);
          if (cardEl) resizeObserver.observe(cardEl);
          if (visualizerContainer) resizeObserver.observe(visualizerContainer);
          window.addEventListener("resize", updateVisualizerPosition);
        }
      } catch (err) {
        console.warn("Microphone visualizer unavailable:", err);
      }
    })();
  });

  let artist = $state("");
  let track = $state("");
  let thumbnail = $state("");
  let favicon = $state("");

  const showTime = 24;

  let closeTimer = $state<NodeJS.Timeout | null>(null);
  const reAlertTimers = $state<NodeJS.Timeout[]>([]);

  let showPopup = $state(false);
  let imagesLoaded = $state(false);

  function popup() {
    if (!imagesLoaded) {
      // Wait for images to load before showing
      const checkInterval = setInterval(() => {
        if (imagesLoaded) {
          clearInterval(checkInterval);
          showPopup = true;

          closeTimer = setTimeout(() => {
            showPopup = false;
          }, showTime * 1000);
        }
      }, 50);

      // Timeout after 3 seconds to show anyway
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!showPopup && imagesLoaded === false) {
          imagesLoaded = true;
        }
      }, 3000);
    } else {
      showPopup = true;

      closeTimer = setTimeout(() => {
        showPopup = false;
      }, showTime * 1000);
    }
  }

  $effect.pre(() => {
    socketIo.client.on("nowPlaying", async (data: NowPlaying) => {
      if (data.artist === artist && data.track === track && data.thumbnail === thumbnail && data.favicon === favicon) {
        return;
      }

      // Preload images before showing
      const imgPromises = [
        new Promise((resolve) => {
          const img = new Image();
          img.referrerPolicy = "no-referrer";
          img.onload = () => resolve(true);
          img.onerror = () => resolve(true);
          img.src = data.thumbnail;
        }),
        new Promise((resolve) => {
          const img = new Image();
          img.referrerPolicy = "no-referrer";
          img.onload = () => resolve(true);
          img.onerror = () => resolve(true);
          img.src = data.favicon;
        }),
      ];
      await Promise.all(imgPromises);

      artist = data.artist;
      track = data.track;
      thumbnail = data.thumbnail;
      favicon = data.favicon;

      if (closeTimer) clearTimeout(closeTimer);
      for (const reAlertTimer of reAlertTimers) {
        clearTimeout(reAlertTimer);
      }
      reAlertTimers.length = 0;

      popup();

      for (const reAlert of data.reAlerts) {
        const timeout = new Date(reAlert).getTime() - Date.now();
        reAlertTimers.push(setTimeout(popup, timeout));
      }
    });

    return () => {
      if (closeTimer) clearTimeout(closeTimer);
      for (const reAlertTimer of reAlertTimers) {
        clearTimeout(reAlertTimer);
      }

      socketIo.client.off("nowPlaying");

      try {
        if (analyzerInstance && analyzerInstance.disconnectInput) {
          analyzerInstance.disconnectInput();
        }
      } catch (e) {}
      if (audioStream) {
        audioStream.getTracks().forEach((t) => t.stop());
      }

      if (resizeObserver) {
        try {
          resizeObserver.disconnect();
        } catch (e) {}
        resizeObserver = null;
      }
      window.removeEventListener("resize", updateVisualizerPosition);
    };
  });
</script>

{#if !widgets.disabled.includes("common.nowPlaying")}
  <div
    id="now-playing"
    data-show={showPopup}
  >
    <div class="container">
      <div class="album-art-wrapper">
        <div class="album-art-glow"></div>
        <div class="album-art">
          <img
            src={thumbnail}
            alt="Album cover"
            class="thumbnail"
          />
          <div class="favicon-badge">
            <img
              src={favicon}
              alt="Source"
              class="favicon"
            />
          </div>
        </div>
      </div>

      <div
        class="info"
        bind:this={cardEl}
      >
        <div class="music-icon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M9 18V5l12-2v13"></path>
            <circle
              cx="6"
              cy="18"
              r="3"
            ></circle>
            <circle
              cx="18"
              cy="16"
              r="3"
            ></circle>
          </svg>
        </div>

        <div class="text-content">
          <div class="track-name">{track}</div>
          <div class="artist-name">{artist}</div>
        </div>

        <div
          class="visualizer-top"
          bind:this={visualizerContainer}
          aria-hidden="true"
        ></div>
      </div>
    </div>
  </div>
{/if}

<style>
  #now-playing {
    position: fixed;
    bottom: 2rem;
    left: 2rem;
    pointer-events: none;
    z-index: 1000;
    overflow: visible;
  }

  .container {
    display: flex;
    align-items: flex-end;
    gap: 1.5rem;
    opacity: 0;
    transform: translateY(2rem) scale(0.9);
    transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  /* Album Art Styles */
  .album-art-wrapper {
    position: relative;
    flex-shrink: 0;
  }

  .album-art-glow {
    position: absolute;
    inset: -0.75rem;
    background: rgba(255, 255, 255, 0.3);
    border-radius: 1.5rem;
    opacity: 0;
    filter: blur(20px);
    transition: opacity 0.8s ease;
  }

  .album-art {
    position: relative;
    width: 7rem;
    height: 7rem;
    border-radius: 1rem;
    overflow: hidden;
    background: linear-gradient(135deg, #1a1a1a, #2a2a2a);
    box-shadow:
      0 10px 30px rgba(0, 0, 0, 0.5),
      0 0 0 1px rgba(255, 255, 255, 0.1) inset;
    transform: translateY(1rem) rotate(-5deg);
    transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .thumbnail {
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0;
    transition: opacity 0.4s ease 0.2s;
  }

  .favicon-badge {
    position: absolute;
    bottom: 0.25rem;
    right: 0.25rem;
    width: 2rem;
    height: 2rem;
    background: linear-gradient(135deg, #2a2a2a, #1a1a1a);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.4),
      0 0 0 3px rgba(0, 0, 0, 0.8),
      0 0 0 4px rgba(255, 255, 255, 0.1);
    opacity: 0;
    transform: scale(0);
    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s;
  }

  .favicon {
    width: 1.5rem;
    height: 1.5rem;
    object-fit: contain;
    border-radius: 50%;
  }

  /* Info Section Styles */
  .info {
    position: relative; /* ensure absolute children position inside this container */
    display: flex;
    align-items: center;
    gap: 1rem;
    background: linear-gradient(135deg, rgba(30, 30, 30, 0.95), rgba(20, 20, 20, 0.95));
    backdrop-filter: blur(20px);
    padding: 1.25rem 1.5rem;
    border-radius: 1rem;
    min-width: 20rem;
    max-width: 50rem;
    box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.4),
      0 0 0 1px rgba(255, 255, 255, 0.05) inset;
    transform: translateX(-1rem);
    transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s;
  }

  .music-icon {
    width: 2rem;
    height: 2rem;
    color: rgba(255, 255, 255, 0.6);
    flex-shrink: 0;
    opacity: 0;
    transform: rotate(-180deg) scale(0);
    transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s;
  }

  .music-icon svg {
    width: 100%;
    height: 100%;
  }

  .text-content {
    flex: 1;
    min-width: 0;
    opacity: 0;
    transform: translateY(0.5rem);
    transition: all 0.5s ease 0.3s;
  }

  .track-name {
    font-size: 1.125rem;
    font-weight: 600;
    color: #ffffff;
    margin-bottom: 0.25rem;
    overflow-wrap: break-word;
    word-break: break-word;
    letter-spacing: -0.01em;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    line-height: 1.3;
  }

  .artist-name {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.6);
    overflow-wrap: break-word;
    word-break: break-word;
    letter-spacing: 0.01em;
    line-height: 1.3;
  }

  /* bottom-positioned visualizer (flipped vertically) */
  .visualizer-top {
    position: absolute;
    left: 1rem;
    right: 1rem;
    /* bottom is set dynamically in JS */
    height: 10rem;
    overflow: hidden;
    background: transparent;
    z-index: 2;
    animation: visualizerPop 0.6s ease forwards 1s;
    transition: bottom 200ms ease;
  }

  #now-playing[data-show="true"] .container {
    opacity: 1;
    transform: translateY(0) scale(1);
  }

  #now-playing[data-show="true"] .album-art-glow {
    opacity: 1;
    animation: glow-pulse 3s ease-in-out infinite;
  }

  #now-playing[data-show="true"] .album-art {
    transform: translateY(0) rotate(0deg);
  }

  #now-playing[data-show="true"] .thumbnail {
    opacity: 1;
  }

  #now-playing[data-show="true"] .favicon-badge {
    opacity: 1;
    transform: scale(1);
  }

  #now-playing[data-show="true"] .info {
    transform: translateX(0);
  }

  #now-playing[data-show="true"] .music-icon {
    opacity: 1;
    transform: rotate(0deg) scale(1);
  }

  #now-playing[data-show="true"] .text-content {
    opacity: 1;
    transform: translateY(0);
  }

  #now-playing[data-show="true"] .visualizer-top {
    opacity: 1;
    transform: scale(1);
  }

  /* Animations */
  @keyframes visualize {
    0%,
    100% {
      height: 30%;
    }
    50% {
      height: 100%;
    }
  }

  @keyframes glow-pulse {
    0%,
    100% {
      opacity: 0.6;
      transform: scale(1);
    }
    50% {
      opacity: 1;
      transform: scale(1.05);
    }
  }

  /* Hide State */
  #now-playing[data-show="false"] .container {
    opacity: 0;
    transform: translateY(2rem) scale(0.9);
    transition: all 0.4s cubic-bezier(0.6, -0.28, 0.74, 0.05);
  }

  #now-playing[data-show="false"] .album-art {
    transform: translateY(1rem) rotate(-5deg);
  }

  #now-playing[data-show="false"] .info {
    transform: translateX(-1rem);
  }
</style>
