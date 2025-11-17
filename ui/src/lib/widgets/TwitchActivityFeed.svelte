<script lang="ts">
  import { getSocketIo } from "$lib/socket-io.svelte";
  import { getWidgets } from "$lib/widgets.svelte";

  const widgets = getWidgets();
  const socketIo = getSocketIo();

  interface TwitchEvent {
    type: string;
    username: string;
    timestamp: number;
  }

  let events = $state<TwitchEvent[]>([]);
  let maxEvents = $state(5);

  // Get max events setting from widgets
  $effect(() => {
    const setting = widgets.entries.twitch.activityFeed?.maxEvents;
    if (setting !== undefined) {
      maxEvents = setting;
    }
  });

  function addEvent(event: TwitchEvent) {
    events = [event, ...events].slice(0, maxEvents);
  }

  function getEventIcon(type: string) {
    switch (type) {
      case "follow":
        return "💜";
      case "subscription":
        return "⭐";
      case "raid":
        return "🎯";
      case "bits":
        return "💎";
      default:
        return "✨";
    }
  }

  function getEventText(type: string) {
    switch (type) {
      case "follow":
        return "followed";
      case "subscription":
        return "subscribed";
      case "raid":
        return "raided";
      case "bits":
        return "cheered";
      default:
        return "interacted";
    }
  }

  $effect.pre(() => {
    socketIo.client.on("twitch:event", (data: any) => {
      addEvent({
        type: data.type,
        username: data.username,
        timestamp: Date.now(),
      });
    });

    return () => {
      socketIo.client.off("twitch:event");
    };
  });
</script>

{#if !widgets.disabled.includes("twitch.activityFeed")}
  <div id="twitch-activity-feed">
    {#if events.length > 0}
      <div class="feed-container">
        <div class="feed-header">
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            class="twitch-icon"
          >
            <path
              d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"
            ></path>
          </svg>
          <span class="header-text">Recent Activity</span>
        </div>

        <div class="events-list">
          {#each events as event, index (event.timestamp + event.username)}
            <div
              class="event-item"
              style="animation-delay: {index * 0.05}s"
            >
              <div class="event-icon">{getEventIcon(event.type)}</div>
              <div class="event-content">
                <span class="event-username">{event.username}</span>
                <span class="event-action">{getEventText(event.type)}</span>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  #twitch-activity-feed {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    pointer-events: none;
    z-index: 999;
    max-width: 20rem;
  }

  .feed-container {
    background: linear-gradient(135deg, rgba(30, 30, 30, 0.95), rgba(20, 20, 20, 0.95));
    backdrop-filter: blur(20px);
    border-radius: 1rem;
    padding: 1rem;
    box-shadow:
      0 10px 40px rgba(0, 0, 0, 0.5),
      0 0 0 1px rgba(255, 255, 255, 0.05) inset;
    animation: slide-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .feed-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .twitch-icon {
    width: 1.25rem;
    height: 1.25rem;
    color: #9146ff;
  }

  .header-text {
    font-size: 0.875rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.8);
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }

  .events-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .event-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.625rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 0.5rem;
    border: 1px solid rgba(255, 255, 255, 0.05);
    opacity: 0;
    transform: translateX(1rem);
    animation: fade-slide-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    transition: all 0.2s ease;
  }

  .event-item:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(145, 70, 255, 0.3);
  }

  .event-icon {
    font-size: 1.25rem;
    flex-shrink: 0;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  }

  .event-content {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    min-width: 0;
    flex: 1;
  }

  .event-username {
    font-size: 0.875rem;
    font-weight: 600;
    color: #ffffff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    letter-spacing: -0.01em;
  }

  .event-action {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.5);
    letter-spacing: 0.01em;
  }

  @keyframes slide-in {
    from {
      opacity: 0;
      transform: translateX(2rem);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes fade-slide-in {
    from {
      opacity: 0;
      transform: translateX(1rem);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
</style>
