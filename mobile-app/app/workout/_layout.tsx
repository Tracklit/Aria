import { Stack } from 'expo-router';
import { colors } from '../../src/theme';

export default function WorkoutLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background.primary },
        animation: 'slide_from_bottom',
      }}
    >
      <Stack.Screen name="tracking" />
    </Stack>
  );
}
