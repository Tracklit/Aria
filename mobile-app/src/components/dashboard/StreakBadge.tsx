import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, spacing, borderRadius } from '../../theme';

interface StreakBadgeProps {
  streak: number;
  badge: { title: string; icon: string; color: string } | null;
}

const StreakBadgeComponent = React.memo(function StreakBadgeComponent({
  streak,
  badge,
}: StreakBadgeProps) {
  const colors = useColors();

  if (!badge) return null;

  return (
    <View style={[styles.card, { backgroundColor: colors.background.cardSolid }]}>
      <View style={[styles.iconWrap, { backgroundColor: `${badge.color}20` }]}>
        <Ionicons name={badge.icon as any} size={24} color={badge.color} />
      </View>
      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: badge.color }]}>{badge.title}</Text>
        <Text style={[styles.streakCount, { color: colors.text.primary }]}>
          {streak}-day streak
        </Text>
      </View>
      <Ionicons name="flame" size={28} color={badge.color} style={styles.trailingIcon} />
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginTop: 16,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  streakCount: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 2,
  },
  trailingIcon: {
    marginLeft: 8,
  },
});

export default StreakBadgeComponent;
