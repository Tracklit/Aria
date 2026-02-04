import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../src/theme';

export default function Index() {
  // The root layout handles all navigation based on auth state
  // This screen just shows a loading state while that happens
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
