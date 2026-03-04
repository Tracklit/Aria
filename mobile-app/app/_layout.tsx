import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { AppProviders, useAuth } from '../src/context';
import { colors } from '../src/theme';
import { gluestackConfig } from '../src/theme/gluestack';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { ToastContainer } from '../src/components/Toast';

function RootLayoutNav() {
  const { isAuthenticated, isLoading, profile } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [forceReady, setForceReady] = useState(false);
  const ready = !isLoading || forceReady;

  useEffect(() => {
    console.info('[Root] auth snapshot', {
      isLoading,
      forceReady,
      isAuthenticated,
      onboardingCompleted: profile?.onboardingCompleted,
      segment0: segments[0],
    });
  }, [isLoading, forceReady, isAuthenticated, profile?.onboardingCompleted, segments]);

  useEffect(() => {
    if (!ready) return;

    const inAuthGroup = segments[0] === 'auth';
    const inOnboarding = segments[0] === 'onboarding';
    const inTabs = segments[0] === '(tabs)';
    const inWorkout = segments[0] === 'workout';
    const inPlan = segments[0] === 'plan';
    const inRaceDay = segments[0] === 'race-day';
    const inProfile = segments[0] === 'profile';
    const inTools = segments[0] === 'tools';
    const inNutrition = segments[0] === 'nutrition';
    const inPrograms = segments[0] === 'programs';
    const inAthleteInfo = segments[0] === 'athlete-info';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to welcome screen if not authenticated
      router.replace('/auth/welcome');
    } else if (isAuthenticated) {
      if (inAuthGroup) {
        // Redirect away from auth screens if authenticated
        if (profile?.onboardingCompleted) {
          router.replace('/(tabs)/dashboard');
        } else {
          router.replace('/onboarding/step1');
        }
      } else if (!profile?.onboardingCompleted && !inOnboarding) {
        // Redirect to onboarding if not completed
        router.replace('/onboarding/step1');
      } else if (
        profile?.onboardingCompleted &&
        !inTabs &&
        !inWorkout &&
        !inPlan &&
        !inRaceDay &&
        !inProfile &&
        !inTools &&
        !inNutrition &&
        !inPrograms &&
        !inAthleteInfo
      ) {
        // Redirect to dashboard if authenticated and onboarding is complete
        router.replace('/(tabs)/dashboard');
      }
    }
  }, [isAuthenticated, ready, profile?.onboardingCompleted, segments]);

  useEffect(() => {
    if (!isLoading) {
      setForceReady(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      console.warn('Auth still loading after 12s, proceeding with fallback routing');
      setForceReady(true);
    }, 12000);

    return () => clearTimeout(timeoutId);
  }, [isLoading]);

  if (!ready) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background.primary },
        }}
    >
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="workout" options={{ headerShown: false }} />
      <Stack.Screen name="plan" options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="race-day" options={{ headerShown: false, presentation: 'card' }} />
      <Stack.Screen name="profile" options={{ headerShown: false, presentation: 'card' }} />
      <Stack.Screen name="tools" options={{ headerShown: false }} />
      <Stack.Screen name="nutrition" options={{ headerShown: false }} />
      <Stack.Screen name="programs" options={{ headerShown: false }} />
      <Stack.Screen name="athlete-info" options={{ headerShown: false, presentation: 'card' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <GluestackUIProvider config={gluestackConfig as any}>
        <AppProviders>
          <StatusBar style="light" />
          <RootLayoutNav />
          <ToastContainer />
        </AppProviders>
      </GluestackUIProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
