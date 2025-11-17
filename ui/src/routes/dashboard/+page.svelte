<script lang="ts">
  import { getEventIcon, getEventText, type TwitchEvent } from "$lib/events";
  import { getSocketIo } from "$lib/socket-io.svelte";

  const socketIo = getSocketIo();

  interface ChatMessage {
    type: string;
    username: string;
    message: string;
    messageId: string;
    timestamp: number;
    suspicious?: boolean;
    badges?: string[];
    color?: string;
  }

  let activityEvents = $state<TwitchEvent[]>([]);
  let chatMessages = $state<ChatMessage[]>([]);
  let maxChatMessages = 1000;

  function formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  }

  function getBadgeEmoji(badge: string): string {
    const badgeMap: Record<string, string> = {
      broadcaster: "📡",
      moderator: "🗡️",
      vip: "💎",
      subscriber: "⭐",
      premium: "👑",
      turbo: "⚡",
      partner: "✓",
      staff: "🔧",
      admin: "⚙️",
    };
    return badgeMap[badge] || "";
  }

  $effect.pre(() => {
    socketIo.client.on("twitch:event", (data: TwitchEvent) => {
      activityEvents = [{ ...data, timestamp: Date.now() }, ...activityEvents];
    });

    socketIo.client.on("twitch:event:moderation", (data: TwitchEvent) => {
      activityEvents = [{ ...data, timestamp: Date.now() }, ...activityEvents];
    });

    socketIo.client.on("twitch:chat", (data: any) => {
      if (data.type === "message_delete") {
        // Remove message by messageId
        chatMessages = chatMessages.filter((msg) => msg.messageId !== data.messageId);
      } else if (data.type === "message" || data.type === "suspicious_message") {
        // Add new message
        chatMessages = [
          ...chatMessages,
          {
            type: data.type,
            username: data.username,
            message: data.message,
            messageId: data.messageId,
            timestamp: Date.now(),
            suspicious: data.type === "suspicious_message",
            badges: data.badges,
            color: data.color,
          },
        ].slice(-maxChatMessages);
      }
    });

    return () => {
      socketIo.client.off("twitch:event");
      socketIo.client.off("twitch:event:moderation");
      socketIo.client.off("twitch:chat");
    };
  });
</script>

<main class="h-screen bg-linear-to-br from-neutral-900 via-neutral-800 to-neutral-900 text-white p-6 overflow-hidden">
  <div class="h-full max-w-7xl mx-auto flex flex-col gap-6">
    <!-- Header -->
    <header class="shrink-0">
      <h1 class="text-4xl font-bold bg-clip-text text-transparent bg-linear-to-r from-purple-400 to-pink-600"> Dashboard </h1>
    </header>

    <!-- Main Content Grid -->
    <div class="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden">
      <!-- Activity Feed -->
      <section class="dashboard-card flex flex-col">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">📊</span>
            <h2 class="text-xl font-semibold">Activity Feed</h2>
          </div>
          <span class="text-sm text-neutral-400">{activityEvents.length} events</span>
        </div>

        <div class="card-content flex-1 overflow-y-auto">
          {#if activityEvents.length === 0}
            <div class="empty-state">
              <span class="text-6xl mb-4">📭</span>
              <p class="text-neutral-400">No activity yet</p>
              <p class="text-sm text-neutral-500">Events will appear here as they happen</p>
            </div>
          {:else}
            <div class="space-y-2">
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
      </section>

      <!-- Chat -->
      <section class="dashboard-card flex flex-col">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">💬</span>
            <h2 class="text-xl font-semibold">Chat</h2>
          </div>
          <span class="text-sm text-neutral-400">{chatMessages.length} messages</span>
        </div>

        <div class="card-content flex-1 overflow-y-auto">
          {#if chatMessages.length === 0}
            <div class="empty-state">
              <span class="text-6xl mb-4">💭</span>
              <p class="text-neutral-400">No messages yet</p>
              <p class="text-sm text-neutral-500">Chat will appear here when viewers start chatting</p>
            </div>
          {:else}
            <div class="space-y-3">
              {#each chatMessages as msg (msg.messageId)}
                <div
                  class="chat-message"
                  class:suspicious={msg.suspicious}
                >
                  <div class="flex items-baseline gap-2 mb-1 flex-wrap">
                    {#if msg.badges && msg.badges.length > 0}
                      <div class="flex gap-1">
                        {#each msg.badges as badge}
                          <span
                            class="chat-badge"
                            title={badge}>{getBadgeEmoji(badge)}</span
                          >
                        {/each}
                      </div>
                    {/if}
                    <span
                      class="chat-username"
                      style="color: {msg.color || '#c084fc'}">{msg.username}</span
                    >
                    {#if msg.suspicious}
                      <span class="suspicious-badge">⚠️ Suspicious</span>
                    {/if}
                    <span class="chat-time">{formatTime(msg.timestamp)}</span>
                  </div>
                  <p class="chat-text">{msg.message}</p>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </section>
    </div>
  </div>
</main>

<style>
  .dashboard-card {
    background: linear-gradient(135deg, rgba(30, 30, 30, 0.8), rgba(20, 20, 20, 0.8));
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 1rem;
    overflow: hidden;
    transition: all 0.3s ease;
  }

  .dashboard-card:hover {
    border-color: rgba(168, 85, 247, 0.4);
    box-shadow: 0 8px 32px rgba(168, 85, 247, 0.15);
  }

  .card-header {
    padding: 1.5rem;
    background: rgba(0, 0, 0, 0.2);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .card-content {
    padding: 1.5rem;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    text-align: center;
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

  /* Chat Styles */
  .chat-message {
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 0.5rem;
    border-left: 3px solid rgba(168, 85, 247, 0.5);
    transition: all 0.2s ease;
  }

  .chat-message:hover {
    background: rgba(255, 255, 255, 0.04);
    border-left-color: rgba(168, 85, 247, 0.8);
  }

  .chat-message.suspicious {
    background: rgba(251, 191, 36, 0.05);
    border-left-color: rgba(251, 191, 36, 0.6);
  }

  .chat-message.suspicious:hover {
    background: rgba(251, 191, 36, 0.08);
    border-left-color: rgba(251, 191, 36, 0.8);
  }

  .chat-username {
    font-weight: 700;
    color: #c084fc;
    font-size: 0.9rem;
  }

  .chat-badge {
    display: inline-block;
    font-size: 0.85rem;
    line-height: 1;
  }

  .suspicious-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.125rem 0.5rem;
    background: rgba(251, 191, 36, 0.2);
    color: #fbbf24;
    border: 1px solid rgba(251, 191, 36, 0.4);
    border-radius: 0.25rem;
    font-size: 0.7rem;
    font-weight: 600;
  }

  .chat-time {
    color: rgba(255, 255, 255, 0.4);
    font-size: 0.75rem;
  }

  .chat-text {
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.95rem;
    line-height: 1.5;
  }

  /* Scrollbar Styling */
  .card-content::-webkit-scrollbar {
    width: 8px;
  }

  .card-content::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
  }

  .card-content::-webkit-scrollbar-thumb {
    background: rgba(168, 85, 247, 0.4);
    border-radius: 4px;
  }

  .card-content::-webkit-scrollbar-thumb:hover {
    background: rgba(168, 85, 247, 0.6);
  }
</style>
