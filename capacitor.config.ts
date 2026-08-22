import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.loop.feed",
  appName: "Loop",
  webDir: "mobile-shell",
  server: {
    // The feed needs the live backend (/api/public/video), so the app loads
    // the deployed site. Publish the project once and this URL serves it.
    url: "https://project--a691ccd6-a37a-4d28-be72-6b983a02d6e2.lovable.app",
    cleartext: false,
    androidScheme: "https",
  },
  android: {
    backgroundColor: "#0a0a0b",
  },
};

export default config;
