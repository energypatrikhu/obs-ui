<script lang="ts">
  import { getEventIcon, getEventText, type TwitchEvent } from "$lib/events";
  import { getSocketIo } from "$lib/socket-io.svelte";
  import { getWidgets } from "$lib/widgets.svelte";

  const widgets = getWidgets();
  const socketIo = getSocketIo();

  const eventList = $state<TwitchEvent[]>([]);

  let showPopup = $state(false);
  let currentEvent = $state<TwitchEvent | undefined>(undefined);

  function getNextEvent() {
    return eventList.find((event) => !event.shown);
  }
  function getEventListSizeByShown(shown: boolean) {
    return eventList.filter((event) => event.shown === shown).length;
  }
  function removeEvent(event: TwitchEvent) {
    eventList.splice(eventList.indexOf(event), 1);
  }

  function showEvent() {
    if (eventList.length === 0 || getEventListSizeByShown(true) > 0) {
      return;
    }

    currentEvent = getNextEvent();

    if (!currentEvent) {
      return;
    }

    currentEvent.shown = true;

    setTimeout(() => {
      showPopup = true;

      setTimeout(() => {
        showPopup = false;

        setTimeout(() => {
          removeEvent(currentEvent!);
          showEvent();
        }, 800);
      }, 8000);
    }, 100);
  }

  $effect.pre(() => {
    socketIo.client.on("twitch:event", (data: TwitchEvent) => {
      eventList.push({
        type: data.type,
        username: data.username,
        shown: false,
        tier: data.tier,
        total: data.total,
        message: data.message,
        streak: data.streak,
        duration: data.duration,
        amount: data.amount,
        viewers: data.viewers,
      });

      showEvent();
    });

    return () => {
      socketIo.client.off("twitch:event");
    };
  });
</script>

{#if currentEvent && !widgets.disabled.includes(`twitch.${currentEvent.type}`)}
  <div
    id="twitch-notification"
    data-show={showPopup}
  >
    <div class="backdrop"></div>

    <div class="container">
      <div class="icon-wrapper">
        <div class="icon-glow"></div>
        <div class="icon-circle">
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            class="twitch-icon"
          >
            <path
              d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"
            ></path>
          </svg>
        </div>
      </div>

      <div class="content">
        <div class="message">
          <span class="username">{currentEvent.username}</span>
          <span class="text">{getEventText(currentEvent)}</span>
          {#if currentEvent.message}
            <span class="user-message">"{currentEvent.message}"</span>
          {/if}
        </div>

        <div class="hearts">
          <div class="heart">{getEventIcon(currentEvent.type)}</div>
          <div class="heart">{getEventIcon(currentEvent.type)}</div>
          <div class="heart">{getEventIcon(currentEvent.type)}</div>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  #twitch-notification {
    position: fixed;
    top: 2rem;
    left: 50%;
    transform: translateX(-50%);
    pointer-events: none;
    z-index: 1000;
  }

  .backdrop {
    position: absolute;
    inset: -1rem;
    background: radial-gradient(ellipse at top, rgba(169, 112, 255, 0.15) 0%, transparent 70%);
    opacity: 0;
    transition: opacity 0.6s ease;
    pointer-events: none;
  }

  .container {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    background: linear-gradient(135deg, rgba(30, 30, 30, 0.95), rgba(20, 20, 20, 0.95));
    backdrop-filter: blur(20px);
    padding: 1.5rem 2rem;
    border-radius: 1rem;
    box-shadow:
      0 10px 40px rgba(0, 0, 0, 0.5),
      0 0 0 1px rgba(255, 255, 255, 0.05) inset;
    opacity: 0;
    transform: translateY(-3rem) scale(0.8);
    transition: all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  /* Icon Styles */
  .icon-wrapper {
    position: relative;
    flex-shrink: 0;
  }

  .icon-glow {
    position: absolute;
    inset: -0.5rem;
    background: radial-gradient(circle, rgba(145, 70, 255, 0.4), transparent 70%);
    border-radius: 50%;
    opacity: 0;
    filter: blur(15px);
    transition: opacity 0.8s ease;
  }

  .icon-circle {
    position: relative;
    width: 4rem;
    height: 4rem;
    background: linear-gradient(135deg, #9146ff, #772ce8);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow:
      0 8px 20px rgba(145, 70, 255, 0.3),
      0 0 0 3px rgba(0, 0, 0, 0.3),
      0 0 0 4px rgba(145, 70, 255, 0.2);
    opacity: 0;
    transform: scale(0) rotate(-180deg);
    transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s;
  }

  .twitch-icon {
    width: 2rem;
    height: 2rem;
    color: white;
  }

  /* Content Styles */
  .content {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    opacity: 0;
    transform: translateX(-1rem);
    transition: all 0.6s ease 0.3s;
  }

  .message {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .username {
    font-size: 1.25rem;
    font-weight: 700;
    color: #ffffff;
    letter-spacing: -0.01em;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  .text {
    font-size: 0.95rem;
    color: rgba(255, 255, 255, 0.7);
    letter-spacing: 0.01em;
  }

  .user-message {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.6);
    font-style: italic;
    margin-top: 0.25rem;
    max-width: 20rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Hearts Animation */
  .hearts {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .heart {
    font-size: 1.5rem;
    opacity: 0;
    transform: scale(0) translateY(0);
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  }

  /* Show State */
  #twitch-notification[data-show="true"] .backdrop {
    opacity: 1;
  }

  #twitch-notification[data-show="true"] .container {
    opacity: 1;
    transform: translateY(0) scale(1);
  }

  #twitch-notification[data-show="true"] .icon-glow {
    opacity: 1;
    animation: glow-pulse 2s ease-in-out infinite;
  }

  #twitch-notification[data-show="true"] .icon-circle {
    opacity: 1;
    transform: scale(1) rotate(0deg);
    animation: icon-bounce 0.6s ease 0.4s;
  }

  #twitch-notification[data-show="true"] .content {
    opacity: 1;
    transform: translateX(0);
  }

  #twitch-notification[data-show="true"] .heart {
    animation: heart-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }

  #twitch-notification[data-show="true"] .heart:nth-child(1) {
    animation-delay: 0.5s;
  }

  #twitch-notification[data-show="true"] .heart:nth-child(2) {
    animation-delay: 0.65s;
  }

  #twitch-notification[data-show="true"] .heart:nth-child(3) {
    animation-delay: 0.8s;
  }

  /* Animations */
  @keyframes glow-pulse {
    0%,
    100% {
      opacity: 0.8;
      transform: scale(1);
    }
    50% {
      opacity: 1;
      transform: scale(1.1);
    }
  }

  @keyframes icon-bounce {
    0%,
    100% {
      transform: scale(1) rotate(0deg);
    }
    50% {
      transform: scale(1.15) rotate(5deg);
    }
  }

  @keyframes heart-pop {
    0% {
      opacity: 0;
      transform: scale(0) translateY(0);
    }
    50% {
      opacity: 1;
      transform: scale(1.2) translateY(-0.25rem);
    }
    100% {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  /* Hide State */
  #twitch-notification[data-show="false"] .container {
    opacity: 0;
    transform: translateY(-3rem) scale(0.8);
    transition: all 0.5s cubic-bezier(0.6, -0.28, 0.74, 0.05);
  }

  #twitch-notification[data-show="false"] .backdrop {
    opacity: 0;
    transition: opacity 0.5s ease;
  }
</style>
