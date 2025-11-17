import type { Socket } from "socket.io-client";
import type { getWidgets } from "./widgets.svelte";

import { getContext, setContext } from "svelte";

class SocketIo {
  client = $state<Socket>() as Socket;
  connected = $state<boolean>(false);

  constructor(socket: Socket, widgets: ReturnType<typeof getWidgets>) {
    this.client = socket;

    socket.on("connect", () => (this.connected = true));
    socket.on("disconnect", () => (this.connected = false));

    socket.on("widgets-settings", (data) => {
      widgets.disabled = data.disabledWidgets;
      if (data.twitch?.activityFeed?.maxEvents !== undefined) {
        widgets.entries.twitch.activityFeed.maxEvents = data.twitch.activityFeed.maxEvents;
      }
    });
  }
}

const SOCKET_IO_KEY = Symbol("SocketIo");

export function setSocketIo(socket: Socket, widgets: ReturnType<typeof getWidgets>) {
  return setContext(SOCKET_IO_KEY, new SocketIo(socket, widgets));
}

export function getSocketIo() {
  return getContext<ReturnType<typeof setSocketIo>>(SOCKET_IO_KEY);
}
