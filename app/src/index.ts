import AppDatabase from "#libs/database";
import { defaultImage } from "#libs/defaultImage";
import { Logger } from "#libs/logger";
import TwitchApi from "#libs/twitchApi";
import express from "express";
import { createServer } from "http";
import { join } from "path";
import { Server } from "socket.io";

import { handleIoCallbacks, handleIoTwitchCallbacks } from "#libs/io-callbacks";

import nowPlayingRoute from "#routes/nowPlaying";
import twitchCallbackRoute from "#routes/twitchCallback";
import widgetsSettingsRoute from "#routes/widgetsSettings";
import { readdirSync } from "fs";

(async () => {
  const logger = new Logger("Server");
  const PORT = process.env.PORT || 2442;
  const app = express();
  const server = createServer(app);

  app.locals.io = new Server(server, { cors: { origin: "*" } });
  app.locals.db = await AppDatabase.create();

  // Middleware to handle Private Network Access BEFORE other middleware
  app.use((req, res, next) => {
    // Set CORS headers for all responses
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Private-Network", "true");

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }

    next();
  });

  app.use(express.static(join(__dirname, "../static")));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use(nowPlayingRoute);
  app.use(twitchCallbackRoute);
  app.use(widgetsSettingsRoute);

  server.listen(PORT, () => {
    logger.info(`Server running @ http://localhost:${PORT}/`);
    // List pages
    logger.info(`Available pages:`);
    const availableRoutes: string[] = readdirSync(join(__dirname, "../static")).filter((file) => file.endsWith(".html"));
    for (const route of availableRoutes) {
      logger.info(` - http://localhost:${PORT}/${route}`);
    }

    app.locals.twitch = new TwitchApi(app.locals.io, app.locals.db);

    app.locals.twitch.on("event-received", (notification) => {
      switch (notification.subscription.type) {
        // Activity Feed Events
        case "channel.follow": {
          app.locals.io.emit("twitch:event", {
            type: "follow",
            username: notification.event.user_name,
          });
          break;
        }
        case "channel.subscribe": {
          app.locals.io.emit("twitch:event", {
            type: "subscribe",
            username: notification.event.user_name,
            tier: notification.event.tier,
          });
          break;
        }
        case "channel.subscription.gift": {
          app.locals.io.emit("twitch:event", {
            type: "subscription.gift",
            username: notification.event.user_name || "Anonymous",
            tier: notification.event.tier,
            total: notification.event.total,
          });
          break;
        }
        case "channel.subscription.message": {
          app.locals.io.emit("twitch:event", {
            type: "subscription.message",
            username: notification.event.user_name,
            message: notification.event.sub_message.message.text,
            tier: notification.event.tier,
            streak: notification.event.streak_months,
            duration: notification.event.duration_months,
          });
          break;
        }
        case "channel.cheer": {
          app.locals.io.emit("twitch:event", {
            type: "cheer",
            username: notification.event.user_name || "Anonymous",
            amount: notification.event.bits,
            message: notification.event.message,
          });
          break;
        }
        case "channel.raid": {
          app.locals.io.emit("twitch:event", {
            type: "raid",
            username: notification.event.from_broadcaster_user_name,
            viewers: notification.event.viewers,
          });
          break;
        }

        // Moderation Events
        case "channel.ban": {
          app.locals.io.emit("twitch:event:moderation", {
            type: "ban",
            username: notification.event.user_name,
            moderator: notification.event.moderator_user_name,
            reason: notification.event.reason,
            is_permanent: notification.event.is_permanent,
            ends_at: notification.event.ends_at,
          });
          break;
        }

        // Chat Events
        case "channel.chat.message": {
          app.locals.io.emit("twitch:chat", {
            type: "message",
            username: notification.event.chatter_user_name,
            messageId: notification.event.message_id,
            message: notification.event.message.text,
            badges: notification.event.badges.map((badge: any) => badge.set_id),
            color: notification.event.color,
          });
          break;
        }
        case "channel.chat.message_delete": {
          app.locals.io.emit("twitch:chat", {
            type: "message_delete",
            username: notification.event.target_user_name,
            messageId: notification.event.message_id,
          });
          break;
        }
        case "channel.suspicious_user.message": {
          app.locals.io.emit("twitch:chat", {
            type: "suspicious_message",
            username: notification.event.user_name,
            messageId: notification.event.message_id,
            message: notification.event.message,
          });
          break;
        }
      }
    });

    app.locals.twitch.once("websocket-connected", async () => {
      logger.info("Twitch WebSocket connected, subscribing to events");

      const users = await app.locals.twitch.users.getUsers({});
      if (!users) {
        logger.error("Failed to get user for websocket event subscription");
        return;
      }

      await app.locals.twitch.subscribeToWebsocketEvents([
        {
          type: "channel.follow",
          version: "2",
          condition: {
            broadcaster_user_id: users.data[0].id,
            moderator_user_id: users.data[0].id,
          },
        },
        {
          type: "channel.subscribe",
          version: "1",
          condition: {
            broadcaster_user_id: users.data[0].id,
          },
        },
        {
          type: "channel.subscription.gift",
          version: "1",
          condition: {
            broadcaster_user_id: users.data[0].id,
          },
        },
        {
          type: "channel.subscription.message",
          version: "1",
          condition: {
            broadcaster_user_id: users.data[0].id,
          },
        },
        {
          type: "channel.cheer",
          version: "1",
          condition: {
            broadcaster_user_id: users.data[0].id,
          },
        },
        {
          type: "channel.raid",
          version: "1",
          condition: {
            to_broadcaster_user_id: users.data[0].id,
          },
        },
        {
          type: "channel.ban",
          version: "1",
          condition: {
            broadcaster_user_id: users.data[0].id,
          },
        },
        {
          type: "channel.chat.message",
          version: "1",
          condition: {
            broadcaster_user_id: users.data[0].id,
            user_id: users.data[0].id,
          },
        },
        {
          type: "channel.chat.message_delete",
          version: "1",
          condition: {
            broadcaster_user_id: users.data[0].id,
            user_id: users.data[0].id,
          },
        },
        {
          type: "channel.suspicious_user.message",
          version: "1",
          condition: {
            broadcaster_user_id: users.data[0].id,
            moderator_user_id: users.data[0].id,
          },
        },
      ]);

      logger.info("Subscribed to Twitch WebSocket events");
    });

    app.locals.twitch.once("ready", () => {
      app.locals.twitch.connectToWebsocket();
    });
    app.locals.twitch.init();

    app.locals.nowPlayingCurrent = {
      reAlerts: [Date.now()],
      track: "Connection established",
      artist: "App & Extension By EnergyPatrikHU",
      thumbnail: defaultImage,
      favicon: defaultImage,
    };

    app.locals.widgetsSettings = app.locals.db.getWidgetSettings();

    app.locals.io.on("connection", (socket) => {
      handleIoCallbacks(app.locals.io, socket);
      handleIoTwitchCallbacks(app.locals.io, socket, app.locals.twitch);
    });
  });

  function errorHandler(err: any, type: string) {
    logger.error(`> = = = = = = = = = = = = < ${type} > = = = = = = = = = = = = <`);
    logger.error(err);
    logger.error(`> = = = = = = = = = = = = < ${type} > = = = = = = = = = = = = <`);
  }
  process.on("unhandledRejection", (err) => errorHandler(err, "Unhandled Rejection"));
  process.on("uncaughtException", (err) => errorHandler(err, "Uncaught Exception"));
  process.on("uncaughtExceptionMonitor", (err) => errorHandler(err, "Uncaught Exception Monitor"));
})();
