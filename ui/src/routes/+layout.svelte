<script lang="ts">
  import "../app.css";

  import favicon from "$lib/assets/favicon.svg";
  import { setSocketIo } from "$lib/socket-io.svelte";
  import { setWidgetFunctions } from "$lib/widget-functions.svelte";
  import { getWidgetSettings } from "$lib/widget-settings-api";
  import { setWidgets } from "$lib/widgets.svelte";
  import { io } from "socket.io-client";

  const socket = io("http://localhost:2442");

  // Setup contexts
  const widgets = setWidgets();
  const socketIo = setSocketIo(socket, widgets);
  setWidgetFunctions(socketIo.client);

  $effect.pre(() => {
    // Setup disabled widgets
    getWidgetSettings()
      .then((data) => {
        widgets.disabled = data.disabledWidgets;
        if (data.twitch?.activityFeed?.maxEvents !== undefined) {
          widgets.entries.twitch.activityFeed.maxEvents = data.twitch.activityFeed.maxEvents;
        }
      })
      .catch((error) => {
        console.error(error);
      });

    return () => {
      socketIo.client.off("widgets-settings");
      socketIo.client.disconnect();
    };
  });

  let { children } = $props();
</script>

<svelte:head>
  <link
    rel="icon"
    href={favicon}
  />
</svelte:head>

{#if socketIo.connected}
  {@render children()}
{:else}
  <div class="text-4xl flex flex-col justify-center items-center text-center h-screen w-screen">
    <span class="connection-error-text text-red-600 font-bold">OBS UI</span>
    <span class="connection-error-text text-red-600">Can't connect to the server</span>
  </div>
{/if}

<style>
  .connection-error-text {
    text-shadow: 0 0 10px rgba(0, 0, 0, 1);
    animation: fade-in-out 2s infinite alternate;
  }
  @keyframes fade-in-out {
    0% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  }
</style>
