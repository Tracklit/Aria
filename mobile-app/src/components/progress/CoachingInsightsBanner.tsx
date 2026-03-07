import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles, useColors, spacing } from '../../theme';
import type { ThemeColors } from '../../theme/colors';

interface CoachingInsightsBannerProps {
  type: 'warning' | 'positive' | 'info';
  summary: string;
  details: string;
  isLoading?: boolean;
}

function getInsightConfig(type: CoachingInsightsBannerProps['type'], colors: ThemeColors) {
  switch (type) {
    case 'warning':
      return { icon: 'alert-circle' as const, color: colors.orange };
    case 'positive':
      return { icon: 'checkmark-circle' as const, color: colors.green };
    case 'info':
    default:
      return { icon: 'information-circle' as const, color: colors.teal };
  }
}

const CoachingInsightsBanner = React.memo(function CoachingInsightsBanner({
  type,
  summary,
  details,
  isLoading,
}: CoachingInsightsBannerProps) {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const [expanded, setExpanded] = useState(false);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.skeletonLine} />
        <View style={[styles.skeletonLine, styles.skeletonShort]} />
      </View>
    );
  }

  const config = getInsightConfig(type, colors);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.7}
    >
      <View style={styles.headerRow}>
        <Ionicons name={config.icon} size={22} color={config.color} />
        <Text style={[styles.summary, { color: config.color }]} numberOfLines={expanded ? undefined : 2}>
          {summary}
        </Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.text.tertiary}
        />
      </View>
      {expanded && (
        <Text style={styles.details}>{details}</Text>
      )}
    </TouchableOpacity>
  );
});

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.background.cardSolid,
      borderRadius: 16,
      padding: spacing.md,
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    summary: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
    },
    details: {
      fontSize: 14,
      color: colors.text.secondary,
      lineHeight: 20,
      marginTop: spacing.sm,
      marginLeft: 32,
    },
    skeletonLine: {
      height: 14,
      borderRadius: 7,
      backgroundColor: colors.background.secondary,
      width: '80%',
      marginBottom: 8,
    },
    skeletonShort: {
      width: '50%',
      marginBottom: 0,
    },
  });

export default CoachingInsightsBanner;
