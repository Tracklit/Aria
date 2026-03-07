import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import CircularGauge from '../charts/CircularGauge';
import { useColors, spacing, borderRadius } from '../../theme';

interface LatestStatsRowProps {
  weeklyMiles: number;
  weeklyMilesGoal?: number;
  latestPace: string;
  sleepHours: number | null;
}

const LatestStatsRow = React.memo(function LatestStatsRow({
  weeklyMiles,
  weeklyMilesGoal = 20,
  latestPace,
  sleepHours,
}: LatestStatsRowProps) {
  const colors = useColors();

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => router.push('/(tabs)/progress')}
      style={[styles.row, { backgroundColor: colors.background.cardSolid }]}
    >
      <CircularGauge
        value={weeklyMiles}
        maxValue={weeklyMilesGoal}
        size={90}
        color="#00E5FF"
        label="Distance"
        unit="mi"
        valueFormatter={(v) => v.toFixed(1)}
      />
      <View style={styles.paceContainer}>
        <Text style={[styles.paceValue, { color: colors.text.primary }]}>
          {latestPace || '--:--'}
        </Text>
        <Text style={[styles.paceUnit, { color: colors.text.tertiary }]}>/mi</Text>
        <Text style={[styles.paceLabel, { color: colors.text.secondary }]}>Pace</Text>
      </View>
      {sleepHours != null && (
        <CircularGauge
          value={sleepHours}
          maxValue={9}
          size={90}
          color="#5C6BC0"
          label="Sleep"
          unit="hrs"
          valueFormatter={(v) => v.toFixed(1)}
        />
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginHorizontal: 24,
    marginTop: 16,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  paceContainer: {
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paceValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  paceUnit: {
    fontSize: 11,
    marginTop: -2,
  },
  paceLabel: {
    fontSize: 10,
    marginTop: 2,
  },
});

export default LatestStatsRow;
