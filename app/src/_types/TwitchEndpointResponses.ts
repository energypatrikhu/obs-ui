import type { SubscriptionTypes } from "#types/TwitchApi";

export interface StartCommercial {
  data: Array<{
    length: number;
    message: string;
    retry_after: number;
  }>;
}

export interface GetAdSchedule {
  data: Array<{
    snooze_count: number;
    snooze_refresh_at: string;
    next_ad_at: string;
    duration: number;
    last_ad_at: string;
    preroll_free_time: number;
  }>;
}

export interface SnoozeNextAd {
  data: Array<{
    snooze_count: number;
    snooze_refresh_at: string;
    next_ad_at: string;
  }>;
}

export interface GetExtensionAnalytics {
  data: Array<{
    extension_id: string;
    URL: string;
    type: string;
    date_range: {
      started_at: string;
      ended_at: string;
    };
  }>;
  pagination: {
    cursor: string;
  };
}

export interface GetGameAnalytics {
  data: Array<{
    game_id: string;
    URL: string;
    type: string;
    date_range: {
      started_at: string;
      ended_at: string;
    };
  }>;
  pagination: {
    cursor: string;
  };
}

export interface GetBitsLeaderboard {
  data: Array<{
    user_id: string;
    user_login: string;
    user_name: string;
    rank: number;
    score: number;
  }>;
  date_range: {
    started_at: string;
    ended_at: string;
  };
  total: number;
}

export interface GetCheermotes {
  data: Array<{
    prefix: string;
    tiers: Array<{
      min_bits: number;
      id: "1" | "100" | "500" | "1000" | "5000" | "10000" | "100000";
      color: string;
      images: {
        can_cheer: boolean;
        show_in_bits_card: boolean;
      };
    }>;
    type: "global_first_party" | "global_third_party" | "channel_custom" | "display_only" | "sponsored";
    order: number;
    last_updated: string;
    is_charitable: boolean;
  }>;
}

export interface GetExtensionTransactions {
  data: Array<{
    id: string;
    timestamp: string;
    broadcaster_id: string;
    broadcaster_login: string;
    broadcaster_name: string;
    user_id: string;
    user_login: string;
    user_name: string;
    product_type: "BITS_IN_EXTENSION";
    product_data: {
      sku: string;
      domain: string;
      cost: {
        amount: number;
        type: "bits";
      };
      inDevelopment: boolean;
      displayName: string;
      expiration: string;
      broadcast: boolean;
    };
  }>;
  pagination: {
    cursor: string;
  };
}

export interface GetChannelInformation {
  data: Array<{
    broadcaster_id: string;
    broadcaster_login: string;
    broadcaster_name: string;
    broadcaster_language: string;
    game_name: string;
    game_id: string;
    title: string;
    delay: number;
    tags: Array<string>;
    content_classification_labels: Array<string>;
    is_branded_content: boolean;
  }>;
}

export interface GetChannelEditors {
  data: Array<{
    user_id: string;
    user_name: string;
    created_at: string;
  }>;
}

export interface GetFollowedChannels {
  data: Array<{
    broadcaster_id: string;
    broadcaster_login: string;
    broadcaster_name: string;
    followed_at: string;
  }>;
  pagination: {
    cursor: string;
  };
  total: number;
}

export interface GetChannelFollowers {
  data: Array<{
    followed_at: string;
    user_id: string;
    user_login: string;
    user_name: string;
  }>;
  pagination: {
    cursor: string;
  };
  total: number;
}

export interface CreateCustomRewards {
  data: Array<{
    broadcaster_id: string;
    broadcaster_login: string;
    broadcaster_name: string;
    id: string;
    title: string;
    prompt: string;
    cost: number;
    image: {
      url_1x: string;
      url_2x: string;
      url_4x: string;
    };
    default_image: {
      url_1x: string;
      url_2x: string;
      url_4x: string;
    };
    background_color: string;
    is_enabled: boolean;
    is_user_input_required: boolean;
    max_per_stream_setting: {
      is_enabled: boolean;
      max_per_stream: number;
    };
    max_per_user_per_stream_setting: {
      is_enabled: boolean;
      max_per_user_per_stream: number;
    };
    global_cooldown_setting: {
      is_enabled: boolean;
      global_cooldown_seconds: number;
    };
    is_paused: boolean;
    is_in_stock: boolean;
    should_redemptions_skip_request_queue: boolean;
    redemptions_redeemed_current_stream: number;
    cooldown_expires_at: string;
  }>;
}

export interface GetCustomReward {
  data: Array<{
    broadcaster_id: string;
    broadcaster_login: string;
    broadcaster_name: string;
    id: string;
    title: string;
    prompt: string;
    cost: number;
    image: {
      url_1x: string;
      url_2x: string;
      url_4x: string;
    };
    default_image: {
      url_1x: string;
      url_2x: string;
      url_4x: string;
    };
    background_color: string;
    is_enabled: boolean;
    is_user_input_required: boolean;
    max_per_stream_setting: {
      is_enabled: boolean;
      max_per_stream: number;
    };
    max_per_user_per_stream_setting: {
      is_enabled: boolean;
      max_per_user_per_stream: number;
    };
    global_cooldown_setting: {
      is_enabled: boolean;
      global_cooldown_seconds: number;
    };
    is_paused: boolean;
    is_in_stock: boolean;
    should_redemptions_skip_request_queue: boolean;
    redemptions_redeemed_current_stream: number;
    cooldown_expires_at: string;
  }>;
}

export interface GetCustomRewardRedemption {
  data: Array<{
    broadcaster_id: string;
    broadcaster_login: string;
    broadcaster_name: string;
    id: string;
    user_login: string;
    user_id: string;
    user_name: string;
    user_input: string;
    status: "CANCELED" | "FULFILLED" | "UNFULFILLED";
    redeemed_at: string;
    reward: {
      id: string;
      title: string;
      prompt: string;
      cost: number;
    };
  }>;
}

export interface UpdateCustomReward {
  data: Array<{
    broadcaster_id: string;
    broadcaster_login: string;
    broadcaster_name: string;
    id: string;
    title: string;
    prompt: string;
    cost: number;
    image: {
      url_1x: string;
      url_2x: string;
      url_4x: string;
    };
    default_image: {
      url_1x: string;
      url_2x: string;
      url_4x: string;
    };
    background_color: string;
    is_enabled: boolean;
    is_user_input_required: boolean;
    max_per_stream_setting: {
      is_enabled: boolean;
      max_per_stream: number;
    };
    max_per_user_per_stream_setting: {
      is_enabled: boolean;
      max_per_user_per_stream: number;
    };
    global_cooldown_setting: {
      is_enabled: boolean;
      global_cooldown_seconds: number;
    };
    is_paused: boolean;
    is_in_stock: boolean;
    should_redemptions_skip_request_queue: boolean;
    redemptions_redeemed_current_stream: number;
    cooldown_expires_at: string;
  }>;
}

export interface UpdateRedemptionStatus {
  data: Array<{
    broadcaster_id: string;
    broadcaster_login: string;
    broadcaster_name: string;
    id: string;
    user_id: string;
    user_name: string;
    user_login: string;
    reward: {
      id: string;
      title: string;
      prompt: string;
      cost: number;
    };
    user_input: string;
    status: "CANCELED" | "FULFILLED" | "UNFULFILLED";
    redeemed_at: string;
  }>;
}

export interface GetCharityCampaign {
  data: Array<{
    id: string;
    broadcaster_id: string;
    broadcaster_login: string;
    broadcaster_name: string;
    charity_name: string;
    charity_description: string;
    charity_logo: string;
    charity_website: string;
    current_amount: {
      value: number;
      decimal_places: number;
      currency: string;
    };
    target_amount: {
      value: number;
      decimal_places: number;
      currency: string;
    };
  }>;
}

export interface GetCharityCampaignDonations {
  data: Array<{
    id: string;
    campaign_id: string;
    user_id: string;
    user_login: string;
    user_name: string;
    amount: {
      value: number;
      decimal_places: number;
      currency: string;
    };
  }>;
  pagination: {
    cursor: string;
  };
}

export interface GetChatters {
  data: Array<{
    user_id: string;
    user_login: string;
    user_name: string;
  }>;
  pagination: {
    cursor: string;
  };
  total: number;
}

export interface GetChannelEmotes {
  data: Array<{
    id: string;
    name: string;
    images: {
      url_1x: string;
      url_2x: string;
      url_4x: string;
    };
    tier: string;
    emote_type: "bitstier" | "follower" | "subscriptions";
    emote_set_id: string;
    format: "animated" | "static";
    scale: "1.0" | "2.0" | "3.0";
    theme_mode: "dark" | "light";
  }>;
  template: string;
}

export interface GetGlobalEmotes {
  data: Array<{
    id: string;
    name: string;
    images: {
      url_1x: string;
      url_2x: string;
      url_4x: string;
    };
    format: "animated" | "static";
    scale: "1.0" | "2.0" | "3.0";
    theme_mode: "dark" | "light";
  }>;
  template: string;
}

export interface GetEmoteSets {
  data: Array<{
    id: string;
    name: string;
    images: {
      url_1x: string;
      url_2x: string;
      url_4x: string;
    };
    emote_type: "bitstier" | "follower" | "subscriptions";
    emote_set_id: string;
    owner_id: string;
    format: "animated" | "static";
    scale: "1.0" | "2.0" | "3.0";
    theme_mode: "dark" | "light";
  }>;
  template: string;
}

export interface GetChannelChatBadges {
  data: Array<{
    set_id: string;
    versions: Array<{
      id: string;
      image_url_1x: string;
      image_url_2x: string;
      image_url_4x: string;
      title: string;
      description: string;
      click_action: string;
      click_url: string;
    }>;
  }>;
}

export interface GetGlobalChatBadges {
  data: Array<{
    set_id: string;
    versions: Array<{
      id: string;
      image_url_1x: string;
      image_url_2x: string;
      image_url_4x: string;
      title: string;
      description: string;
      click_action: string;
      click_url: string;
    }>;
  }>;
}

export interface GetChatSettings {
  data: Array<{
    broadcaster_id: string;
    emote_mode: boolean;
    follower_mode: boolean;
    follower_mode_duration: number;
    moderator_id: string;
    non_moderator_chat_delay: boolean;
    non_moderator_chat_delay_duration: number;
    slow_mode: boolean;
    slow_mode_wait_time: number;
    subscriber_mode: boolean;
    unique_chat_mode: boolean;
  }>;
}

export interface GetUserEmotes {
  data: Array<{
    id: string;
    name: string;
    emote_type:
      | "none"
      | "bitstier"
      | "follower"
      | "subscriptions"
      | "channelpoints"
      | "rewards"
      | "hypetrain"
      | "prime"
      | "turbo"
      | "smilies"
      | "globals"
      | "owl2019"
      | "twofactor"
      | "limitedtime";
    emote_set_id: string;
    owner_id: string;
    format: "animated" | "static";
    scale: "1.0" | "2.0" | "3.0";
    theme_mode: "dark" | "light";
  }>;
  template: string;
  pagination: {
    cursor: string;
  };
}

export interface UpdateChatSettings {
  data: Array<{
    broadcaster_id: string;
    emote_mode: boolean;
    follower_mode: boolean;
    follower_mode_duration: number;
    moderator_id: string;
    non_moderator_chat_delay: boolean;
    non_moderator_chat_delay_duration: number;
    slow_mode: boolean;
    slow_mode_wait_time: number;
    subscriber_mode: boolean;
    unique_chat_mode: boolean;
  }>;
}

export interface SendChatMessage {
  data: Array<{
    message_id: string;
    is_sent: boolean;
    drop_reason: {
      code: string;
      message: string;
    };
  }>;
}

export interface GetUserChatColor {
  data: Array<{
    user_id: string;
    user_login: string;
    user_name: string;
    color: string;
  }>;
}

export interface CreateClip {
  edit_url: string;
  id: string;
}

export interface GetClips {
  data: Array<{
    id: string;
    url: string;
    embed_url: string;
    broadcaster_id: string;
    broadcaster_name: string;
    creator_id: string;
    creator_name: string;
    video_id: string;
    game_id: string;
    language: string;
    title: string;
    view_count: number;
    created_at: string;
    thumbnail_url: string;
    duration: number;
    vod_offset: number;
    is_featured: boolean;
  }>;
  pagination: {
    cursor: string;
  };
}

export interface GetConduits {
  data: Array<{
    id: string;
    shard_count: number;
  }>;
}

export interface CreateConduits {
  data: Array<{
    id: string;
    shard_count: number;
  }>;
}

export interface UpdateConduits {
  data: Array<{
    id: string;
    shard_count: number;
  }>;
}

export interface GetConduitShards {
  data: Array<{
    id: string;
    status:
      | "enabled"
      | "webhook_callback_verification_pending"
      | "webhook_callback_verification_failed"
      | "notification_failures_exceeded"
      | "websocket_disconnected"
      | "websocket_failed_ping_pong"
      | "websocket_received_inbound_traffic"
      | "websocket_internal_error"
      | "websocket_network_timeout"
      | "websocket_network_error"
      | "websocket_failed_to_reconnect";
    transport:
      | {
          method: "webhook";
          callback: string;
        }
      | {
          method: "websocket";
          session_id: string;
          connected_at: string;
          disconnected_at: string;
        };
  }>;
  pagination: {
    cursor: string;
  };
}

export interface UpdateConduitShards {
  data: Array<{
    id: string;
    status:
      | "enabled"
      | "webhook_callback_verification_pending"
      | "webhook_callback_verification_failed"
      | "notification_failures_exceeded"
      | "websocket_disconnected"
      | "websocket_failed_ping_pong"
      | "websocket_received_inbound_traffic"
      | "websocket_internal_error"
      | "websocket_network_timeout"
      | "websocket_network_error"
      | "websocket_failed_to_reconnect";
    transport:
      | {
          method: "webhook";
          callback: string;
        }
      | {
          method: "websocket";
          session_id: string;
          connected_at: string;
          disconnected_at: string;
        };
  }>;
  errors: Array<{
    id: string;
    message:
      | "The length of the string in the secret field is not valid."
      | "The URL in the transport's callback field is not valid. The URL must use the HTTPS protocol and the 443 port number."
      | "The value specified in the method field is not valid."
      | "The callback field is required if you specify the webhook transport method."
      | "The session_id field is required if you specify the WebSocket transport method."
      | "The websocket session is not connected."
      | "The shard id is outside of the conduit’s range.";
    code: string;
  }>;
}

export interface GetContentClassificationLabels {
  data: Array<{
    content_classification_labels: Array<{
      id: string;
      description: string;
      name: string;
    }>;
  }>;
}

export interface GetDropsEntitlements {
  data: Array<{
    id: string;
    benefit_id: string;
    timestamp: string;
    user_id: string;
    game_id: string;
    fulfillment_status: "CLAIMED" | "FULFILLED";
    last_updated: string;
  }>;
  pagination: {
    cursor: string;
  };
}

export interface UpdateDropsEntitlements {
  data: Array<{
    status: "INVALID_ID" | "NOT_FOUND" | "SUCCESS" | "UNAUTHORIZED" | "UPDATE_FAILED";
    ids: Array<string>;
  }>;
}

export interface GetExtensionConfigurationSegment {
  data: Array<{
    segment: "broadcaster" | "developer" | "global";
    broadcaster_id: string;
    content: string;
    version: string;
  }>;
}

export interface GetExtensionLiveChannels {
  data: Array<{
    broadcaster_id: string;
    broadcaster_name: string;
    game_name: string;
    game_id: string;
    title: string;
  }>;
  pagination: string;
}

export interface GetExtensionSecrets {
  data: Array<{
    format_version: number;
    secrets: Array<{
      content: string;
      active_at: string;
      expires_at: string;
    }>;
  }>;
}

export interface CreateExtensionSecret {
  data: Array<{
    format_version: number;
    secrets: Array<{
      content: string;
      active_at: string;
      expires_at: string;
    }>;
  }>;
}

export interface GetExtensions {
  data: Array<{
    author_name: string;
    bits_enabled: boolean;
    can_install: boolean;
    configuration_location: "hosted" | "custom" | "none";
    description: string;
    eula_tos_url: string;
    has_chat_support: boolean;
    icon_url: string;
    icon_urls: { [key: string]: string };
    id: string;
    name: string;
    privacy_policy_url: string;
    request_identity_link: boolean;
    screenshot_urls: Array<string>;
    state:
      | "Approved"
      | "AssetsUploaded"
      | "Deleted"
      | "Deprecated"
      | "InReview"
      | "InTest"
      | "PendingAction"
      | "Rejected"
      | "Released";
    subscriptions_support_level: "none" | "optional";
    summary: string;
    support_email: string;
    version: string;
    viewer_summary: string;
    views: {
      mobile: {
        viewer_url: string;
      };
      panel: {
        viewer_url: string;
        height: number;
        can_link_external_content: boolean;
      };
      video_overlay: {
        viewer_url: string;
        can_link_external_content: boolean;
      };
      component: {
        viewer_url: string;
        aspect_ratio_x: number;
        aspect_ratio_y: number;
        autoscale: boolean;
        scale_pixels: number;
        target_height: number;
        can_link_external_content: boolean;
      };
      config: {
        viewer_url: string;
        can_link_external_content: boolean;
      };
    };
    allowlisted_config_urls: Array<string>;
    allowlisted_panel_urls: Array<string>;
  }>;
}

export interface GetReleasedExtensions {
  data: Array<{
    author_name: string;
    bits_enabled: boolean;
    can_install: boolean;
    configuration_location: "hosted" | "custom" | "none";
    description: string;
    eula_tos_url: string;
    has_chat_support: boolean;
    icon_url: string;
    icon_urls: { [key: string]: string };
    id: string;
    name: string;
    privacy_policy_url: string;
    request_identity_link: boolean;
    screenshot_urls: Array<string>;
    state:
      | "Approved"
      | "AssetsUploaded"
      | "Deleted"
      | "Deprecated"
      | "InReview"
      | "InTest"
      | "PendingAction"
      | "Rejected"
      | "Released";
    subscriptions_support_level: "none" | "optional";
    summary: string;
    support_email: string;
    version: string;
    viewer_summary: string;
    views: {
      mobile: {
        viewer_url: string;
      };
      panel: {
        viewer_url: string;
        height: number;
        can_link_external_content: boolean;
      };
      video_overlay: {
        viewer_url: string;
        can_link_external_content: boolean;
      };
      component: {
        viewer_url: string;
        aspect_ratio_x: number;
        aspect_ratio_y: number;
        autoscale: boolean;
        scale_pixels: number;
        target_height: number;
        can_link_external_content: boolean;
      };
      config: {
        viewer_url: string;
        can_link_external_content: boolean;
      };
    };
    allowlisted_config_urls: Array<string>;
    allowlisted_panel_urls: Array<string>;
  }>;
}

export interface GetExtensionBitsProducts {
  data: Array<{
    sku: string;
    cost: {
      amount: number;
      type: "bits";
    };
    in_development: boolean;
    display_name: string;
    expiration: string;
    is_broadcast: boolean;
  }>;
}

export interface UpdateExtensionBitsProduct {
  data: Array<{
    sku: string;
    cost: {
      amount: number;
      type: "bits";
    };
    in_development: boolean;
    display_name: string;
    expiration: string;
    is_broadcast: boolean;
  }>;
}

export interface CreateEventSubSubscription {
  data: Array<{
    id: string;
    status: "enabled" | "webhook_callback_verification_pending";
    type: SubscriptionTypes;
    version: string;
    condition: { [key: string]: string };
    created_at: string;
    transport:
      | {
          method: "webhook";
          callback: string;
        }
      | {
          method: "websocket";
          session_id: string;
          connected_at: string;
        }
      | {
          method: "conduit";
          conduit_id: string;
        };
    cost: number;
  }>;
  total: number;
  total_cost: number;
  max_total_cost: number;
}

export interface GetEventSubSubscriptions {
  data: Array<{
    id: string;
    status:
      | "enabled"
      | "webhook_callback_verification_pending"
      | "webhook_callback_verification_failed"
      | "notification_failures_exceeded"
      | "authorization_revoked"
      | "moderator_removed"
      | "user_removed"
      | "version_removed"
      | "beta_maintenance"
      | "websocket_disconnected"
      | "websocket_failed_ping_pong"
      | "websocket_received_inbound_traffic"
      | "websocket_connection_unused"
      | "websocket_internal_error"
      | "websocket_network_timeout"
      | "websocket_network_error";
    type: SubscriptionTypes;
    version: string;
    condition: { [key: string]: string };
    created_at: string;
    transport:
      | {
          method: "webhook";
          callback: string;
        }
      | {
          method: "websocket";
          session_id: string;
          connected_at: string;
          disconnected_at: string;
        };
    cost: number;
  }>;
  total: number;
  total_cost: number;
  max_total_cost: number;
  pagination: {
    cursor: string;
  };
}

export interface GetTopGames {
  data: Array<{
    id: string;
    name: string;
    box_art_url: string;
    igdb_id: string;
  }>;
  pagination: {
    cursor: string;
  };
}

export interface GetGames {
  data: Array<{
    id: string;
    name: string;
    box_art_url: string;
    igdb_id: string;
  }>;
}

export interface GetCreatorGoals {
  data: Array<{
    id: string;
    broadcaster_id: string;
    broadcaster_name: string;
    broadcaster_login: string;
    type: "follower" | "subscription" | "subscription_count" | "new_subscription" | "new_subscription_count";
    description: string;
    current_amount: number;
    target_amount: number;
    created_at: string;
  }>;
}

export interface GetChannelGuestStarSettings {
  is_moderator_send_live_enabled: boolean;
  slot_count: number;
  is_browser_source_audio_enabled: boolean;
  group_layout: "TILED_LAYOUT" | "SCREENSHARE_LAYOUT";
  browser_source_token: string;
}

export interface GetGuestStarSession {
  data: Array<{
    id: string;
    guests: Array<{
      slot_id: number | "SCREENSHARE";
      is_live: boolean;
      user_id: string;
      user_display_name: string;
      user_login: string;
      volume: number;
      assigned_at: string;
      audio_settings: {
        is_host_enabled: boolean;
        is_guest_enabled: boolean;
        is_available: boolean;
      };
      video_settings: {
        is_host_enabled: boolean;
        is_guest_enabled: boolean;
        is_available: boolean;
      };
    }>;
  }>;
}

export interface CreateGuestStarSession {
  data: Array<{
    id: string;
    guests: Array<{
      slot_id: number | "SCREENSHARE";
      is_live: boolean;
      user_id: string;
      user_display_name: string;
      user_login: string;
      volume: number;
      assigned_at: string;
      audio_settings: {
        is_host_enabled: boolean;
        is_guest_enabled: boolean;
        is_available: boolean;
      };
      video_settings: {
        is_host_enabled: boolean;
        is_guest_enabled: boolean;
        is_available: boolean;
      };
    }>;
  }>;
}

export interface EndGuestStarSession {
  data: Array<{
    id: string;
    guests: Array<{
      slot_id: number | "SCREENSHARE";
      is_live: boolean;
      user_id: string;
      user_display_name: string;
      user_login: string;
      volume: number;
      assigned_at: string;
      audio_settings: {
        is_host_enabled: boolean;
        is_guest_enabled: boolean;
        is_available: boolean;
      };
      video_settings: {
        is_host_enabled: boolean;
        is_guest_enabled: boolean;
        is_available: boolean;
      };
    }>;
  }>;
}

export interface GetGuestStarInvites {
  data: Array<{
    user_id: string;
    invited_at: string;
    status: "INVITED" | "ACCEPTED" | "READY";
    is_video_enabled: boolean;
    is_audio_enabled: boolean;
    is_video_available: boolean;
    is_audio_available: boolean;
  }>;
}

export interface GetHypeTrainEvents {
  data: Array<{
    id: string;
    event_type: string;
    event_timestamp: string;
    version: string;
    event_data: {
      broadcaster_id: string;
      cooldown_end_time: string;
      expires_at: string;
      goal: number;
      id: string;
      last_contribution: {
        total: number;
        type: "BITS" | "SUBS" | "OTHER";
        user: string;
      };
      level: number;
      started_at: string;
      top_contributions: Array<{
        total: number;
        type: "BITS" | "SUBS" | "OTHER";
        user: string;
      }>;
      total: number;
    };
  }>;
  pagination: {
    cursor: string;
  };
}

export interface CheckAutoModStatus {
  data: Array<{
    msg_id: string;
    is_permitted: boolean;
  }>;
}

export interface GetAutoModSettings {
  data: Array<{
    broadcaster_id: string;
    moderator_id: string;
    overall_level: number;
    disability: number;
    aggression: number;
    sexuality_sex_or_gender: number;
    misogyny: number;
    bullying: number;
    swearing: number;
    race_ethnicity_or_religion: number;
    sex_based_terms: number;
  }>;
}

export interface UpdateAutoModSettings {
  data: Array<{
    broadcaster_id: string;
    moderator_id: string;
    overall_level: number;
    disability: number;
    aggression: number;
    sexuality_sex_or_gender: number;
    misogyny: number;
    bullying: number;
    swearing: number;
    race_ethnicity_or_religion: number;
    sex_based_terms: number;
  }>;
}

export interface GetBannedUsers {
  data: Array<{
    user_id: string;
    user_login: string;
    user_name: string;
    expires_at: string;
    created_at: string;
    reason: string;
    moderator_id: string;
    moderator_login: string;
    moderator_name: string;
  }>;
  pagination: {
    cursor: string;
  };
}

export interface BanUser {
  data: Array<{
    broadcaster_id: string;
    moderator_id: string;
    user_id: string;
    created_at: string;
    end_time: string;
  }>;
}

export interface GetUnbanRequests {
  data: Array<{
    id: string;
    broadcaster_id: string;
    broadcaster_name: string;
    broadcaster_login: string;
    moderator_id: string;
    moderator_login: string;
    moderator_name: string;
    user_id: string;
    user_login: string;
    user_name: string;
    text: string;
    status: "pending" | "approved" | "denied" | "acknowledged" | "canceled";
    created_at: string;
    resolved_at: string;
    resolution_text: string;
  }>;
  pagination: {
    cursor: string;
  };
}

export interface ResolveUnbanRequests {
  data: Array<{
    id: string;
    broadcaster_id: string;
    broadcaster_login: string;
    broadcaster_name: string;
    moderator_id: string;
    moderator_login: string;
    moderator_name: string;
    user_id: string;
    user_login: string;
    user_name: string;
    text: string;
    status: "approved" | "denied";
    created_at: string;
    resolved_at: string;
    resolution_text: string;
  }>;
}

export interface GetBlockedTerms {
  data: Array<{
    broadcaster_id: string;
    moderator_id: string;
    id: string;
    text: string;
    created_at: string;
    updated_at: string;
    expires_at: string;
  }>;
  pagination: {
    cursor: string;
  };
}

export interface AddBlockedTerm {
  data: Array<{
    broadcaster_id: string;
    moderator_id: string;
    id: string;
    text: string;
    created_at: string;
    updated_at: string;
    expires_at: string;
  }>;
}

export interface GetModeratedChannels {
  data: Array<{
    broadcaster_id: string;
    broadcaster_login: string;
    broadcaster_name: string;
  }>;
  pagination: {
    cursor: string;
  };
}

export interface GetModerators {
  data: Array<{
    user_id: string;
    user_login: string;
    user_name: string;
  }>;
  pagination: {
    cursor: string;
  };
}

export interface GetVIPs {
  data: Array<{
    user_id: string;
    user_name: string;
    user_login: string;
  }>;
  pagination: {
    cursor: string;
  };
}

export interface UpdateShieldModeStatus {
  data: Array<{
    is_active: boolean;
    moderator_id: string;
    moderator_login: string;
    moderator_name: string;
    last_activated_at: string;
  }>;
}

export interface GetShieldModeStatus {
  data: Array<{
    is_active: boolean;
    moderator_id: string;
    moderator_login: string;
    moderator_name: string;
    last_activated_at: string;
  }>;
}

export interface GetPolls {
  data: Array<{
    id: string;
    broadcaster_id: string;
    broadcaster_name: string;
    broadcaster_login: string;
    title: string;
    choices: Array<{
      id: string;
      title: string;
      votes: number;
      channel_points_votes: number;
      bits_votes: number;
    }>;
    bits_voting_enabled: boolean;
    bits_per_vote: number;
    channel_points_voting_enabled: boolean;
    channel_points_per_vote: number;
    status: "ACTIVE" | "COMPLETED" | "TERMINATED" | "ARCHIVED" | "MODERATED" | "INVALID";
    duration: number;
    started_at: string;
    ended_at: string;
  }>;
  pagination: {
    cursor: string;
  };
}

export interface CreatePoll {
  data: Array<{
    id: string;
    broadcaster_id: string;
    broadcaster_name: string;
    broadcaster_login: string;
    title: string;
    choices: Array<{
      id: string;
      title: string;
      votes: number;
      channel_points_votes: number;
      bits_votes: number;
    }>;
    bits_voting_enabled: boolean;
    bits_per_vote: number;
    channel_points_voting_enabled: boolean;
    channel_points_per_vote: number;
    status: "ACTIVE" | "COMPLETED" | "TERMINATED" | "ARCHIVED" | "MODERATED" | "INVALID";
    duration: number;
    started_at: string;
    ended_at: string;
  }>;
}

export interface EndPoll {
  data: Array<{
    id: string;
    broadcaster_id: string;
    broadcaster_name: string;
    broadcaster_login: string;
    title: string;
    choices: Array<{
      id: string;
      title: string;
      votes: number;
      channel_points_votes: number;
      bits_votes: number;
    }>;
    bits_voting_enabled: boolean;
    bits_per_vote: number;
    channel_points_voting_enabled: boolean;
    channel_points_per_vote: number;
    status: "ACTIVE" | "COMPLETED" | "TERMINATED" | "ARCHIVED" | "MODERATED" | "INVALID";
    duration: number;
    started_at: string;
    ended_at: string;
  }>;
}

export interface GetPredictions {
  data: Array<{
    id: string;
    broadcaster_id: string;
    broadcaster_name: string;
    broadcaster_login: string;
    title: string;
    winning_outcome_id: string;
    outcomes: Array<{
      id: string;
      title: string;
      users: number;
      channel_points: number;
      top_predictors: Array<{
        user_id: string;
        user_name: string;
        user_login: string;
        channel_points_used: number;
        channel_points_won: number;
      }>;
      color: "BLUE" | "PINK";
    }>;
    prediction_window: number;
    status: "ACTIVE" | "CANCELED" | "LOCKED" | "RESOLVED";
    created_at: string;
    ended_at: string;
    locked_at: string;
  }>;
  pagination: {
    cursor: string;
  };
}

export interface CreatePrediction {
  data: Array<{
    id: string;
    broadcaster_id: string;
    broadcaster_name: string;
    broadcaster_login: string;
    title: string;
    winning_outcome_id: string;
    outcomes: Array<{
      id: string;
      title: string;
      users: number;
      channel_points: number;
      top_predictors: Array<{
        user_id: string;
        user_name: string;
        user_login: string;
        channel_points_used: number;
        channel_points_won: number;
      }>;
      color: "BLUE" | "PINK";
    }>;
    prediction_window: number;
    status: "ACTIVE" | "CANCELED" | "LOCKED" | "RESOLVED";
    created_at: string;
    ended_at: string;
    locked_at: string;
  }>;
}

export interface EndPrediction {
  data: Array<{
    id: string;
    broadcaster_id: string;
    broadcaster_name: string;
    broadcaster_login: string;
    title: string;
    winning_outcome_id: string;
    outcomes: Array<{
      id: string;
      title: string;
      users: number;
      channel_points: number;
      top_predictors: Array<{
        user_id: string;
        user_name: string;
        user_login: string;
        channel_points_used: number;
        channel_points_won: number;
      }>;
      color: "BLUE" | "PINK";
    }>;
    prediction_window: number;
    status: "ACTIVE" | "CANCELED" | "LOCKED" | "RESOLVED";
    created_at: string;
    ended_at: string;
    locked_at: string;
  }>;
}

export interface StartARaid {
  data: Array<{
    created_at: string;
    is_mature: boolean;
  }>;
}

export interface GetChannelStreamSchedule {
  data: {
    segments: Array<{
      id: string;
      start_time: string;
      end_time: string;
      title: string;
      canceled_until: string;
      category: {
        id: string;
        name: string;
      };
      is_recurring: boolean;
    }>;
    broadcaster_id: string;
    broadcaster_name: string;
    broadcaster_login: string;
    vacation: {
      start_time: string;
      end_time: string;
    };
  };
  pagination: {
    cursor: string;
  };
}

export interface CreateChannelStreamScheduleSegment {
  data: {
    segments: Array<{
      id: string;
      start_time: string;
      end_time: string;
      title: string;
      canceled_until: string;
      category: {
        id: string;
        name: string;
      };
      is_recurring: boolean;
    }>;
    broadcaster_id: string;
    broadcaster_name: string;
    broadcaster_login: string;
    vacation: {
      start_time: string;
      end_time: string;
    };
  };
}

export interface UpdateChannelStreamScheduleSegment {
  data: {
    segments: Array<{
      id: string;
      start_time: string;
      end_time: string;
      title: string;
      canceled_until: string;
      category: {
        id: string;
        name: string;
      };
      is_recurring: boolean;
    }>;
    broadcaster_id: string;
    broadcaster_name: string;
    broadcaster_login: string;
    vacation: {
      start_time: string;
      end_time: string;
    };
  };
}

export interface SearchCategories {
  data: Array<{
    box_art_url: string;
    name: string;
    id: string;
  }>;
}

export interface SearchChannels {
  data: Array<{
    broadcaster_language: string;
    broadcaster_login: string;
    display_name: string;
    game_id: string;
    game_name: string;
    id: string;
    is_live: boolean;
    tag_ids: Array<string>;
    tags: Array<string>;
    thumbnail_url: string;
    title: string;
    started_at: string;
  }>;
}

export interface GetStreamKey {
  data: Array<{
    stream_key: string;
  }>;
}

export interface GetStreams {
  data: Array<{
    id: string;
    user_id: string;
    user_login: string;
    user_name: string;
    game_id: string;
    game_name: string;
    type: "live";
    title: string;
    tags: Array<string>;
    viewer_count: number;
    started_at: string;
    language: string;
    thumbnail_url: string;
    tag_ids: Array<string>;
    is_mature: boolean;
  }>;
  pagination: {
    cursor: string;
  };
}

export interface GetFollowedStreams {
  data: Array<{
    id: string;
    user_id: string;
    user_login: string;
    user_name: string;
    game_id: string;
    game_name: string;
    type: "live";
    title: string;
    viewer_count: number;
    started_at: string;
    language: string;
    thumbnail_url: string;
    tag_ids: Array<string>;
    tags: Array<string>;
    is_mature: boolean;
  }>;
  pagination: {
    cursor: string;
  };
}

export interface CreateStreamMarker {
  data: Array<{
    id: string;
    created_at: string;
    position_seconds: number;
    description: string;
  }>;
}

export interface GetStreamMarkers {
  data: Array<{
    user_id: string;
    user_name: string;
    user_login: string;
    videos: Array<{
      video_id: string;
      markers: Array<{
        id: string;
        created_at: string;
        description: string;
        position_seconds: number;
        url: string;
      }>;
    }>;
  }>;
  pagination: {
    cursor: string;
  };
}

export interface GetBroadcasterSubscriptions {
  data: Array<{
    broadcaster_id: string;
    broadcaster_login: string;
    broadcaster_name: string;
    gifter_id: string;
    gifter_login: string;
    gifter_name: string;
    is_gift: boolean;
    plan_name: string;
    tier: "1000" | "2000" | "3000";
    user_id: string;
    user_name: string;
    user_login: string;
  }>;
  pagination: {
    cursor: string;
  };
  points: number;
  total: number;
}

export interface CheckUserSubscription {
  data: Array<{
    broadcaster_id: string;
    broadcaster_login: string;
    broadcaster_name: string;
    gifter_id: string;
    gifter_login: string;
    gifter_name: string;
    is_gift: boolean;
    tier: "1000" | "2000" | "3000";
  }>;
}

export interface GetAllStreamTags {
  data: Array<{
    tag_id: string;
    is_auto: boolean;
    localization_names: { [key: string]: string };
    localization_descriptions: { [key: string]: string };
  }>;
  pagination: {
    cursor: string;
  };
}

export interface GetStreamTags {
  data: Array<{
    tag_id: string;
    is_auto: boolean;
    localization_names: { [key: string]: string };
    localization_descriptions: { [key: string]: string };
  }>;
}

export interface GetChannelTeams {
  data: Array<{
    broadcaster_id: string;
    broadcaster_login: string;
    broadcaster_name: string;
    background_image_url: string;
    banner: string;
    created_at: string;
    updated_at: string;
    info: string;
    thumbnail_url: string;
    team_name: string;
    team_display_name: string;
    id: string;
  }>;
}

export interface GetTeams {
  data: Array<{
    users: Array<{
      user_id: string;
      user_login: string;
      user_name: string;
    }>;
    background_image_url: string;
    banner: string;
    created_at: string;
    updated_at: string;
    info: string;
    thumbnail_url: string;
    team_name: string;
    team_display_name: string;
    id: string;
  }>;
}

export interface GetUsers {
  data: Array<{
    id: string;
    login: string;
    display_name: string;
    type: "admin" | "global_mod" | "staff" | "";
    broadcaster_type: "affiliate" | "partner" | "";
    description: string;
    profile_image_url: string;
    offline_image_url: string;
    view_count: number;
    email: string;
    created_at: string;
  }>;
}

export interface UpdateUser {
  data: Array<{
    id: string;
    login: string;
    display_name: string;
    type: "admin" | "global_mod" | "staff" | "";
    broadcaster_type: "affiliate" | "partner" | "";
    description: string;
    profile_image_url: string;
    offline_image_url: string;
    view_count: number;
    email: string;
    created_at: string;
  }>;
}

export interface GetUserBlockList {
  data: Array<{
    user_id: string;
    user_login: string;
    display_name: string;
  }>;
}

export interface GetUserExtensions {
  data: Array<{
    id: string;
    version: string;
    name: string;
    can_activate: boolean;
    type: "component" | "mobile" | "overlay" | "panel";
  }>;
}

export interface GetUserActiveExtensions {
  data: {
    panel: {
      active: boolean;
      id: string;
      version: string;
      name: string;
    };
    overlay: {
      active: boolean;
      id: string;
      version: string;
      name: string;
    };
    component: {
      active: boolean;
      id: string;
      version: string;
      name: string;
      x: number;
      y: number;
    };
  };
}

export interface UpdateUserExtensions {
  data: {
    panel: {
      active: boolean;
      id: string;
      version: string;
      name: string;
    };
    overlay: {
      active: boolean;
      id: string;
      version: string;
      name: string;
    };
    component: {
      active: boolean;
      id: string;
      version: string;
      name: string;
      x: number;
      y: number;
    };
  };
}

export interface GetVideos {
  data: Array<{
    id: string;
    stream_id: string;
    user_id: string;
    user_login: string;
    user_name: string;
    title: string;
    description: string;
    created_at: string;
    published_at: string;
    url: string;
    thumbnail_url: string;
    viewable: string;
    view_count: number;
    language: string;
    type: "archive" | "highlight" | "upload";
    duration: string;
    muted_segments: Array<{
      duration: number;
      offset: number;
    }>;
  }>;
  pagination: {
    cursor: string;
  };
}

export interface DeleteVideos {
  data: Array<string>;
}
