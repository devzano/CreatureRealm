// app.config.ts
import "dotenv/config";
import type { ExpoConfig } from "@expo/config";

const VARIANT = (process.env.APP_VARIANT || "production") as
  | "development"
  | "production";

const IS_DEV = VARIANT === "development";

const pick = <T extends { dev: any; prod: any; }>(obj: T) =>
  IS_DEV ? obj.dev : obj.prod;

const appTitleBase = "CreatureRealm";

const appNames = {
  dev: `${appTitleBase} (Dev)`,
  prod: appTitleBase,
};

const appDisplayNames = {
  dev: "CreatureRealm (Dev)",
  prod: "CreatureRealm",
};

const schemes = {
  dev: "creaturerealm-dev",
  prod: "creaturerealm",
};

const iosBundleIds = {
  dev: "com.devzano.CreatureRealm.dev",
  prod: "com.devzano.CreatureRealm",
};

const androidPackages = {
  dev: "com.devzano.CreatureRealm.dev",
  prod: "com.devzano.CreatureRealm",
};

const iOSIcons = {
  dev: "./assets/images/icon.png",
  prod: "./assets/images/icon.png",
};
const androidIcons = {
  dev: "./assets/images/adaptive-icon.png",
  prod: "./assets/images/adaptive-icon.png",
};

// const splashPluginConfig = {
//   // image: pick({
//   //   dev: "./assets/images/splash.png",
//   //   prod: "./assets/images/splash.png",
//   // }),
//   resizeMode: "contain" as const,
//   backgroundColor: "#071826"
// };

const BUILD_NUMBER = 13;

const config: ExpoConfig = {
  name: pick(appNames),
  slug: "CreatureRealm",
  scheme: pick(schemes),

  version: "1.0.1",
  orientation: "portrait",
  icon: pick(iOSIcons),
  userInterfaceStyle: "automatic",
  newArchEnabled: true,

  ios: {
    supportsTablet: true,
    bundleIdentifier: pick(iosBundleIds),
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      CFBundleName: pick(appNames),
      CFBundleDisplayName: pick(appDisplayNames),
    },
    icon: "./assets/images/CreatureRealm.icon",
  },

  android: {
    package: pick(androidPackages),
    adaptiveIcon: {
      backgroundColor: "#071826",
      foregroundImage: pick(androidIcons),
      // backgroundImage: pick(adaptiveBackgrounds),
      // monochromeImage: pick(adaptiveMonochrome),
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
  },

  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/icon.png",
  },

  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-font",
    "expo-web-browser",
    "expo-audio",
    // "@react-native-google-signin/google-signin",
    // [
    //   "expo-splash-screen",
    //   splashPluginConfig,
    // ],
    [
      "react-native-google-mobile-ads",
      {
        iosAppId: "ca-app-pub-7336849218717327~6986681648",
        androidAppId: "ca-app-pub-7336849218717327~7509318020",
      },
    ],
    [
      "expo-asset",
      {
        assets: ["./assets/sounds"],
      },
    ],
    [
      "expo-notifications",
      {
        sounds: ["./assets/sounds/digitalbeeping.wav"],
      },
    ],
    [
      "expo-build-properties",
      {
        // android: {
        //   targetSdkVersion: 35,
        //   compileSdkVersion: 35,
        //   buildToolsVersion: "35.0.0",
        // },
        // ios: {
        //   deploymentTarget: "16.0",
        // },
      },
    ],
    [
      "expo-updates",
      {
        username: "devzano",
      },
    ],
  ],

  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },

  extra: {
    APP_VARIANT: VARIANT,
    eas: { projectId: "05c97fca-c5bb-4b54-a744-8855a250248d" },
    buildNumber: BUILD_NUMBER,
    minSupportedBuildNumber: BUILD_NUMBER,

    admobBannerUnitIdIos: "ca-app-pub-7336849218717327/8053911801",
    admobBannerUnitIdAndroid: "ca-app-pub-7336849218717327/6995244912",

    iosStoreUrl:
      "https://apps.apple.com/app/creaturerealm/id6755702513",
    androidStoreUrl:
      "https://play.google.com/store/apps/details?id=com.devzano.CreatureRealm",
  },

  updates: {
    url: "https://u.expo.dev/05c97fca-c5bb-4b54-a744-8855a250248d",
  },

  runtimeVersion: { policy: "appVersion" },

  owner: "devzano",
};

export default config;
