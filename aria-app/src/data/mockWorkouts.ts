import { WorkoutMetrics, DayWorkout } from '../types';

// Mock training plan interface for development/demo purposes
// Uses a simplified structure distinct from the API-based TrainingPlan type
export interface MockTrainingPlan {
  goal: string;
  date: string;
  schedule: Array<{ day: string; type: string; details?: string }>;
}

export const mockTrainingPlan: MockTrainingPlan = {
  goal: 'Half Marathon',
  date: 'May 15',
  schedule: [
    { day: 'Tuesday', type: 'Rest Day' },
    { day: 'Wednesday', type: 'Intervals', details: '5 × 400m, 90% effort' },
    { day: 'Thursday', type: 'Cross Training' },
    { day: 'Friday', type: 'Intervals' },
  ],
};

export const mockCurrentWorkout: WorkoutMetrics = {
  type: 'Sprint Intervals',
  duration: 502, // seconds (08:22)
  distance: 3.12,
  pace: '4:24',
  heartRate: 158,
  spm: 180,
  status: 'recovery',
};

export const mockWeeklyPlan: DayWorkout[] = [
  { day: 'Monday', duration: '32 min', type: 'Run' },
  { day: 'Tuesday', duration: '44 min', type: 'Run' },
  { day: 'Wednesday', duration: '24 min', type: 'Run' },
  { day: 'Thursday', duration: '40 min', type: 'Run' },
  { day: 'Friday', type: 'Rest' },
  { day: 'Saturday', duration: '60 min', type: 'Long Run' },
  { day: 'Sunday', duration: '36 min', type: 'Run' },
];

export const mockCompetitionDiet = {
  breakfast: 'Oatmeal with blueberries and honey',
  snack: 'Greek yogurt with a handful of almonds',
  lunch: 'Grilled salmon with quinoa or sweet potato',
  preRace: 'Energy bar + water',
};

export const mockCompetitionTips = [
  'Warm-up properly to prevent injury',
  'Stretch before your run',
  'Focus on powering through the first 30 meters',
];

export const mockCompetitionDietAlex = {
  breakfast: 'Oatmeal with fruit',
  lunch: 'Turkey sandwich',
  snack: 'Banana',
};

export const mockCompetitionTipsAlex = [
  'Stay relaxed at the start',
  'Drive with your arms',
];
