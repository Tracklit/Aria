import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { DayWorkout } from '../../types';

interface TrainingTableProps {
  workouts: DayWorkout[];
}

export const TrainingTable: React.FC<TrainingTableProps> = ({ workouts }) => {
  return (
    <View style={styles.container}>
      {workouts.map((workout, index) => (
        <View
          key={index}
          style={[
            styles.row,
            index === workouts.length - 1 && styles.lastRow,
          ]}
        >
          <Text style={styles.day}>{workout.day}</Text>
          <Text style={styles.duration}>{workout.duration || workout.type}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.cardSolid,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.secondary,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  day: {
    ...typography.body,
    color: colors.text.primary,
  },
  duration: {
    ...typography.body,
    color: colors.text.secondary,
  },
});
