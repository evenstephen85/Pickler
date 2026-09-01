import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/**
 * Two very different worlds:
 *
 *  - Native (Capacitor) uses the Haptics plugin, which works on both iOS and
 *    Android and gives real taptic feedback.
 *  - The web build falls back to navigator.vibrate, which Android browsers
 *    support and **iOS Safari does not** — there is no web vibration API on
 *    iPhone at all. On an iPhone playing the hosted site, the sounds and the
 *    on-screen animation carry the whole alert; that gap closes when the app
 *    ships as a native build.
 */
const isNative = Capacitor.isNativePlatform();

function webVibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Unsupported or blocked (iOS, or a browser that gates it behind a gesture).
  }
}

export function hapticLight() {
  if (isNative) void Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
  else webVibrate(12);
}

export function hapticMedium() {
  if (isNative) void Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
  else webVibrate(28);
}

export function hapticHeavy() {
  if (isNative) void Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
  else webVibrate(60);
}

/** The winner reveal — a distinct rhythm, not just a longer buzz. */
export function hapticWinner() {
  if (isNative) void Haptics.notification({ type: NotificationType.Success }).catch(() => {});
  else webVibrate([40, 60, 40, 60, 160]);
}
