import type AppDatabase from "#libs/database";
import { Logger } from "#libs/logger";
import type { EventSubMessage, EventSubNotification, RefreshTokenResponse, TwitchEvents } from "#types/TwitchApi";
import type * as TwitchEndpointRequests from "#types/TwitchEndpointRequests";
import type * as TwitchEndpointResponses from "#types/TwitchEndpointResponses";
import { sleep } from "@energypatrikhu/node-utils";
import { execSync } from "child_process";
import EventEmitter from "events";
import _ from "lodash";
import type { Server } from "socket.io";
import WebSocket from "ws";
import twitchScopes from "../../all-scopes.json";

const logger = new Logger("TwitchApi");
// const debug = new Logger('TwitchApi - Debug', !!process.env.NODE);
const debug = new Logger("TwitchApi - Debug");

export default class Twitch {
  private externalEmitter: EventEmitter = new EventEmitter();
  private internalEmitter: EventEmitter = new EventEmitter();

  private twitchApiUrl = "https://api.twitch.tv/helix";
  private twitchIdUrl = "https://id.twitch.tv";

  private redirect_uri = "http://localhost:2442/twitch-callback";
  private response_type = "code";
  private grant_type = "authorization_code";

  private credentials: {
    client_id: string;
    client_secret: string;
    scope: Array<string>;
    code: string;
    access_token: string;
    refresh_token: string;
  } = {
    client_id: "",
    client_secret: "",
    scope: [],
    code: "",
    access_token: "",
    refresh_token: "",
  };

  private websocket_id = "";

  private io: Server;
  private db: AppDatabase;

  constructor(io: Server, db: AppDatabase) {
    this.io = io;
    this.db = db;
  }

  private async updateCredentials(credentials: any) {
    this.credentials = _.merge(this.credentials, credentials);

    await this.db.setTwitchCredentials(this.credentials);
  }

  public generateOAuth2AuthorizeURL() {
    // const scopes = this.credentials.scope.map((scope) => encodeURIComponent(scope)).join("+");
    const scopes = twitchScopes.map((scope) => encodeURIComponent(scope)).join("+");

    let url = this.twitchIdUrl + "/oauth2/authorize";
    url += `?client_id=${this.credentials.client_id}`;
    url += `&redirect_uri=${this.redirect_uri}`;
    url += `&response_type=${this.response_type}`;
    url += `&scope=${scopes}`;
    return url;
  }

  public async init() {
    logger.info("Initializing Twitch API");

    const storedCredentials = this.db.getTwitchCredentials();
    await this.updateCredentials(storedCredentials);

    if (!this.credentials.client_id || !this.credentials.client_secret) {
      logger.error("Failed to initialize Twitch API, missing credentials");
      return;
    }

    if (this.credentials.scope.length === 0) {
      logger.error("Failed to initialize Twitch API, missing scopes");
      return;
    }

    if (!this.credentials.code) {
      this.internalEmitter.once("code-set", async () => {
        await this.authTokens();
        logger.info("Twitch API initialized");
        this.externalEmitter.emit("ready");
      });

      logger.warn("Not authenticated, opening browser with OAuth2 URL");
      execSync(`start "" "${this.generateOAuth2AuthorizeURL()}"`);

      return this;
    }

    await this.authTokens();
    logger.info("Twitch API initialized");
    this.externalEmitter.emit("ready");
    return this;
  }

  private async authTokens() {
    debug.info("Authenticating tokens");

    if (!this.credentials.access_token) {
      await this.getTokens();
    } else {
      if (!(await this.validateToken())) {
        await this.refreshToken();
      }
    }

    debug.info("Tokens authenticated");
  }

  public async setCode(code: string) {
    await this.updateCredentials({ code });
    this.internalEmitter.emit("code-set");
    return this;
  }

  public async getTokens() {
    debug.info("Requesting tokens");

    try {
      const response = await fetch(this.twitchIdUrl + "/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: this.credentials.client_id,
          client_secret: this.credentials.client_secret,
          code: this.credentials.code,
          grant_type: this.grant_type,
          redirect_uri: this.redirect_uri,
        }),
      });

      const json = (await response.json()) as RefreshTokenResponse;

      if (json.error) {
        debug.error("Failed to get tokens");
        return false;
      }

      await this.updateCredentials({
        access_token: json.access_token,
        refresh_token: json.refresh_token,
      });

      debug.info("Tokens received");
      return true;
    } catch {
      debug.error("Failed to get tokens");
      return false;
    }
  }

  private async validateToken() {
    debug.info("Validating tokens");

    try {
      const response = await fetch(this.twitchIdUrl + "/oauth2/validate", {
        headers: {
          Authorization: `OAuth ${this.credentials.access_token}`,
        },
      });

      const json = (await response.json()) as { status?: number };

      if (json.status === 401) {
        debug.warn("Token is invalid, refreshing");
        return false;
      }

      debug.info("Token is valid");
      return true;
    } catch {
      debug.error("Failed to validate token");
      return false;
    }
  }

  private async refreshToken() {
    debug.info("Refreshing tokens");

    try {
      const response = await fetch(this.twitchIdUrl + "/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: this.credentials.client_id,
          client_secret: this.credentials.client_secret,
          grant_type: "refresh_token",
          refresh_token: this.credentials.refresh_token,
        }),
      });

      const json = (await response.json()) as RefreshTokenResponse;

      if (json.error) {
        return false;
      }

      await this.updateCredentials({
        access_token: json.access_token,
        refresh_token: json.refresh_token,
      });

      debug.info("Tokens refreshed");
      return true;
    } catch {
      debug.error("Failed to refresh tokens");
      return false;
    }
  }

  async subscribeToWebsocketEvents(events: Array<Omit<TwitchEndpointRequests.CreateEventSubSubscription, "transport">>) {
    debug.info("Subscribing to websocket events");
    this.externalEmitter.emit("subscribing-to-websocket-events");

    for (const event of events) {
      const eventSub = await this.eventSub.createEventSubSubscription({
        type: event.type,
        version: event.version,
        condition: event.condition,
        transport: {
          method: "websocket",
          session_id: this.websocket_id,
        },
      });

      if (!eventSub) {
        debug.error("Failed to subscribe to websocket events");
        this.externalEmitter.emit("failed-to-subscribe-to-websocket-events");
        return;
      }
    }

    debug.info("Subscribed to websocket events");
    this.externalEmitter.emit("subscribed-to-websocket-events");
  }

  public async connectToWebsocket(
    oldWebsocket: WebSocket | undefined = undefined,
    websocketUrl: string | undefined = undefined,
  ) {
    if (!oldWebsocket && !websocketUrl) {
      await this.clearEventSubSubscriptions();
    }

    logger.info("Connecting to websocket");
    this.externalEmitter.emit("websocket-connecting");

    const eventSubWs = new WebSocket(websocketUrl || "wss://eventsub.wss.twitch.tv/ws");

    eventSubWs.on("message", async (data) => {
      const msg: EventSubMessage = JSON.parse(data.toString());

      switch (msg.metadata.message_type) {
        case "session_welcome": {
          if (oldWebsocket) {
            oldWebsocket.close();
          }

          debug.info("WebSocket session welcome received");
          logger.info("Connected to websocket");
          this.websocket_id = msg.payload.session.id;
          // await this.subscribeToWebsocketEvents();
          this.externalEmitter.emit("websocket-connected");
          break;
        }

        case "session_reconnect": {
          debug.warn("WebSocket session reconnect requested");
          this.connectToWebsocket(eventSubWs, msg.payload.session.reconnect_url);
          break;
        }

        case "notification": {
          const subscriptionType = msg.metadata.subscription_type;
          const notification: EventSubNotification = msg.payload;

          debug.info(`Received '${subscriptionType}' event:`, notification.event);
          this.externalEmitter.emit("event-received", notification);
          break;
        }

        case "revocation": {
          debug.warn("WebSocket session revoked");
          this.externalEmitter.emit("websocket-revoked");

          switch (msg.payload.subscription.status) {
            case "user_removed": {
              logger.warn("WebSocket session revoked, the user mentioned in the subscription no longer exists");
              break;
            }

            case "authorization_revoked": {
              logger.warn(
                "WebSocket session revoked, the user revoked the authorization token that the subscription relied on",
              );
              break;
            }

            case "version_removed": {
              logger.warn("WebSocket session revoked, the subscription type and version is no longer supported");
              break;
            }
          }
          break;
        }
      }
    });
  }

  public on(event: TwitchEvents, listener: (data: any) => void) {
    this.externalEmitter.on(event, listener);
  }

  public once(event: TwitchEvents, listener: (data: any) => void) {
    this.externalEmitter.once(event, listener);
  }

  private async clearEventSubSubscriptions() {
    debug.info("Clearing EventSub subscriptions");
    this.externalEmitter.emit("clearing-eventsub-subscriptions");

    try {
      const subscriptions = await this.eventSub.getEventSubSubscriptions({});

      if (!subscriptions) {
        debug.error("Failed to get EventSub subscriptions");
        this.externalEmitter.emit("failed-to-clear-eventsub-subscriptions");
        return;
      }

      for (const subscription of subscriptions.data) {
        if (subscription.status !== "enabled") {
          await this.eventSub.deleteEventSubSubscription({
            id: subscription.id,
          });
        }
      }

      debug.info("Cleared EventSub subscriptions");
      this.externalEmitter.emit("cleared-eventsub-subscriptions");
    } catch {
      debug.error("Failed to clear EventSub subscriptions");
      this.externalEmitter.emit("failed-to-clear-eventsub-subscriptions");
    }
  }

  private pickBy<T extends object>(object: T | null | undefined): _.PartialObject<T> {
    return _.pickBy(object as any, (value) => value !== undefined);
  }

  async twitchApi<T>({
    path,
    method,
    headers,
    type,
    query,
    body,
    hasResponse = true,
  }: {
    path: string;
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    headers?: Record<string, string> | undefined;
    type?: "urlencoded" | "json" | undefined;
    query?: Record<string, any> | undefined;
    body?: Record<string, any> | undefined;
    hasResponse?: boolean;
  }): Promise<T> {
    const init = {
      method: method || "POST",
      headers: {
        "Client-ID": this.credentials.client_id,
        "Authorization": `Bearer ${this.credentials.access_token}`,
        "Content-Type": type === "urlencoded" ? "application/x-www-form-urlencoded" : "application/json",
        ...headers,
      },
    };

    if (body && type) {
      _.merge(init, {
        body: type === "urlencoded" ? new URLSearchParams(body) : JSON.stringify(body),
      });
    }

    if (query) {
      const urlParams = new URLSearchParams(query);
      path += `?${urlParams.toString()}`;
    }

    const response = await fetch(this.twitchApiUrl + path, init);

    if (response.status === 401) {
      debug.warn("Failed to authenticate, refreshing token");

      await sleep(1000);
      await this.refreshToken();

      await sleep(1000);
      return await this.twitchApi({ path, method, headers, type, body });
    }

    if (hasResponse) {
      const json = (await response.json()) as T;

      if (response.status !== 200 && response.status !== 202 && response.status !== 204) {
        debug.error(`Failed to fetch ${path}, status: ${response.status}`, json);
      }

      return json;
    } else {
      if (response.status !== 200 && response.status !== 202 && response.status !== 204) {
        debug.error(`Failed to ${method} ${path}, status: ${response.status}`, await response.json());

        return false as T;
      }

      return true as T;
    }
  }

  // ------------------------------- // Endpoints // ------------------------------- //

  //
  // Ads
  //
  public ads = {
    startCommercial: async ({ broadcaster_id, length }: TwitchEndpointRequests.StartCommercial) => {
      if (!this.credentials.scope.includes("channel:edit:commercial")) {
        debug.error("Failed to start commercial, missing scope: channel:edit:commercial");
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.StartCommercial>({
        path: "/channels/commercial",
        method: "POST",
        type: "json",
        body: this.pickBy({ broadcaster_id, length }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to start commercial");
        return null;
      }

      return response;
    },

    getAdSchedule: async ({ broadcaster_id }: TwitchEndpointRequests.GetAdSchedule) => {
      if (!this.credentials.scope.includes("channel:read:ads")) {
        debug.error("Failed to get ad schedule, missing scope: channel:read:ads");
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.GetAdSchedule>({
        path: "/channels/ads",
        method: "GET",
        type: "json",
        query: this.pickBy({ broadcaster_id }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get ad schedule");
        return null;
      }

      return response;
    },

    snoozeNextAd: async ({ broadcaster_id }: TwitchEndpointRequests.SnoozeNextAd) => {
      if (!this.credentials.scope.includes("channel:manage:ads")) {
        debug.error("Failed to snooze next ad, missing scope: channel:manage:ads");
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.SnoozeNextAd>({
        path: "/channels/ads/schedule/snooze",
        method: "DELETE",
        type: "json",
        query: this.pickBy({ broadcaster_id }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to snooze next ad");
        return null;
      }

      return response;
    },
  };

  //
  // Analytics
  //
  public analytics = {
    getExtensionAnalytics: async ({
      extension_id,
      type,
      started_at,
      ended_at,
      first,
      after,
    }: TwitchEndpointRequests.GetExtensionAnalytics) => {
      if (!this.credentials.scope.includes("analytics:read:extensions")) {
        debug.error("Failed to get extension analytics, missing scope: analytics:read:extensions");
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.GetExtensionAnalytics>({
        path: "/analytics/extensions",
        method: "GET",
        type: "json",
        query: this.pickBy({
          extension_id,
          type,
          started_at,
          ended_at,
          first,
          after,
        }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get extension analytics");
        return null;
      }

      return response;
    },

    getGameAnalytics: async ({
      game_id,
      type,
      started_at,
      ended_at,
      first,
      after,
    }: TwitchEndpointRequests.GetGameAnalytics) => {
      if (!this.credentials.scope.includes("analytics:read:games")) {
        debug.error("Failed to get game analytics, missing scope: analytics:read:games");
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.GetGameAnalytics>({
        path: "/analytics/games",
        method: "GET",
        type: "json",
        query: this.pickBy({
          game_id,
          type,
          started_at,
          ended_at,
          first,
          after,
        }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get game analytics");
        return null;
      }

      return response;
    },
  };

  //
  // Bits
  //
  public bits = {
    getBitsLeaderboard: async ({ count, period, started_at, user_id }: TwitchEndpointRequests.GetBitsLeaderboard) => {
      if (!this.credentials.scope.includes("bits:read")) {
        debug.error("Failed to get bits leaderboard, missing scope: bits:read");
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.GetBitsLeaderboard>({
        path: "/bits/leaderboard",
        method: "GET",
        type: "json",
        query: this.pickBy({ count, period, started_at, user_id }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get bits leaderboard");
        return null;
      }

      return response;
    },

    getCheermotes: async ({ broadcaster_id }: TwitchEndpointRequests.GetCheermotes) => {
      const response = await this.twitchApi<TwitchEndpointResponses.GetCheermotes>({
        path: "/bits/cheermotes",
        method: "GET",
        type: "json",
        query: this.pickBy({ broadcaster_id }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get cheermotes");
        return null;
      }

      return response;
    },

    getExtensionTransactions: async ({ extension_id, id, first, after }: TwitchEndpointRequests.GetExtensionTransactions) => {
      const response = await this.twitchApi<TwitchEndpointResponses.GetExtensionTransactions>({
        path: "/extensions/transactions",
        method: "GET",
        type: "json",
        query: this.pickBy({ extension_id, id, first, after }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get extension transactions");
        return null;
      }

      return response;
    },
  };

  //
  // Channels
  //
  public channels = {
    getChannelInformation: async ({ broadcaster_id }: TwitchEndpointRequests.GetChannelInformation) => {
      const response = await this.twitchApi<TwitchEndpointResponses.GetChannelInformation>({
        path: "/channels",
        method: "GET",
        type: "json",
        query: this.pickBy({ broadcaster_id }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get channel information");
        return null;
      }

      return response;
    },

    modifyChannelInformation: async ({
      broadcaster_id,
      game_id,
      broadcaster_language,
      title,
      delay,
      tags,
      content_classification_labels,
      is_branded_content,
    }: TwitchEndpointRequests.ModifyChannelInformation) => {
      if (!this.credentials.scope.includes("channel:manage:broadcast")) {
        debug.error("Failed to modify channel information, missing scope: channel:manage:broadcast");
        return null;
      }

      const response = await this.twitchApi<boolean>({
        path: "/channels",
        method: "PATCH",
        type: "json",
        query: this.pickBy({ broadcaster_id }),
        body: this.pickBy({
          game_id,
          broadcaster_language,
          title,
          delay,
          tags,
          content_classification_labels,
          is_branded_content,
        }),
      });

      if (response) {
        debug.info("Channel information modified");
      } else {
        debug.error("Failed to modify channel information");
      }
      return response;
    },

    getChannelEditors: async ({ broadcaster_id }: TwitchEndpointRequests.GetChannelEditors) => {
      if (!this.credentials.scope.includes("channel:read:editors")) {
        debug.error("Failed to get channel editors, missing scope: channel:read:editors");
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.GetChannelEditors>({
        path: "/channels/editors",
        method: "GET",
        type: "json",
        query: this.pickBy({ broadcaster_id }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get channel editors");
        return null;
      }

      return response;
    },

    getFollowedChannels: async ({ user_id, broadcaster_id, first, after }: TwitchEndpointRequests.GetFollowedChannels) => {
      if (!this.credentials.scope.includes("user:read:follows")) {
        debug.error("Failed to get followed channels, missing scope: user:read:follows");
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.GetFollowedChannels>({
        path: "/users/follows",
        method: "GET",
        type: "json",
        query: this.pickBy({ user_id, broadcaster_id, first, after }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get followed channels");
        return null;
      }

      return response;
    },

    getChannelFollowers: async ({ user_id, broadcaster_id, first, after }: TwitchEndpointRequests.GetChannelFollowers) => {
      if (!this.credentials.scope.includes("moderator:read:followers")) {
        debug.error("Failed to get channel followers, missing scope: moderator:read:followers");
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.GetChannelFollowers>({
        path: "/users/follows",
        method: "GET",
        type: "json",
        query: this.pickBy({ user_id, broadcaster_id, first, after }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get channel followers");
        return null;
      }

      return response;
    },
  };

  //
  // Channel Points
  //
  public channelPoints = {
    createCustomRewards: async ({
      broadcaster_id,
      title,
      cost,
      prompt,
      is_enabled,
      background_color,
      is_user_input_required,
      is_max_per_stream_enabled,
      max_per_stream,
      is_max_per_user_per_stream_enabled,
      max_per_user_per_stream,
      is_global_cooldown_enabled,
      global_cooldown_seconds,
      should_redemptions_skip_request_queue,
    }: TwitchEndpointRequests.CreateCustomRewards) => {
      if (!this.credentials.scope.includes("channel:manage:redemptions")) {
        debug.error("Failed to create custom rewards, missing scope: channel:manage:redemptions");
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.CreateCustomRewards>({
        path: "/channel_points/custom_rewards",
        method: "POST",
        type: "json",
        query: this.pickBy({ broadcaster_id }),
        body: this.pickBy({
          title,
          cost,
          prompt,
          is_enabled,
          background_color,
          is_user_input_required,
          is_max_per_stream_enabled,
          max_per_stream,
          is_max_per_user_per_stream_enabled,
          max_per_user_per_stream,
          is_global_cooldown_enabled,
          global_cooldown_seconds,
          should_redemptions_skip_request_queue,
        }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to create custom rewards");
        return null;
      }

      return response;
    },

    deleteCustomReward: async ({ broadcaster_id, id }: TwitchEndpointRequests.DeleteCustomReward) => {
      if (!this.credentials.scope.includes("channel:manage:redemptions")) {
        debug.error("Failed to delete custom reward, missing scope: channel:manage:redemptions");
        return null;
      }

      const response = await this.twitchApi<boolean>({
        path: "/channel_points/custom_rewards",
        method: "DELETE",
        query: this.pickBy({ broadcaster_id, id }),
        hasResponse: false,
      });

      if (response) {
        debug.info("Custom reward deleted");
      } else {
        debug.error("Failed to delete custom reward");
      }
      return response;
    },

    getCustomReward: async ({ broadcaster_id, id, only_manageable_rewards }: TwitchEndpointRequests.GetCustomReward) => {
      if (
        !this.credentials.scope.includes("channel:read:redemptions") &&
        !this.credentials.scope.includes("channel:manage:redemptions")
      ) {
        debug.error("Failed to get custom reward, missing scope: channel:read:redemptions or channel:manage:redemptions");
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.GetCustomReward>({
        path: "/channel_points/custom_rewards",
        method: "GET",
        type: "json",
        query: this.pickBy({ broadcaster_id, id, only_manageable_rewards }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get custom reward");
        return null;
      }

      return response;
    },

    getCustomRewardRedemption: async ({
      broadcaster_id,
      reward_id,
      status,
      id,
      sort,
      after,
      first,
    }: TwitchEndpointRequests.GetCustomRewardRedemption) => {
      if (
        !this.credentials.scope.includes("channel:read:redemptions") &&
        !this.credentials.scope.includes("channel:manage:redemptions")
      ) {
        debug.error(
          "Failed to get custom reward redemption, missing scope: channel:read:redemptions or channel:manage:redemptions",
        );
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.GetCustomRewardRedemption>({
        path: "/channel_points/custom_rewards/redemptions",
        method: "GET",
        type: "json",
        query: this.pickBy({
          broadcaster_id,
          reward_id,
          status,
          id,
          sort,
          after,
          first,
        }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get custom reward redemption");
        return null;
      }

      return response;
    },

    updateCustomReward: async ({
      broadcaster_id,
      id,
      title,
      prompt,
      cost,
      background_color,
      is_enabled,
      is_user_input_required,
      is_max_per_stream_enabled,
      max_per_stream,
      is_max_per_user_per_stream_enabled,
      max_per_user_per_stream,
      is_global_cooldown_enabled,
      global_cooldown_seconds,
      is_paused,
      should_redemptions_skip_request_queue,
    }: TwitchEndpointRequests.UpdateCustomReward) => {
      if (!this.credentials.scope.includes("channel:manage:redemptions")) {
        debug.error("Failed to update custom reward, missing scope: channel:manage:redemptions");
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.UpdateCustomReward>({
        path: "/channel_points/custom_rewards",
        method: "PATCH",
        type: "json",
        query: this.pickBy({ broadcaster_id, id }),
        body: this.pickBy({
          title,
          prompt,
          cost,
          background_color,
          is_enabled,
          is_user_input_required,
          is_max_per_stream_enabled,
          max_per_stream,
          is_max_per_user_per_stream_enabled,
          max_per_user_per_stream,
          is_global_cooldown_enabled,
          global_cooldown_seconds,
          is_paused,
          should_redemptions_skip_request_queue,
        }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to update custom reward");
        return null;
      }

      return response;
    },

    updateRedemptionStatus: async ({
      id,
      broadcaster_id,
      reward_id,
      status,
    }: TwitchEndpointRequests.UpdateRedemptionStatus) => {
      if (!this.credentials.scope.includes("channel:manage:redemptions")) {
        debug.error("Failed to update redemption status, missing scope: channel:manage:redemptions");
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.UpdateRedemptionStatus>({
        path: "/channel_points/custom_rewards/redemptions",
        method: "PATCH",
        type: "json",
        query: this.pickBy({ id, broadcaster_id, reward_id }),
        body: this.pickBy({ status }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to update redemption status");
        return null;
      }

      return response;
    },
  };

  //
  // Charity
  //
  public charity = {
    getCharityCampaign: async ({ broadcaster_id }: TwitchEndpointRequests.GetCharityCampaign) => {
      if (!this.credentials.scope.includes("channel:read:charity")) {
        debug.error("Failed to get charity campaign, missing scope: channel:read:charity");
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.GetCharityCampaign>({
        path: "/charity/campaigns",
        method: "GET",
        type: "json",
        query: this.pickBy({ broadcaster_id }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get charity campaign");
        return null;
      }

      return response;
    },

    getCharityCampaignDonations: async ({
      broadcaster_id,
      first,
      after,
    }: TwitchEndpointRequests.GetCharityCampaignDonations) => {
      if (!this.credentials.scope.includes("channel:read:charity")) {
        debug.error("Failed to get charity campaign donations, missing scope: channel:read:charity");
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.GetCharityCampaignDonations>({
        path: "/charity/donations",
        method: "GET",
        type: "json",
        query: this.pickBy({ broadcaster_id, first, after }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get charity campaign donations");
        return null;
      }

      return response;
    },
  };

  //
  // Chat
  //
  public chat = {
    getChatters: async ({ broadcaster_id, moderator_id, first, after }: TwitchEndpointRequests.GetChatters) => {
      if (!this.credentials.scope.includes("moderator:read:chatters")) {
        debug.error("Failed to get chatters, missing scope: moderator:read:chatters");
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.GetChatters>({
        path: "/chat/chatters",
        method: "GET",
        type: "json",
        query: this.pickBy({ broadcaster_id, moderator_id, first, after }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get chatters");
        return null;
      }

      return response;
    },

    getChannelEmotes: async ({ broadcaster_id }: TwitchEndpointRequests.GetChannelEmotes) => {
      const response = await this.twitchApi<TwitchEndpointResponses.GetChannelEmotes>({
        path: "/chat/emotes",
        method: "GET",
        type: "json",
        query: this.pickBy({ broadcaster_id }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get channel emotes");
        return null;
      }

      return response;
    },

    getGlobalEmotes: async () => {
      const response = await this.twitchApi<TwitchEndpointResponses.GetGlobalEmotes>({
        path: "/chat/emotes/global",
        method: "GET",
        type: "json",
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get global emotes");
        return null;
      }

      return response;
    },

    getEmoteSets: async ({ emote_set_id }: TwitchEndpointRequests.GetEmoteSets) => {
      const response = await this.twitchApi<TwitchEndpointResponses.GetEmoteSets>({
        path: "/chat/emotes/set",
        method: "GET",
        type: "json",
        query: this.pickBy({ emote_set_id }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get emote sets");
        return null;
      }

      return response;
    },

    getChannelChatBadges: async ({ broadcaster_id }: TwitchEndpointRequests.GetChannelChatBadges) => {
      const response = await this.twitchApi<TwitchEndpointResponses.GetChannelChatBadges>({
        path: "/chat/badges",
        method: "GET",
        type: "json",
        query: this.pickBy({ broadcaster_id }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get channel chat badges");
        return null;
      }

      return response;
    },

    getGlobalChatBadges: async () => {
      const response = await this.twitchApi<TwitchEndpointResponses.GetGlobalChatBadges>({
        path: "/chat/badges/global",
        method: "GET",
        type: "json",
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get global chat badges");
        return null;
      }

      return response;
    },

    getChatSettings: async ({ broadcaster_id, moderator_id }: TwitchEndpointRequests.GetChatSettings) => {
      const response = await this.twitchApi<TwitchEndpointResponses.GetChatSettings>({
        path: "/chat/settings",
        method: "GET",
        type: "json",
        query: this.pickBy({ broadcaster_id, moderator_id }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get chat settings");
        return null;
      }

      return response;
    },

    getUserEmotes: async ({ user_id, after, broadcaster_id }: TwitchEndpointRequests.GetUserEmotes) => {
      if (!this.credentials.scope.includes("user:read:emotes")) {
        debug.error("Failed to get user emotes, missing scope: user:read:emotes");
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.GetUserEmotes>({
        path: "/chat/emotes/user",
        method: "GET",
        type: "json",
        query: this.pickBy({ user_id, after, broadcaster_id }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get user emotes");
        return null;
      }

      return response;
    },

    updateChatSettings: async ({
      broadcaster_id,
      moderator_id,
      emote_mode,
      follower_mode,
      follower_mode_duration,
      non_moderator_chat_delay,
      non_moderator_chat_delay_duration,
      slow_mode,
      slow_mode_wait_time,
      subscriber_mode,
      unique_chat_mode,
    }: TwitchEndpointRequests.UpdateChatSettings) => {
      if (!this.credentials.scope.includes("moderator:manage:chat_settings")) {
        debug.error("Failed to update chat settings, missing scope: moderator:manage:chat_settings");
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.UpdateChatSettings>({
        path: "/chat/settings",
        method: "PATCH",
        type: "json",
        query: this.pickBy({ broadcaster_id, moderator_id }),
        body: this.pickBy({
          emote_mode,
          follower_mode,
          follower_mode_duration,
          non_moderator_chat_delay,
          non_moderator_chat_delay_duration,
          slow_mode,
          slow_mode_wait_time,
          subscriber_mode,
          unique_chat_mode,
        }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to update chat settings");
        return null;
      }

      return response;
    },

    sendChatAnnouncement: async ({
      broadcaster_id,
      moderator_id,
      message,
      color,
    }: TwitchEndpointRequests.SendChatAnnouncement) => {
      if (!this.credentials.scope.includes("moderator:manage:announcements")) {
        debug.error("Failed to send chat announcement, missing scope: moderator:manage:announcements");
        return null;
      }

      const response = await this.twitchApi<boolean>({
        path: "/chat/announcements",
        method: "POST",
        type: "json",
        query: this.pickBy({ broadcaster_id, moderator_id }),
        body: this.pickBy({ message, color }),
      });

      if (response) {
        debug.info("Sent chat announcement");
      } else {
        debug.error("Failed to send chat announcement");
      }
      return response;
    },

    sendAShoutout: async ({ from_broadcaster_id, to_broadcaster_id, moderator_id }: TwitchEndpointRequests.SendAShoutout) => {
      if (!this.credentials.scope.includes("moderator:manage:shoutouts")) {
        debug.error("Failed to send a shoutout, missing scope: moderator:manage:shoutouts");
        return null;
      }

      const response = await this.twitchApi<boolean>({
        path: "/chat/shoutouts",
        method: "POST",
        type: "json",
        query: this.pickBy({
          from_broadcaster_id,
          to_broadcaster_id,
          moderator_id,
        }),
      });

      if (response) {
        debug.info("Sent a shoutout");
      } else {
        debug.error("Failed to send a shoutout");
      }
      return response;
    },

    sendChatMessage: async ({
      broadcaster_id,
      sender_id,
      message,
      reply_parent_message_id,
    }: TwitchEndpointRequests.SendChatMessage) => {
      if (!this.credentials.scope.includes("user:write:chat")) {
        debug.error("Failed to send chat message, missing scope: user:write:chat");
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.SendChatMessage>({
        path: "/chat/messages",
        method: "POST",
        type: "json",
        body: this.pickBy({
          broadcaster_id,
          sender_id,
          message,
          reply_parent_message_id,
        }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to send chat message");
        return null;
      }

      return response;
    },

    getUserChatColor: async ({ user_id }: TwitchEndpointRequests.GetUserChatColor) => {
      const response = await this.twitchApi<TwitchEndpointResponses.GetUserChatColor>({
        path: "/chat/users",
        method: "GET",
        type: "json",
        query: this.pickBy({ user_id }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get user chat color");
        return null;
      }

      return response;
    },

    updateUserChatColor: async ({ user_id, color }: TwitchEndpointRequests.UpdateUserChatColor) => {
      if (!this.credentials.scope.includes("user:manage:chat_color")) {
        debug.error("Failed to update user chat color, missing scope: user:manage:chat_color");
        return null;
      }

      const response = await this.twitchApi<boolean>({
        path: "/chat/color",
        method: "PUT",
        type: "json",
        query: this.pickBy({ user_id, color }),
      });

      if (response) {
        debug.info("Updated user chat color");
      } else {
        debug.error("Failed to update user chat color");
      }
      return response;
    },
  };

  //
  // Clips
  //
  public clips = {
    createClip: async ({ broadcaster_id, has_delay }: TwitchEndpointRequests.CreateClip) => {
      if (!this.credentials.scope.includes("clips:edit")) {
        debug.error("Failed to create clip, missing scope: clips:edit");
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.CreateClip>({
        path: "/clips",
        method: "POST",
        type: "json",
        query: this.pickBy({ broadcaster_id, has_delay }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to create clip");
        return null;
      }

      return response;
    },

    getClips: async ({
      broadcaster_id,
      game_id,
      id,
      started_at,
      ended_at,
      first,
      before,
      after,
      is_featured,
    }: TwitchEndpointRequests.GetClips) => {
      const response = await this.twitchApi<TwitchEndpointResponses.GetClips>({
        path: "/clips",
        method: "GET",
        type: "json",
        query: this.pickBy({
          broadcaster_id,
          game_id,
          id,
          started_at,
          ended_at,
          first,
          before,
          after,
          is_featured,
        }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get clips");
        return null;
      }

      return response;
    },
  };

  //
  // Conduits
  //
  public conduits = {
    getConduits: async () => {
      const response = await this.twitchApi<TwitchEndpointResponses.GetConduits>({
        path: "/eventsub/conduits",
        method: "GET",
        type: "json",
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get conduits");
        return null;
      }

      return response;
    },

    createConduits: async ({ shard_count }: TwitchEndpointRequests.CreateConduits) => {
      const response = await this.twitchApi<TwitchEndpointResponses.CreateConduits>({
        path: "/eventsub/conduits",
        method: "POST",
        type: "json",
        body: this.pickBy({ shard_count }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to create conduits");
        return null;
      }

      return response;
    },

    updateConduits: async ({ id, shard_count }: TwitchEndpointRequests.UpdateConduits) => {
      const response = await this.twitchApi<TwitchEndpointResponses.UpdateConduits>({
        path: "/eventsub/conduits",
        method: "PATCH",
        type: "json",
        body: this.pickBy({ id, shard_count }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to update conduits");
        return null;
      }

      return response;
    },

    deleteConduit: async ({ id }: TwitchEndpointRequests.DeleteConduit) => {
      const response = await this.twitchApi<boolean>({
        path: "/eventsub/conduits",
        method: "DELETE",
        query: this.pickBy({ id }),
        hasResponse: false,
      });

      if (response) {
        debug.info("Conduit deleted");
      } else {
        debug.error("Failed to delete conduit");
      }
      return response;
    },

    getConduitShards: async ({ conduit_id, status, after }: TwitchEndpointRequests.GetConduitShards) => {
      const response = await this.twitchApi<TwitchEndpointResponses.GetConduitShards>({
        path: "/eventsub/conduits/shards",
        method: "GET",
        type: "json",
        query: this.pickBy({ conduit_id, status, after }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get conduit shards");
        return null;
      }

      return response;
    },

    updateConduitShards: async ({ conduit_id, shards }: TwitchEndpointRequests.UpdateConduitShards) => {
      const response = await this.twitchApi<TwitchEndpointResponses.UpdateConduitShards>({
        path: "/eventsub/conduits/shards",
        method: "PATCH",
        type: "json",
        body: this.pickBy({ conduit_id, shards }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to update conduit shards");
        return null;
      }

      return response;
    },
  };

  //
  // CCLs
  //
  public ccls = {
    getContentClassificationLabels: async ({ locale }: TwitchEndpointRequests.GetContentClassificationLabels) => {
      const response = await this.twitchApi<TwitchEndpointResponses.GetContentClassificationLabels>({
        path: "/content_classification_labels",
        method: "GET",
        type: "json",
        query: this.pickBy({ locale }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get content classification labels");
        return null;
      }

      return response;
    },
  };

  //
  // Entitlements
  //
  public entitlements = {
    getDropsEntitlements: async ({
      id,
      user_id,
      game_id,
      fulfillment_status,
      after,
      first,
    }: TwitchEndpointRequests.GetDropsEntitlements) => {
      const response = await this.twitchApi<TwitchEndpointResponses.GetDropsEntitlements>({
        path: "/entitlements/drops",
        method: "GET",
        type: "json",
        query: this.pickBy({
          id,
          user_id,
          game_id,
          fulfillment_status,
          after,
          first,
        }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get drops entitlements");
        return null;
      }

      return response;
    },

    updateDropsEntitlements: async ({
      entitlement_ids,
      fulfillment_status,
    }: TwitchEndpointRequests.UpdateDropsEntitlements) => {
      const response = await this.twitchApi<TwitchEndpointResponses.UpdateDropsEntitlements>({
        path: "/entitlements/drops",
        method: "PATCH",
        type: "json",
        body: this.pickBy({ entitlement_ids, fulfillment_status }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to update drops entitlements");
        return null;
      }

      return response;
    },
  };

  //
  // Extensions
  //
  public extensions = {
    getExtensionConfigurationSegment: async ({
      broadcaster_id,
      extension_id,
      segment,
    }: TwitchEndpointRequests.GetExtensionConfigurationSegment) => {
      const response = await this.twitchApi<TwitchEndpointResponses.GetExtensionConfigurationSegment>({
        path: "/extensions/configurations",
        method: "GET",
        type: "json",
        query: this.pickBy({ broadcaster_id, extension_id, segment }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get extension configuration segment");
        return null;
      }

      return response;
    },

    setExtensionConfigurationSegment: async ({
      extension_id,
      segment,
      broadcaster_id,
      content,
      version,
    }: TwitchEndpointRequests.SetExtensionConfigurationSegment) => {
      const response = await this.twitchApi<boolean>({
        path: "/extensions/configurations",
        method: "PUT",
        type: "json",
        query: this.pickBy({
          extension_id,
          segment,
          broadcaster_id,
          content,
          version,
        }),
      });

      if (response) {
        debug.info("Set extension configuration segment");
      } else {
        debug.error("Failed to set extension configuration segment");
      }
      return response;
    },

    setExtensionRequiredConfiguration: async ({
      broadcaster_id,
      extension_id,
      extension_version,
      required_configuration,
    }: TwitchEndpointRequests.SetExtensionRequiredConfiguration) => {
      const response = await this.twitchApi<boolean>({
        path: "/extensions/required_configuration",
        method: "PUT",
        type: "json",
        query: this.pickBy({ broadcaster_id }),
        body: this.pickBy({
          extension_id,
          extension_version,
          required_configuration,
        }),
      });

      if (response) {
        debug.info("Set extension required configuration");
      } else {
        debug.error("Failed to set extension required configuration");
      }
      return response;
    },

    sendExtensionPubSubMessage: async ({
      target,
      broadcaster_id,
      is_global_broadcast,
      message,
    }: TwitchEndpointRequests.SendExtensionPubSubMessage) => {
      const response = await this.twitchApi<boolean>({
        path: "/extensions/pubsub",
        method: "POST",
        type: "json",
        body: this.pickBy({
          target,
          broadcaster_id,
          is_global_broadcast,
          message,
        }),
      });

      if (response) {
        debug.info("Sent extension PubSub message");
      } else {
        debug.error("Failed to send extension PubSub message");
      }
      return response;
    },

    getExtensionLiveChannels: async ({ extension_id, first, after }: TwitchEndpointRequests.GetExtensionLiveChannels) => {
      const response = await this.twitchApi<TwitchEndpointResponses.GetExtensionLiveChannels>({
        path: "/extensions/live",
        method: "GET",
        type: "json",
        query: this.pickBy({ extension_id, first, after }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get extension live channels");
        return null;
      }

      return response;
    },

    getExtensionSecrets: async ({ extension_id }: TwitchEndpointRequests.GetExtensionSecrets) => {
      const response = await this.twitchApi<TwitchEndpointResponses.GetExtensionSecrets>({
        path: "/extensions/jwt/secrets",
        method: "GET",
        type: "json",
        query: this.pickBy({ extension_id }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get extension secrets");
        return null;
      }

      return response;
    },

    createExtensionSecret: async ({ extension_id, delay }: TwitchEndpointRequests.CreateExtensionSecret) => {
      const response = await this.twitchApi<TwitchEndpointResponses.CreateExtensionSecret>({
        path: "/extensions/jwt/secrets",
        method: "POST",
        type: "json",
        query: this.pickBy({ extension_id, delay }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to create extension secret");
        return null;
      }

      return response;
    },

    sendExtensionChatMessage: async ({
      broadcaster_id,
      text,
      extension_id,
      extension_version,
    }: TwitchEndpointRequests.SendExtensionChatMessage) => {
      const response = await this.twitchApi<boolean>({
        path: "/extensions/chat",
        method: "POST",
        type: "json",
        query: this.pickBy({ broadcaster_id }),
        body: this.pickBy({ text, extension_id, extension_version }),
      });

      if (response) {
        debug.info("Sent extension chat message");
      } else {
        debug.error("Failed to send extension chat message");
      }
      return response;
    },

    getExtensions: async ({ extension_id, extension_version }: TwitchEndpointRequests.GetExtensions) => {
      const response = await this.twitchApi<TwitchEndpointResponses.GetExtensions>({
        path: "/extensions",
        method: "GET",
        type: "json",
        query: this.pickBy({ extension_id, extension_version }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get extensions");
        return null;
      }

      return response;
    },

    getReleasedExtensions: async ({ extension_id, extension_version }: TwitchEndpointRequests.GetReleasedExtensions) => {
      const response = await this.twitchApi<TwitchEndpointResponses.GetReleasedExtensions>({
        path: "/extensions/released",
        method: "GET",
        type: "json",
        query: this.pickBy({ extension_id, extension_version }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get released extensions");
        return null;
      }

      return response;
    },

    getExtensionBitsProducts: async ({ should_include_all }: TwitchEndpointRequests.GetExtensionBitsProducts) => {
      const response = await this.twitchApi<TwitchEndpointResponses.GetExtensionBitsProducts>({
        path: "/bits/extensions",
        method: "GET",
        type: "json",
        query: this.pickBy({ should_include_all }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get extension bits products");
        return null;
      }

      return response;
    },

    updateExtensionBitsProduct: async ({
      sku,
      cost,
      in_development,
      display_name,
      is_broadcast,
      expiration,
    }: TwitchEndpointRequests.UpdateExtensionBitsProduct) => {
      const response = await this.twitchApi<TwitchEndpointResponses.UpdateExtensionBitsProduct>({
        path: "/bits/extensions",
        method: "PUT",
        type: "json",
        body: this.pickBy({
          sku,
          cost,
          in_development,
          display_name,
          is_broadcast,
          expiration,
        }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to update extension bits product");
        return null;
      }

      return response;
    },
  };

  //
  // EventSub
  //
  public eventSub = {
    createEventSubSubscription: async ({
      type,
      version,
      condition,
      transport,
    }: TwitchEndpointRequests.CreateEventSubSubscription) => {
      if (!this.credentials.scope.includes("channel:read:subscriptions")) {
        debug.error("Failed to create EventSub subscription, missing scope: channel:read:subscriptions");
        return null;
      }

      const response = await this.twitchApi<boolean>({
        path: "/eventsub/subscriptions",
        method: "POST",
        type: "json",
        body: this.pickBy({ type, version, condition, transport }),
      });

      if (response) {
        debug.info("Created EventSub subscription for type:", type);
      } else {
        debug.error("Failed to create EventSub subscription for type:", type);
      }
      return response;
    },

    deleteEventSubSubscription: async ({ id }: TwitchEndpointRequests.DeleteEventSubSubscription) => {
      const response = await this.twitchApi<boolean>({
        path: "/eventsub/subscriptions",
        method: "DELETE",
        query: this.pickBy({ id }),
        hasResponse: false,
      });

      if (response) {
        debug.info("Deleted EventSub subscription");
      } else {
        debug.error("Failed to delete EventSub subscription");
      }
      return response;
    },

    getEventSubSubscriptions: async ({ status, type, user_id, after }: TwitchEndpointRequests.GetEventSubSubscriptions) => {
      const response = await this.twitchApi<TwitchEndpointResponses.GetEventSubSubscriptions>({
        path: "/eventsub/subscriptions",
        method: "GET",
        type: "json",
        query: this.pickBy({ status, type, user_id, after }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get EventSub subscriptions");
        return null;
      }

      return response;
    },
  };

  //
  // Games
  //
  public games = {
    getTopGames: async ({ first, after, before }: TwitchEndpointRequests.GetTopGames) => {
      const response = await this.twitchApi<TwitchEndpointResponses.GetTopGames>({
        path: "/games/top",
        method: "GET",
        type: "json",
        query: this.pickBy({ first, after, before }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get top games");
        return null;
      }

      return response;
    },

    getGames: async ({ id, name, igdb_id }: TwitchEndpointRequests.GetGames) => {
      const response = await this.twitchApi<TwitchEndpointResponses.GetGames>({
        path: "/games",
        method: "GET",
        type: "json",
        query: this.pickBy({ id, name, igdb_id }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get games");
        return null;
      }

      return response;
    },
  };

  //
  // Goals
  //
  public goals = {
    getCreatorGoals: async ({ broadcaster_id }: TwitchEndpointRequests.GetCreatorGoals) => {
      if (!this.credentials.scope.includes("channel:read:goals")) {
        debug.error("Failed to get creator goals, missing scope: channel:read:goals");
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.GetCreatorGoals>({
        path: "/goals",
        method: "GET",
        type: "json",
        query: this.pickBy({ broadcaster_id }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get creator goals");
        return null;
      }

      return response;
    },
  };

  //
  // Guest Star
  //
  public guestStar = {
    getChannelGuestStarSettings: async ({
      broadcaster_id,
      moderator_id,
    }: TwitchEndpointRequests.GetChannelGuestStarSettings) => {
      if (
        !this.credentials.scope.includes("channel:read:guest_star") &&
        !this.credentials.scope.includes("channel:manage:guest_star") &&
        !this.credentials.scope.includes("moderator:read:guest_star") &&
        !this.credentials.scope.includes("moderator:manage:guest_star")
      ) {
        debug.error(
          "Failed to get channel guest star settings, missing scope: channel:read:guest_star, channel:manage:guest_star, moderator:read:guest_star or moderator:manage:guest_star",
        );
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.GetChannelGuestStarSettings>({
        path: "/guest_star/channel_settings",
        method: "GET",
        type: "json",
        query: this.pickBy({ broadcaster_id, moderator_id }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get channel guest star settings");
        return null;
      }

      return response;
    },

    updateChannelGuestStarSettings: async ({
      broadcaster_id,
      is_moderator_send_live_enabled,
      slot_count,
      is_browser_source_audio_enabled,
      group_layout,
      regenerate_browser_sources,
    }: TwitchEndpointRequests.UpdateChannelGuestStarSettings) => {
      if (!this.credentials.scope.includes("channel:manage:guest_star")) {
        debug.error("Failed to update channel guest star settings, missing scope: channel:manage:guest_star");
        return null;
      }

      const response = await this.twitchApi<boolean>({
        path: "/guest_star/channel_settings",
        method: "PUT",
        type: "json",
        query: this.pickBy({ broadcaster_id }),
        body: this.pickBy({
          is_moderator_send_live_enabled,
          slot_count,
          is_browser_source_audio_enabled,
          group_layout,
          regenerate_browser_sources,
        }),
      });

      if (response) {
        debug.info("Updated channel guest star settings");
      } else {
        debug.error("Failed to update channel guest star settings");
      }
      return response;
    },

    getGuestStarSession: async ({ broadcaster_id, moderator_id }: TwitchEndpointRequests.GetGuestStarSession) => {
      if (
        !this.credentials.scope.includes("channel:read:guest_star") &&
        !this.credentials.scope.includes("channel:manage:guest_star") &&
        !this.credentials.scope.includes("moderator:read:guest_star") &&
        !this.credentials.scope.includes("moderator:manage:guest_star")
      ) {
        debug.error(
          "Failed to get guest star session, missing scope: channel:read:guest_star, channel:manage:guest_star, moderator:read:guest_star or moderator:manage:guest_star",
        );
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.GetGuestStarSession>({
        path: "/guest_star/sessions",
        method: "GET",
        type: "json",
        query: this.pickBy({ broadcaster_id, moderator_id }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get guest star session");
        return null;
      }

      return response;
    },

    createGuestStarSession: async ({ broadcaster_id }: TwitchEndpointRequests.CreateGuestStarSession) => {
      if (!this.credentials.scope.includes("channel:manage:guest_star")) {
        debug.error("Failed to create guest star session, missing scope: channel:manage:guest_star");
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.CreateGuestStarSession>({
        path: "/guest_star/sessions",
        method: "POST",
        type: "json",
        body: this.pickBy({ broadcaster_id }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to create guest star session");
        return null;
      }

      return response;
    },

    endGuestStarSession: async ({ broadcaster_id, session_id }: TwitchEndpointRequests.EndGuestStarSession) => {
      if (!this.credentials.scope.includes("channel:manage:guest_star")) {
        debug.error("Failed to end guest star session, missing scope: channel:manage:guest_star");
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.EndGuestStarSession>({
        path: "/guest_star/sessions",
        method: "DELETE",
        type: "json",
        query: this.pickBy({ broadcaster_id, session_id }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to end guest star session");
        return null;
      }

      return response;
    },

    getGuestStarInvites: async ({ broadcaster_id, moderator_id, session_id }: TwitchEndpointRequests.GetGuestStarInvites) => {
      if (
        !this.credentials.scope.includes("channel:read:guest_star") &&
        !this.credentials.scope.includes("channel:manage:guest_star") &&
        !this.credentials.scope.includes("moderator:read:guest_star") &&
        !this.credentials.scope.includes("moderator:manage:guest_star")
      ) {
        debug.error(
          "Failed to get guest star invites, missing scope: channel:read:guest_star, channel:manage:guest_star, moderator:read:guest_star or moderator:manage:guest_star",
        );
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.GetGuestStarInvites>({
        path: "/guest_star/invites",
        method: "GET",
        type: "json",
        query: this.pickBy({ broadcaster_id, moderator_id, session_id }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get guest star invites");
        return null;
      }

      return response;
    },

    sendGuestStarInvite: async ({
      broadcaster_id,
      moderator_id,
      session_id,
      guest_id,
    }: TwitchEndpointRequests.SendGuestStarInvite) => {
      if (
        !this.credentials.scope.includes("channel:manage:guest_star") &&
        !this.credentials.scope.includes("moderator:manage:guest_star")
      ) {
        debug.error(
          "Failed to send guest star invite, missing scope: channel:manage:guest_star or moderator:manage:guest_star",
        );
        return null;
      }

      const response = await this.twitchApi<boolean>({
        path: "/guest_star/invites",
        method: "POST",
        type: "json",
        query: this.pickBy({
          broadcaster_id,
          moderator_id,
          session_id,
          guest_id,
        }),
      });

      if (response) {
        debug.info("Sent guest star invite");
      } else {
        debug.error("Failed to send guest star invite");
      }
      return response;
    },

    deleteGuestStarInvite: async ({
      broadcaster_id,
      moderator_id,
      session_id,
      guest_id,
    }: TwitchEndpointRequests.DeleteGuestStarInvite) => {
      if (
        !this.credentials.scope.includes("channel:manage:guest_star") &&
        !this.credentials.scope.includes("moderator:manage:guest_star")
      ) {
        debug.error(
          "Failed to delete guest star invite, missing scope: channel:manage:guest_star or moderator:manage:guest_star",
        );
        return null;
      }

      const response = await this.twitchApi<boolean>({
        path: "/guest_star/invites",
        method: "DELETE",
        type: "json",
        query: this.pickBy({
          broadcaster_id,
          moderator_id,
          session_id,
          guest_id,
        }),
      });

      if (response) {
        debug.info("Deleted guest star invite");
      } else {
        debug.error("Failed to delete guest star invite");
      }
      return response;
    },

    assignGuestStarSlot: async ({
      broadcaster_id,
      moderator_id,
      session_id,
      guest_id,
      slot_id,
    }: TwitchEndpointRequests.AssignGuestStarSlot) => {
      if (
        !this.credentials.scope.includes("channel:manage:guest_star") &&
        !this.credentials.scope.includes("moderator:manage:guest_star")
      ) {
        debug.error(
          "Failed to assign guest star slot, missing scope: channel:manage:guest_star or moderator:manage:guest_star",
        );
        return null;
      }

      const response = await this.twitchApi<boolean>({
        path: "/guest_star/slots",
        method: "POST",
        type: "json",
        query: this.pickBy({
          broadcaster_id,
          moderator_id,
          session_id,
          guest_id,
          slot_id,
        }),
      });

      if (response) {
        debug.info("Assigned guest star slot");
      } else {
        debug.error("Failed to assign guest star slot");
      }
      return response;
    },

    updateGuestStarSlot: async ({
      broadcaster_id,
      moderator_id,
      session_id,
      source_slot_id,
      destination_slot_id,
    }: TwitchEndpointRequests.UpdateGuestStarSlot) => {
      if (
        !this.credentials.scope.includes("channel:manage:guest_star") &&
        !this.credentials.scope.includes("moderator:manage:guest_star")
      ) {
        debug.error(
          "Failed to update guest star slot, missing scope: channel:manage:guest_star or moderator:manage:guest_star",
        );
        return null;
      }

      const response = await this.twitchApi<boolean>({
        path: "/guest_star/slots",
        method: "PATCH",
        type: "json",
        query: this.pickBy({
          broadcaster_id,
          moderator_id,
          session_id,
          source_slot_id,
          destination_slot_id,
        }),
      });

      if (response) {
        debug.info("Updated guest star slot");
      } else {
        debug.error("Failed to update guest star slot");
      }
      return response;
    },

    deleteGuestStarSlot: async ({
      broadcaster_id,
      moderator_id,
      session_id,
      guest_id,
      slot_id,
      should_reinvite_guest,
    }: TwitchEndpointRequests.DeleteGuestStarSlot) => {
      if (
        !this.credentials.scope.includes("channel:manage:guest_star") &&
        !this.credentials.scope.includes("moderator:manage:guest_star")
      ) {
        debug.error(
          "Failed to delete guest star slot, missing scope: channel:manage:guest_star or moderator:manage:guest_star",
        );
        return null;
      }

      const response = await this.twitchApi<boolean>({
        path: "/guest_star/slots",
        method: "DELETE",
        type: "json",
        query: this.pickBy({
          broadcaster_id,
          moderator_id,
          session_id,
          guest_id,
          slot_id,
          should_reinvite_guest,
        }),
      });

      if (response) {
        debug.info("Deleted guest star slot");
      } else {
        debug.error("Failed to delete guest star slot");
      }
      return response;
    },

    updateGuestStarSlotSettings: async ({
      broadcaster_id,
      moderator_id,
      session_id,
      slot_id,
      is_audio_enabled,
      is_video_enabled,
      is_live,
      volume,
    }: TwitchEndpointRequests.UpdateGuestStarSlotSettings) => {
      if (
        !this.credentials.scope.includes("channel:manage:guest_star") &&
        !this.credentials.scope.includes("moderator:manage:guest_star")
      ) {
        debug.error(
          "Failed to update guest star slot settings, missing scope: channel:manage:guest_star or moderator:manage:guest_star",
        );
        return null;
      }

      const response = await this.twitchApi<boolean>({
        path: "/guest_star/slot_settings",
        method: "PATCH",
        type: "json",
        query: this.pickBy({
          broadcaster_id,
          moderator_id,
          session_id,
          slot_id,
          is_audio_enabled,
          is_video_enabled,
          is_live,
          volume,
        }),
      });

      if (response) {
        debug.info("Updated guest star slot settings");
      } else {
        debug.error("Failed to update guest star slot settings");
      }
      return response;
    },
  };

  //
  // Hype Train
  //
  public hypeTrain = {
    getHypeTrainEvents: async ({ broadcaster_id, first, after }: TwitchEndpointRequests.GetHypeTrainEvents) => {
      if (!this.credentials.scope.includes("channel:read:hype_train")) {
        debug.error("Failed to get hype train events, missing scope: channel:read:hype_train");
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.GetHypeTrainEvents>({
        path: "/hypetrain/events",
        method: "GET",
        type: "json",
        query: this.pickBy({ broadcaster_id, first, after }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get hype train events");
        return null;
      }

      return response;
    },
  };

  //
  // Moderation
  //
  public moderation = {
    checkAutoModStatus: async ({ broadcaster_id, data }: TwitchEndpointRequests.CheckAutoModStatus) => {
      if (!this.credentials.scope.includes("moderation:read")) {
        debug.error("Failed to check auto mod status, missing scope: moderation:read");
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.CheckAutoModStatus>({
        path: "/moderation/enforcements/status",
        method: "POST",
        type: "json",
        query: this.pickBy({ broadcaster_id }),
        body: this.pickBy({ data }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to check auto mod status");
        return null;
      }

      return response;
    },

    manageHeldAutoModMessages: async ({ user_id, msg_id, action }: TwitchEndpointRequests.ManageHeldAutoModMessages) => {
      if (!this.credentials.scope.includes("moderator:manage:automod")) {
        debug.error("Failed to manage held auto mod messages, missing scope: moderator:manage:automod");
        return null;
      }

      const response = await this.twitchApi<boolean>({
        path: "/moderation/automod/message",
        method: "POST",
        type: "json",
        body: this.pickBy({ user_id, msg_id, action }),
      });

      if (response) {
        debug.info("Managed held auto mod messages");
      } else {
        debug.error("Failed to manage held auto mod messages");
      }
      return response;
    },

    getAutoModSettings: async ({ broadcaster_id, moderator_id }: TwitchEndpointRequests.GetAutoModSettings) => {
      if (!this.credentials.scope.includes("moderator:read:automod_settings")) {
        debug.error("Failed to get auto mod settings, missing scope: moderator:read:automod_settings");
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.GetAutoModSettings>({
        path: "/moderation/automod/settings",
        method: "GET",
        type: "json",
        query: this.pickBy({ broadcaster_id, moderator_id }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get auto mod settings");
        return null;
      }

      return response;
    },

    updateAutoModSettings: async ({ broadcaster_id, moderator_id, data }: TwitchEndpointRequests.UpdateAutoModSettings) => {
      if (!this.credentials.scope.includes("moderator:manage:automod_settings")) {
        debug.error("Failed to update auto mod settings, missing scope: moderator:manage:automod_settings");
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.UpdateAutoModSettings>({
        path: "/moderation/automod/settings",
        method: "PUT",
        type: "json",
        query: this.pickBy({ broadcaster_id, moderator_id }),
        body: this.pickBy(data),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to update auto mod settings");
        return null;
      }

      return response;
    },

    getBannedUsers: async ({ broadcaster_id, user_id, first, after, before }: TwitchEndpointRequests.GetBannedUsers) => {
      if (
        !this.credentials.scope.includes("moderation:read") &&
        !this.credentials.scope.includes("moderator:manage:banned_users")
      ) {
        debug.error("Failed to get banned users, missing scope: moderation:read or moderator:manage:banned_users");
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.GetBannedUsers>({
        path: "/moderation/banned",
        method: "GET",
        type: "json",
        query: this.pickBy({ broadcaster_id, user_id, first, after, before }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get banned users");
        return null;
      }

      return response;
    },

    banUser: async ({ broadcaster_id, moderator_id, data }: TwitchEndpointRequests.BanUser) => {
      if (!this.credentials.scope.includes("moderator:manage:banned_users")) {
        debug.error("Failed to ban user, missing scope: moderator:manage:banned_users");
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.BanUser>({
        path: "/moderation/bans",
        method: "POST",
        type: "json",
        query: this.pickBy({ broadcaster_id, moderator_id }),
        body: this.pickBy({ data }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to ban user");
        return null;
      }

      return response;
    },

    unbanUser: async ({ broadcaster_id, moderator_id, user_id }: TwitchEndpointRequests.UnbanUser) => {
      if (!this.credentials.scope.includes("moderator:manage:banned_users")) {
        debug.error("Failed to unban user, missing scope: moderator:manage:banned_users");
        return null;
      }

      const response = await this.twitchApi<boolean>({
        path: "/moderation/bans",
        method: "DELETE",
        type: "json",
        query: this.pickBy({ broadcaster_id, moderator_id, user_id }),
      });

      if (response) {
        debug.info("Unbanned user");
      } else {
        debug.error("Failed to unban user");
      }
      return response;
    },

    getUnbanRequests: async ({
      broadcaster_id,
      moderator_id,
      status,
      user_id,
      after,
      first,
    }: TwitchEndpointRequests.GetUnbanRequests) => {
      if (
        !this.credentials.scope.includes("moderator:read:unban_requests") &&
        !this.credentials.scope.includes("moderator:manage:unban_requests")
      ) {
        debug.error(
          "Failed to get unban requests, missing scope: moderator:read:unban_requests or moderator:manage:unban_requests",
        );
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.GetUnbanRequests>({
        path: "/moderation/unban_requests",
        method: "GET",
        type: "json",
        query: this.pickBy({
          broadcaster_id,
          moderator_id,
          status,
          user_id,
          after,
          first,
        }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get unban requests");
        return null;
      }

      return response;
    },

    resolveUnbanRequests: async ({
      broadcaster_id,
      moderator_id,
      unban_request_id,
      status,
      resolution_text,
    }: TwitchEndpointRequests.ResolveUnbanRequests) => {
      if (!this.credentials.scope.includes("moderator:manage:unban_requests")) {
        debug.error("Failed to resolve unban requests, missing scope: moderator:manage:unban_requests");
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.ResolveUnbanRequests>({
        path: "/moderation/unban_requests",
        method: "PATCH",
        type: "json",
        query: this.pickBy({
          broadcaster_id,
          moderator_id,
          unban_request_id,
          status,
          resolution_text,
        }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to resolve unban requests");
        return null;
      }

      return response;
    },

    getBlockedTerms: async ({ broadcaster_id, moderator_id, first, after }: TwitchEndpointRequests.GetBlockedTerms) => {
      if (
        !this.credentials.scope.includes("moderator:read:blocked_terms") &&
        !this.credentials.scope.includes("moderator:manage:blocked_terms")
      ) {
        debug.error(
          "Failed to get blocked terms, missing scope: moderator:read:blocked_terms or moderator:manage:blocked_terms",
        );
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.GetBlockedTerms>({
        path: "/moderation/blocked_terms",
        method: "GET",
        type: "json",
        query: this.pickBy({ broadcaster_id, moderator_id, first, after }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get blocked terms");
        return null;
      }

      return response;
    },

    addBlockedTerm: async ({ broadcaster_id, moderator_id, text }: TwitchEndpointRequests.AddBlockedTerm) => {
      if (!this.credentials.scope.includes("moderator:manage:blocked_terms")) {
        debug.error("Failed to add blocked term, missing scope: moderator:manage:blocked_terms");
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.AddBlockedTerm>({
        path: "/moderation/blocked_terms",
        method: "POST",
        type: "json",
        query: this.pickBy({ broadcaster_id, moderator_id }),
        body: this.pickBy({ text }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to add blocked term");
        return null;
      }

      return response;
    },

    removeBlockedTerm: async ({ broadcaster_id, moderator_id, id }: TwitchEndpointRequests.RemoveBlockedTerm) => {
      if (!this.credentials.scope.includes("moderator:manage:blocked_terms")) {
        debug.error("Failed to remove blocked term, missing scope: moderator:manage:blocked_terms");
        return null;
      }

      const response = await this.twitchApi<boolean>({
        path: "/moderation/blocked_terms",
        method: "DELETE",
        type: "json",
        query: this.pickBy({ broadcaster_id, moderator_id, id }),
      });

      if (response) {
        debug.info("Removed blocked term");
      } else {
        debug.error("Failed to remove blocked term");
      }
      return response;
    },

    deleteChatMessages: async ({ broadcaster_id, moderator_id, message_id }: TwitchEndpointRequests.DeleteChatMessages) => {
      if (!this.credentials.scope.includes("moderator:manage:chat_messages")) {
        debug.error("Failed to delete chat messages, missing scope: moderator:manage:chat_messages");
        return null;
      }

      const response = await this.twitchApi<boolean>({
        path: "/moderation/chat",
        method: "DELETE",
        type: "json",
        query: this.pickBy({ broadcaster_id, moderator_id, message_id }),
      });

      if (response) {
        debug.info("Deleted chat messages");
      } else {
        debug.error("Failed to delete chat messages");
      }
      return response;
    },

    getModeratedChannels: async ({ user_id, after, first }: TwitchEndpointRequests.GetModeratedChannels) => {
      if (!this.credentials.scope.includes("user:read:moderated_channels")) {
        debug.error("Failed to get moderated channels, missing scope: user:read:moderated_channels");
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.GetModeratedChannels>({
        path: "/moderation/channels",
        method: "GET",
        type: "json",
        query: this.pickBy({ user_id, after, first }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get moderated channels");
        return null;
      }

      return response;
    },

    getModerators: async ({ broadcaster_id, user_id, first, after }: TwitchEndpointRequests.GetModerators) => {
      if (
        !this.credentials.scope.includes("moderation:read") &&
        !this.credentials.scope.includes("channel:manage:moderators")
      ) {
        debug.error("Failed to get moderators, missing scope: moderation:read or channel:manage:moderators");
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.GetModerators>({
        path: "/moderation/moderators",
        method: "GET",
        type: "json",
        query: this.pickBy({ broadcaster_id, user_id, first, after }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get moderators");
        return null;
      }

      return response;
    },

    addChannelModerator: async ({ broadcaster_id, user_id }: TwitchEndpointRequests.AddChannelModerator) => {
      if (!this.credentials.scope.includes("channel:manage:moderators")) {
        debug.error("Failed to add channel moderator, missing scope: channel:manage:moderators");
        return null;
      }

      const response = await this.twitchApi<boolean>({
        path: "/moderation/moderators",
        method: "POST",
        type: "json",
        query: this.pickBy({ broadcaster_id, user_id }),
      });

      if (response) {
        debug.info("Added channel moderator");
      } else {
        debug.error("Failed to add channel moderator");
      }
      return response;
    },

    removeChannelModerator: async ({ broadcaster_id, user_id }: TwitchEndpointRequests.RemoveChannelModerator) => {
      if (!this.credentials.scope.includes("channel:manage:moderators")) {
        debug.error("Failed to remove channel moderator, missing scope: channel:manage:moderators");
        return null;
      }

      const response = await this.twitchApi<boolean>({
        path: "/moderation/moderators",
        method: "DELETE",
        type: "json",
        query: this.pickBy({ broadcaster_id, user_id }),
      });

      if (response) {
        debug.info("Removed channel moderator");
      } else {
        debug.error("Failed to remove channel moderator");
      }
      return response;
    },

    getVIPs: async ({ user_id, broadcaster_id, first, after }: TwitchEndpointRequests.GetVIPs) => {
      if (!this.credentials.scope.includes("channel:read:vips") && !this.credentials.scope.includes("channel:manage:vips")) {
        debug.error("Failed to get VIPs, missing scope: channel:read:vips or channel:manage:vips");
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.GetVIPs>({
        path: "/moderation/vips",
        method: "GET",
        type: "json",
        query: this.pickBy({ user_id, broadcaster_id, first, after }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get VIPs");
        return null;
      }

      return response;
    },

    addChannelVIP: async ({ user_id, broadcaster_id }: TwitchEndpointRequests.AddChannelVIP) => {
      if (!this.credentials.scope.includes("channel:manage:vips")) {
        debug.error("Failed to add channel VIP, missing scope: channel:manage:vips");
        return null;
      }

      const response = await this.twitchApi<boolean>({
        path: "/moderation/vips",
        method: "POST",
        type: "json",
        query: this.pickBy({ user_id, broadcaster_id }),
      });

      if (response) {
        debug.info("Added channel VIP");
      } else {
        debug.error("Failed to add channel VIP");
      }
      return response;
    },

    removeChannelVIP: async ({ user_id, broadcaster_id }: TwitchEndpointRequests.RemoveChannelVIP) => {
      if (!this.credentials.scope.includes("channel:manage:vips")) {
        debug.error("Failed to remove channel VIP, missing scope: channel:manage:vips");
        return null;
      }

      const response = await this.twitchApi<boolean>({
        path: "/moderation/vips",
        method: "DELETE",
        type: "json",
        query: this.pickBy({ user_id, broadcaster_id }),
      });

      if (response) {
        debug.info("Removed channel VIP");
      } else {
        debug.error("Failed to remove channel VIP");
      }
      return response;
    },

    updateShieldModeStatus: async ({
      broadcaster_id,
      moderator_id,
      is_active,
    }: TwitchEndpointRequests.UpdateShieldModeStatus) => {
      if (!this.credentials.scope.includes("moderator:manage:shield_mode")) {
        debug.error("Failed to update shield mode status, missing scope: moderator:manage:shield_mode");
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.UpdateShieldModeStatus>({
        path: "/moderation/shield_mode",
        method: "PUT",
        type: "json",
        query: this.pickBy({ broadcaster_id, moderator_id }),
        body: this.pickBy({ is_active }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to update shield mode status");
        return null;
      }

      return response;
    },

    getShieldModeStatus: async ({ broadcaster_id, moderator_id }: TwitchEndpointRequests.GetShieldModeStatus) => {
      if (
        !this.credentials.scope.includes("moderator:read:shield_mode") &&
        !this.credentials.scope.includes("moderator:manage:shield_mode")
      ) {
        debug.error(
          "Failed to get shield mode status, missing scope: moderator:read:shield_mode or moderator:manage:shield_mode",
        );
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.GetShieldModeStatus>({
        path: "/moderation/shield_mode",
        method: "GET",
        type: "json",
        query: this.pickBy({ broadcaster_id, moderator_id }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get shield mode status");
        return null;
      }

      return response;
    },
  };

  //
  // Polls
  //
  public polls = {
    getPolls: async ({ broadcaster_id, id, first, after }: TwitchEndpointRequests.GetPolls) => {
      if (!this.credentials.scope.includes("channel:read:polls") && !this.credentials.scope.includes("channel:manage:polls")) {
        debug.error("Failed to get polls, missing scope: channel:read:polls or channel:manage:polls");
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.GetPolls>({
        path: "/polls",
        method: "GET",
        type: "json",
        query: this.pickBy({ broadcaster_id, id, first, after }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get polls");
        return null;
      }

      return response;
    },

    createPoll: async ({
      broadcaster_id,
      title,
      choices,
      duration,
      channel_points_voting_enabled,
      channel_points_per_vote,
    }: TwitchEndpointRequests.CreatePoll) => {
      if (!this.credentials.scope.includes("channel:manage:polls")) {
        debug.error("Failed to create poll, missing scope: channel:manage:polls");
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.CreatePoll>({
        path: "/polls",
        method: "POST",
        type: "json",
        body: this.pickBy({
          broadcaster_id,
          title,
          choices,
          duration,
          channel_points_voting_enabled,
          channel_points_per_vote,
        }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to create poll");
        return null;
      }

      return response;
    },

    endPoll: async ({ broadcaster_id, id, status }: TwitchEndpointRequests.EndPoll) => {
      if (!this.credentials.scope.includes("channel:manage:polls")) {
        debug.error("Failed to end poll, missing scope: channel:manage:polls");
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.EndPoll>({
        path: "/polls",
        method: "PATCH",
        type: "json",
        body: this.pickBy({ broadcaster_id, id, status }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to end poll");
        return null;
      }

      return response;
    },
  };

  //
  // Predictions
  //
  public predictions = {
    getPredictions: async ({ broadcaster_id, id, first, after }: TwitchEndpointRequests.GetPredictions) => {
      if (
        !this.credentials.scope.includes("channel:read:predictions") &&
        !this.credentials.scope.includes("channel:manage:predictions")
      ) {
        debug.error("Failed to get predictions, missing scope: channel:read:predictions or channel:manage:predictions");
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.GetPredictions>({
        path: "/predictions",
        method: "GET",
        type: "json",
        query: this.pickBy({ broadcaster_id, id, first, after }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get predictions");
        return null;
      }

      return response;
    },

    createPrediction: async ({
      broadcaster_id,
      title,
      outcomes,
      prediction_window,
    }: TwitchEndpointRequests.CreatePrediction) => {
      if (!this.credentials.scope.includes("channel:manage:predictions")) {
        debug.error("Failed to create prediction, missing scope: channel:manage:predictions");
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.CreatePrediction>({
        path: "/predictions",
        method: "POST",
        type: "json",
        body: this.pickBy({
          broadcaster_id,
          title,
          outcomes,
          prediction_window,
        }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to create prediction");
        return null;
      }

      return response;
    },

    endPrediction: async ({ broadcaster_id, id, status, winning_outcome_id }: TwitchEndpointRequests.EndPrediction) => {
      if (!this.credentials.scope.includes("channel:manage:predictions")) {
        debug.error("Failed to end prediction, missing scope: channel:manage:predictions");
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.EndPrediction>({
        path: "/predictions",
        method: "PATCH",
        type: "json",
        body: this.pickBy({ broadcaster_id, id, status, winning_outcome_id }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to end prediction");
        return null;
      }

      return response;
    },
  };

  //
  // Raids
  //
  public raids = {
    startARaid: async ({ from_broadcaster_id, to_broadcaster_id }: TwitchEndpointRequests.StartARaid) => {
      if (!this.credentials.scope.includes("channel:manage:raids")) {
        debug.error("Failed to start a raid, missing scope: channel:manage:raids");
        return null;
      }

      const response = await this.twitchApi<boolean>({
        path: "/raids",
        method: "POST",
        type: "json",
        query: this.pickBy({ from_broadcaster_id, to_broadcaster_id }),
      });

      if (response) {
        debug.info("Successfully started a raid");
      } else {
        debug.error("Failed to start a raid");
      }
      return response;
    },

    cancelARaid: async ({ broadcaster_id }: TwitchEndpointRequests.CancelARaid) => {
      if (!this.credentials.scope.includes("channel:manage:raids")) {
        debug.error("Failed to cancel a raid, missing scope: channel:manage:raids");
        return null;
      }

      const response = await this.twitchApi<boolean>({
        path: "/raids",
        method: "DELETE",
        type: "json",
        query: this.pickBy({ broadcaster_id }),
      });

      if (response) {
        debug.info("Successfully cancelled a raid");
      } else {
        debug.error("Failed to cancel a raid");
      }
      return response;
    },
  };

  //
  // Schedule
  //
  public schedule = {
    getChannelStreamSchedule: async ({
      broadcaster_id,
      id,
      start_time,
      utc_offset,
      first,
      after,
    }: TwitchEndpointRequests.GetChannelStreamSchedule) => {
      const response = await this.twitchApi<TwitchEndpointResponses.GetChannelStreamSchedule>({
        path: "/schedule",
        method: "GET",
        type: "json",
        query: this.pickBy({
          broadcaster_id,
          id,
          start_time,
          utc_offset,
          first,
          after,
        }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get channel stream schedule");
        return null;
      }

      return response;
    },

    getChannelICalendar: async ({ broadcaster_id }: TwitchEndpointRequests.GetChannelICalendar) => {
      const response = await this.twitchApi<unknown>({
        path: "/schedule/icalendar",
        method: "GET",
        type: "json",
        query: this.pickBy({ broadcaster_id }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get channel iCalendar");
        return null;
      }

      return response;
    },

    updateChannelStreamSchedule: async ({
      broadcaster_id,
      is_vacation_enabled,
      vacation_start_time,
      vacation_end_time,
      timezone,
    }: TwitchEndpointRequests.UpdateChannelStreamSchedule) => {
      if (!this.credentials.scope.includes("channel:manage:schedule")) {
        debug.error("Failed to update channel stream schedule, missing scope: channel:manage:schedule");
        return null;
      }

      const response = await this.twitchApi<boolean>({
        path: "/schedule/settings",
        method: "PATCH",
        type: "json",
        query: this.pickBy({
          broadcaster_id,
          is_vacation_enabled,
          vacation_start_time,
          vacation_end_time,
          timezone,
        }),
      });

      if (response) {
        debug.info("Updated channel stream schedule");
      } else {
        debug.error("Failed to update channel stream schedule");
      }
      return response;
    },

    createChannelStreamScheduleSegment: async ({
      broadcaster_id,
      start_time,
      timezone,
      duration,
      is_recurring,
      category_id,
      title,
    }: TwitchEndpointRequests.CreateChannelStreamScheduleSegment) => {
      if (!this.credentials.scope.includes("channel:manage:schedule")) {
        debug.error("Failed to create channel stream schedule segment, missing scope: channel:manage:schedule");
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.CreateChannelStreamScheduleSegment>({
        path: "/schedule/segment",
        method: "POST",
        type: "json",
        query: this.pickBy({ broadcaster_id }),
        body: this.pickBy({
          start_time,
          timezone,
          duration,
          is_recurring,
          category_id,
          title,
        }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to create channel stream schedule segment");
        return null;
      }

      return response;
    },

    updateChannelStreamScheduleSegment: async ({
      broadcaster_id,
      id,
      start_time,
      duration,
      category_id,
      title,
      is_canceled,
      timezone,
    }: TwitchEndpointRequests.UpdateChannelStreamScheduleSegment) => {
      if (!this.credentials.scope.includes("channel:manage:schedule")) {
        debug.error("Failed to update channel stream schedule segment, missing scope: channel:manage:schedule");
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.UpdateChannelStreamScheduleSegment>({
        path: "/schedule/segment",
        method: "PATCH",
        type: "json",
        query: this.pickBy({ broadcaster_id, id }),
        body: this.pickBy({
          start_time,
          duration,
          category_id,
          title,
          is_canceled,
          timezone,
        }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to update channel stream schedule segment");
        return null;
      }

      return response;
    },

    deleteChannelStreamScheduleSegment: async ({
      broadcaster_id,
      id,
    }: TwitchEndpointRequests.DeleteChannelStreamScheduleSegment) => {
      if (!this.credentials.scope.includes("channel:manage:schedule")) {
        debug.error("Failed to delete channel stream schedule segment, missing scope: channel:manage:schedule");
        return null;
      }

      const response = await this.twitchApi<boolean>({
        path: "/schedule/segment",
        method: "DELETE",
        type: "json",
        query: this.pickBy({ broadcaster_id, id }),
      });

      if (response) {
        debug.info("Deleted channel stream schedule segment");
      } else {
        debug.error("Failed to delete channel stream schedule segment");
      }
      return response;
    },
  };

  //
  // Search
  //
  public search = {
    searchCategories: async ({ query, first, after }: TwitchEndpointRequests.SearchCategories) => {
      const response = await this.twitchApi<TwitchEndpointResponses.SearchCategories>({
        path: "/search/categories",
        method: "GET",
        type: "json",
        query: this.pickBy({ query, first, after }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to search categories");
        return null;
      }

      return response;
    },

    searchChannels: async ({ query, live_only, first, after }: TwitchEndpointRequests.SearchChannels) => {
      const response = await this.twitchApi<TwitchEndpointResponses.SearchChannels>({
        path: "/search/channels",
        method: "GET",
        type: "json",
        query: this.pickBy({ query, live_only, first, after }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to search channels");
        return null;
      }

      return response;
    },
  };

  //
  // Streams
  //
  public streams = {
    getStreamKey: async ({ broadcaster_id }: TwitchEndpointRequests.GetStreamKey) => {
      if (!this.credentials.scope.includes("channel:read:stream_key")) {
        debug.error("Failed to get stream key, missing scope: channel:read:stream_key");
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.GetStreamKey>({
        path: "/streams/key",
        method: "GET",
        type: "json",
        query: this.pickBy({ broadcaster_id }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get stream key");
        return null;
      }

      return response;
    },

    getStreams: async ({
      user_id,
      user_login,
      game_id,
      type,
      language,
      first,
      before,
      after,
    }: TwitchEndpointRequests.GetStreams) => {
      const response = await this.twitchApi<TwitchEndpointResponses.GetStreams>({
        path: "/streams",
        method: "GET",
        type: "json",
        query: this.pickBy({
          user_id,
          user_login,
          game_id,
          type,
          language,
          first,
          before,
          after,
        }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get streams");
        return null;
      }

      return response;
    },

    getFollowedStreams: async ({ user_id, first, after }: TwitchEndpointRequests.GetFollowedStreams) => {
      if (!this.credentials.scope.includes("user:read:follows")) {
        debug.error("Failed to get followed streams, missing scope: user:read:follows");
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.GetFollowedStreams>({
        path: "/streams/followed",
        method: "GET",
        type: "json",
        query: this.pickBy({ user_id, first, after }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get followed streams");
        return null;
      }

      return response;
    },

    createStreamMarker: async ({ user_id, description }: TwitchEndpointRequests.CreateStreamMarker) => {
      if (!this.credentials.scope.includes("channel:manage:broadcast")) {
        debug.error("Failed to create stream marker, missing scope: channel:manage:broadcast");
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.CreateStreamMarker>({
        path: "/streams/markers",
        method: "POST",
        type: "json",
        body: this.pickBy({ user_id, description }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to create stream marker");
        return null;
      }

      return response;
    },

    getStreamMarkers: async ({ user_id, video_id, first, before, after }: TwitchEndpointRequests.GetStreamMarkers) => {
      if (
        !this.credentials.scope.includes("user:read:broadcast") &&
        !this.credentials.scope.includes("channel:manage:broadcast")
      ) {
        debug.error("Failed to get stream markers, missing scope: user:read:broadcast or channel:manage:broadcast");
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.GetStreamMarkers>({
        path: "/streams/markers",
        method: "GET",
        type: "json",
        query: this.pickBy({ user_id, video_id, first, before, after }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get stream markers");
        return null;
      }

      return response;
    },
  };

  //
  // Subscriptions
  //
  public subscriptions = {
    getBroadcasterSubscriptions: async ({
      broadcaster_id,
      user_id,
      first,
      after,
      before,
    }: TwitchEndpointRequests.GetBroadcasterSubscriptions) => {
      if (!this.credentials.scope.includes("channel:read:subscriptions")) {
        debug.error("Failed to get broadcaster subscriptions, missing scope: channel:read:subscriptions");
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.GetBroadcasterSubscriptions>({
        path: "/subscriptions",
        method: "GET",
        type: "json",
        query: this.pickBy({
          broadcaster_id,
          user_id,
          first,
          after,
          before,
        }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get broadcaster subscriptions");
        return null;
      }

      return response;
    },

    checkUserSubscription: async ({ broadcaster_id, user_id }: TwitchEndpointRequests.CheckUserSubscription) => {
      if (!this.credentials.scope.includes("user:read:subscriptions")) {
        debug.error("Failed to check user subscription, missing scope: user:read:subscriptions");
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.CheckUserSubscription>({
        path: "/subscriptions/user",
        method: "GET",
        type: "json",
        query: this.pickBy({ broadcaster_id, user_id }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to check user subscription");
        return null;
      }

      return response;
    },
  };

  //
  // Tags
  //
  public tags = {
    getAllStreamTags: async ({ tag_id, first, after }: TwitchEndpointRequests.GetAllStreamTags) => {
      const response = await this.twitchApi<TwitchEndpointResponses.GetAllStreamTags>({
        path: "/tags/streams",
        method: "GET",
        type: "json",
        query: this.pickBy({ tag_id, first, after }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get all stream tags");
        return null;
      }

      return response;
    },

    getStreamTags: async ({ broadcaster_id }: TwitchEndpointRequests.GetStreamTags) => {
      const response = await this.twitchApi<TwitchEndpointResponses.GetStreamTags>({
        path: "/streams/tags",
        method: "GET",
        type: "json",
        query: this.pickBy({ broadcaster_id }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get stream tags");
        return null;
      }

      return response;
    },
  };

  //
  // Teams
  //
  public teams = {
    getChannelTeams: async ({ broadcaster_id }: TwitchEndpointRequests.GetChannelTeams) => {
      const response = await this.twitchApi<TwitchEndpointResponses.GetChannelTeams>({
        path: "/teams/channel",
        method: "GET",
        type: "json",
        query: this.pickBy({ broadcaster_id }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get channel teams");
        return null;
      }

      return response;
    },

    getTeams: async ({ name, id }: TwitchEndpointRequests.GetTeams) => {
      const response = await this.twitchApi<TwitchEndpointResponses.GetTeams>({
        path: "/teams",
        method: "GET",
        type: "json",
        query: this.pickBy({ name, id }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get teams");
        return null;
      }

      return response;
    },
  };

  //
  // Users
  //
  public users = {
    getUsers: async ({ id, login }: TwitchEndpointRequests.GetUsers) => {
      const response = await this.twitchApi<TwitchEndpointResponses.GetUsers>({
        path: "/users",
        method: "GET",
        type: "json",
        query: this.pickBy({ id, login }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get users");
        return null;
      }

      return response;
    },

    updateUser: async ({ description }: TwitchEndpointRequests.UpdateUser) => {
      if (!this.credentials.scope.includes("user:edit")) {
        debug.error("Failed to update user, missing scope: user:edit");
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.UpdateUser>({
        path: "/users",
        method: "PUT",
        type: "json",
        query: this.pickBy({ description }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to update user");
        return null;
      }

      return response;
    },

    getUserBlockList: async ({ broadcaster_id, first, after }: TwitchEndpointRequests.GetUserBlockList) => {
      if (!this.credentials.scope.includes("user:read:blocked_users")) {
        debug.error("Failed to get user block list, missing scope: user:read:blocked_users");
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.GetUserBlockList>({
        path: "/users/blocks",
        method: "GET",
        type: "json",
        query: this.pickBy({ broadcaster_id, first, after }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get user block list");
        return null;
      }

      return response;
    },

    blockUser: async ({ target_user_id, source_context, reason }: TwitchEndpointRequests.BlockUser) => {
      if (!this.credentials.scope.includes("user:manage:blocked_users")) {
        debug.error("Failed to block user, missing scope: user:manage:blocked_users");
        return null;
      }

      const response = await this.twitchApi<boolean>({
        path: "/users/blocks",
        method: "PUT",
        type: "json",
        query: this.pickBy({ target_user_id, source_context, reason }),
      });

      if (response) {
        debug.info("Blocked user");
      } else {
        debug.error("Failed to block user");
      }
      return response;
    },

    unblockUser: async ({ target_user_id }: TwitchEndpointRequests.UnblockUser) => {
      if (!this.credentials.scope.includes("user:manage:blocked_users")) {
        debug.error("Failed to unblock user, missing scope: user:manage:blocked_users");
        return null;
      }

      const response = await this.twitchApi<boolean>({
        path: "/users/blocks",
        method: "DELETE",
        type: "json",
        query: this.pickBy({ target_user_id }),
      });

      if (response) {
        debug.info("Unblocked user");
      } else {
        debug.error("Failed to unblock user");
      }
      return response;
    },

    getUserExtensions: async () => {
      if (!this.credentials.scope.includes("user:read:broadcast") && !this.credentials.scope.includes("user:edit:broadcast")) {
        debug.error("Failed to get user extensions, missing scope: user:read:broadcast or user:edit:broadcast");
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.GetUserExtensions>({
        path: "/users/extensions/list",
        method: "GET",
        type: "json",
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get user extensions");
        return null;
      }

      return response;
    },

    getUserActiveExtensions: async ({ user_id }: TwitchEndpointRequests.GetUserActiveExtensions) => {
      const response = await this.twitchApi<TwitchEndpointResponses.GetUserActiveExtensions>({
        path: "/users/extensions",
        method: "GET",
        type: "json",
        query: this.pickBy({ user_id }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get user active extensions");
        return null;
      }

      return response;
    },

    updateUserExtensions: async ({ data }: TwitchEndpointRequests.UpdateUserExtensions) => {
      if (!this.credentials.scope.includes("user:edit:broadcast")) {
        debug.error("Failed to update user extensions, missing scope: user:edit:broadcast");
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.UpdateUserExtensions>({
        path: "/users/extensions",
        method: "PUT",
        type: "json",
        body: this.pickBy({ data }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to update user extensions");
        return null;
      }

      return response;
    },
  };

  //
  // Videos
  //
  public videos = {
    getVideos: async ({
      id,
      user_id,
      game_id,
      language,
      period,
      sort,
      type,
      first,
      after,
      before,
    }: TwitchEndpointRequests.GetVideos) => {
      const response = await this.twitchApi<TwitchEndpointResponses.GetVideos>({
        path: "/videos",
        method: "GET",
        type: "json",
        query: this.pickBy({
          id,
          user_id,
          game_id,
          language,
          period,
          sort,
          type,
          first,
          after,
          before,
        }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to get videos");
        return null;
      }

      return response;
    },

    deleteVideos: async ({ id }: TwitchEndpointRequests.DeleteVideos) => {
      if (!this.credentials.scope.includes("channel:manage:videos")) {
        debug.error("Failed to delete videos, missing scope: channel:manage:videos");
        return null;
      }

      const response = await this.twitchApi<TwitchEndpointResponses.DeleteVideos>({
        path: "/videos",
        method: "DELETE",
        type: "json",
        query: this.pickBy({ id }),
      });

      if ((typeof response === "boolean" && !response) || !response) {
        debug.error("Failed to delete videos");
        return null;
      }

      return response;
    },
  };

  //
  // Whispers
  //
  public whispers = {
    sendWhisper: async ({ from_user_id, to_user_id, message }: TwitchEndpointRequests.SendWhisper) => {
      if (!this.credentials.scope.includes("user:manage:whispers")) {
        debug.error("Failed to send whisper, missing scope: user:manage:whispers");
        return null;
      }

      const response = await this.twitchApi<boolean>({
        path: "/whispers",
        method: "POST",
        type: "json",
        query: this.pickBy({ from_user_id, to_user_id }),
        body: this.pickBy({ message }),
      });

      if (response) {
        debug.info("Sent whisper");
      } else {
        debug.error("Failed to send whisper");
      }
      return response;
    },
  };
}
