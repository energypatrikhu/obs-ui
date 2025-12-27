<script lang="ts">
  import { getSocketIo } from "$lib/socket-io.svelte";
  import type { NowPlaying as NowPlayingType } from "$lib/types/NowPlaying";
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
    setTimeout(() => {
      mounted = true;
    }, 500);

    try {
      const response = await fetch("http://localhost:2442/nowPlaying");
      if (response.ok) {
        const data: NowPlayingType = await response.json();
        if (data && data.artist && data.track) {
          // Preload images before showing
          const imgPromises = [
            new Promise((resolve) => {
              const img = new Image();
              img.onload = () => resolve(true);
              img.onerror = () => resolve(true);
              img.src = data.thumbnail;
            }),
            new Promise((resolve) => {
              const img = new Image();
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
        }
      }
    } catch (error) {
      console.error("Failed to fetch current playing music:", error);
    }
  });

  $effect.pre(() => {
    socketIo.client.on("nowPlaying", updateNowPlaying);

    return () => {
      socketIo.client.off("nowPlaying", updateNowPlaying);
    };
  });
</script>

{#if mounted}
  <div
    transition:fade
    class="brb-container"
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
      <div class="brb-text-wrapper">
        <h1 class="brb-text">Be Right Back</h1>
        <div class="brb-underline"></div>
      </div>

      {#if hasData}
        <div
          class="now-playing-card"
          data-updating={isUpdating}
          style="--thumbnail: url({thumbnail})"
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
            <div class="visualizer">
              <div class="bar"></div>
              <div class="bar"></div>
              <div class="bar"></div>
              <div class="bar"></div>
              <div class="bar"></div>
            </div>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .brb-container {
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
    background: radial-gradient(ellipse at 20% 30%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
      radial-gradient(ellipse at 80% 70%, rgba(59, 130, 246, 0.15) 0%, transparent 50%),
      radial-gradient(ellipse at 50% 50%, rgba(236, 72, 153, 0.1) 0%, transparent 70%);
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
    background: rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
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

  .brb-text-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .brb-text {
    font-size: 5rem;
    font-weight: 800;
    background: linear-gradient(135deg, #ffffff 0%, #a78bfa 50%, #60a5fa 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    text-align: center;
    letter-spacing: -0.03em;
    margin: 0;
    text-shadow: 0 0 80px rgba(167, 139, 250, 0.5);
    animation: textGlow 3s ease-in-out infinite;
    position: relative;
  }

  @keyframes textGlow {
    0%,
    100% {
      filter: brightness(1) drop-shadow(0 0 20px rgba(167, 139, 250, 0.5));
    }
    50% {
      filter: brightness(1.2) drop-shadow(0 0 40px rgba(167, 139, 250, 0.8));
    }
  }

  .brb-underline {
    width: 100%;
    height: 4px;
    background: linear-gradient(90deg, transparent 0%, #a78bfa 50%, transparent 100%);
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
      0 0 100px rgba(139, 92, 246, 0.2);
    opacity: 1;
    transform: translateY(0) scale(1);
    overflow: hidden;
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
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(59, 130, 246, 0.3), rgba(236, 72, 153, 0.3));
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
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.4), rgba(59, 130, 246, 0.4));
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
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, transparent 100%);
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
      0 0 0 4px rgba(139, 92, 246, 0.3);
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
    color: rgba(139, 92, 246, 0.8);
    flex-shrink: 0;
    opacity: 0;
    transform: rotate(-180deg) scale(0);
    animation: iconSpin 0.6s ease forwards 0.8s;
    filter: drop-shadow(0 0 10px rgba(139, 92, 246, 0.5));
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
    color: rgba(139, 92, 246, 0.8);
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

  .visualizer {
    display: flex;
    align-items: flex-end;
    gap: 0.35rem;
    height: 3rem;
    opacity: 0;
    transform: scale(0);
    animation: visualizerPop 0.6s ease forwards 1s;
  }

  @keyframes visualizerPop {
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .bar {
    width: 0.35rem;
    background: linear-gradient(to top, rgba(139, 92, 246, 0.6), rgba(167, 139, 250, 1));
    border-radius: 0.175rem;
    box-shadow: 0 0 10px rgba(139, 92, 246, 0.5);
    animation: visualize 1s ease-in-out infinite;
  }

  .bar:nth-child(1) {
    animation-delay: 0s;
  }

  .bar:nth-child(2) {
    animation-delay: 0.15s;
  }

  .bar:nth-child(3) {
    animation-delay: 0.3s;
  }

  .bar:nth-child(4) {
    animation-delay: 0.45s;
  }

  .bar:nth-child(5) {
    animation-delay: 0.6s;
  }

  @keyframes visualize {
    0%,
    100% {
      height: 25%;
    }
    50% {
      height: 100%;
    }
  }

  @media (max-width: 968px) {
    .brb-text {
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
    .brb-text {
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
