export default interface Widget {
  disabledWidgets: string[];
  twitch?: {
    activityFeed?: {
      maxEvents?: number;
    };
  };
}
