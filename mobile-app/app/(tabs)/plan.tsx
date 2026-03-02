import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth, useWorkout } from '../../src/context';
import { colors } from '../../src/theme';

const formatDay = (date: string) =>
  new Date(date).toLocaleDateString('en-US', { weekday: 'long' });

export default function PlanScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { activePlan, plannedWorkouts, isLoading, loadTrainingPlans } = useWorkout();

  useEffect(() => {
    loadTrainingPlans();
  }, [loadTrainingPlans]);

  const displayName = profile?.displayName || 'Alex';
  const schedule = plannedWorkouts.slice(0, 7);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text testID="plan.title" style={styles.title}>Plan</Text>
          {profile?.photoUrl ? (
            <Image source={{ uri: profile.photoUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitial}>{displayName.charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </View>

        <Text style={styles.planFor}>TRAINING PLAN FOR {displayName.toUpperCase()}</Text>

        {activePlan ? (
          <>
            <LinearGradient colors={['#0d47a1', '#1976d2', '#004d40']} style={styles.goalCard}>
              <Text style={styles.goalTitle}>{activePlan.targetEventName || activePlan.planName}</Text>
              <Text style={styles.goalDate}>
                {activePlan.targetEventDate
                  ? new Date(activePlan.targetEventDate).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'May 15'}
              </Text>
            </LinearGradient>

            <View style={styles.scheduleSection}>
              <Text testID="plan.schedule_title" style={styles.scheduleTitle}>Schedule</Text>
              {schedule.length > 0 ? (
                schedule.map((item) => (
                  <View key={item.id} style={styles.dayRow}>
                    <Text style={styles.dayText}>{formatDay(item.date)}</Text>
                    <View style={styles.workoutCol}>
                      <Text style={styles.workoutType}>{item.title || item.type}</Text>
                      {item.description ? (
                        <Text style={styles.workoutDetails}>{item.description}</Text>
                      ) : null}
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.dayRow}>
                  <Text style={styles.dayText}>Tuesday</Text>
                  <Text style={styles.workoutType}>Rest Day</Text>
                </View>
              )}
            </View>
          </>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No Training Plan</Text>
            <Text style={styles.emptyText}>
              Create a personalized plan to match your goal event and current level.
            </Text>
            <TouchableOpacity
              testID="plan.create_with_aria"
              style={styles.primaryBtn}
              onPress={() => router.push('/(tabs)/chat')}
            >
              <Text style={styles.primaryBtnText}>Create with Aria</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="plan.create_manually"
              style={styles.secondaryBtn}
              onPress={() => router.push('/plan/create')}
            >
              <Text style={styles.secondaryBtnText}>Create Manually</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 130,
  },
  header: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: '700',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderColor: '#00E5FF',
    borderWidth: 2,
  },
  avatarFallback: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderColor: '#00E5FF',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
  },
  avatarInitial: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 24,
  },
  planFor: {
    marginTop: 12,
    color: '#00E5FF',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
  },
  goalCard: {
    marginTop: 16,
    borderRadius: 16,
    padding: 24,
  },
  goalTitle: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: '600',
    marginBottom: 8,
  },
  goalDate: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '500',
  },
  scheduleSection: {
    marginTop: 18,
  },
  scheduleTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 14,
  },
  dayRow: {
    borderRadius: 12,
    marginBottom: 8,
    padding: 16,
    backgroundColor: '#0c0c0e',
    borderBottomWidth: 1,
    borderBottomColor: '#1c1c1e',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  dayText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
    minWidth: 90,
  },
  workoutCol: {
    flex: 1,
    alignItems: 'flex-end',
  },
  workoutType: {
    color: '#007AFF',
    fontSize: 16,
  },
  workoutDetails: {
    color: '#AAAAAA',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'right',
  },
  emptyCard: {
    marginTop: 28,
    padding: 20,
    backgroundColor: '#111',
    borderRadius: 16,
  },
  emptyTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: {
    color: '#AAA',
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 16,
  },
  primaryBtn: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    marginBottom: 10,
  },
  primaryBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryBtn: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#007AFF',
    borderWidth: 1,
  },
  secondaryBtnText: {
    color: '#007AFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
