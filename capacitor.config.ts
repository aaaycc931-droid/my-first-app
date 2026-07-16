import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.aaaycc931.solfeggio",
  appName: "视唱练耳",
  webDir: "mobile-dist",
  loggingBehavior: "none",
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
