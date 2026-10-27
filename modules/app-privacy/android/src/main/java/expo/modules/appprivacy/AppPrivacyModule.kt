package expo.modules.appprivacy

import android.os.Build
import android.view.WindowManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Hides the app's preview in the recent-apps switcher while App lock is on.
// Android 13+ can do this on its own (screenshots inside the app keep working). Older versions only
// have FLAG_SECURE, which also blocks screenshots, so it's used there as the fallback.
class AppPrivacyModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AppPrivacy")

    Function("setHiddenInRecents") { hidden: Boolean ->
      val activity = appContext.currentActivity ?: return@Function false
      activity.runOnUiThread {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
          activity.setRecentsScreenshotEnabled(!hidden)
        } else if (hidden) {
          activity.window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
        } else {
          activity.window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
        }
      }
      true
    }
  }
}
