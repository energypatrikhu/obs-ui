import { Logger } from "#libs/logger";
import { Router } from "express";

const router = Router();
const logger = new Logger("Widgets");

router.post("/widgets/enable", async (req, res) => {
  const { widget } = req.body as {
    widget?: string;
  };

  logger.info("Enabling widget", widget);

  if (!widget) {
    logger.error("No widget provided");
    res.status(400).json({
      error: "No widget provided",
    });
    return;
  }

  if (req.app.locals.widgetsSettings.disabledWidgets.includes(widget)) {
    await req.app.locals.db.enableWidget(widget);
    req.app.locals.widgetsSettings = req.app.locals.db.getWidgetSettings();

    req.app.locals.io.emit("widgets-settings", req.app.locals.widgetsSettings);

    logger.info("Widget enabled");
  } else {
    logger.info("Widget already enabled");
  }

  res.sendStatus(202);
});

router.post("/widgets/disable", async (req, res) => {
  const { widget } = req.body as {
    widget?: string;
  };

  logger.info("Disabling widget", widget);

  if (!widget) {
    logger.error("No widget provided");
    res.status(400).json({
      error: "No widget provided",
    });
    return;
  }

  if (!req.app.locals.widgetsSettings.disabledWidgets.includes(widget)) {
    await req.app.locals.db.disableWidget(widget);
    req.app.locals.widgetsSettings = req.app.locals.db.getWidgetSettings();

    req.app.locals.io.emit("widgets-settings", req.app.locals.widgetsSettings);

    logger.info("Widget disabled");
  } else {
    logger.info("Widget already disabled");
  }

  res.sendStatus(202);
});

router.post("/widgets/settings", async (req, res) => {
  await req.app.locals.db.setWidgetSettings(req.body);
  req.app.locals.widgetsSettings = req.app.locals.db.getWidgetSettings();
  req.app.locals.io.emit("widgets-settings", req.app.locals.widgetsSettings);
  res.sendStatus(202);
});

router.get("/widgets/settings", async (req, res) => {
  res.status(200).json(req.app.locals.widgetsSettings);
});

export default router;
