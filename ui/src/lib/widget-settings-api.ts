import axios from "axios";

export async function getWidgetSettings() {
  try {
    const response = await axios.get("http://localhost:2442/widgets/settings");
    return response.data;
  } catch (error) {
    console.log("Error getting widget settings:", error);
    return null;
  }
}

const widgetSettingsModes = ["enable", "disable"] as const;
export async function setWidgetSettings(widget: string, mode: (typeof widgetSettingsModes)[number]) {
  try {
    await axios.post(`http://localhost:2442/widgets/${mode}`, { widget });
  } catch (error) {
    console.log("Error setting widget settings:", error);
  }
}

export async function updateWidgetSettings(settings: any) {
  try {
    await axios.post("http://localhost:2442/widgets/settings", settings);
  } catch (error) {
    console.log("Error updating widget settings:", error);
  }
}
