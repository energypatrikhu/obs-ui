export interface Widgets {
  nowPlaying: {
    name: string;
    functions: Array<{
      name: string;
      timeout: number;
    }>;
  };
  twitch: {
    notifications: {
      [key: string]: {
        name: string;
        functions: Array<{
          name: string;
          timeout: number;
        }>;
      };
    };
  };
}
