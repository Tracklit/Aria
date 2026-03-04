import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';

const VOICE_SETTINGS_KEY = 'aria_voice_settings';

export interface VoiceSettings {
  enabled: boolean;
  volume: number; // 0-1
  rate: number; // 0.5-2.0
}

const DEFAULT_SETTINGS: VoiceSettings = { enabled: false, volume: 1.0, rate: 1.0 };

export async function getVoiceSettings(): Promise<VoiceSettings> {
  try {
    const raw = await AsyncStorage.getItem(VOICE_SETTINGS_KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch {
    // Fall through to defaults
  }
  return { ...DEFAULT_SETTINGS };
}

export async function saveVoiceSettings(settings: VoiceSettings): Promise<void> {
  await AsyncStorage.setItem(VOICE_SETTINGS_KEY, JSON.stringify(settings));
}

export async function speak(text: string): Promise<void> {
  const settings = await getVoiceSettings();
  if (!settings.enabled) return;

  // Stop any ongoing speech before starting new
  Speech.stop();

  Speech.speak(text, {
    rate: settings.rate,
    volume: settings.volume,
    language: 'en-US',
  });
}

export function stopSpeaking(): void {
  Speech.stop();
}

// Coaching cue helpers

export async function announceSetComplete(setNumber: number, totalSets: number): Promise<void> {
  if (setNumber >= totalSets) {
    await speak('All sets complete. Nice work!');
  } else {
    await speak(`Set ${setNumber} of ${totalSets} complete.`);
  }
}

export async function announceRestTimer(seconds: number): Promise<void> {
  if (seconds <= 3 && seconds >= 1) {
    await speak(`${seconds}`);
  }
}

export async function announceExerciseStart(exerciseName: string): Promise<void> {
  await speak(`Next up: ${exerciseName}`);
}

export async function announceWorkoutComplete(duration: string): Promise<void> {
  await speak(`Workout complete! Total time: ${duration}. Great session!`);
}
