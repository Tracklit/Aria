import React, { useState } from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { spacing, borderRadius } from '../../theme';

interface PreWorkoutReadinessBarProps {
  readinessScore: number | null;
}

function getBarConfig(score: number) {
  if (score >= 80) {
    return {
      bg: 'rgba(50,215,75,0.12)',
      border: 'rgba(50,215,75,0.3)',
      icon: 'shield-checkmark' as const,
      iconColor: '#32D74B',
      message: 'Fully recovered — push hard today',
    };
  }
  if (score >= 60) {
    return {
      bg: 'rgba(255,214,10,0.12)',
      border: 'rgba(255,214,10,0.3)',
      icon: 'fitness' as const,
      iconColor: '#FFD60A',
      message: 'Moderate recovery — train smart today',
    };
  }
  return {
    bg: 'rgba(255,69,58,0.12)',
    border: 'rgba(255,69,58,0.3)',
    icon: 'warning' as const,
    iconColor: '#FF453A',
    message: 'Recovery is low — consider adjusting intensity',
  };
}

const PreWorkoutReadinessBar = React.memo(function PreWorkoutReadinessBar({
  readinessScore,
}: PreWorkoutReadinessBarProps) {
  const [dismissed, setDismissed] = useState(false);

  if (readinessScore == null || dismissed) {
    return null;
  }

  const config = getBarConfig(readinessScore);

  return (
    <Animated.View
      entering={FadeInDown.duration(400).springify()}
      style={[
        styles.bar,
        {
          backgroundColor: config.bg,
          borderColor: config.border,
        },
      ]}
    >
      <Ionicons name={config.icon} size={18} color={config.iconColor} />
      <Text style={[styles.message, { color: config.iconColor }]}>
        {config.message}
      </Text>
      <TouchableOpacity
        onPress={() => setDismissed(true)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={styles.dismissButton}
      >
        <Ionicons name="close" size={16} color={config.iconColor} />
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  message: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  dismissButton: {
    padding: 2,
  },
});

export default PreWorkoutReadinessBar;
