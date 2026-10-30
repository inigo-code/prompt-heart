// Before the first frame, Android shows the launch window with the splash theme. That theme sets no colour
// for the system bars, so Android paints the navigation bar black (and adds its contrast scrim), which
// shows as a dark strip near the bottom of the splash. Give the launch window's bars the splash colour.
// In app.json this plugin is listed BEFORE expo-splash-screen: style mods run in reverse order, so it then
// runs after the splash theme has been written. Listed after, its items are overwritten.
const { withAndroidStyles } = require('expo/config-plugins');

const SPLASH_THEME = 'Theme.App.SplashScreen';
const ITEMS = {
  'android:navigationBarColor': '@color/splashscreen_background',
  'android:statusBarColor': '@color/splashscreen_background',
  'android:enforceNavigationBarContrast': 'false',
  'android:enforceStatusBarContrast': 'false',
};

module.exports = function withSplashSystemBars(config) {
  return withAndroidStyles(config, (cfg) => {
    const styles = (cfg.modResults.resources.style ??= []);
    let theme = styles.find((s) => s.$.name === SPLASH_THEME);
    if (!theme) {
      theme = { $: { name: SPLASH_THEME, parent: 'Theme.SplashScreen' }, item: [] };
      styles.push(theme);
    }
    theme.item ??= [];
    for (const [name, value] of Object.entries(ITEMS)) {
      const existing = theme.item.find((i) => i.$.name === name);
      // The contrast switches only exist from Android 10 (API 29); older versions skip them.
      const attrs = name.startsWith('android:enforce') ? { name, 'tools:targetApi': '29' } : { name };
      if (existing) existing._ = value;
      else theme.item.push({ $: attrs, _: value });
    }
    return cfg;
  });
};
