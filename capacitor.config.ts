import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.sacshawty.feed",
  appName: "SacShawty",
  // Fully bundled app assets — no remote site is loaded.
  webDir: "mobile-shell",
  plugins: {
    // Route JS fetch/XHR through native HTTP so cross-origin API calls
    // are not blocked by the WebView CORS policy.
    CapacitorHttp: { enabled: true },
  },
  android: {
    backgroundColor: "#0a0a0b",
    allowMixedContent: true,
  },
};

export default config;
