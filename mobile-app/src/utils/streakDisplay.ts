interface StreakBadge {
  title: string;
  icon: string;
  color: string;
}

export function getStreakBadge(streak: number): StreakBadge | null {
  if (streak <= 0) return null;

  if (streak <= 2) {
    return { title: 'Just Started', icon: 'flame-outline', color: '#FF9F0A' };
  }
  if (streak <= 6) {
    return { title: 'Getting Started', icon: 'flame', color: '#FF9F0A' };
  }
  if (streak <= 13) {
    return { title: 'Consistency King', icon: 'trophy', color: '#FFD60A' };
  }
  if (streak <= 29) {
    return { title: 'Two Week Warrior', icon: 'medal', color: '#FFD60A' };
  }
  return { title: 'Monthly Master', icon: 'star', color: '#32D74B' };
}
