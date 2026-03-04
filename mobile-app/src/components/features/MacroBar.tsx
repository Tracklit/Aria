import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../theme';

interface MacroBarProps {
  protein: number;
  carbs: number;
  fats: number;
  height?: number;
}

export const MacroBar: React.FC<MacroBarProps> = ({ protein, carbs, fats, height = 8 }) => {
  const total = protein + carbs + fats;
  if (total === 0) return null;

  const proteinPercent = (protein / total) * 100;
  const carbsPercent = (carbs / total) * 100;
  const fatsPercent = (fats / total) * 100;

  return (
    <View style={[styles.container, { height }]}>
      <View style={[styles.segment, { width: `${proteinPercent}%`, backgroundColor: colors.primary }]} />
      <View style={[styles.segment, { width: `${carbsPercent}%`, backgroundColor: colors.yellow }]} />
      <View style={[styles.segment, { width: `${fatsPercent}%`, backgroundColor: colors.orange }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  segment: {
    height: '100%',
  },
});
