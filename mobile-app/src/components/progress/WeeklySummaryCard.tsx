import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SmoothAreaChart } from '../charts';
import { useColors, spacing } from '../../theme';
import type { ThemeColors } from '../../theme/colors';
import { useThemedStyles } from '../../theme';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface WeeklySummaryCardProps {
  dailyDurations: number[];
  miles: number;
  duration: { hours: number; mins: number };
  avgPace: string;
}

const WeeklySummaryCard = React.memo(function WeeklySummaryCard({
  dailyDurations,
  miles,
  duration,
  avgPace,
}: WeeklySummaryCardProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container}>
      <Text testID="progress.weekly_summary" style={styles.cardTitle}>
        Weekly Summary
      </Text>

      <View style={styles.chartWrap}>
        <SmoothAreaChart
          data={dailyDurations}
          labels={DAY_LABELS}
          height={130}
          strokeWidth={2.5}
        />
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statMain}>{miles.toFixed(1)} mi</Text>
          <Text style={styles.statSub}>Distance</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statMain}>
            {duration.hours}h {duration.mins}m
          </Text>
          <Text style={styles.statSub}>Duration</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statMain}>{avgPace}</Text>
          <Text style={styles.statSub}>Avg. Pace</Text>
        </View>
      </View>
    </View>
  );
});

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.background.cardSolid,
      borderRadius: 20,
      padding: spacing.lg,
      marginHorizontal: spacing.lg,
      marginTop: 20,
    },
    cardTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: 4,
    },
    chartWrap: {
      marginTop: 12,
    },
    statsGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: spacing.md,
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
    },
    statMain: {
      fontSize: 20,
      color: colors.text.primary,
      fontWeight: '700',
      marginBottom: 4,
    },
    statSub: {
      fontSize: 12,
      color: colors.text.secondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
  });

export default WeeklySummaryCard;
