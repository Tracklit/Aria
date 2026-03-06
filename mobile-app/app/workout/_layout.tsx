import { Stack } from 'expo-router';
import { useColors } from '../../src/theme';

export default function WorkoutLayout() {
  const colors = useColors();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background.primary },
        animation: 'slide_from_bottom',
      }}
    >
      <Stack.Screen name="tracking" />
      <Stack.Screen name="live-session" />
      <Stack.Screen name="log-workout" />
    </Stack>
  );
}
