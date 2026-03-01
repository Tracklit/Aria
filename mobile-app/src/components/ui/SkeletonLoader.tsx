import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ViewStyle, Animated } from 'react-native';
import { colors, borderRadius, spacing } from '../../theme';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius: radius = 8,
  style,
}) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.6,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.container,
        { width, height, borderRadius: radius, opacity },
        style,
      ]}
    />
  );
};

export const SkeletonCard: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.cardHeader}>
        <SkeletonLoader width={32} height={32} borderRadius={16} />
        <SkeletonLoader width="70%" height={24} style={{ marginLeft: spacing.sm }} />
      </View>
      <SkeletonLoader width="90%" height={16} style={{ marginTop: spacing.sm }} />
      <SkeletonLoader width="60%" height={16} style={{ marginTop: spacing.xs }} />
      <SkeletonLoader
        width="100%"
        height={44}
        borderRadius={borderRadius.lg}
        style={{ marginTop: spacing.md }}
      />
    </View>
  );
};

export const SkeletonStatsCard: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  return (
    <View style={[styles.card, style]}>
      <SkeletonLoader width="50%" height={24} style={{ marginBottom: spacing.md }} />
      <View style={styles.statsRow}>
        {[1, 2, 3].map((key) => (
          <View key={key} style={styles.statItem}>
            <SkeletonLoader width={60} height={32} style={{ marginBottom: spacing.xs }} />
            <SkeletonLoader width={80} height={14} />
          </View>
        ))}
      </View>
    </View>
  );
};

export const SkeletonWarningCard: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  return (
    <View style={[styles.card, { borderWidth: 2, borderColor: colors.red + '50' }, style]}>
      <View style={styles.cardHeader}>
        <SkeletonLoader width={24} height={24} borderRadius={12} />
        <SkeletonLoader width="60%" height={20} style={{ marginLeft: spacing.sm }} />
      </View>
      <SkeletonLoader width="80%" height={16} style={{ marginTop: spacing.sm }} />
      <SkeletonLoader width="90%" height={16} style={{ marginTop: spacing.sm }} />
      <SkeletonLoader width="70%" height={14} style={{ marginTop: spacing.xs }} />
    </View>
  );
};

export const SkeletonPatternCard: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  return (
    <View style={[styles.card, { padding: spacing.md }, style]}>
      <View style={styles.cardHeader}>
        <SkeletonLoader width={20} height={20} borderRadius={10} />
        <SkeletonLoader width="40%" height={14} style={{ marginLeft: spacing.sm }} />
        <SkeletonLoader width={60} height={12} style={{ marginLeft: 'auto' }} />
      </View>
      <SkeletonLoader width="95%" height={14} style={{ marginTop: spacing.sm }} />
      <SkeletonLoader width="85%" height={14} style={{ marginTop: spacing.xs }} />
      <SkeletonLoader width="75%" height={12} style={{ marginTop: spacing.sm }} />
    </View>
  );
};

export const SkeletonInsightCard: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  return (
    <View style={[styles.card, { padding: spacing.md }, style]}>
      <View style={styles.cardHeader}>
        <SkeletonLoader width={20} height={20} borderRadius={10} />
        <SkeletonLoader width="50%" height={16} style={{ marginLeft: spacing.sm }} />
      </View>
      <SkeletonLoader width="100%" height={14} style={{ marginTop: spacing.sm }} />
      <SkeletonLoader width="90%" height={14} style={{ marginTop: spacing.xs }} />
      <SkeletonLoader width="60%" height={12} style={{ marginTop: spacing.sm }} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.secondary,
  },
  card: {
    backgroundColor: colors.background.cardSolid,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
});
