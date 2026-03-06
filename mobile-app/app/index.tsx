import { View, ActivityIndicator } from 'react-native';
import { useColors } from '../src/theme';

export default function Index() {
  const colors = useColors();
  // The root layout handles all navigation based on auth state
  // This screen just shows a loading state while that happens
  return (
    <View style={{ flex: 1, backgroundColor: colors.background.primary, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}
