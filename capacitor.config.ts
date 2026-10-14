import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.calmplan.app",
  appName: "CalmPlan",
  webDir: "dist",
  server: {
    androidScheme: "https",
    cleartext: false, // Enforce strict SSL/TLS encryption.
  },
  plugins: {
    Camera: {
      saveToGallery: false, // Privacy compliance: never clutter the user photo roll.
    },
  },
};

export default config;
