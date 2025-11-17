import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  alias: {
    $: "./src",
  },
  srcDir: "src",
  modules: ["@wxt-dev/module-svelte"],
  manifestVersion: 2,
  manifest: {
    host_permissions: ["http://localhost:2442/*"],
    permissions: ["storage", "tabs", "activeTab", "http://localhost:2442/*"],
    web_accessible_resources: ["**/*"],
  },
});
