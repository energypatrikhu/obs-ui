export async function getDomain() {
  return await new Promise<string>((resolve, reject) => {
    browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) {
        reject(new Error("No active tab found"));
        return;
      }

      const url = new URL(tabs[0].url!);
      resolve(url.hostname);
    });
  });
}
