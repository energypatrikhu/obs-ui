import { getContext, setContext } from "svelte";

class Widgets {
  entries = {
    nowPlaying: {
      name: "Now Playing",
      functions: [
        {
          name: "Test",
          timeout: 30 * 1000,
        },
      ],
    },
    twitch: {
      notifications: {
        "follow": {
          name: "Follows",
          functions: [
            {
              name: "Test",
              timeout: 10 * 1000,
            },
          ],
        },
        "subscribe": {
          name: "Subscriptions",
          functions: [
            {
              name: "Test",
              timeout: 10 * 1000,
            },
          ],
        },
        "subscription.gift": {
          name: "Gifted Subs",
          functions: [
            {
              name: "Test",
              timeout: 10 * 1000,
            },
          ],
        },
        "subscription.message": {
          name: "Resubs",
          functions: [
            {
              name: "Test",
              timeout: 10 * 1000,
            },
          ],
        },
        "cheer": {
          name: "Cheers",
          functions: [
            {
              name: "Test",
              timeout: 10 * 1000,
            },
          ],
        },
        "raid": {
          name: "Raids",
          functions: [
            {
              name: "Test",
              timeout: 10 * 1000,
            },
          ],
        },
      },
      activityFeed: {
        name: "Activity Feed",
        maxEvents: 5,
        functions: [
          {
            name: "Test",
            timeout: 10 * 1000,
          },
        ],
      },
    },
  };

  disabled = $state<string[]>([]);
}

const WIDGETS_KEY = Symbol("Widgets");

export function setWidgets() {
  return setContext(WIDGETS_KEY, new Widgets());
}

export function getWidgets() {
  return getContext<ReturnType<typeof setWidgets>>(WIDGETS_KEY);
}
