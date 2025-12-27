<script lang="ts">
  import { getSocketIo } from "$lib/socket-io.svelte";
  import type { NowPlaying as NowPlayingType } from "$lib/types/NowPlaying";
  import { onMount } from "svelte";

  const socketIo = getSocketIo();

  let artist = $state("");
  let track = $state("");
  let thumbnail = $state("");
  let favicon = $state("");
  let hasData = $state(false);
  let isUpdating = $state(true);

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

<main
  class="h-screen bg-linear-to-br from-neutral-900 via-neutral-800 to-neutral-900 text-white flex items-center justify-center"
>
  {#if hasData}
    <div
      class="now-playing-card"
      class:updating={isUpdating}
    >
      <div class="artwork">
        <img
          src={thumbnail}
          alt={`${artist} - ${track}`}
        />
      </div>
      <div class="info">
        <div class="artist">{artist}</div>
        <div class="track">{track}</div>
        {#if favicon}
          <div class="favicon">
            <img
              src={favicon}
              alt="Platform"
            />
          </div>
        {/if}
      </div>
    </div>
  {:else}
    <div class="empty-state">
      <span class="text-6xl mb-4 block">🎵</span>
      <p class="text-neutral-400">No music playing</p>
    </div>
  {/if}
</main>

<style>
  main {
    margin: 0;
    padding: 0;
  }

  .now-playing-card {
    text-align: center;
    transition: opacity 0.3s ease;
    opacity: 1;
  }

  .now-playing-card.updating {
    opacity: 0.5;
  }

  .artwork {
    width: 300px;
    height: 300px;
    margin-bottom: 2rem;
    border-radius: 1rem;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(168, 85, 247, 0.3);
  }

  .artwork img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .info {
    max-width: 400px;
    margin: 0 auto;
  }

  .artist {
    font-size: 1.875rem;
    font-weight: 700;
    color: #c084fc;
    margin-bottom: 0.5rem;
  }

  .track {
    font-size: 1.5rem;
    color: rgba(255, 255, 255, 0.8);
    margin-bottom: 1rem;
  }

  .favicon {
    width: 40px;
    height: 40px;
    margin: 0 auto;
  }

  .favicon img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .empty-state {
    text-align: center;
  }
</style>
