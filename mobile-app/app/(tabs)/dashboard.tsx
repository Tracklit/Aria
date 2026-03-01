import React, { useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDashboard } from '../../src/context';
import { colors, typography, spacing, borderRadius } from '../../src/theme';
import { DashboardCard as DashboardCardType } from '../../src/context/DashboardContext';
import { DashboardCard } from '../../src/components/features';
import {
  SkeletonCard,
  SkeletonStatsCard,
  SkeletonWarningCard,
  SkeletonPatternCard,
  SkeletonInsightCard,
} from '../../src/components/ui/SkeletonLoader';
import { FadeIn } from '../../src/components/ui/FadeIn';

const screenWidth = Dimensions.get('window').width;

export default function DashboardScreen() {
  const {
    mode,
    greeting,
    subtitle,
    cards,
    insights,
    patterns,
    fatigueScore,
    isLoading,
    isGenerating,
    error,
    loadDashboard,
    refreshDashboard,
    loadPatterns,
    clearError,
  } = useDashboard();

  useEffect(() => {
    loadDashboard();
    loadPatterns(); // Load pattern recognition data
  }, [loadDashboard, loadPatterns]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      refreshDashboard(),
      loadPatterns(),
    ]);
  }, [refreshDashboard, loadPatterns]);

  const handleCardAction = useCallback((action: string, data?: any) => {
    switch (action) {
      case 'start_workout':
      case 'start_session':
        router.push('/workout/tracking');
        break;
      case 'view_plan':
        router.push('/(tabs)/plan');
        break;
      case 'view_race':
        // Navigate to race details
        break;
      default:
        console.log('Unhandled action:', action);
    }
  }, []);

  const renderCard = useCallback((card: DashboardCardType) => {
    return (
      <DashboardCard
        key={card.order}
        card={card}
        onCTAPress={handleCardAction}
      />
    );
  }, [handleCardAction]);

  // Memoize filtered patterns to avoid recomputing
  const highPriorityPatterns = useMemo(() => {
    return patterns?.filter((p) => p.severity === 'high' || p.severity === 'medium') || [];
  }, [patterns]);

  const renderLoading = useCallback(() => (
    <>
      <View style={styles.header}>
        <Text style={styles.greeting}>Loading...</Text>
        <Text style={styles.subtitle}>Getting your insights ready</Text>
      </View>
      <SkeletonWarningCard style={{ marginBottom: spacing.lg }} />
      <View style={{ gap: spacing.md, marginBottom: spacing.lg }}>
        <SkeletonPatternCard />
        <SkeletonPatternCard />
      </View>
      <View style={{ marginBottom: spacing.lg }}>
        <SkeletonInsightCard style={{ marginBottom: spacing.md }} />
        <SkeletonInsightCard style={{ marginBottom: spacing.md }} />
        <SkeletonInsightCard />
      </View>
      <View style={styles.cardsContainer}>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonStatsCard />
      </View>
    </>
  ), []);

  const renderError = useCallback(() => (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle-outline" size={48} color={colors.text.tertiary} />
      <Text style={styles.errorTitle}>Unable to Load Dashboard</Text>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={() => {
        clearError();
        loadDashboard();
      }}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  ), [error, clearError, loadDashboard]);

  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Ionicons name="analytics-outline" size={48} color={colors.text.tertiary} />
      <Text style={styles.emptyTitle}>No Insights Yet</Text>
      <Text style={styles.emptyText}>
        Start tracking your workouts to see personalized insights and recommendations.
      </Text>
    </View>
  ), []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {isLoading && cards.length === 0 ? (
          renderLoading()
        ) : error ? (
          renderError()
        ) : (
          <>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.greeting}>{greeting || 'Good morning!'}</Text>
              {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>

            {/* Fatigue Score Warning */}
            {fatigueScore && fatigueScore.riskLevel === 'high' && (
              <FadeIn delay={100} duration={500}>
                <View style={[styles.warningCard, { borderColor: colors.red + '50' }]}>
                  <View style={styles.warningHeader}>
                    <Ionicons name="warning" size={24} color={colors.red} />
                    <Text style={styles.warningTitle}>High Fatigue Detected</Text>
                  </View>
                  <Text style={styles.warningText}>
                    Fatigue Score: {fatigueScore.score}/100 ({fatigueScore.trend})
                  </Text>
                  <Text style={styles.warningRecommendation}>{fatigueScore.recommendation}</Text>
                  {fatigueScore.factors && fatigueScore.factors.length > 0 && (
                    <View style={styles.factorsList}>
                      {fatigueScore.factors.map((factor, index) => (
                        <Text key={index} style={styles.factorText}>• {factor}</Text>
                      ))}
                    </View>
                  )}
                </View>
              </FadeIn>
            )}

            {/* Training Pattern Warnings */}
            {highPriorityPatterns.length > 0 && (
              <View style={styles.patternsSection}>
                {highPriorityPatterns.map((pattern, index) => (
                    <FadeIn key={index} delay={200 + (index * 100)} duration={500}>
                      <View
                        style={[
                          styles.patternCard,
                          {
                            borderColor: pattern.severity === 'high'
                              ? colors.red + '50'
                              : colors.yellow + '50'
                          }
                        ]}
                      >
                        <View style={styles.patternHeader}>
                          <Ionicons
                            name={pattern.severity === 'high' ? 'alert-circle' : 'alert'}
                            size={20}
                            color={pattern.severity === 'high' ? colors.red : colors.yellow}
                          />
                          <Text style={styles.patternType}>{pattern.type.replace('_', ' ').toUpperCase()}</Text>
                          <Text style={styles.patternConfidence}>
                            {Math.round(pattern.confidence * 100)}% confident
                          </Text>
                        </View>
                        <Text style={styles.patternDescription}>{pattern.description}</Text>
                        <Text style={styles.patternRecommendation}>💡 {pattern.recommendation}</Text>
                      </View>
                    </FadeIn>
                  ))}
              </View>
            )}

            {/* AI Insights (if any) */}
            {isGenerating && (
              <>
                <View style={styles.generatingCard}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.generatingText}>Generating AI insights...</Text>
                </View>
                <View style={{ gap: spacing.md, marginBottom: spacing.lg }}>
                  <SkeletonInsightCard />
                  <SkeletonInsightCard />
                  <SkeletonInsightCard />
                </View>
              </>
            )}

            {insights && insights.length > 0 && (
              <FadeIn delay={300} duration={600}>
                <View style={styles.insightsSection}>
                  <Text style={styles.sectionTitle}>AI Insights</Text>
                  {insights.slice(0, 3).map((insight, index) => (
                    <FadeIn key={insight.id} delay={400 + (index * 100)} duration={500}>
                      <View
                        style={[
                          styles.insightCard,
                          {
                            borderColor: insight.type === 'warning'
                              ? colors.red + '30'
                              : insight.type === 'tip'
                              ? colors.teal + '30'
                              : insight.type === 'prediction'
                              ? colors.primary + '30'
                              : colors.green + '30'
                          }
                        ]}
                      >
                        <View style={styles.insightHeader}>
                          <Ionicons
                            name={
                              insight.type === 'warning'
                                ? 'warning-outline'
                                : insight.type === 'tip'
                                ? 'bulb-outline'
                                : insight.type === 'prediction'
                                ? 'trending-up-outline'
                                : 'happy-outline'
                            }
                            size={20}
                            color={
                              insight.type === 'warning'
                                ? colors.red
                                : insight.type === 'tip'
                                ? colors.teal
                                : insight.type === 'prediction'
                                ? colors.primary
                                : colors.green
                            }
                          />
                          <Text style={styles.insightTitle}>{insight.title}</Text>
                        </View>
                        <Text style={styles.insightMessage}>{insight.message}</Text>
                        {insight.suggestedAction && (
                          <Text style={styles.insightAction}>→ {insight.suggestedAction}</Text>
                        )}
                      </View>
                    </FadeIn>
                  ))}
                </View>
              </FadeIn>
            )}

            {/* Dynamic Cards */}
            {cards.length > 0 ? (
              <View style={styles.cardsContainer}>
                {cards.map((card, index) => (
                  <FadeIn key={card.order} delay={500 + (index * 100)} duration={500}>
                    {renderCard(card)}
                  </FadeIn>
                ))}
              </View>
            ) : (
              renderEmptyState()
            )}
          </>
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
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
  },
  header: {
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  greeting: {
    ...typography.h1,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.primary,
    fontSize: 17,
  },
  cardsContainer: {
    gap: spacing.lg,
  },

  // Card styles
  workoutCard: {
    backgroundColor: colors.background.cardSolid,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  competitionCard: {
    backgroundColor: colors.background.cardSolid,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.yellow + '30',
  },
  insightCard: {
    backgroundColor: colors.background.cardSolid,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.teal + '30',
  },
  streakCard: {
    backgroundColor: colors.background.cardSolid,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.orange + '30',
  },
  statsCard: {
    backgroundColor: colors.background.cardSolid,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.h3,
    color: colors.text.primary,
    flex: 1,
  },
  cardSubtitle: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  tipsContainer: {
    gap: spacing.sm,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  tipBullet: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: 2,
  },
  tipText: {
    ...typography.body,
    color: colors.text.secondary,
    flex: 1,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  ctaButtonText: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
  },

  // Stats card
  statsTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
    color: colors.text.secondary,
  },

  // Loading state
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 3,
  },
  loadingText: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },

  // Error state
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 3,
    paddingHorizontal: spacing.xl,
  },
  errorTitle: {
    ...typography.h2,
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  errorText: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  retryButtonText: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 3,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },

  // AI Insights & Warnings
  warningCard: {
    backgroundColor: colors.background.cardSolid,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 2,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  warningTitle: {
    ...typography.h3,
    color: colors.text.primary,
    flex: 1,
  },
  warningText: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  warningRecommendation: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  factorsList: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  factorText: {
    ...typography.caption,
    color: colors.text.secondary,
  },

  // Pattern Cards
  patternsSection: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  patternCard: {
    backgroundColor: colors.background.cardSolid,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
  },
  patternHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  patternType: {
    ...typography.caption,
    color: colors.text.primary,
    fontWeight: '600',
    flex: 1,
  },
  patternConfidence: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  patternDescription: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  patternRecommendation: {
    ...typography.caption,
    color: colors.text.primary,
    fontStyle: 'italic',
  },

  // Generating state
  generatingCard: {
    backgroundColor: colors.background.cardSolid,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  generatingText: {
    ...typography.body,
    color: colors.text.secondary,
  },

  // AI Insights
  insightsSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  insightCard: {
    backgroundColor: colors.background.cardSolid,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  insightTitle: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
    flex: 1,
  },
  insightMessage: {
    ...typography.body,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  insightAction: {
    ...typography.caption,
    color: colors.primary,
    marginTop: spacing.sm,
    fontWeight: '600',
  },
});
