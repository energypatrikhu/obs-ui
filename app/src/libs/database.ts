import { Logger } from "#libs/logger";
import { existsSync, mkdirSync } from "fs";
import { dirname } from "path";
import twitchScopes from "../../all-scopes.json";

const logger = new Logger("Database");

interface WidgetSettings {
  disabledWidgets: string[];
  settings: {
    twitch?: {
      activityFeed?: {
        maxEvents?: number;
      };
    };
  };
}

interface TwitchCredentials {
  client_id: string;
  client_secret: string;
  scope: string[];
  code: string;
  access_token: string;
  refresh_token: string;
}

/**
 * AppDatabase - Manages application data storage using JSON files
 *
 * Storage Structure:
 * - widgets.json: Stores widget configurations and disabled widgets list
 * - credentials.json: Stores Twitch API credentials
 *
 * Widget Settings Structure:
 * {
 *   "disabledWidgets": ["widget.name"],
 *   "settings": {
 *     "twitch": {
 *       "activityFeed": {
 *         "maxEvents": 5
 *       }
 *     }
 *   }
 * }
 */
class AppDatabase {
  private widgetsPath: string;
  private credentialsPath: string;
  private widgetsCache: WidgetSettings | null = null;
  private credentialsCache: TwitchCredentials | null = null;

  private constructor(dataDir: string = "./data") {
    this.widgetsPath = `${dataDir}/widgets.json`;
    this.credentialsPath = `${dataDir}/credentials.json`;
  }

  static async create(dataDir: string = "./data"): Promise<AppDatabase> {
    const db = new AppDatabase(dataDir);
    await db.initialize();
    logger.info("Database initialized with JSON file storage");
    return db;
  }

  private async initialize() {
    // Ensure data directory exists
    await mkdirSync(dirname(this.widgetsPath), { recursive: true });

    // Initialize widgets file if it doesn't exist
    if (!existsSync(this.widgetsPath)) {
      await this.saveWidgets({
        disabledWidgets: [],
        settings: {
          twitch: {
            activityFeed: {
              maxEvents: 5,
            },
          },
        },
      });
    }

    // Initialize credentials file if it doesn't exist
    if (!existsSync(this.credentialsPath)) {
      await this.saveCredentials({
        client_id: "",
        client_secret: "",
        scope: twitchScopes,
        code: "",
        access_token: "",
        refresh_token: "",
      });
    }

    // Load initial cache
    await this.loadWidgets();
    await this.loadCredentials();
  }

  // ========== File I/O Methods ==========

  private async loadWidgets(): Promise<WidgetSettings> {
    try {
      this.widgetsCache = await Bun.file(this.widgetsPath).json();
      return this.widgetsCache!;
    } catch (error) {
      logger.error("Failed to load widgets.json", error);
      // Return default if file is corrupted
      const defaults: WidgetSettings = {
        disabledWidgets: [],
        settings: {
          twitch: {
            activityFeed: {
              maxEvents: 5,
            },
          },
        },
      };
      this.widgetsCache = defaults;
      return defaults;
    }
  }

  private async saveWidgets(data: WidgetSettings): Promise<void> {
    try {
      await Bun.write(this.widgetsPath, JSON.stringify(data, null, 2));
      this.widgetsCache = data;
    } catch (error) {
      logger.error("Failed to save widgets.json", error);
      throw error;
    }
  }

  private async loadCredentials(): Promise<TwitchCredentials> {
    try {
      this.credentialsCache = await Bun.file(this.credentialsPath).json();
      return this.credentialsCache!;
    } catch (error) {
      logger.error("Failed to load credentials.json", error);
      // Return default if file is corrupted
      const defaults: TwitchCredentials = {
        client_id: "",
        client_secret: "",
        scope: [],
        code: "",
        access_token: "",
        refresh_token: "",
      };
      this.credentialsCache = defaults;
      return defaults;
    }
  }

  private async saveCredentials(data: TwitchCredentials): Promise<void> {
    try {
      await Bun.write(this.credentialsPath, JSON.stringify(data, null, 2));
      this.credentialsCache = data;
    } catch (error) {
      logger.error("Failed to save credentials.json", error);
      throw error;
    }
  }

  // ========== Disabled Widgets Methods ==========

  /**
   * Get all disabled widgets
   */
  public getDisabledWidgets(): string[] {
    return this.widgetsCache?.disabledWidgets ?? [];
  }

  /**
   * Add a widget to disabled list
   */
  public async disableWidget(name: string): Promise<void> {
    const widgets = await this.loadWidgets();
    if (!widgets.disabledWidgets.includes(name)) {
      widgets.disabledWidgets.push(name);
      await this.saveWidgets(widgets);
    }
  }

  /**
   * Remove a widget from disabled list
   */
  public async enableWidget(name: string): Promise<void> {
    const widgets = await this.loadWidgets();
    widgets.disabledWidgets = widgets.disabledWidgets.filter((w) => w !== name);
    await this.saveWidgets(widgets);
  }

  /**
   * Check if a widget is disabled
   */
  public isWidgetDisabled(name: string): boolean {
    return this.widgetsCache?.disabledWidgets.includes(name) ?? false;
  }

  // ========== Widget Settings Methods ==========

  /**
   * Get widget settings
   */
  public getWidgetSettings(): { disabledWidgets: string[]; twitch?: { activityFeed?: { maxEvents?: number } } } {
    const widgets = this.widgetsCache ?? {
      disabledWidgets: [],
      settings: {
        twitch: {
          activityFeed: {
            maxEvents: 5,
          },
        },
      },
    };

    return {
      disabledWidgets: widgets.disabledWidgets,
      twitch: {
        activityFeed: {
          maxEvents: widgets.settings.twitch?.activityFeed?.maxEvents ?? 5,
        },
      },
    };
  }

  /**
   * Set widget settings
   */
  public async setWidgetSettings(settings: {
    disabledWidgets: string[];
    twitch?: { activityFeed?: { maxEvents?: number } };
  }): Promise<void> {
    const widgets = await this.loadWidgets();

    widgets.disabledWidgets = settings.disabledWidgets;

    // Deep merge settings
    if (settings.twitch?.activityFeed?.maxEvents !== undefined) {
      if (!widgets.settings.twitch) widgets.settings.twitch = {};
      if (!widgets.settings.twitch.activityFeed) widgets.settings.twitch.activityFeed = {};
      widgets.settings.twitch.activityFeed.maxEvents = settings.twitch.activityFeed.maxEvents;
    }

    await this.saveWidgets(widgets);
  }

  /**
   * Update a specific widget setting without affecting other settings
   */
  public async updateWidgetSetting(path: string[], value: any): Promise<void> {
    const widgets = await this.loadWidgets();

    // Navigate to the path and set the value
    let current: any = widgets.settings;
    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) {
        current[path[i]] = {};
      }
      current = current[path[i]];
    }
    current[path[path.length - 1]] = value;

    await this.saveWidgets(widgets);
  }

  /**
   * Get a specific widget setting by path
   */
  public getWidgetSetting(path: string[], defaultValue?: any): any {
    const widgets = this.widgetsCache;
    if (!widgets) {
      return defaultValue;
    }

    let current: any = widgets.settings;
    for (const key of path) {
      if (current[key] === undefined) {
        return defaultValue;
      }
      current = current[key];
    }

    return current;
  }

  // ========== Twitch Credentials Methods ==========

  /**
   * Get Twitch credentials
   */
  public getTwitchCredentials(): TwitchCredentials {
    return (
      this.credentialsCache ?? {
        client_id: "",
        client_secret: "",
        scope: [],
        code: "",
        access_token: "",
        refresh_token: "",
      }
    );
  }

  /**
   * Update Twitch credentials
   */
  public async setTwitchCredentials(credentials: {
    client_id?: string;
    client_secret?: string;
    scope?: string[];
    code?: string;
    access_token?: string;
    refresh_token?: string;
  }): Promise<void> {
    const current = await this.loadCredentials();

    if (credentials.client_id !== undefined) current.client_id = credentials.client_id;
    if (credentials.client_secret !== undefined) current.client_secret = credentials.client_secret;
    if (credentials.scope !== undefined) current.scope = credentials.scope;
    if (credentials.code !== undefined) current.code = credentials.code;
    if (credentials.access_token !== undefined) current.access_token = credentials.access_token;
    if (credentials.refresh_token !== undefined) current.refresh_token = credentials.refresh_token;

    await this.saveCredentials(current);
  }
}

export default AppDatabase;
