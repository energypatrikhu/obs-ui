import { defaultImage } from "#libs/defaultImage";
import { Logger } from "#libs/logger";
import { parseMetadata } from "#libs/metadataParser";
import type Metadata from "#types/Metadata";
import { Router } from "express";

const router = Router();
const logger = new Logger("Now Playing");

router.post("/nowPlaying", async (req, res) => {
  const { metadata, time } = req.body as {
    metadata?: Metadata;
    time?: number;
  };

  if (!metadata) {
    logger.error("No metadata provided");
    res.status(400).json({
      error: "No metadata provided",
    });
    return;
  }

  if (!time) {
    logger.error("No time provided");
    res.status(400).json({
      error: "No time provided",
    });
    return;
  }

  const duration = metadata.duration - (20 + 8.2);
  const reAlerts = [Date.now(), Date.now() + duration * 1000];

  const parsedMetadata = parseMetadata(metadata);

  logger.info("Received new metadata", `\n Title: ${parsedMetadata.title}`, `\n Artist: ${parsedMetadata.artist}`);

  req.app.locals.nowPlayingNext = {
    reAlerts,
    track: parsedMetadata.title || "Unknown",
    artist: parsedMetadata.artist || "Unknown",
    thumbnail: metadata.info.artwork || defaultImage,
    favicon: metadata.favicon || defaultImage,
  };

  if (JSON.stringify(req.app.locals.nowPlayingCurrent) !== JSON.stringify(req.app.locals.nowPlayingNext)) {
    req.app.locals.nowPlayingCurrent = req.app.locals.nowPlayingNext;
    req.app.locals.io.emit("nowPlaying", req.app.locals.nowPlayingCurrent);
  }

  res.sendStatus(202);
});

router.get("/nowPlaying", async (req, res) => {
  res.status(200).json(req.app.locals.nowPlayingCurrent);
});

export default router;
