export interface Settings {
  enabledDomains: string[];
}

const defaultSettings: Settings = {
  enabledDomains: [],
};

const settingsKey = "settings";

export async function getSettings(): Promise<Settings> {
  return await new Promise<Settings>((resolve) => {
    browser.storage.local.get(settingsKey, (keys) => {
      if (!(settingsKey in keys)) {
        resolve(defaultSettings);
        return;
      }

      try {
        const parsed = JSON.parse(keys[settingsKey]);
        resolve(parsed);
      } catch {
        resolve(defaultSettings);
      }
    });
  });
}

export async function setSettings(settings: Settings): Promise<void> {
  return await new Promise<void>((resolve) => {
    browser.storage.local.set({ [settingsKey]: JSON.stringify(settings) }, () => {
      resolve();
    });
  });
}
