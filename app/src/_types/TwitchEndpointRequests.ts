import type { SubscriptionTypes } from "#types/TwitchApi";

export interface StartCommercial {
  broadcaster_id: string;
  length: number;
}

export interface GetAdSchedule {
  broadcaster_id: string;
}

export interface SnoozeNextAd {
  broadcaster_id: string;
}

export interface GetExtensionAnalytics {
  extension_id?: string;
  type?: "overview_v2";
  started_at?: string;
  ended_at?: string;
  first?: number;
  after?: string;
}

export interface GetGameAnalytics {
  game_id?: string;
  type?: "overview_v2";
  started_at?: string;
  ended_at?: string;
  first?: number;
  after?: string;
}

export interface GetBitsLeaderboard {
  count?: number;
  period?: "day" | "week" | "month" | "year" | "all";
  started_at?: string;
  user_id?: string;
}

export interface GetCheermotes {
  broadcaster_id?: string;
}

export interface GetExtensionTransactions {
  extension_id: string;
  id?: string;
  first?: number;
  after?: string;
}

export interface GetChannelInformation {
  broadcaster_id: string;
}

export interface ModifyChannelInformation {
  broadcaster_id: string;
  game_id?: string;
  broadcaster_language?: string;
  title?: string;
  delay?: number;
  tags?: Array<string>;
  content_classification_labels?: Array<{
    id: string;
    is_enabled: boolean;
  }>;
  is_branded_content?: boolean;
}

export interface GetChannelEditors {
  broadcaster_id: string;
}

export interface GetFollowedChannels {
  user_id: string;
  broadcaster_id?: string;
  first?: number;
  after?: string;
}

export interface GetChannelFollowers {
  user_id?: string;
  broadcaster_id: string;
  first?: number;
  after?: string;
}

export interface CreateCustomRewards {
  broadcaster_id: string;
  title: string;
  cost: number;
  prompt?: string;
  is_enabled?: boolean;
  background_color?: string;
  is_user_input_required?: boolean;
  is_max_per_stream_enabled?: boolean;
  max_per_stream?: number;
  is_max_per_user_per_stream_enabled?: boolean;
  max_per_user_per_stream?: number;
  is_global_cooldown_enabled?: boolean;
  global_cooldown_seconds?: number;
  should_redemptions_skip_request_queue?: boolean;
}

export interface DeleteCustomReward {
  broadcaster_id: string;
  id: string;
}

export interface GetCustomReward {
  broadcaster_id: string;
  id?: string;
  only_manageable_rewards?: boolean;
}

export interface GetCustomRewardRedemption {
  broadcaster_id: string;
  reward_id: string;
  status: "CANCELED" | "FULFILLED" | "UNFULFILLED";
  id?: string;
  sort?: "OLDEST" | "NEWEST";
  after?: string;
  first?: number;
}

export interface UpdateCustomReward {
  broadcaster_id: string;
  id: string;
  title?: string;
  prompt?: string;
  cost?: number;
  background_color?: string;
  is_enabled?: boolean;
  is_user_input_required?: boolean;
  is_max_per_stream_enabled?: boolean;
  max_per_stream?: number;
  is_max_per_user_per_stream_enabled?: boolean;
  max_per_user_per_stream?: number;
  is_global_cooldown_enabled?: boolean;
  global_cooldown_seconds?: number;
  is_paused?: boolean;
  should_redemptions_skip_request_queue?: boolean;
}

export interface UpdateRedemptionStatus {
  id: string;
  broadcaster_id: string;
  reward_id: string;
  status: "CANCELED" | "FULFILLED";
}

export interface GetCharityCampaign {
  broadcaster_id: string;
}

export interface GetCharityCampaignDonations {
  broadcaster_id: string;
  first?: number;
  after?: string;
}

export interface GetChatters {
  broadcaster_id: string;
  moderator_id: string;
  first?: number;
  after?: string;
}

export interface GetChannelEmotes {
  broadcaster_id: string;
}

export interface GetEmoteSets {
  emote_set_id: string;
}

export interface GetChannelChatBadges {
  broadcaster_id: string;
}

export interface GetChatSettings {
  broadcaster_id: string;
  moderator_id?: string;
}

export interface GetUserEmotes {
  user_id: string;
  after?: string;
  broadcaster_id?: string;
}

export interface UpdateChatSettings {
  broadcaster_id: string;
  moderator_id: string;
  emote_mode: boolean;
  follower_mode: boolean;
  follower_mode_duration: number;
  non_moderator_chat_delay: number;
  non_moderator_chat_delay_duration: number;
  slow_mode: boolean;
  slow_mode_wait_time: number;
  subscriber_mode: boolean;
  unique_chat_mode: boolean;
}

export interface SendChatAnnouncement {
  broadcaster_id: string;
  moderator_id: string;
  message: string;
  color?: "blue" | "green" | "orange" | "purple" | "primary (default)";
}

export interface SendAShoutout {
  from_broadcaster_id: string;
  to_broadcaster_id: string;
  moderator_id: string;
}

export interface SendChatMessage {
  broadcaster_id: string;
  sender_id: string;
  message: string;
  reply_parent_message_id?: string;
}

export interface GetUserChatColor {
  user_id: string;
}

export interface UpdateUserChatColor {
  user_id: string;
  color:
    | "blue"
    | "blue_violet"
    | "cadet_blue"
    | "chocolate"
    | "coral"
    | "dodger_blue"
    | "firebrick"
    | "golden_rod"
    | "green"
    | "hot_pink"
    | "orange_red"
    | "red"
    | "sea_green"
    | "spring_green"
    | "yellow_green";
}

export interface CreateClip {
  broadcaster_id: string;
  has_delay?: boolean;
}

export interface GetClips {
  broadcaster_id: string;
  game_id: string;
  id: string;
  started_at?: string;
  ended_at?: string;
  first?: number;
  before?: string;
  after?: string;
  is_featured?: boolean;
}

export interface CreateConduits {
  shard_count: number;
}

export interface UpdateConduits {
  id: string;
  shard_count: number;
}

export interface DeleteConduit {
  id: string;
}

export interface GetConduitShards {
  conduit_id: string;
  status?: string;
  after?: string;
}

export interface UpdateConduitShards {
  conduit_id: string;
  shards: Array<{
    id: string;
    transport:
      | {
          method?: "webhook";
          callback?: string;
          secret?: string;
        }
      | {
          method?: "websocket";
          session_id?: string;
        };
  }>;
}

export interface GetContentClassificationLabels {
  locale?:
    | "bg-BG"
    | "cs-CZ"
    | "da-DK"
    | "da-DK"
    | "de-DE"
    | "el-GR"
    | "en-GB"
    | "en-US"
    | "es-ES"
    | "es-MX"
    | "fi-FI"
    | "fr-FR"
    | "hu-HU"
    | "it-IT"
    | "ja-JP"
    | "ko-KR"
    | "nl-NL"
    | "no-NO"
    | "pl-PL"
    | "pt-BT"
    | "pt-PT"
    | "ro-RO"
    | "ru-RU"
    | "sk-SK"
    | "sv-SE"
    | "th-TH"
    | "tr-TR"
    | "vi-VN"
    | "zh-CN"
    | "zh-TW";
}

export interface GetDropsEntitlements {
  id?: string;
  user_id?: string;
  game_id?: string;
  fulfillment_status?: "CLAIMED" | "FULFILLED";
  after?: string;
  first?: number;
}

export interface UpdateDropsEntitlements {
  entitlement_ids?: Array<string>;
  fulfillment_status?: "CLAIMED" | "FULFILLED";
}

export interface GetExtensionConfigurationSegment {
  broadcaster_id?: string;
  extension_id: string;
  segment: "broadcaster" | "developer" | "global";
}

export interface SetExtensionConfigurationSegment {
  extension_id: string;
  segment: "broadcaster" | "developer" | "global";
  broadcaster_id?: string;
  content?: string;
  version?: string;
}

export interface SetExtensionRequiredConfiguration {
  broadcaster_id: string;
  extension_id: string;
  extension_version: string;
  required_configuration: string;
}

export interface SendExtensionPubSubMessage {
  target: "broadcast" | "global" | "whisper-<user-id>";
  broadcaster_id: string;
  is_global_broadcast?: boolean;
  message: string;
}

export interface GetExtensionLiveChannels {
  extension_id: string;
  first?: number;
  after?: string;
}

export interface GetExtensionSecrets {
  extension_id: string;
}

export interface CreateExtensionSecret {
  extension_id: string;
  delay?: number;
}

export interface SendExtensionChatMessage {
  broadcaster_id: string;
  text: string;
  extension_id: string;
  extension_version: string;
}

export interface GetExtensions {
  extension_id: string;
  extension_version?: string;
}

export interface GetReleasedExtensions {
  extension_id: string;
  extension_version?: string;
}

export interface GetExtensionBitsProducts {
  should_include_all?: boolean;
}

export interface UpdateExtensionBitsProduct {
  sku: string;
  cost: {
    amount: number;
    type: "bits";
  };
  in_development: boolean;
  display_name?: string;
  is_broadcast?: boolean;
  expiration?: string;
}

export interface CreateEventSubSubscription {
  type: SubscriptionTypes;
  version: string;
  condition: { [key: string]: string };
  transport:
    | {
        method: "webhook";
        callback?: string;
        secret?: string;
      }
    | {
        method: "websocket";
        session_id?: string;
      }
    | {
        method: "conduit";
        conduit_id?: string;
      };
}

export interface DeleteEventSubSubscription {
  id: string;
}

export interface GetEventSubSubscriptions {
  status?:
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
  type?: SubscriptionTypes;
  user_id?: string;
  after?: string;
}

export interface GetTopGames {
  first?: number;
  after?: string;
  before?: string;
}

export interface GetGames {
  id: string;
  name: string;
  igdb_id: string;
}

export interface GetCreatorGoals {
  broadcaster_id: string;
}

export interface GetChannelGuestStarSettings {
  broadcaster_id: string;
  moderator_id: string;
}

export interface UpdateChannelGuestStarSettings {
  broadcaster_id: string;
  is_moderator_send_live_enabled?: boolean;
  slot_count?: number;
  is_browser_source_audio_enabled?: boolean;
  group_layout?: "TILED_LAYOUT" | "SCREENSHARE_LAYOUT" | "HORIZONTAL_LAYOUT" | "VERTICAL_LAYOUT";
  regenerate_browser_sources?: boolean;
}

export interface GetGuestStarSession {
  broadcaster_id: string;
  moderator_id: string;
}

export interface CreateGuestStarSession {
  broadcaster_id: string;
}

export interface EndGuestStarSession {
  broadcaster_id: string;
  session_id: string;
}

export interface GetGuestStarInvites {
  broadcaster_id: string;
  moderator_id: string;
  session_id: string;
}

export interface SendGuestStarInvite {
  broadcaster_id: string;
  moderator_id: string;
  session_id: string;
  guest_id: string;
}

export interface DeleteGuestStarInvite {
  broadcaster_id: string;
  moderator_id: string;
  session_id: string;
  guest_id: string;
}

export interface AssignGuestStarSlot {
  broadcaster_id: string;
  moderator_id: string;
  session_id: string;
  guest_id: string;
  slot_id: string;
}

export interface UpdateGuestStarSlot {
  broadcaster_id: string;
  moderator_id: string;
  session_id: string;
  source_slot_id: string;
  destination_slot_id?: string;
}

export interface DeleteGuestStarSlot {
  broadcaster_id: string;
  moderator_id: string;
  session_id: string;
  guest_id: string;
  slot_id: string;
  should_reinvite_guest?: string;
}

export interface UpdateGuestStarSlotSettings {
  broadcaster_id: string;
  moderator_id: string;
  session_id: string;
  slot_id: string;
  is_audio_enabled?: boolean;
  is_video_enabled?: boolean;
  is_live?: boolean;
  volume?: number;
}

export interface GetHypeTrainEvents {
  broadcaster_id: string;
  first?: number;
  after?: string;
}

export interface CheckAutoModStatus {
  broadcaster_id: string;
  data: Array<{
    msg_id: string;
    msg_text: string;
  }>;
}

export interface ManageHeldAutoModMessages {
  user_id: string;
  msg_id: string;
  action: "ALLOW" | "DENY";
}

export interface GetAutoModSettings {
  broadcaster_id: string;
  moderator_id: string;
}

export interface UpdateAutoModSettings {
  broadcaster_id: string;
  moderator_id: string;
  data:
    | {
        overall_level: number;
      }
    | {
        aggression: number;
        bullying: number;
        disability: number;
        misogyny: number;
        race_ethnicity_or_religion: number;
        sex_based_terms: number;
        sexuality_sex_or_gender: number;
        swearing: number;
      };
}

export interface GetBannedUsers {
  broadcaster_id: string;
  user_id?: string;
  first?: number;
  after?: string;
  before?: string;
}

export interface BanUser {
  broadcaster_id: string;
  moderator_id: string;
  data: {
    user_id: string;
    duration?: number;
    reason?: string;
  };
}

export interface UnbanUser {
  broadcaster_id: string;
  moderator_id: string;
  user_id: string;
}

export interface GetUnbanRequests {
  broadcaster_id: string;
  moderator_id: string;
  status: "pending" | "approved" | "denied" | "acknowledged" | "canceled";
  user_id?: string;
  after?: string;
  first?: number;
}

export interface ResolveUnbanRequests {
  broadcaster_id: string;
  moderator_id: string;
  unban_request_id: string;
  status: "approved" | "denied";
  resolution_text?: string;
}

export interface GetBlockedTerms {
  broadcaster_id: string;
  moderator_id: string;
  first?: number;
  after?: string;
}

export interface AddBlockedTerm {
  broadcaster_id: string;
  moderator_id: string;
  text: string;
}

export interface RemoveBlockedTerm {
  broadcaster_id: string;
  moderator_id: string;
  id: string;
}

export interface DeleteChatMessages {
  broadcaster_id: string;
  moderator_id: string;
  message_id?: string;
}

export interface GetModeratedChannels {
  user_id: string;
  after?: string;
  first?: number;
}

export interface GetModerators {
  broadcaster_id: string;
  user_id?: string;
  first?: string;
  after?: string;
}

export interface AddChannelModerator {
  broadcaster_id: string;
  user_id: string;
}

export interface RemoveChannelModerator {
  broadcaster_id: string;
  user_id: string;
}

export interface GetVIPs {
  user_id?: string;
  broadcaster_id: string;
  first?: number;
  after?: string;
}

export interface AddChannelVIP {
  user_id: string;
  broadcaster_id: string;
}

export interface RemoveChannelVIP {
  user_id: string;
  broadcaster_id: string;
}

export interface UpdateShieldModeStatus {
  broadcaster_id: string;
  moderator_id: string;
  is_active: boolean;
}

export interface GetShieldModeStatus {
  broadcaster_id: string;
  moderator_id: string;
}

export interface GetPolls {
  broadcaster_id: string;
  id?: string;
  first?: string;
  after?: string;
}

export interface CreatePoll {
  broadcaster_id: string;
  title: string;
  choices: Array<{
    title: string;
  }>;
  duration: number;
  channel_points_voting_enabled?: boolean;
  channel_points_per_vote?: number;
}

export interface EndPoll {
  broadcaster_id: string;
  id: string;
  status: "TERMINATED" | "ARCHIVED";
}

export interface GetPredictions {
  broadcaster_id: string;
  id?: string;
  first?: string;
  after?: string;
}

export interface CreatePrediction {
  broadcaster_id: string;
  title: string;
  outcomes: Array<{
    title: string;
  }>;
  prediction_window: number;
}

export interface EndPrediction {
  broadcaster_id: string;
  id: string;
  status: "RESOLVED" | "CANCELED" | "LOCKED";
  winning_outcome_id?: string;
}

export interface StartARaid {
  from_broadcaster_id: string;
  to_broadcaster_id: string;
}

export interface CancelARaid {
  broadcaster_id: string;
}

export interface GetChannelStreamSchedule {
  broadcaster_id: string;
  id?: string;
  start_time?: string;
  utc_offset?: string;
  first?: number;
  after?: string;
}
export interface GetChannelICalendar {
  broadcaster_id: string;
}

export interface UpdateChannelStreamSchedule {
  broadcaster_id: string;
  is_vacation_enabled?: boolean;
  vacation_start_time?: string;
  vacation_end_time?: string;
  timezone?: string;
}

export interface CreateChannelStreamScheduleSegment {
  broadcaster_id: string;
  start_time: string;
  timezone: string;
  duration: string;
  is_recurring?: boolean;
  category_id?: string;
  title?: string;
}

export interface UpdateChannelStreamScheduleSegment {
  broadcaster_id: string;
  id: string;
  start_time?: string;
  duration?: string;
  category_id?: string;
  title?: string;
  is_canceled?: boolean;
  timezone?: string;
}

export interface DeleteChannelStreamScheduleSegment {
  broadcaster_id: string;
  id: string;
}

export interface SearchCategories {
  query: string;
  first?: number;
  after?: string;
}

export interface SearchChannels {
  query: string;
  live_only?: boolean;
  first?: number;
  after?: string;
}

export interface GetStreamKey {
  broadcaster_id: string;
}

export interface GetStreams {
  user_id?: string;
  user_login?: string;
  game_id?: string;
  type?: "all" | "live";
  language?: string;
  first?: number;
  before?: string;
  after?: string;
}

export interface GetFollowedStreams {
  user_id: string;
  first?: number;
  after?: string;
}

export interface CreateStreamMarker {
  user_id: string;
  description?: string;
}

export interface GetStreamMarkers {
  user_id: string;
  video_id: string;
  first?: string;
  before?: string;
  after?: string;
}

export interface GetBroadcasterSubscriptions {
  broadcaster_id: string;
  user_id?: string;
  first?: string;
  after?: string;
  before?: string;
}

export interface CheckUserSubscription {
  broadcaster_id: string;
  user_id: string;
}

export interface GetAllStreamTags {
  tag_id?: string;
  first?: number;
  after?: string;
}

export interface GetStreamTags {
  broadcaster_id: string;
}

export interface GetChannelTeams {
  broadcaster_id: string;
}

export interface GetTeams {
  name: string;
  id: string;
}

export interface GetUsers {
  id?: string;
  login?: string;
}

export interface UpdateUser {
  description?: string;
}

export interface GetUserBlockList {
  broadcaster_id: string;
  first?: number;
  after?: string;
}

export interface BlockUser {
  target_user_id: string;
  source_context?: "chat" | "whisper";
  reason?: "harassment" | "spam" | "other";
}

export interface UnblockUser {
  target_user_id: string;
}

export interface GetUserActiveExtensions {
  user_id?: string;
}

export interface UpdateUserExtensions {
  data: { [key: string]: string };
}

export interface GetVideos {
  id: string;
  user_id: string;
  game_id: string;
  language?: string;
  period?: "all" | "day" | "month" | "week";
  sort?: "time" | "trending" | "views";
  type?: "all" | "archive" | "highlight" | "upload";
  first?: string;
  after?: string;
  before?: string;
}

export interface DeleteVideos {
  id: string;
}

export interface SendWhisper {
  from_user_id: string;
  to_user_id: string;
  message: string;
}
