import { Capacitor } from '@capacitor/core';
import { StatusBar } from '@capacitor/status-bar';

/** No-ops on the web build; the status bar only exists in a native wrapper. */
export function hideNativeStatusBar() {
  if (!Capacitor.isNativePlatform()) return;
  void StatusBar.hide().catch(() => {});
}
