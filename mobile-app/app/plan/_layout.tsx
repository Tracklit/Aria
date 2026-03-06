import { Stack } from 'expo-router';
import { useColors } from '../../src/theme';

export default function PlanLayout() {
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
