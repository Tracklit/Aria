import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useColors, useThemedStyles, typography } from '../../theme';
import { ThemeColors } from '../../theme/colors';

interface MacroDonutChartProps {
  protein: number;
  carbs: number;
  fats: number;
  totalCalories?: number;
  size?: number;
  strokeWidth?: number;
}

export const MacroDonutChart: React.FC<MacroDonutChartProps> = ({
  protein,
  carbs,
  fats,
  totalCalories,
  size = 120,
  strokeWidth = 12,
}) => {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);

  const total = protein + carbs + fats;
  if (total === 0) return null;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const proteinAngle = (protein / total) * circumference;
  const carbsAngle = (carbs / total) * circumference;
  const fatsAngle = (fats / total) * circumference;

  const proteinOffset = 0;
  const carbsOffset = proteinAngle;
  const fatsOffset = proteinAngle + carbsAngle;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Background circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Fats */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={colors.orange}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${fatsAngle} ${circumference - fatsAngle}`}
          strokeDashoffset={-fatsOffset}
          strokeLinecap="round"
          rotation={-90}
          origin={`${center}, ${center}`}
        />
        {/* Carbs */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={colors.yellow}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${carbsAngle} ${circumference - carbsAngle}`}
          strokeDashoffset={-carbsOffset}
          strokeLinecap="round"
          rotation={-90}
          origin={`${center}, ${center}`}
        />
        {/* Protein */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={colors.primary}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${proteinAngle} ${circumference - proteinAngle}`}
          strokeDashoffset={-proteinOffset}
          strokeLinecap="round"
          rotation={-90}
          origin={`${center}, ${center}`}
        />
      </Svg>
      {totalCalories !== undefined && (
        <View style={styles.centerText}>
          <Text style={styles.calorieNumber}>{totalCalories}</Text>
          <Text style={styles.calorieLabel}>kcal</Text>
        </View>
      )}
    </View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    position: 'absolute',
    alignItems: 'center',
  },
  calorieNumber: {
    ...typography.h3,
    color: colors.text.primary,
    fontWeight: '700',
  },
  calorieLabel: {
    ...typography.caption,
    color: colors.text.secondary,
  },
});
