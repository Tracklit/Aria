import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemedStyles, typography, spacing, borderRadius } from '../../theme';
import { ThemeColors } from '../../theme/colors';

interface ScheduleItemProps {
  day: string;
  type: string;
  details?: string;
}

export const ScheduleItem: React.FC<ScheduleItemProps> = ({ day, type, details }) => {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container}>
      <Text style={styles.day}>{day}</Text>
      <View style={styles.workoutContainer}>
        <Text style={styles.type}>{type}</Text>
        {details && <Text style={styles.details}>{details}</Text>}
      </View>
    </View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background.cardSolid,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  day: {
    ...typography.body,
    color: colors.text.primary,
    flex: 1,
  },
  workoutContainer: {
    flex: 2,
    alignItems: 'flex-end',
  },
  type: {
    ...typography.body,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  details: {
    ...typography.caption,
    color: colors.text.secondary,
  },
});
