import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, Button } from '../../src/components/ui';
import { ScheduleItem, PlanGoalCard } from '../../src/components/features';
import { useAuth, useWorkout } from '../../src/context';
import { colors, typography, spacing } from '../../src/theme';

export default function PlanScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { activePlan, plannedWorkouts, isLoading, loadTrainingPlans } = useWorkout();

  useEffect(() => {
    loadTrainingPlans();
  }, [loadTrainingPlans]);

  const displayName = profile?.displayName || 'Athlete';

  const handleCreateWithAria = () => {
    router.push('/(tabs)/chat');
  };

  const handleCreateManually = () => {
    router.push('/plan/create');
  };

  // Group workouts by week for display
  const upcomingWorkouts = plannedWorkouts
    .filter((w) => new Date(w.date) >= new Date())
    .slice(0, 7);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Plan</Text>
          <Avatar uri={profile?.photoUrl || undefined} size="medium" showGradientRing />
        </View>

        <Text style={styles.subtitle}>TRAINING PLAN FOR {displayName.toUpperCase()}</Text>

        {activePlan ? (
          <>
            <PlanGoalCard
              goalName={activePlan.targetEventName || activePlan.planName}
              targetDate={activePlan.targetEventDate || undefined}
            />

            <View style={styles.scheduleSection}>
              <Text style={styles.scheduleTitle}>Schedule</Text>
              {upcomingWorkouts.length > 0 ? (
                upcomingWorkouts.map((workout, index) => {
                  const date = new Date(workout.date);
                  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
                  return (
                    <ScheduleItem
                      key={workout.id || index}
                      day={dayName}
                      type={workout.title || workout.type}
                      details={workout.description || undefined}
                    />
                  );
                })
              ) : (
                <Text style={styles.noWorkoutsText}>No upcoming workouts scheduled</Text>
              )}
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyStateIconContainer}>
              <Ionicons name="calendar-outline" size={64} color={colors.text.tertiary} />
            </View>
            <Text style={styles.emptyStateTitle}>No Training Plan</Text>
            <Text style={styles.emptyStateText}>
              Create a personalized training plan to reach your running goals
            </Text>
            <View style={styles.buttonContainer}>
              <Button
                title="Create with Aria"
                onPress={handleCreateWithAria}
                style={styles.createPlanButton}
              />
              <Button
                title="Create Manually"
                onPress={handleCreateManually}
                variant="secondary"
                style={styles.createPlanButton}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h1,
    color: colors.text.primary,
  },
  subtitle: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: spacing.lg,
  },
  scheduleSection: {
    marginTop: spacing.md,
  },
  scheduleTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  noWorkoutsText: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
  },
  emptyStateIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.background.cardSolid,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyStateTitle: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyStateText: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 280,
    gap: spacing.md,
  },
  createPlanButton: {
    width: '100%',
  },
});
