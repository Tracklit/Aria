import React, { useEffect, useMemo } from 'react';
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
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth, useDashboard, useWorkout } from '../../src/context';
import { colors } from '../../src/theme';

function getDisplayName(profileName?: string | null, greeting?: string) {
  if (profileName?.trim()) return profileName.trim();
  if (!greeting) return 'Alex';
  const match = greeting.match(/,\s*(.+)$/);
  return match?.[1]?.trim() || 'Alex';
}

export default function DashboardScreen() {
  const { profile } = useAuth();
  const { startWorkoutSession, todaysWorkout, loadTodaysWorkout } = useWorkout();
  const {
    greeting,
    subtitle,
    cards,
    insights,
    fatigueScore,
    isLoading,
    loadDashboard,
    loadPatterns,
    refreshDashboard,
  } = useDashboard();

  useEffect(() => {
    loadDashboard();
    loadPatterns();
    loadTodaysWorkout();
  }, [loadDashboard, loadPatterns, loadTodaysWorkout]);

  const displayName = useMemo(
    () => getDisplayName(profile?.displayName, greeting),
    [profile?.displayName, greeting]
  );

  const workoutCard = cards.find((card) => card.type === 'workout_card');
  const workoutTitle = workoutCard?.title || 'Sprint Intervals';
  const workoutSubtitle = workoutCard?.subtitle || '6 × 150m, 90% effort';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.microphoneContainer}>
          <View style={styles.microphoneBubble}>
            <Ionicons name="mic-outline" size={20} color={colors.teal} />
          </View>
        </View>

        <Text style={styles.greeting}>Good Morning, {displayName}</Text>
        <Text style={styles.subtitle}>{subtitle || "Let's get faster today 🚀"}</Text>

        <View style={styles.avatarWrap}>
          {profile?.photoUrl ? (
            <Image source={{ uri: profile.photoUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitial}>{displayName.charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </View>

        {fatigueScore?.riskLevel === 'high' && (
          <View style={styles.warningCard}>
            <View style={styles.warningHeader}>
              <Ionicons name="warning-outline" size={20} color="#FF3B30" />
              <Text style={styles.warningTitle}>High Fatigue Detected</Text>
            </View>
            <Text style={styles.warningText}>
              Fatigue Score: {fatigueScore.score}/100 ({fatigueScore.trend})
            </Text>
            {(fatigueScore.factors || []).slice(0, 2).map((factor, index) => (
              <Text key={`${factor}-${index}`} style={styles.factorText}>
                • {factor}
              </Text>
            ))}
            <Text style={styles.warningRecommendation}>
              Recommendation: {fatigueScore.recommendation}
            </Text>
          </View>
        )}

        <LinearGradient
          colors={['#0d47a1', '#1976d2', '#004d40']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.workoutCard}
        >
          <Text style={styles.workoutTitle}>{workoutTitle}</Text>
          <Text style={styles.workoutSubtitle}>{workoutSubtitle}</Text>
          <TouchableOpacity
            testID="dashboard.start_session"
            style={styles.workoutButton}
            onPress={async () => {
              try {
                await startWorkoutSession(todaysWorkout?.id);
              } catch (error) {
                // Keep navigation responsive; workout screen can handle fallback states.
              } finally {
                router.push('/workout/tracking');
              }
            }}
          >
            <Text style={styles.workoutButtonText}>Start Session</Text>
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Race Day Insights</Text>
          <LinearGradient
            colors={['rgba(88,86,214,0.4)', 'rgba(0,229,255,0.2)']}
            style={styles.raceCard}
          >
            <Text style={styles.raceEmoji}>🎉</Text>
            <Text style={styles.raceTitle}>Congrats {displayName}!</Text>
            <Text style={styles.raceMessage}>
              You&apos;re officially ready for the Half Marathon. Here&apos;s your final race day strategy.
            </Text>
            <TouchableOpacity
              testID="dashboard.view_strategy"
              style={styles.raceButton}
              onPress={() => router.push('/race-day')}
            >
              <Text style={styles.raceButtonText}>View Strategy</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Insights</Text>
          {isLoading && insights.length === 0 ? (
            <View style={styles.loadingState}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            (insights.slice(0, 3).length > 0
              ? insights.slice(0, 3)
              : [
                  {
                    id: 0,
                    title: 'Form Improvement',
                    message:
                      'Your cadence has improved by 4 BPM over the last two weeks, reducing impact stress on your knees.',
                    suggestedAction: 'View Form Analysis',
                  },
                ]
            ).map((insight) => (
              <TouchableOpacity
                key={String(insight.id)}
                testID={`dashboard.insight.${insight.id}`}
                style={styles.insightCard}
                onPress={() => router.push('/(tabs)/chat')}
              >
                <View style={styles.insightHeader}>
                  <Ionicons name="bulb-outline" size={18} color={colors.green} />
                  <Text style={styles.insightTitle}>{insight.title}</Text>
                </View>
                <Text style={styles.insightText}>{insight.message}</Text>
                {insight.suggestedAction ? (
                  <Text style={styles.insightAction}>→ {insight.suggestedAction}</Text>
                ) : null}
              </TouchableOpacity>
            ))
          )}
        </View>

        <TouchableOpacity testID="dashboard.refresh" style={styles.refresh} onPress={refreshDashboard}>
          <Ionicons name="refresh" size={16} color={colors.primary} />
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 130,
  },
  microphoneContainer: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  microphoneBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: '500',
    color: '#00E5FF',
    textAlign: 'center',
  },
  avatarWrap: {
    alignItems: 'center',
    marginVertical: 26,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#00E5FF',
  },
  avatarFallback: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#00E5FF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111111',
  },
  avatarInitial: {
    color: '#fff',
    fontSize: 46,
    fontWeight: '700',
  },
  warningCard: {
    marginHorizontal: 24,
    backgroundColor: 'rgba(255,59,48,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.45)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  warningTitle: {
    marginLeft: 8,
    color: '#FF3B30',
    fontWeight: '700',
    fontSize: 16,
  },
  warningText: {
    color: '#FFF',
    fontSize: 14,
    marginBottom: 4,
  },
  factorText: {
    color: '#CCC',
    fontSize: 13,
    marginBottom: 2,
  },
  warningRecommendation: {
    color: '#FFF',
    fontSize: 13,
    marginTop: 6,
    fontWeight: '600',
  },
  workoutCard: {
    marginHorizontal: 24,
    borderRadius: 20,
    padding: 20,
  },
  workoutTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 4,
  },
  workoutSubtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 16,
    marginBottom: 18,
  },
  workoutButton: {
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingVertical: 14,
    alignItems: 'center',
  },
  workoutButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 14,
  },
  raceCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(88,86,214,0.5)',
  },
  raceEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  raceTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 6,
  },
  raceMessage: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  raceButton: {
    backgroundColor: '#111111',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  raceButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
  loadingState: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  insightCard: {
    backgroundColor: 'rgba(0,230,118,0.08)',
    borderLeftWidth: 3,
    borderLeftColor: '#00E676',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  insightTitle: {
    marginLeft: 8,
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  insightText: {
    color: '#D5D5D5',
    fontSize: 14,
    lineHeight: 20,
  },
  insightAction: {
    color: '#00E676',
    fontWeight: '600',
    marginTop: 6,
    fontSize: 13,
  },
  refresh: {
    marginTop: 6,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  refreshText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
});
