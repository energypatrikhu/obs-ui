import type NowPlaying from "#types/NowPlaying";
import type Widget from "#types/Widget";
import type { Server } from "socket.io";

import Twitch from "#libs/twitchApi";

declare global {
  namespace Express {
    interface Locals {
      twitch: Twitch;
      io: Server;
      nowPlayingCurrent: NowPlaying;
      nowPlayingNext: NowPlaying;
      widgetsSettings: Widget;
    }
  }
}
