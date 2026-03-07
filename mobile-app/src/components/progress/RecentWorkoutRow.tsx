import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useThemedStyles, useColors, spacing } from '../../theme';
import type { ThemeColors } from '../../theme/colors';

interface RecentWorkoutRowProps {
  dateStr: string;
  title: string;
  duration: string;
  type?: string;
}

function getWorkoutIcon(type: string | undefined, color: string): React.ReactNode {
  const size = 20;
  switch (type?.toLowerCase()) {
    case 'run':
    case 'running':
      // Running figure icon
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="14" cy="4" r="2.5" fill={color} />
          <Path
            d="M7 22l3-7 3 2v5h2v-7l-3-2 1-3c1.5 1.7 3.7 3 6 3v-2c-1.9 0-3.5-1-4.3-2.4l-1.5-2.5C13.5 5.4 12.8 5 12 5c-.3 0-.6.1-.9.2L6 8v5h2V9l2-1-2 6-4.5 2 .9 1.9L7 16"
            fill={color}
          />
        </Svg>
      );
    case 'sprint':
    case 'speed':
      // Lightning bolt
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill={color} />
        </Svg>
      );
    default:
      // Generic activity dot
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="6" fill={color} />
        </Svg>
      );
  }
}

const RecentWorkoutRow = React.memo(function RecentWorkoutRow({
  dateStr,
  title,
  duration,
  type,
}: RecentWorkoutRowProps) {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        {getWorkoutIcon(type, colors.primary)}
      </View>
      <View style={styles.dateWrap}>
        <Text style={styles.dateText}>{dateStr}</Text>
      </View>
      <View style={styles.infoWrap}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>
      <Text style={styles.duration}>{duration}</Text>
    </View>
  );
});

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background.cardSolid,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
    },
    iconWrap: {
      width: 28,
      alignItems: 'center',
      marginRight: 8,
    },
    dateWrap: {
      width: 50,
    },
    dateText: {
      fontSize: 13,
      color: colors.text.secondary,
      fontWeight: '500',
    },
    infoWrap: {
      flex: 1,
      marginHorizontal: 8,
    },
    title: {
      fontSize: 15,
      color: colors.text.primary,
      fontWeight: '600',
    },
    duration: {
      fontSize: 14,
      color: colors.text.secondary,
      fontWeight: '500',
    },
  });

export default RecentWorkoutRow;
