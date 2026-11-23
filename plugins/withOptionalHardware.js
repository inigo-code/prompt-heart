// Shared by every Heart Apps Expo app. The master copy is Heart Apps\Tools\expo\withOptionalHardware.js;
// sync_android_features.py copies it into each app's plugins folder, so edit it there and sync, not here.
//
// Android quietly turns some settings into hardware the phone must have: a portrait lock ("orientation" in
// app.json) requires a portrait screen, and the camera, location, microphone and similar permissions require
// that hardware. Google Play then hides the app from devices without it (tablets, Chromebooks, desktops,
// Android XR) and warns on every release. None of the Heart Apps needs any of it to work, so each one is
// declared optional here. The app must still cope when the hardware isn't there (a photo picker as well as
// the camera, and so on).
const { withAndroidManifest } = require('expo/config-plugins');

const OPTIONAL = [
  // A portrait or landscape lock.
  'android.hardware.screen.portrait',
  'android.hardware.screen.landscape',
  // CAMERA.
  'android.hardware.camera',
  'android.hardware.camera.any',
  'android.hardware.camera.autofocus',
  'android.hardware.camera.flash',
  'android.hardware.camera.front',
  // ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION.
  'android.hardware.location',
  'android.hardware.location.gps',
  'android.hardware.location.network',
  // RECORD_AUDIO.
  'android.hardware.microphone',
  // Calls and SMS permissions.
  'android.hardware.telephony',
  // Bluetooth and Wi-Fi permissions.
  'android.hardware.bluetooth',
  'android.hardware.bluetooth_le',
  'android.hardware.wifi',
  // A touchscreen (some libraries declare it).
  'android.hardware.touchscreen',
  'android.hardware.touchscreen.multitouch',
  'android.hardware.touchscreen.multitouch.distinct',
];

module.exports = function withOptionalHardware(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    // Anything another plugin declared for these is replaced, so none of them ends up required.
    manifest['uses-feature'] = (manifest['uses-feature'] ?? []).filter((f) => !OPTIONAL.includes(f.$?.['android:name']));
    for (const name of OPTIONAL) {
      manifest['uses-feature'].push({ $: { 'android:name': name, 'android:required': 'false' } });
    }
    return cfg;
  });
};
