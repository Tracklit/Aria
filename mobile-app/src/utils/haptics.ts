import * as Haptics from 'expo-haptics';

export async function impactLight() {
  try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
}
export async function impactMedium() {
  try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
}
export async function impactHeavy() {
  try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch {}
}
export async function notificationSuccess() {
  try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
}
export async function notificationWarning() {
  try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } catch {}
}
export async function notificationError() {
  try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
}
export async function selectionChanged() {
  try { await Haptics.selectionAsync(); } catch {}
}
