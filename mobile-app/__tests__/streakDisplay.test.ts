import { getStreakBadge } from '../src/utils/streakDisplay';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`  PASS: ${message}`);
}

console.log('\n🏆  Testing getStreakBadge...\n');

// Null cases
assert(getStreakBadge(0) === null, '0 streak returns null');
assert(getStreakBadge(-1) === null, 'Negative streak returns null');

// Just Started (1-2)
assert(getStreakBadge(1)?.title === 'Just Started', '1-day streak: Just Started');
assert(getStreakBadge(2)?.title === 'Just Started', '2-day streak: Just Started');
assert(getStreakBadge(1)?.icon === 'flame-outline', '1-day icon: flame-outline');

// Getting Started (3-6)
assert(getStreakBadge(3)?.title === 'Getting Started', '3-day streak: Getting Started');
assert(getStreakBadge(6)?.title === 'Getting Started', '6-day streak: Getting Started');
assert(getStreakBadge(5)?.icon === 'flame', '5-day icon: flame');

// Consistency King (7-13)
assert(getStreakBadge(7)?.title === 'Consistency King', '7-day streak: Consistency King');
assert(getStreakBadge(13)?.title === 'Consistency King', '13-day streak: Consistency King');
assert(getStreakBadge(10)?.icon === 'trophy', '10-day icon: trophy');
assert(getStreakBadge(10)?.color === '#FFD60A', '10-day color: gold');

// Two Week Warrior (14-29)
assert(getStreakBadge(14)?.title === 'Two Week Warrior', '14-day streak: Two Week Warrior');
assert(getStreakBadge(29)?.title === 'Two Week Warrior', '29-day streak: Two Week Warrior');
assert(getStreakBadge(20)?.icon === 'medal', '20-day icon: medal');

// Monthly Master (30+)
assert(getStreakBadge(30)?.title === 'Monthly Master', '30-day streak: Monthly Master');
assert(getStreakBadge(100)?.title === 'Monthly Master', '100-day streak: Monthly Master');
assert(getStreakBadge(30)?.icon === 'star', '30-day icon: star');
assert(getStreakBadge(30)?.color === '#32D74B', '30-day color: green');

// All badges have required properties
for (const streak of [1, 3, 7, 14, 30]) {
  const badge = getStreakBadge(streak);
  assert(badge !== null, `Streak ${streak} returns a badge`);
  assert(typeof badge!.title === 'string', `Streak ${streak} badge has title`);
  assert(typeof badge!.icon === 'string', `Streak ${streak} badge has icon`);
  assert(typeof badge!.color === 'string', `Streak ${streak} badge has color`);
}

console.log('\n✅ All streakDisplay tests passed!\n');
