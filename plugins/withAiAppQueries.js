// Android 11+ hides other apps unless you declare them. Prompt Heart opens these AI apps by
// package name (see src/lib/launch.ts), so it declares exactly these packages, and nothing broader
// like QUERY_ALL_PACKAGES. Keep in sync with androidPackage in src/lib/ai.ts.
const { withAndroidManifest } = require('expo/config-plugins');

const AI_APP_PACKAGES = [
  'com.openai.chatgpt',
  'com.anthropic.claude',
  'com.google.android.apps.bard',
  'ai.x.grok',
  'ai.perplexity.app.android',
  'com.microsoft.copilot',
  'com.deepseek.chat',
  'ai.mistral.chat',
];

module.exports = function withAiAppQueries(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest.queries = manifest.queries ?? [{}];
    const queries = manifest.queries[0];
    queries.package = queries.package ?? [];
    for (const name of AI_APP_PACKAGES) {
      if (!queries.package.some((p) => p.$?.['android:name'] === name)) queries.package.push({ $: { 'android:name': name } });
    }
    return cfg;
  });
};
