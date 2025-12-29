<script lang="ts">
  import { page } from "$app/state";
  import { getSocketIo } from "$lib/socket-io.svelte";
  import type { NowPlaying as NowPlayingType } from "$lib/types/NowPlaying";
  import AudioMotionAnalyzer from "audiomotion-analyzer";
  import axios from "axios";
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";

  const socketIo = getSocketIo();

  let artist = $state("");
  let track = $state("");
  let thumbnail = $state("");
  let favicon = $state("");
  let hasData = $state(false);
  let isUpdating = $state(true);
  let mounted = $state(false);

  let visualizerContainer: HTMLDivElement | null = $state(null);
  let analyzerInstance: AudioMotionAnalyzer | null = $state(null);
  let audioStream: MediaStream | null = $state(null);
  let cardEl: HTMLDivElement | null = $state(null);
  let resizeObserver: ResizeObserver | null = $state(null);

  function updateVisualizerPosition() {
    if (!cardEl || !visualizerContainer) return;
    const vizH = visualizerContainer.offsetHeight || parseFloat(getComputedStyle(visualizerContainer).height) || 0;
    const offset = -Math.max(0, Math.round(vizH));
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
          mode: 4,
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
          colorStops: [currentTheme.accentColor, currentTheme.glowColor],
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

  // Get scene type from query parameter
  let scene = $derived(page.url.searchParams.get("scene") || "brb");

  // Theme configuration based on scene
  type SceneKey = "brb" | "ending" | "starting-soon";
  type Theme = {
    containerClass: string;
    mainText: string;
    subtitle: string | null;
    gradient: string;
    textGradient: string;
    accentColor: string;
    particleColor: string;
    glowColor: string;
  };
  const themes: Record<SceneKey, Theme> = {
    "brb": {
      containerClass: "brb-container",
      mainText: "Be Right Back",
      subtitle: null,
      gradient:
        "radial-gradient(ellipse at 20% 30%, rgba(139, 92, 246, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(59, 130, 246, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, rgba(236, 72, 153, 0.1) 0%, transparent 70%)",
      textGradient: "linear-gradient(135deg, #ffffff 0%, #8b5cf6 50%, #ec4899 100%)",
      accentColor: "#8b5cf6",
      particleColor: "rgba(139, 92, 246, 0.4)",
      glowColor: "rgba(139, 92, 246, 0.5)",
    },
    "ending": {
      containerClass: "ending-container",
      mainText: "Stream Ending",
      subtitle: "Thanks for watching!",
      gradient:
        "radial-gradient(ellipse at 20% 30%, rgba(239, 68, 68, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(249, 115, 22, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, rgba(245, 158, 11, 0.1) 0%, transparent 70%)",
      textGradient: "linear-gradient(135deg, #ffffff 0%, #ef4444 50%, #f97316 100%)",
      accentColor: "#ef4444",
      particleColor: "rgba(239, 68, 68, 0.4)",
      glowColor: "rgba(239, 68, 68, 0.5)",
    },
    "starting-soon": {
      containerClass: "starting-container",
      mainText: "Starting Soon",
      subtitle: null,
      gradient:
        "radial-gradient(ellipse at 20% 30%, rgba(34, 197, 94, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(59, 130, 246, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, rgba(16, 185, 129, 0.1) 0%, transparent 70%)",
      textGradient: "linear-gradient(135deg, #ffffff 0%, #22c55e 50%, #10b981 100%)",
      accentColor: "#22c55e",
      particleColor: "rgba(34, 197, 94, 0.4)",
      glowColor: "rgba(34, 197, 94, 0.5)",
    },
  };

  let currentTheme = $derived(themes[scene as SceneKey] || themes.brb);

  function updateNowPlaying(data: NowPlayingType) {
    if (data.artist === artist && data.track === track) {
      return;
    }

    isUpdating = true;
    setTimeout(() => {
      artist = data.artist;
      track = data.track;
      thumbnail = data.thumbnail;
      favicon = data.favicon;
      hasData = true;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          isUpdating = false;
        });
      });
    }, 300);
  }

  onMount(async () => {
    setTimeout(() => (mounted = true), 500);

    try {
      const resp = await axios.get<NowPlayingType>("http://localhost:2442/nowPlaying");
      const data: NowPlayingType | undefined = resp.data;
      if (!data || !data.artist || !data.track) {
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
      hasData = true;
      // Wait for card to render in invisible state, then fade in
      setTimeout(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            isUpdating = false;
          });
        });
      }, 400);
    } catch (error) {
      console.error("Failed to fetch current playing music:", error);
    }
  });

  $effect.pre(() => {
    socketIo.client.on("nowPlaying", updateNowPlaying);

    return () => {
      socketIo.client.off("nowPlaying", updateNowPlaying);
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

{#if mounted}
  <div
    transition:fade
    class={currentTheme.containerClass}
    style="--bg-gradient: {currentTheme.gradient}; --text-gradient: {currentTheme.textGradient}; --accent-color: {currentTheme.accentColor}; --particle-color: {currentTheme.particleColor}; --glow-color: {currentTheme.glowColor}"
  >
    <div class="bg-gradient"></div>
    <div class="particles">
      {#each Array(20) as _, i}
        <div
          class="particle"
          style="--i: {i}"
        ></div>
      {/each}
    </div>

    <div class="content">
      <div class="text-wrapper">
        <h1 class="main-text">{currentTheme.mainText}</h1>
        {#if currentTheme.subtitle}
          <p class="subtitle">{currentTheme.subtitle}</p>
        {/if}
        <div class="underline"></div>
      </div>

      {#if hasData}
        <div
          class="now-playing-card"
          data-updating={isUpdating}
          style="--thumbnail: url({thumbnail})"
          bind:this={cardEl}
        >
          <div class="card-glow"></div>
          <div class="album-art-wrapper">
            <div class="album-art">
              <img
                src={thumbnail}
                alt="Album cover"
                class="thumbnail"
              />
              <div class="album-overlay"></div>
              <div class="favicon-badge">
                <img
                  src={favicon}
                  alt="Source"
                  class="favicon"
                />
              </div>
            </div>
          </div>

          <div class="info">
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
              <div class="label">Now Playing</div>
              <div class="track-name">{track}</div>
              <div class="artist-name">{artist}</div>
            </div>
          </div>

          <div
            class="visualizer-bottom"
            bind:this={visualizerContainer}
            aria-hidden="true"
          ></div>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .brb-container,
  .ending-container,
  .starting-container {
    width: 100vw;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0a0a0a;
    padding: 2rem;
    overflow: hidden;
    position: relative;
  }

  .bg-gradient {
    position: absolute;
    inset: 0;
    background: var(--bg-gradient);
    animation: gradientShift 20s ease-in-out infinite;
  }

  @keyframes gradientShift {
    0%,
    100% {
      opacity: 1;
      transform: scale(1) rotate(0deg);
    }
    50% {
      opacity: 0.8;
      transform: scale(1.1) rotate(5deg);
    }
  }

  .particles {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  }

  .particle {
    position: absolute;
    width: 4px;
    height: 4px;
    background: var(--particle-color);
    border-radius: 50%;
    box-shadow: 0 0 10px var(--glow-color);
    animation: float calc(10s + var(--i) * 2s) linear infinite;
    left: calc(var(--i) * 5%);
    top: calc(var(--i) * 5%);
    opacity: 0;
  }

  @keyframes float {
    0% {
      transform: translateY(100vh) translateX(0) scale(0);
      opacity: 0;
    }
    10% {
      opacity: 1;
    }
    90% {
      opacity: 1;
    }
    100% {
      transform: translateY(-100vh) translateX(calc(var(--i) * 20px - 100px)) scale(1);
      opacity: 0;
    }
  }

  .content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4rem;
    z-index: 1;
    animation: contentFadeIn 1s ease-out;
    transition: all 0.8s ease-out;
  }

  @keyframes contentFadeIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .text-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .main-text {
    font-size: 5rem;
    font-weight: 800;
    background: var(--text-gradient);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    text-align: center;
    letter-spacing: -0.03em;
    margin: 0;
    text-shadow: 0 0 80px var(--glow-color);
    animation: textGlow 3s ease-in-out infinite;
    position: relative;
  }

  @keyframes textGlow {
    0%,
    100% {
      filter: brightness(1) drop-shadow(0 0 20px var(--glow-color));
    }
    50% {
      filter: brightness(1.2) drop-shadow(0 0 40px var(--glow-color));
    }
  }

  .subtitle {
    font-size: 1.5rem;
    color: rgba(255, 255, 255, 0.8);
    margin: 0;
    text-align: center;
  }

  .underline {
    width: 100%;
    height: 4px;
    background: linear-gradient(90deg, transparent 0%, var(--accent-color) 50%, transparent 100%);
    border-radius: 2px;
    animation: underlineExpand 2s ease-out;
  }

  @keyframes underlineExpand {
    from {
      width: 0;
      opacity: 0;
    }
    to {
      width: 100%;
      opacity: 1;
    }
  }

  .now-playing-card {
    position: relative;
    display: flex;
    align-items: center;
    gap: 2.5rem;
    background: linear-gradient(135deg, rgba(30, 30, 30, 0.85) 0%, rgba(20, 20, 20, 0.95) 100%);
    backdrop-filter: blur(40px);
    padding: 2.5rem;
    border-radius: 2rem;
    box-shadow:
      0 20px 60px rgba(0, 0, 0, 0.5),
      0 0 0 1px rgba(255, 255, 255, 0.1) inset,
      0 0 100px var(--glow-color);
    opacity: 1;
    transform: translateY(0) scale(1);
    /* overflow: hidden; */
    transition:
      opacity 0.3s ease,
      transform 0.3s ease;
  }

  .now-playing-card::before {
    content: "";
    position: absolute;
    inset: 0;
    background-image: var(--thumbnail);
    background-size: 150%;
    background-position: center;
    background-repeat: no-repeat;
    filter: blur(10px) brightness(0.3) contrast(0.8);
    opacity: 0.4;
    z-index: 0;
    transition: background-image 0.5s ease;
  }

  .now-playing-card[data-updating="true"] {
    opacity: 0;
    transform: translateY(0) scale(0.98);
  }

  .card-glow {
    position: absolute;
    inset: -2px;
    background: linear-gradient(135deg, var(--glow-color), var(--accent-color), var(--glow-color));
    border-radius: 2rem;
    filter: blur(20px);
    opacity: 0.5;
    z-index: -1;
    animation: cardGlowPulse 4s ease-in-out infinite;
  }

  @keyframes cardGlowPulse {
    0%,
    100% {
      opacity: 0.3;
      transform: scale(0.98);
    }
    50% {
      opacity: 0.6;
      transform: scale(1.02);
    }
  }

  .album-art-wrapper {
    position: relative;
    filter: drop-shadow(0 20px 40px rgba(0, 0, 0, 0.6));
  }

  .album-art-wrapper::before {
    content: "";
    position: absolute;
    inset: -10px;
    background: linear-gradient(135deg, var(--accent-color), var(--glow-color));
    border-radius: 1.5rem;
    filter: blur(20px);
    opacity: 0;
    animation: albumGlow 2s ease-in-out infinite;
    z-index: -1;
  }

  @keyframes albumGlow {
    0%,
    100% {
      opacity: 0.3;
    }
    50% {
      opacity: 0.7;
    }
  }

  .album-art {
    position: relative;
    width: 12rem;
    height: 12rem;
    border-radius: 1.25rem;
    overflow: hidden;
    background: linear-gradient(135deg, #1a1a1a, #2a2a2a);
    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1) inset;
    flex-shrink: 0;
    transform: rotate(-2deg);
    transition: transform 0.3s ease;
  }

  .album-art:hover {
    transform: rotate(0deg) scale(1.05);
  }

  .thumbnail {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .album-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, transparent 100%);
    pointer-events: none;
  }

  .favicon-badge {
    position: absolute;
    bottom: 0.75rem;
    right: 0.75rem;
    width: 3rem;
    height: 3rem;
    background: linear-gradient(135deg, rgba(30, 30, 30, 0.95), rgba(20, 20, 20, 0.95));
    backdrop-filter: blur(10px);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow:
      0 4px 16px rgba(0, 0, 0, 0.6),
      0 0 0 3px rgba(0, 0, 0, 0.9),
      0 0 0 4px var(--glow-color);
    animation: badgePop 0.5s ease forwards 1s;
    opacity: 0;
    transform: scale(0);
  }

  @keyframes badgePop {
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .favicon {
    width: 2rem;
    height: 2rem;
    object-fit: contain;
    border-radius: 50%;
  }

  .info {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    min-width: 0;
    max-width: 45rem;
  }

  .music-icon {
    width: 2.5rem;
    height: 2.5rem;
    color: var(--accent-color);
    flex-shrink: 0;
    opacity: 0;
    transform: rotate(-180deg) scale(0);
    animation: iconSpin 0.6s ease forwards 0.8s;
    filter: drop-shadow(0 0 10px var(--glow-color));
  }

  @keyframes iconSpin {
    to {
      opacity: 1;
      transform: rotate(0deg) scale(1);
    }
  }

  .music-icon svg {
    width: 100%;
    height: 100%;
  }

  .text-content {
    flex: 1;
    min-width: 0;
    opacity: 0;
    transform: translateX(-1rem);
    animation: textSlideIn 0.6s ease forwards 0.9s;
  }

  @keyframes textSlideIn {
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .label {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--accent-color);
    margin-bottom: 0.5rem;
  }

  .track-name {
    font-size: 1.75rem;
    font-weight: 700;
    color: #ffffff;
    overflow-wrap: break-word;
    word-break: break-word;
    letter-spacing: -0.02em;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
    line-height: 1.3;
    margin-bottom: 0.25rem;
  }

  .artist-name {
    font-size: 1.25rem;
    color: rgba(255, 255, 255, 0.6);
    overflow-wrap: break-word;
    word-break: break-word;
    letter-spacing: 0.01em;
    line-height: 1.3;
  }

  /* bottom-positioned visualizer (flipped vertically) */
  .visualizer-bottom {
    position: absolute;
    left: 2rem;
    right: 2rem;
    /* bottom is set dynamically in JS */
    height: 12.5rem;
    overflow: hidden;
    background: transparent;
    z-index: 2;
    animation: visualizerPop 0.6s ease forwards 1s;
    transition: bottom 200ms ease;
  }

  /* Ensure the AudioMotionAnalyzer canvas is transparent and flipped vertically */
  .visualizer-bottom :global(canvas) {
    transform: scaleY(-1) !important;
    -webkit-transform: scaleY(-1) !important;
  }

  @keyframes visualizerPop {
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @media (max-width: 968px) {
    .main-text {
      font-size: 3.5rem;
    }

    .now-playing-card {
      flex-direction: column;
      text-align: center;
      gap: 2rem;
    }

    .info {
      flex-direction: column;
      align-items: center;
    }

    .album-art {
      width: 10rem;
      height: 10rem;
    }
  }

  @media (max-width: 640px) {
    .main-text {
      font-size: 2.5rem;
    }

    .content {
      gap: 2.5rem;
    }

    .now-playing-card {
      padding: 2rem;
    }

    .album-art {
      width: 8rem;
      height: 8rem;
    }

    .track-name {
      font-size: 1.5rem;
    }

    .artist-name {
      font-size: 1.125rem;
    }
  }
</style>
