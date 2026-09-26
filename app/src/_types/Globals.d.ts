import type AppDatabase from "#libs/database";
import type { Config } from "#libs/database";
import Twitch from "#libs/twitchApi";
import type { WindowsMediaWatcher } from "#libs/windowsMedia";
import type NowPlaying from "#types/NowPlaying";
import type Widget from "#types/Widget";
import type { Server } from "socket.io";

declare global {
  namespace Express {
    interface Locals {
      twitch: Twitch;
      io: Server;
      db: AppDatabase;
      config: Config;
      windowsMediaWatcher?: WindowsMediaWatcher;
      nowPlayingCurrent: NowPlaying;
      nowPlayingNext: NowPlaying;
      widgetsSettings: Widget;
    }
  }
}
