<script lang="ts">
  import { getWidgetFunctions } from "$lib/widget-functions.svelte";
  import { setWidgetSettings, updateWidgetSettings } from "$lib/widget-settings-api";
  import { getWidgets } from "$lib/widgets.svelte";

  const widgets = getWidgets();
  const widgetFunctions = getWidgetFunctions();

  let disabledButtons = $state<string[]>([]);
  let maxEventsSaveTimeout: ReturnType<typeof setTimeout> | null = null;

  // Save maxEvents when it changes
  $effect(() => {
    const maxEvents = widgets.entries.twitch.activityFeed.maxEvents;

    if (maxEventsSaveTimeout) {
      clearTimeout(maxEventsSaveTimeout);
    }

    maxEventsSaveTimeout = setTimeout(() => {
      updateWidgetSettings({
        disabledWidgets: widgets.disabled,
        twitch: {
          activityFeed: {
            maxEvents,
          },
        },
      });
    }, 500);
  });

  function toggleWidget(widget: string) {
    if (widgets.disabled.includes(widget)) {
      setWidgetSettings(widget, "enable");
    } else {
      setWidgetSettings(widget, "disable");
    }
  }
</script>

<main class="min-h-screen bg-linear-to-br from-neutral-900 via-neutral-800 to-neutral-900 text-white p-6">
  <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <header class="mb-8">
      <h1 class="text-4xl font-bold bg-clip-text text-transparent bg-linear-to-r from-purple-400 to-pink-600 mb-2">
        Widget Settings
      </h1>
      <p class="text-neutral-400">Configure and test your stream widgets</p>
    </header>

    <!-- Common Widgets Section -->
    <section class="mb-12">
      <h2 class="text-2xl font-semibold mb-4 flex items-center gap-2">
        <span class="text-blue-400">🎵</span>
        Common Widgets
      </h2>

      <div class="widget-card">
        <div class="widget-header">
          <div class="flex items-center justify-between">
            <h3 class="text-xl font-medium">{widgets.entries.nowPlaying.name}</h3>
            <div
              class="status-badge"
              class:enabled={!widgets.disabled.includes("common.nowPlaying")}
            >
              {!widgets.disabled.includes("common.nowPlaying") ? "Enabled" : "Disabled"}
            </div>
          </div>
        </div>

        <div class="widget-content">
          <button
            class="toggle-button"
            onclick={() => toggleWidget("common.nowPlaying")}
          >
            {widgets.disabled.includes("common.nowPlaying") ? "Enable" : "Disable"}
          </button>

          <div class="divider"></div>

          <div class="test-buttons">
            {#each widgets.entries.nowPlaying.functions as { name, timeout }}
              <button
                class="test-button"
                disabled={disabledButtons.includes(`button:common:${widgets.entries.nowPlaying.name}:${name}`)}
                onclick={() => {
                  disabledButtons = disabledButtons.concat(`button:common:${widgets.entries.nowPlaying.name}:${name}`);
                  setTimeout(() => {
                    disabledButtons = disabledButtons.filter(
                      (button) => button !== `button:common:${widgets.entries.nowPlaying.name}:${name}`,
                    );
                  }, timeout);
                  widgetFunctions.execute("common", widgets.entries.nowPlaying.name, name);
                }}
              >
                🧪 {name}
              </button>
            {/each}
          </div>
        </div>
      </div>
    </section>

    <!-- Twitch Events Section -->
    <section class="mb-12">
      <h2 class="text-2xl font-semibold mb-4 flex items-center gap-2">
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          class="w-6 h-6 text-purple-500"
        >
          <path
            d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"
          ></path>
        </svg>
        Twitch Events
      </h2>

      <!-- Activity Feed -->
      <div class="widget-card mb-6">
        <div class="widget-header">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-xl font-medium">{widgets.entries.twitch.activityFeed.name}</h3>
              <p class="text-sm text-neutral-400 mt-1">Shows recent activity in a compact feed</p>
            </div>
            <div
              class="status-badge"
              class:enabled={!widgets.disabled.includes("twitch.activityFeed")}
            >
              {!widgets.disabled.includes("twitch.activityFeed") ? "Enabled" : "Disabled"}
            </div>
          </div>
        </div>

        <div class="widget-content">
          <div class="flex flex-wrap gap-4 items-center">
            <button
              class="toggle-button"
              onclick={() => toggleWidget("twitch.activityFeed")}
            >
              {widgets.disabled.includes("twitch.activityFeed") ? "Enable" : "Disable"}
            </button>

            <label
              class="flex items-center gap-3 px-4 py-2 bg-neutral-700/50 rounded-lg border border-neutral-600 hover:border-purple-500 transition-colors"
            >
              <span class="text-sm font-medium text-neutral-300">Max Events:</span>
              <input
                type="number"
                min="1"
                max="20"
                bind:value={widgets.entries.twitch.activityFeed.maxEvents}
                class="bg-neutral-800 px-3 py-1 rounded w-20 text-center border border-neutral-600 focus:border-purple-500 focus:outline-none transition-colors"
              />
            </label>
          </div>

          <div class="divider"></div>

          <div class="test-buttons">
            {#each widgets.entries.twitch.activityFeed.functions as { name, timeout }}
              <button
                class="test-button"
                disabled={disabledButtons.includes(`button:twitch:${widgets.entries.twitch.activityFeed.name}:${name}`)}
                onclick={() => {
                  disabledButtons = disabledButtons.concat(`button:twitch:${widgets.entries.twitch.activityFeed.name}:${name}`);
                  setTimeout(() => {
                    disabledButtons = disabledButtons.filter(
                      (button) => button !== `button:twitch:${widgets.entries.twitch.activityFeed.name}:${name}`,
                    );
                  }, timeout);
                  widgetFunctions.execute("twitch", widgets.entries.twitch.activityFeed.name, name);
                }}
              >
                🧪 {name}
              </button>
            {/each}
          </div>
        </div>
      </div>

      <!-- Notifications -->
      <h3 class="text-xl font-semibold mb-4 text-neutral-300">Notification Types</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        {#each Object.entries(widgets.entries.twitch.notifications) as [entryKey, twitchNotification]}
          <div class="widget-card compact">
            <div class="widget-header compact">
              <div class="flex items-center justify-between">
                <h4 class="text-lg font-medium">{twitchNotification.name}</h4>
                <div
                  class="status-badge compact"
                  class:enabled={!widgets.disabled.includes("twitch." + entryKey)}
                >
                  {!widgets.disabled.includes("twitch." + entryKey) ? "ON" : "OFF"}
                </div>
              </div>
            </div>

            <div class="widget-content compact">
              <div class="flex gap-2 flex-wrap">
                <button
                  class="toggle-button compact"
                  onclick={() => toggleWidget("twitch." + entryKey)}
                >
                  {widgets.disabled.includes("twitch." + entryKey) ? "Enable" : "Disable"}
                </button>

                {#each twitchNotification.functions as { name, timeout }}
                  <button
                    class="test-button compact"
                    disabled={disabledButtons.includes(`button:twitch:${twitchNotification.name}:${name}`)}
                    onclick={() => {
                      disabledButtons = disabledButtons.concat(`button:twitch:${twitchNotification.name}:${name}`);
                      setTimeout(() => {
                        disabledButtons = disabledButtons.filter(
                          (button) => button !== `button:twitch:${twitchNotification.name}:${name}`,
                        );
                      }, timeout);
                      widgetFunctions.execute("twitch", twitchNotification.name, name);
                    }}
                  >
                    🧪 {name}
                  </button>
                {/each}
              </div>
            </div>
          </div>
        {/each}
      </div>
    </section>
  </div>
</main>

<style>
  .widget-card {
    background: linear-gradient(135deg, rgba(30, 30, 30, 0.8), rgba(20, 20, 20, 0.8));
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 1rem;
    overflow: hidden;
    transition: all 0.3s ease;
  }

  .widget-card:hover {
    border-color: rgba(168, 85, 247, 0.4);
    box-shadow: 0 8px 32px rgba(168, 85, 247, 0.15);
  }

  .widget-card.compact {
    border-radius: 0.75rem;
  }

  .widget-header {
    padding: 1.5rem;
    background: rgba(0, 0, 0, 0.2);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .widget-header.compact {
    padding: 1rem;
  }

  .widget-content {
    padding: 1.5rem;
  }

  .widget-content.compact {
    padding: 1rem;
  }

  .status-badge {
    padding: 0.375rem 0.75rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }

  .status-badge.enabled {
    background: rgba(34, 197, 94, 0.2);
    color: #22c55e;
    border-color: rgba(34, 197, 94, 0.3);
  }

  .status-badge.compact {
    padding: 0.25rem 0.625rem;
    font-size: 0.75rem;
  }

  .toggle-button {
    padding: 0.625rem 1.5rem;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  }

  .toggle-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4);
  }

  .toggle-button:active {
    transform: translateY(0);
  }

  .toggle-button.compact {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
  }

  .test-button {
    padding: 0.625rem 1.25rem;
    background: rgba(55, 65, 81, 0.6);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .test-button:hover:not(:disabled) {
    background: rgba(75, 85, 101, 0.8);
    border-color: rgba(168, 85, 247, 0.5);
    transform: translateY(-1px);
  }

  .test-button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .test-button.compact {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
  }

  .test-buttons {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .divider {
    height: 1px;
    background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.1), transparent);
    margin: 1rem 0;
  }
</style>
