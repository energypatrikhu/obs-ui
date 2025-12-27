<script lang="ts">
  import { getEventIcon, getEventText, type TwitchEvent } from "$lib/events";
  import { getSocketIo } from "$lib/socket-io.svelte";

  const socketIo = getSocketIo();

  let activityEvents = $state<TwitchEvent[]>([]);

  function formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  }

  $effect.pre(() => {
    socketIo.client.on("twitch:event", (data: TwitchEvent) => {
      activityEvents = [{ ...data, timestamp: Date.now() }, ...activityEvents];
    });

    socketIo.client.on("twitch:event:moderation", (data: TwitchEvent) => {
      activityEvents = [{ ...data, timestamp: Date.now() }, ...activityEvents];
    });

    return () => {
      socketIo.client.off("twitch:event");
      socketIo.client.off("twitch:event:moderation");
    };
  });
</script>

<main class="h-screen bg-linear-to-br from-neutral-900 via-neutral-800 to-neutral-900 text-white flex flex-col">
  <div class="flex-1 overflow-y-auto">
    {#if activityEvents.length === 0}
      <div class="h-full flex items-center justify-center">
        <div class="text-center">
          <span class="text-6xl mb-4 block">📭</span>
          <p class="text-neutral-400">No activity yet</p>
        </div>
      </div>
    {:else}
      <div class="space-y-2 p-4">
        {#each activityEvents as event (event.timestamp + event.username)}
          <div class="activity-item">
            <div class="flex items-start gap-3">
              <div class="event-icon">{getEventIcon(event.type)}</div>
              <div class="flex-1 min-w-0">
                <div class="flex items-baseline gap-2">
                  <span class="event-username">{event.username}</span>
                  <span class="event-action">{getEventText(event)}</span>
                </div>
                {#if event.message}
                  <p class="event-message">"{event.message}"</p>
                {/if}
                <span class="event-time">{formatTime(event.timestamp!)}</span>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
  }

  /* Activity Feed Styles */
  .activity-item {
    padding: 1rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 0.75rem;
    border: 1px solid rgba(255, 255, 255, 0.05);
    transition: all 0.2s ease;
  }

  .activity-item:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(168, 85, 247, 0.3);
  }

  .event-icon {
    font-size: 1.5rem;
    flex-shrink: 0;
  }

  .event-username {
    font-weight: 700;
    color: #a78bfa;
    font-size: 0.95rem;
  }

  .event-action {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.9rem;
  }

  .event-message {
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.875rem;
    font-style: italic;
    margin-top: 0.25rem;
  }

  .event-time {
    color: rgba(255, 255, 255, 0.4);
    font-size: 0.75rem;
    margin-top: 0.25rem;
    display: block;
  }
</style>
