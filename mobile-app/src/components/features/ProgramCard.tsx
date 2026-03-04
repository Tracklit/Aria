import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../theme';

interface ProgramCardProps {
  program: {
    id: number;
    title: string;
    category?: string | null;
    level?: string | null;
    duration?: number | null;
    totalSessions?: number | null;
    generatedBy?: string | null;
    isUploadedProgram?: boolean;
  };
  onPress: () => void;
}

export const ProgramCard: React.FC<ProgramCardProps> = ({ program, onPress }) => {
  const getSourceIcon = (): { name: string; color: string } => {
    if (program.generatedBy === 'ai') return { name: 'sparkles', color: colors.primary };
    if (program.isUploadedProgram) return { name: 'cloud-upload-outline', color: colors.teal };
    return { name: 'create-outline', color: colors.text.secondary };
  };

  const source = getSourceIcon();

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>{program.title}</Text>
        <Ionicons name={source.name as any} size={16} color={source.color} />
      </View>

      <View style={styles.metaRow}>
        {program.category && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{program.category}</Text>
          </View>
        )}
        {program.level && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{program.level}</Text>
          </View>
        )}
      </View>

      <View style={styles.statsRow}>
        {program.duration && (
          <View style={styles.stat}>
            <Ionicons name="calendar-outline" size={14} color={colors.text.tertiary} />
            <Text style={styles.statText}>{program.duration} weeks</Text>
          </View>
        )}
        {program.totalSessions && (
          <View style={styles.stat}>
            <Ionicons name="fitness-outline" size={14} color={colors.text.tertiary} />
            <Text style={styles.statText}>{program.totalSessions} sessions</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.cardSolid,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
    flex: 1,
    marginRight: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  badge: {
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    ...typography.caption,
    color: colors.text.secondary,
    textTransform: 'capitalize',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
});
