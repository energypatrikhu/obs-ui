<script lang="ts">
  import { getDomain } from "$/lib/getDomain";
  import { getSettings, setSettings, type Settings } from "$/lib/settings";
  import { logger } from "@energypatrikhu/node-utils";

  let domain: string = $state("");
  let settings: Settings = $state({ enabledDomains: [] });
  let sendMetadataCheckbox: HTMLInputElement | null = $state(null);

  $effect(() => {
    if (!sendMetadataCheckbox) return;

    getDomain()
      .then((pageDomain) => {
        if (!pageDomain) {
          console.error("Domain is not set");
          return;
        }

        domain = pageDomain;

        getSettings()
          .then((currentSettings) => {
            settings = currentSettings;

            sendMetadataCheckbox!.checked = settings.enabledDomains.includes(domain);
          })
          .catch((error) => {
            console.error("Error getting settings:", error);
          });
      })
      .catch((error) => {
        console.error("Error getting domain:", error);
      });
  });

  function updateSendMetadata(event: Event) {
    event.preventDefault();

    if (!domain) {
      console.error("Domain is not set");
      return;
    }

    const checkbox = event.target as HTMLInputElement;

    const isChecked = checkbox.checked;

    if (isChecked) {
      settings.enabledDomains.push(domain);
    } else {
      settings.enabledDomains = settings.enabledDomains.filter((d) => d !== domain);
    }

    setSettings(settings);

    logger("info", `Updated settings: ${JSON.stringify(settings, null, 2)}`);
  }
</script>

<h1>OBS Now Playing</h1>

<section>
  <h2>Current Domain</h2>
  <p>{domain}</p>
</section>

<section>
  <h2>Settings</h2>
  <label>
    <input
      bind:this={sendMetadataCheckbox}
      onchange={updateSendMetadata}
      type="checkbox"
    />
    <span>Send Metadata</span>
  </label>
</section>
