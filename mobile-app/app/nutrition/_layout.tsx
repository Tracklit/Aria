import { Stack } from 'expo-router';
import { colors } from '../../src/theme';

export default function NutritionLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background.primary } }} />
  );
}
