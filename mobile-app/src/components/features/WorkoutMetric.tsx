import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../../theme';

interface WorkoutMetricProps {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  unit: string;
  color?: string;
}

export const WorkoutMetric: React.FC<WorkoutMetricProps> = ({
  icon,
  value,
  unit,
  color = colors.text.primary,
}) => {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={20} color={color} style={styles.icon} />
      <View style={styles.textContainer}>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.unit}>{unit}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  icon: {
    marginBottom: spacing.xs,
  },
  textContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  value: {
    ...typography.h2,
    color: colors.text.primary,
  },
  unit: {
    ...typography.body,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
  },
});
