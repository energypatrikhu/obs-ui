import { getFavicon } from "$/lib/getFavicon";

interface Metadata {
  info: {
    title: string;
    artist: string;
    artwork: string;
  };
  duration: number;
  favicon: string;
}

function getMediaDuration() {
  return new Promise<number>((resolve) => {
    const _getMediaDuration_interval = setInterval(() => {
      const videoElements = Array.from(document.querySelectorAll("video"));
      const audioElements = Array.from(document.querySelectorAll("audio"));

      const mediaElements = [...videoElements, ...audioElements];

      if (mediaElements.length === 0) {
        return resolve(0);
      }

      for (const media of mediaElements) {
        if (!media.paused && media.duration && !Number.isNaN(media.duration)) {
          clearInterval(_getMediaDuration_interval);
          resolve(media.duration);
          return;
        }
      }
    }, 0);
  });
}

export async function getMediaMetadataSync() {
  if (!navigator.mediaSession) {
    return null;
  }

  return new Promise<Metadata>((resolve) => {
    const _interval = setInterval(async () => {
      const metadata = navigator.mediaSession.metadata;

      if (metadata) {
        const newMetadata: Metadata = {
          info: {
            title: metadata.title,
            artist: metadata.artist,
            artwork: metadata.artwork ? Array.from(metadata.artwork).pop()?.src! : "",
          },
          duration: await getMediaDuration(),
          favicon: getFavicon(),
        };

        clearInterval(_interval);
        resolve(newMetadata);
      }
    }, 0);
  });
}
