import { defaultImage } from "#libs/defaultImage";
import { Logger } from "#libs/logger";
import type { WindowsMedia } from "#types/WindowsMedia.ts";
import type { Express } from "express";

const logger = new Logger("Windows - Now Playing");

export async function handleWindowsNowPlaying(app: Express, media: WindowsMedia) {
  if (!media.playbackStatus || media.playbackStatus !== "playing") {
    return;
  }

  const currentDate = Date.now();
  const reAlerts = [currentDate];
  if (media.duration) {
    const duration = media.duration - (20 + 8.2);
    reAlerts.push(currentDate + duration * 1000);
  }

  logger.info("Received new metadata", `\n Title: ${media.title}`, `\n Artist: ${media.artist}`);

  app.locals.nowPlayingNext = {
    reAlerts,
    track: media.title || "Unknown",
    artist: media.artist || "Unknown",
    thumbnail: media.albumArt || defaultImage,
    favicon: media.appIcon || defaultImage,
  };

  if (JSON.stringify(app.locals.nowPlayingCurrent) !== JSON.stringify(app.locals.nowPlayingNext)) {
    app.locals.nowPlayingCurrent = app.locals.nowPlayingNext;
    app.locals.io.emit("nowPlaying", app.locals.nowPlayingCurrent);
  }
}
