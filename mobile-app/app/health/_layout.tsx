import { Stack } from 'expo-router';
import { useColors } from '../../src/theme';

export default function HealthLayout() {
  const colors = useColors();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background.primary },
      }}
    />
  );
}
