<script lang="ts">
  import { onMount } from "svelte";

  let devices = $state<MediaDeviceInfo[]>([]);

  onMount(async () => {
    await navigator.mediaDevices.getUserMedia({ audio: true, video: true });

    navigator.mediaDevices.enumerateDevices().then((deviceList) => {
      devices = deviceList;
    });
  });
</script>

<h1 class="text-2xl font-bold mb-4">Media Devices</h1>
<ul class="list-disc list-inside">
  {#each devices as device}
    <li>
      <strong>{device.kind}:</strong>
      {device.label || "Label not available"}
    </li>
  {/each}
</ul>

<style>
  * {
    color: aqua;
  }
</style>
