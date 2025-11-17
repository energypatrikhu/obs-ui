import type AppDatabase from "#libs/database";
import { Logger } from "#libs/logger";
import { existsSync } from "fs";
import { unlink } from "fs/promises";

const logger = new Logger("Migration");

/**
 * Migrate old JSON files to SQLite database
 */
export async function migrateJsonToDatabase(db: AppDatabase): Promise<void> {
  let migratedFiles = 0;

  // Migrate widgets.json
  const widgetsPath = "./widgets.json";
  if (existsSync(widgetsPath)) {
    try {
      const widgetsFile = Bun.file(widgetsPath);
      const widgetsData = await widgetsFile.json();

      // Migrate to new table structure
      if (widgetsData.disabledWidgets && Array.isArray(widgetsData.disabledWidgets)) {
        db.setWidgetSettings({ disabledWidgets: widgetsData.disabledWidgets });
        logger.info("Migrated widgets.json to database");
        migratedFiles++;
      }

      // Remove old file
      await unlink(widgetsPath);
      logger.info("Removed old widgets.json file");
    } catch (error) {
      logger.error("Failed to migrate widgets.json:", error);
    }
  }

  // Migrate credentials.json
  const credentialsPath = "./credentials.json";
  if (existsSync(credentialsPath)) {
    try {
      const credentialsFile = Bun.file(credentialsPath);
      const credentialsData = await credentialsFile.json();

      // Migrate to new table structure
      db.setTwitchCredentials(credentialsData);
      logger.info("Migrated credentials.json to database");
      migratedFiles++;

      // Remove old file
      await unlink(credentialsPath);
      logger.info("Removed old credentials.json file");
    } catch (error) {
      logger.error("Failed to migrate credentials.json:", error);
    }
  }

  // Migrate from old kv_store to new table structure
  await migrateKvStoreToTables(db);

  if (migratedFiles > 0) {
    logger.info(`Migration complete: ${migratedFiles} file(s) migrated to database`);
  }
}

/**
 * Migrate data from legacy kv_store to new table structure
 */
async function migrateKvStoreToTables(db: AppDatabase): Promise<void> {
  let migrated = false;

  // Migrate widgets_settings from kv_store
  const widgetsSettings = db.legacyGet("widgets_settings");
  if (widgetsSettings) {
    if (widgetsSettings.disabledWidgets && Array.isArray(widgetsSettings.disabledWidgets)) {
      // Only migrate if the new table is empty
      const currentSettings = db.getWidgetSettings();
      if (currentSettings.disabledWidgets.length === 0) {
        db.setWidgetSettings(widgetsSettings);
        logger.info("Migrated widgets_settings from kv_store to disabled-widgets table");
        migrated = true;
      }
    }
    db.legacyDelete("widgets_settings");
  }

  // Migrate twitch_credentials from kv_store
  const twitchCredentials = db.legacyGet("twitch_credentials");
  if (twitchCredentials) {
    const currentCreds = db.getTwitchCredentials();
    // Only migrate if current credentials are empty
    if (!currentCreds.client_id && !currentCreds.access_token) {
      db.setTwitchCredentials(twitchCredentials);
      logger.info("Migrated twitch_credentials from kv_store to twitch-credentials table");
      migrated = true;
    }
    db.legacyDelete("twitch_credentials");
  }

  if (migrated) {
    logger.info("Legacy kv_store data migrated to new table structure");

    // Drop the legacy kv_store table after successful migration
    db.dropLegacyKvStore();
  }
}
