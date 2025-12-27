<script lang="ts">
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
    socketIo.client.on("twitch:chat", (data: any) => {
      if (data.type === "message_delete") {
        chatMessages = chatMessages.filter((msg) => msg.messageId !== data.messageId);
      } else if (data.type === "message" || data.type === "suspicious_message") {
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
      socketIo.client.off("twitch:chat");
    };
  });
</script>

<main class="h-screen bg-linear-to-br from-neutral-900 via-neutral-800 to-neutral-900 text-white flex flex-col">
  <div class="flex-1 overflow-y-auto">
    {#if chatMessages.length === 0}
      <div class="h-full flex items-center justify-center">
        <div class="text-center">
          <span class="text-6xl mb-4 block">💭</span>
          <p class="text-neutral-400">No messages yet</p>
        </div>
      </div>
    {:else}
      <div class="space-y-3 p-4">
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
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
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
</style>
