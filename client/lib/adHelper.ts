//client/lib/adHelper.ts
import mobileAds from 'react-native-google-mobile-ads';

let initialized = false;

export const initGoogleADs = async () => {
  if (!initialized) {
    initialized = true;

    await mobileAds().setRequestConfiguration({
      testDeviceIdentifiers: [
        '9279d05aaca0f38b5740572b17ae0ace', // iPhone 15
      ],
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
    });

    mobileAds().initialize();
  }
};