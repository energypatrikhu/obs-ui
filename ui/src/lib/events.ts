export interface TwitchEvent {
  type: string;
  username: string;

  shown?: boolean;
  timestamp?: number;
  tier?: string;
  total?: number;
  message?: string;
  streak?: number;
  duration?: number;
  amount?: number;
  viewers?: number;
  moderator?: string;
  reason?: string;
  is_permanent?: boolean;
}

export function getEventIcon(type: string) {
  switch (type) {
    case "follow":
      return "💜";
    case "subscribe":
    case "subscription.gift":
    case "subscription.message":
      return "⭐";
    case "raid":
      return "🎯";
    case "cheer":
      return "💎";
    case "ban":
      return "🔨";
    default:
      return "✨";
  }
}

export function getEventText(event: TwitchEvent): string {
  switch (event.type) {
    case "follow":
      return "followed";
    case "subscribe":
      return `subscribed (Tier ${event.tier?.replace("000", "")})`;
    case "subscription.gift":
      return `gifted ${event.total} Tier ${event.tier?.replace("000", "")} sub${event.total !== 1 ? "s" : ""}`;
    case "subscription.message":
      const streakText = event.streak ? ` (${event.streak} month streak)` : "";
      return `resubscribed for ${event.duration} months${streakText}`;
    case "cheer":
      return `cheered ${event.amount} bits`;
    case "raid":
      return `raided with ${event.viewers} viewer${event.viewers !== 1 ? "s" : ""}`;
    case "ban":
      const banType = event.is_permanent ? "banned" : "timed out";
      const byMod = event.moderator ? ` by ${event.moderator}` : "";
      return `was ${banType}${byMod}`;
    default:
      return "interacted";
  }
}
