const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function getDayLabel(dayNumber: number): string {
  return WEEKDAYS[(dayNumber - 1) % 7];
}

export function safeParseExercises(exercises: unknown): Array<{ name: string; sets?: number; reps?: string | number; duration?: number; rest?: number; notes?: string }> {
  if (!exercises) return [];
  if (Array.isArray(exercises)) return exercises;
  if (typeof exercises === 'string') {
    try { return JSON.parse(exercises); } catch { return []; }
  }
  return [];
}
