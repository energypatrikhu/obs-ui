import type { Socket } from "socket.io-client";

import { getContext, setContext } from "svelte";
import { defaultImage } from "./globals";

class WidgetFunctions {
  socketIo = $state<Socket>() as Socket;

  constructor(socket: Socket) {
    this.socketIo = socket;
  }

  private ioEmit(eventName: string, data: any) {
    this.socketIo.emit("callback", { eventName, data });
  }

  private commonWidgetFunctions(widgetName: string, functionName: string) {
    switch (widgetName) {
      case "Now Playing": {
        switch (functionName) {
          case "Test": {
            console.log(`'${widgetName}' widget function '${functionName}' called`);
            this.ioEmit("nowPlaying", {
              reAlerts: [Date.now()],
              artist: "Test Artist",
              track: "Test Track",
              thumbnail: defaultImage,
              favicon: defaultImage,
            });
            break;
          }

          default: {
            console.error(`'${widgetName}' widget does not have function '${functionName}'`);
            break;
          }
        }
        break;
      }

      default: {
        console.error(`'${widgetName}' widget does not have widget functions`);
        break;
      }
    }
  }

  private twitchWidgetFunctions(widgetName: string, functionName: string) {
    switch (widgetName) {
      case "Follows": {
        switch (functionName) {
          case "Test": {
            console.log(`'${widgetName}' widget function '${functionName}' called`);
            this.ioEmit("twitch:event", { type: "follow", username: "TestFollower" });
            break;
          }

          default: {
            console.error(`'${widgetName}' widget does not have function '${functionName}'`);
            break;
          }
        }
        break;
      }

      case "Subscriptions": {
        switch (functionName) {
          case "Test": {
            console.log(`'${widgetName}' widget function '${functionName}' called`);
            this.ioEmit("twitch:event", { type: "subscribe", username: "TestSubscriber", tier: "1000" });
            break;
          }

          default: {
            console.error(`'${widgetName}' widget does not have function '${functionName}'`);
            break;
          }
        }
        break;
      }

      case "Gifted Subs": {
        switch (functionName) {
          case "Test": {
            console.log(`'${widgetName}' widget function '${functionName}' called`);
            this.ioEmit("twitch:event", { type: "subscription.gift", username: "TestGifter", tier: "1000", total: 5 });
            break;
          }

          default: {
            console.error(`'${widgetName}' widget does not have function '${functionName}'`);
            break;
          }
        }
        break;
      }

      case "Resubs": {
        switch (functionName) {
          case "Test": {
            console.log(`'${widgetName}' widget function '${functionName}' called`);
            this.ioEmit("twitch:event", {
              type: "subscription.message",
              username: "TestResub",
              tier: "1000",
              duration: 12,
              streak: 12,
              message: "Love the stream!",
            });
            break;
          }

          default: {
            console.error(`'${widgetName}' widget does not have function '${functionName}'`);
            break;
          }
        }
        break;
      }

      case "Cheers": {
        switch (functionName) {
          case "Test": {
            console.log(`'${widgetName}' widget function '${functionName}' called`);
            this.ioEmit("twitch:event", { type: "cheer", username: "TestCheerer", amount: 100, message: "Great content!" });
            break;
          }

          default: {
            console.error(`'${widgetName}' widget does not have function '${functionName}'`);
            break;
          }
        }
        break;
      }

      case "Raids": {
        switch (functionName) {
          case "Test": {
            console.log(`'${widgetName}' widget function '${functionName}' called`);
            this.ioEmit("twitch:event", { type: "raid", username: "TestRaider", viewers: 50 });
            break;
          }

          default: {
            console.error(`'${widgetName}' widget does not have function '${functionName}'`);
            break;
          }
        }
        break;
      }

      case "Activity Feed": {
        switch (functionName) {
          case "Test": {
            console.log(`'${widgetName}' widget function '${functionName}' called`);
            const events = [
              { type: "follow", username: "TestFollower" + Math.floor(Math.random() * 100) },
              { type: "subscribe", username: "TestSubscriber" + Math.floor(Math.random() * 100), tier: "1000" },
              { type: "subscription.gift", username: "TestGifter" + Math.floor(Math.random() * 100), tier: "1000", total: 5 },
              {
                type: "subscription.message",
                username: "TestResub" + Math.floor(Math.random() * 100),
                tier: "1000",
                duration: 12,
                streak: 12,
                message: "Love the stream!",
              },
              {
                type: "cheer",
                username: "TestCheerer" + Math.floor(Math.random() * 100),
                amount: 100,
                message: "Great content!",
              },
              { type: "raid", username: "TestRaider" + Math.floor(Math.random() * 100), viewers: 50 },
            ];
            const randomEvent = events[Math.floor(Math.random() * events.length)];
            this.ioEmit("twitch:event", randomEvent);
            break;
          }

          default: {
            console.error(`'${widgetName}' widget does not have function '${functionName}'`);
            break;
          }
        }
        break;
      }

      default: {
        console.error(`'${widgetName}' widget does not have widget functions`);
        break;
      }
    }
  }

  execute(widgetCategory: string, widgetName: string, functionName: string) {
    switch (widgetCategory) {
      case "common": {
        this.commonWidgetFunctions(widgetName, functionName);
        break;
      }

      case "twitch": {
        this.twitchWidgetFunctions(widgetName, functionName);
        break;
      }
    }
  }
}

const WIDGET_FUNCTIONS_KEY = Symbol("WidgetFunctions");

export function setWidgetFunctions(socket: Socket) {
  return setContext(WIDGET_FUNCTIONS_KEY, new WidgetFunctions(socket));
}

export function getWidgetFunctions() {
  return getContext<ReturnType<typeof setWidgetFunctions>>(WIDGET_FUNCTIONS_KEY);
}
