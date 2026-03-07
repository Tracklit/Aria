import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SparklineChart } from '../charts';
import { useThemedStyles, spacing } from '../../theme';
import type { ThemeColors } from '../../theme/colors';

interface AdvancedAnalyticsCardProps {
  label: string;
  sparklineData: number[];
  value: string;
  badge?: 'Optimal' | 'Moderate' | 'Low' | string;
  sparklineColor?: string;
  progressPercent?: number;
}

function getBadgeColor(badge: string): string {
  switch (badge) {
    case 'Optimal':
      return '#32D74B';
    case 'Moderate':
      return '#FFD60A';
    case 'Low':
      return '#FF453A';
    default:
      return '#00E5FF';
  }
}

const AdvancedAnalyticsCard = React.memo(function AdvancedAnalyticsCard({
  label,
  sparklineData,
  value,
  badge,
  sparklineColor = '#00E5FF',
  progressPercent,
}: AdvancedAnalyticsCardProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container}>
      <View style={styles.leftCol}>
        <Text style={styles.label}>{label}</Text>
        <SparklineChart
          data={sparklineData}
          width={120}
          height={30}
          color={sparklineColor}
          strokeWidth={2}
        />
      </View>
      <View style={styles.rightCol}>
        <Text style={styles.value}>{value}</Text>
        {badge ? (
          <View style={[styles.badge, { backgroundColor: getBadgeColor(badge) + '22' }]}>
            <Text style={[styles.badgeText, { color: getBadgeColor(badge) }]}>{badge}</Text>
          </View>
        ) : null}
        {progressPercent != null ? (
          <View style={styles.progressBarTrack}>
            <View
              style={[styles.progressBarFill, { width: `${Math.round(Math.min(progressPercent, 100))}%` }]}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
});

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.background.cardSolid,
      borderRadius: 16,
      paddingVertical: spacing.md,
      paddingHorizontal: 20,
      marginBottom: 12,
    },
    leftCol: {
      flex: 1,
      marginRight: 12,
    },
    rightCol: {
      alignItems: 'flex-end',
    },
    label: {
      fontSize: 14,
      color: colors.text.primary,
      fontWeight: '600',
      marginBottom: spacing.sm,
    },
    value: {
      fontSize: 14,
      color: colors.text.primary,
      fontWeight: '600',
      marginBottom: 6,
    },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 8,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '600',
    },
    progressBarTrack: {
      height: 8,
      borderRadius: 4,
      width: 80,
      backgroundColor: colors.background.secondary,
      marginTop: 4,
    },
    progressBarFill: {
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
  });

export default AdvancedAnalyticsCard;
