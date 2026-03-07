interface WorkoutForStreak {
  completedDate?: string | null;
  status?: string;
}

/**
 * Calculate current workout streak
 *
 * Counts consecutive days with completed workouts.
 * Breaks if more than 1 day gap between workouts.
 *
 * @param workouts All completed workouts (sorted by date desc)
 * @returns Current streak count (days)
 */
export function calculateStreak(workouts: WorkoutForStreak[]): number {
  if (!workouts || workouts.length === 0) return 0;

  // Get completed workouts sorted by date (most recent first)
  const completed = workouts
    .filter((w) => w.completedDate && w.status === 'completed')
    .sort((a, b) =>
      new Date(b.completedDate!).getTime() - new Date(a.completedDate!).getTime()
    );

  if (completed.length === 0) return 0;

  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0); // Start of today

  for (const workout of completed) {
    const workoutDate = new Date(workout.completedDate!);
    workoutDate.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor(
      (currentDate.getTime() - workoutDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Allow today or yesterday
    if (daysDiff === 0 || daysDiff === 1) {
      streak++;
      currentDate = workoutDate;
    } else if (daysDiff > 1) {
      // Gap detected, streak broken
      break;
    }
  }

  return streak;
}
