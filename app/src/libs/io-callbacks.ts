import type Twitch from "#libs/twitchApi.ts";
import type { Server, Socket } from "socket.io";

interface CallbackData {
  eventName: string;
  data: any;
}

export function handleIoCallbacks(_io: Server, socket: Socket) {
  socket.on("callback", (data: CallbackData) => {
    console.log("callback", data);

    socket.broadcast.emit(data.eventName, data.data);
  });
}

export function handleIoTwitchCallbacks(_io: Server, socket: Socket, twitch: Twitch) {
  // socket.on("twitch:event:list", async (data: CallbackData) => {
  //   console.log("twitch:event:list", data);
  //   const followEvents: Array<GetChannelFollowers> = [];
  //   const events = await twitch.channels.getChannelFollowers({ broadcaster_id: twitchUserId });
  //   // socket.broadcast.emit(data.eventName, data.data);
  // });
}
