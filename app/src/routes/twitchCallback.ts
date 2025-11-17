import { Logger } from "#libs/logger";
import { Router } from "express";

const router = Router();
const logger = new Logger("TwitchApi");

router.get("/twitch-callback", async (req, res) => {
  const { code } = req.query;

  if (!code) {
    logger.error("No code provided");
    res.sendStatus(200);
    return;
  }

  logger.info("Setting twitch auth code");
  await req.app.locals.twitch.setCode(code as string);

  res.sendStatus(200);
});

export default router;
