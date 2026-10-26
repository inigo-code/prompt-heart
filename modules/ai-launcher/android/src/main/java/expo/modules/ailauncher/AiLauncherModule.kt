package expo.modules.ailauncher

import android.content.Intent
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Opens another app on its home screen by package name. Unlike a web link, this can only reach
// that one app, so the browser never opens alongside it. The packages must be declared in the
// manifest's <queries> (plugins/withAiAppQueries.js) to be visible on Android 11+.
class AiLauncherModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AiLauncher")

    Function("isInstalled") { packageName: String ->
      val pm = appContext.reactContext?.packageManager ?: return@Function false
      pm.getLaunchIntentForPackage(packageName) != null
    }

    // Returns false when the app isn't installed (or can't be launched), so JS can fall back to the web.
    Function("openApp") { packageName: String ->
      val context = appContext.reactContext ?: return@Function false
      val intent = context.packageManager.getLaunchIntentForPackage(packageName) ?: return@Function false
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      try {
        (appContext.currentActivity ?: context).startActivity(intent)
        true
      } catch (e: Exception) {
        false
      }
    }
  }
}
