import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { DashboardCard as DashboardCardType } from '../../context/DashboardContext';

interface DashboardCardProps {
  card: DashboardCardType;
  onCTAPress?: (action: string, data?: any) => void;
  style?: ViewStyle;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({ card, onCTAPress, style }) => {
  const getIconForType = () => {
    switch (card.type) {
      case 'workout_card':
        return <Ionicons name="barbell" size={24} color={colors.teal} />;
      case 'competition_card':
        return <Ionicons name="trophy" size={24} color={colors.yellow} />;
      case 'insight_card':
        return <Ionicons name="bulb" size={24} color={colors.primary} />;
      case 'streak_card':
        return <Ionicons name="flame" size={24} color={colors.orange} />;
      case 'stats_row':
        return <Ionicons name="stats-chart" size={24} color={colors.primary} />;
    }
  };

  const handleCTAPress = () => {
    if (card.cta && onCTAPress) {
      onCTAPress(card.cta.action, card.cta.data);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>{getIconForType()}</View>
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {card.title}
          </Text>
          {card.subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {card.subtitle}
            </Text>
          )}
        </View>
      </View>

      {card.content && (
        <View style={styles.contentContainer}>
          {typeof card.content === 'string' ? (
            <Text style={styles.contentText}>{card.content}</Text>
          ) : (
            renderContent(card.content, card.type)
          )}
        </View>
      )}

      {card.cta && (
        <TouchableOpacity style={styles.ctaButton} onPress={handleCTAPress} activeOpacity={0.7}>
          <Text style={styles.ctaButtonText}>{card.cta.label}</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.teal} />
        </TouchableOpacity>
      )}
    </View>
  );
};

// Helper function to render different content types
const renderContent = (content: any, type: string) => {
  if (type === 'stats_row' && content.stats) {
    return (
      <View style={styles.statsGrid}>
        {content.stats.map((stat: any, index: number) => (
          <View key={index} style={styles.statItem}>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>
    );
  }

  if (type === 'workout_card' && content.details) {
    return (
      <View style={styles.workoutDetails}>
        {content.details.map((detail: any, index: number) => (
          <View key={index} style={styles.detailRow}>
            <Ionicons name={detail.icon} size={16} color={colors.text.secondary} />
            <Text style={styles.detailText}>{detail.text}</Text>
          </View>
        ))}
      </View>
    );
  }

  if (type === 'competition_card' && content.daysUntil !== undefined) {
    return (
      <View style={styles.competitionContent}>
        <View style={styles.daysContainer}>
          <Text style={styles.daysNumber}>{content.daysUntil}</Text>
          <Text style={styles.daysLabel}>days until race</Text>
        </View>
        {content.tips && (
          <Text style={styles.tipsText} numberOfLines={3}>
            {content.tips}
          </Text>
        )}
      </View>
    );
  }

  if (type === 'streak_card' && content.days !== undefined) {
    return (
      <View style={styles.streakContent}>
        <View style={styles.streakBadge}>
          <Ionicons name="flame" size={32} color={colors.orange} />
          <Text style={styles.streakNumber}>{content.days}</Text>
        </View>
        <Text style={styles.streakMessage}>{content.message}</Text>
      </View>
    );
  }

  return <Text style={styles.contentText}>{JSON.stringify(content)}</Text>;
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.cardSolid,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: 2,
  },
  subtitle: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  contentContainer: {
    marginBottom: spacing.md,
  },
  contentText: {
    ...typography.body,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.sm,
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
  workoutDetails: {
    gap: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  competitionContent: {
    gap: spacing.md,
  },
  daysContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
  },
  daysNumber: {
    ...typography.display,
    fontSize: 48,
    color: colors.yellow,
    fontWeight: 'bold',
  },
  daysLabel: {
    ...typography.body,
    color: colors.text.secondary,
  },
  tipsText: {
    ...typography.body,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  streakContent: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  streakBadge: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  streakNumber: {
    position: 'absolute',
    ...typography.h2,
    color: colors.text.primary,
    fontWeight: 'bold',
  },
  streakMessage: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.teal + '20',
  },
  ctaButtonText: {
    ...typography.body,
    color: colors.teal,
    fontWeight: '600',
  },
});
