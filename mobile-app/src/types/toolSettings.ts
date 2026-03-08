export type VoiceOption = 'default' | 'custom';
export type GunSoundOption = 'bang' | 'gun-shot' | 'gun-shot-reverb' | 'gun-shot-new' | 'starting-pistol' | 'custom-bang';

export interface StartGunSettings {
  enabled: boolean;
  voice: VoiceOption;
  gunSound: GunSoundOption;
  gunFlash: boolean;
  volume: number;
  marksToSetEnabled: boolean;
  marksToSetDelay: number;
  setToGunEnabled: boolean;
  setToGunDelay: number;
  randomRangeEnabled: boolean;
  randomRange: number;
}

export type OverlayLineType = 'none' | 'center' | 'thirds' | 'quarter' | 'custom';
export type OverlayLineStyle = 'dashed' | 'solid';
export type OverlayLineColor = 'red' | 'white' | 'yellow' | 'cyan';

export interface PhotoFinishSettings {
  defaultSpeed: 0.25 | 0.5 | 1;
  frameStep: number;
  autoPauseOnScrub: boolean;
  showMilliseconds: boolean;
  overlayLine: OverlayLineType;
  overlayLineStyle: OverlayLineStyle;
  overlayLineColor: OverlayLineColor;
  /** Custom line position as percentage (0-100), used when overlayLine is 'custom' */
  customLinePosition: number;
  /** Constrain playback to keyframe range when both are set */
  constrainToKeyframes: boolean;
}

export interface StopwatchSettings {
  lapDisplayFormat: 'split' | 'cumulative' | 'both';
  timerPrecision: 'centiseconds' | 'milliseconds';
  hapticOnLap: boolean;
  keepScreenAwake: boolean;
  soundOnLap: boolean;
}

export interface SprintPredictorSettings {
  defaultDistance: number;
  showDelta: boolean;
  distanceUnit: 'meters' | 'yards';
}

export const DEFAULT_START_GUN: StartGunSettings = {
  enabled: true,
  voice: 'default',
  gunSound: 'bang',
  gunFlash: true,
  volume: 8,
  marksToSetEnabled: true,
  marksToSetDelay: 3,
  setToGunEnabled: true,
  setToGunDelay: 2,
  randomRangeEnabled: true,
  randomRange: 2,
};

export const DEFAULT_PHOTO_FINISH: PhotoFinishSettings = {
  defaultSpeed: 1,
  frameStep: 1 / 30,
  autoPauseOnScrub: true,
  showMilliseconds: true,
  overlayLine: 'center',
  overlayLineStyle: 'dashed',
  overlayLineColor: 'red',
  customLinePosition: 50,
  constrainToKeyframes: true,
};

export const DEFAULT_STOPWATCH: StopwatchSettings = {
  lapDisplayFormat: 'both',
  timerPrecision: 'centiseconds',
  hapticOnLap: true,
  keepScreenAwake: true,
  soundOnLap: false,
};

export const DEFAULT_SPRINT_PREDICTOR: SprintPredictorSettings = {
  defaultDistance: 100,
  showDelta: true,
  distanceUnit: 'meters',
};
