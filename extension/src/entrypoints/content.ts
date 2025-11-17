import { getMediaMetadataSync } from "$/lib/getMediaMetadata";
import { getSettings } from "$/lib/settings";
import { logger } from "@energypatrikhu/node-utils";
import _ from "lodash";

interface Metadata {
  info: {
    title: string;
    artist: string;
    artwork: string;
  };
  duration: number;
  favicon: string;
}

export default defineContentScript({
  matches: ["<all_urls>"],
  async main() {
    let _metadata: Metadata | undefined;
    let isChanged = false;

    const settings = await getSettings();

    (async function autoChecker() {
      try {
        if (!settings.enabledDomains.includes(window.location.hostname)) {
          setTimeout(autoChecker, 1000);
          return;
        }

        const metadata = await getMediaMetadataSync();

        if (metadata === null) {
          setTimeout(autoChecker, 1000);
          return;
        }

        if (_metadata) {
          if (_.isEqual(metadata.info, _metadata.info)) {
            setTimeout(autoChecker, 1000);
            return;
          }
        }

        if (isChanged) {
          setTimeout(autoChecker, 1000);
          return;
        }
        isChanged = true;

        logger("info", "Metadata changed, sending new data to server");
        logger("info", metadata);

        await browser.runtime.sendMessage({
          type: "SEND_NOW_PLAYING_DATA",
          payload: {
            metadata,
            time: Date.now(),
          },
        });

        _metadata = metadata;
      } catch (error) {
        console.error("Error in auto checker", error);
      }

      isChanged = false;
      setTimeout(autoChecker, 1000);
    })();
  },
});
