export default defineBackground({
  persistent: true,
  main() {
    browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
      switch (message.type) {
        case "SEND_NOW_PLAYING_DATA": {
          try {
            console.log("Sending now playing data to server");
            await fetch("http://localhost:2442/nowPlaying", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(message.payload),
            });

            sendResponse({ status: "success" });
          } catch (error: unknown) {
            console.error("Error while sending data to server", error);
            sendResponse({ status: "fail", error: (error as Error).message });
          }
          break;
        }
      }

      return true;
    });
  },
});
