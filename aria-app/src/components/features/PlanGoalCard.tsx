import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { colors, typography, spacing, borderRadius } from '../../theme';

interface PlanGoalCardProps {
  goalName: string;
  targetDate?: string;
}

const RING_SIZE = 160;
const RING_STROKE_WIDTH = 4;
const RING_RADIUS = (RING_SIZE - RING_STROKE_WIDTH) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export const PlanGoalCard: React.FC<PlanGoalCardProps> = ({ goalName, targetDate }) => {
  const formattedDate = targetDate
    ? new Date(targetDate).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
      })
    : undefined;

  return (
    <View style={styles.container}>
      <View style={styles.ringContainer}>
        <Svg width={RING_SIZE} height={RING_SIZE} style={styles.svg}>
          <Defs>
            <SvgLinearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={colors.teal} />
              <Stop offset="100%" stopColor={colors.primary} />
            </SvgLinearGradient>
          </Defs>
          {/* Background ring */}
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth={RING_STROKE_WIDTH}
            fill="transparent"
          />
          {/* Gradient ring - shows progress towards goal */}
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            stroke="url(#ringGradient)"
            strokeWidth={RING_STROKE_WIDTH}
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={`${RING_CIRCUMFERENCE * 0.75} ${RING_CIRCUMFERENCE}`}
            rotation={-90}
            origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
          />
        </Svg>
        <View style={styles.contentContainer}>
          <Text style={styles.goalName} numberOfLines={2} adjustsFontSizeToFit>
            {goalName}
          </Text>
          {formattedDate && <Text style={styles.targetDate}>{formattedDate}</Text>}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.cardSolid,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  ringContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  goalName: {
    ...typography.h2,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  targetDate: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
