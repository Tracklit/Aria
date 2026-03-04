import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp, useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth, useDashboard, useWorkout } from '../../src/context';
import { colors, spacing, borderRadius } from '../../src/theme';

function getDisplayName(profileName?: string | null, greeting?: string) {
  if (profileName?.trim()) return profileName.trim();
  if (!greeting) return 'Athlete';
  const match = greeting.match(/,\s*(.+)$/);
  return match?.[1]?.trim() || 'Athlete';
}

export default function DashboardScreen() {
  const reducedMotion = useReducedMotion();
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

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshDashboard();
    } finally {
      setRefreshing(false);
    }
  }, [refreshDashboard]);

  useEffect(() => {
    loadDashboard();
    loadPatterns();
    loadTodaysWorkout();
  }, [loadDashboard, loadPatterns, loadTodaysWorkout]);

  const displayName = useMemo(
    () => getDisplayName(profile?.displayName, greeting),
    [profile?.displayName, greeting]
  );

  const [chatInput, setChatInput] = useState('');

  const navigateToChat = (message?: string) => {
    const text = message || chatInput;
    if (text.trim()) {
      router.push({ pathname: '/(tabs)/chat', params: { prefill: text.trim() } });
    } else {
      router.push('/(tabs)/chat');
    }
    setChatInput('');
  };

  const suggestionChips = [
    'What should I train today?',
    'Analyze my last sprint',
    'Help me warm up',
  ];

  const workoutCard = cards.find((card) => card.type === 'workout_card');
  const workoutTitle = workoutCard?.title || 'Sprint Intervals';
  const workoutSubtitle = workoutCard?.subtitle || '6 x 150m, 90% effort';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <Animated.View entering={reducedMotion ? undefined : FadeInDown.duration(400)} style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.greeting}>Good Morning, {displayName}</Text>
            <Text style={styles.subtitle}>{subtitle || "Let's get faster today"}</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.avatarWrap}>
              {profile?.photoUrl ? (
                <Image source={{ uri: profile.photoUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitial}>{displayName.charAt(0).toUpperCase()}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              testID="dashboard.settings"
              style={styles.settingsButton}
              onPress={() => router.push('/(tabs)/more')}
            >
              <Ionicons name="settings-outline" size={22} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        <Animated.View entering={reducedMotion ? undefined : FadeInUp.duration(400).delay(50)} style={styles.chatSection}>
          <View style={styles.chatHeader}>
            <Ionicons name="sparkles" size={16} color={colors.primary} />
            <Text style={styles.chatLabel}>Ask Aria</Text>
          </View>
          <View style={styles.chipsWrap}>
            {suggestionChips.map((chip) => (
              <TouchableOpacity
                key={chip}
                testID={`dashboard.chip.${chip.replace(/[^a-zA-Z0-9]+/g, '_')}`}
                style={styles.chip}
                onPress={() => navigateToChat(chip)}
              >
                <Text style={styles.chipText}>{chip}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.chatInputRow}>
            <TouchableOpacity
              testID="dashboard.mic"
              style={styles.micButton}
              onPress={() => router.push('/(tabs)/chat')}
            >
              <Ionicons name="mic" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <TextInput
              testID="dashboard.chat_input"
              style={styles.chatInput}
              placeholder="Ask Aria anything..."
              placeholderTextColor={colors.text.tertiary}
              value={chatInput}
              onChangeText={setChatInput}
              onSubmitEditing={() => navigateToChat()}
              returnKeyType="send"
            />
          </View>
        </Animated.View>

        {fatigueScore?.riskLevel === 'high' && (
          <Animated.View entering={reducedMotion ? undefined : FadeInUp.duration(400).delay(50)} style={styles.warningCard}>
            <View style={styles.warningHeader}>
              <Ionicons name="warning-outline" size={20} color={colors.red} />
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
          </Animated.View>
        )}

        <Animated.View entering={reducedMotion ? undefined : FadeInUp.duration(500).delay(100)}>
        <LinearGradient
          colors={colors.gradient.workout}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.workoutCard}
        >
          <Text style={styles.workoutLabel}>Today's Workout</Text>
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
        </Animated.View>

        <Animated.View entering={reducedMotion ? undefined : FadeInUp.duration(400).delay(50)} style={styles.section}>
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
            ).map((insight, idx) => {
              const insightColors = ['#00E676', '#00E5FF', '#7C4DFF'];
              const insightIcons: Array<keyof typeof Ionicons.glyphMap> = ['bulb-outline', 'trending-up-outline', 'fitness-outline'];
              const accent = insightColors[idx % insightColors.length];
              const icon = insightIcons[idx % insightIcons.length];
              return (
              <Animated.View key={String(insight.id)} entering={reducedMotion ? undefined : FadeInUp.duration(400).delay(200 + idx * 80)}>
              <TouchableOpacity
                testID={`dashboard.insight.${insight.id}`}
                style={[styles.insightCard, { borderLeftColor: accent, backgroundColor: `${accent}14` }]}
                onPress={() => router.push('/(tabs)/chat')}
              >
                <View style={styles.insightHeader}>
                  <Ionicons name={icon} size={18} color={accent} />
                  <Text style={styles.insightTitle}>{insight.title}</Text>
                </View>
                <Text style={styles.insightText}>{insight.message}</Text>
                {insight.suggestedAction ? (
                  <Text style={styles.insightAction}>{insight.suggestedAction}</Text>
                ) : null}
              </TouchableOpacity>
              </Animated.View>
              );
            })
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 130,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginTop: 16,
    marginBottom: 24,
  },
  headerText: {
    flex: 1,
    marginRight: 12,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '500',
    color: colors.teal,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsButton: {
    padding: 4,
  },
  avatarWrap: {},
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.teal,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.secondary,
  },
  avatarInitial: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '700',
  },
  chatSection: {
    marginHorizontal: 24,
    marginBottom: spacing.lg,
    backgroundColor: colors.background.cardSolid,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    paddingTop: spacing.lg,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.md,
  },
  chatLabel: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.md,
  },
  chip: {
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipText: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '500',
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  micButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatInput: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text.primary,
    fontSize: 15,
  },
  warningCard: {
    marginHorizontal: 24,
    backgroundColor: 'rgba(255,69,58,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,69,58,0.45)',
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
    color: colors.red,
    fontWeight: '700',
    fontSize: 16,
  },
  warningText: {
    color: colors.text.primary,
    fontSize: 14,
    marginBottom: 4,
  },
  factorText: {
    color: colors.text.secondary,
    fontSize: 13,
    marginBottom: 2,
  },
  warningRecommendation: {
    color: colors.text.primary,
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
    color: colors.text.primary,
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
    backgroundColor: '#FFF',
    paddingVertical: 14,
    alignItems: 'center',
  },
  workoutButtonText: {
    color: '#0d47a1',
    fontSize: 16,
    fontWeight: '700',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    color: colors.text.primary,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 14,
  },
  loadingState: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  workoutLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    marginBottom: 4,
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
    color: colors.text.primary,
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
});
