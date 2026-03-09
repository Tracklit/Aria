import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useColors, useThemedStyles, typography, spacing, borderRadius } from '../../theme';
import { ThemeColors } from '../../theme/colors';

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
    status?: string | null;
    activeWeek?: number | null;
  };
  onPress: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  onShare?: () => void;
  onToggleStatus?: () => void;
  onActivate?: () => void;
}

export const ProgramCard: React.FC<ProgramCardProps> = ({ program, onPress, onDelete, onEdit, onShare, onToggleStatus, onActivate }) => {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const swipeableRef = React.useRef<Swipeable>(null);

  const isActive = program.status === 'active';
  const isArchived = program.status === 'archived';

  const renderLeftActions = () => {
    if (!onDelete && !onEdit) return null;
    return (
      <View style={styles.swipeActionsLeft}>
        {onDelete && (
          <TouchableOpacity style={[styles.swipeAction, styles.swipeDelete]} onPress={() => { swipeableRef.current?.close(); onDelete(); }}>
            <Ionicons name="trash-outline" size={20} color="#fff" />
            <Text style={styles.swipeActionText}>Delete</Text>
          </TouchableOpacity>
        )}
        {onEdit && (
          <TouchableOpacity style={[styles.swipeAction, styles.swipeEdit]} onPress={() => { swipeableRef.current?.close(); onEdit(); }}>
            <Ionicons name="create-outline" size={20} color="#fff" />
            <Text style={styles.swipeActionText}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderRightActions = () => {
    if (!onToggleStatus && !onShare) return null;
    return (
      <View style={styles.swipeActionsRight}>
        {onToggleStatus && (
          <TouchableOpacity style={[styles.swipeAction, styles.swipeArchive]} onPress={() => { swipeableRef.current?.close(); onToggleStatus(); }}>
            <Ionicons name={isArchived ? 'refresh-outline' : 'archive-outline'} size={20} color="#fff" />
            <Text style={styles.swipeActionText}>{isArchived ? 'Restore' : 'Archive'}</Text>
          </TouchableOpacity>
        )}
        {onShare && (
          <TouchableOpacity style={[styles.swipeAction, styles.swipeShare]} onPress={() => { swipeableRef.current?.close(); onShare(); }}>
            <Ionicons name="share-outline" size={20} color="#fff" />
            <Text style={styles.swipeActionText}>Share</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const getSourceIcon = (): { name: string; color: string } => {
    if (program.generatedBy === 'ai') return { name: 'sparkles', color: colors.primary };
    if (program.isUploadedProgram) return { name: 'cloud-upload-outline', color: colors.primary };
    return { name: 'create-outline', color: colors.text.secondary };
  };

  const source = getSourceIcon();

  return (
    <Swipeable
      ref={swipeableRef}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      overshootLeft={false}
      overshootRight={false}
    >
      <TouchableOpacity
        style={[styles.container, isArchived && styles.containerArchived]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.header}>
          <Text style={[styles.title, isArchived && styles.titleArchived]} numberOfLines={1}>{program.title}</Text>
          <View style={styles.headerRight}>
            {isActive && (
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>ACTIVE</Text>
              </View>
            )}
            {isArchived && (
              <View style={styles.archivedBadge}>
                <Text style={styles.archivedBadgeText}>ARCHIVED</Text>
              </View>
            )}
            <Ionicons name={source.name as any} size={16} color={source.color} />
          </View>
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
          {isActive && program.activeWeek && (
            <View style={styles.weekBadge}>
              <Text style={styles.weekBadgeText}>Week {program.activeWeek}</Text>
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
          {onActivate && !isArchived && (
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); onActivate(); }}
              style={[styles.activateButton, isActive && styles.activateButtonActive]}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isActive ? 'checkmark-circle' : 'play-circle-outline'}
                size={14}
                color={isActive ? '#32D74B' : colors.text.tertiary}
              />
              <Text style={[styles.activateText, isActive && styles.activateTextActive]}>
                {isActive ? 'Active' : 'Activate'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    backgroundColor: colors.background.cardSolid,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  containerArchived: {
    opacity: 0.6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
    flex: 1,
    marginRight: spacing.sm,
  },
  titleArchived: {
    color: colors.text.tertiary,
  },
  activeBadge: {
    backgroundColor: 'rgba(50, 215, 75, 0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#32D74B',
    letterSpacing: 0.5,
  },
  archivedBadge: {
    backgroundColor: 'rgba(142, 142, 147, 0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  archivedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 0.5,
  },
  weekBadge: {
    backgroundColor: 'rgba(48, 213, 200, 0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  weekBadgeText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
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
  activateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
    borderWidth: 1,
    borderColor: colors.background.secondary,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  activateButtonActive: {
    borderColor: 'rgba(50, 215, 75, 0.3)',
    backgroundColor: 'rgba(50, 215, 75, 0.08)',
  },
  activateText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.tertiary,
  },
  activateTextActive: {
    color: '#32D74B',
  },
  swipeActionsLeft: { flexDirection: 'row', marginBottom: spacing.md },
  swipeActionsRight: { flexDirection: 'row', marginBottom: spacing.md },
  swipeAction: { justifyContent: 'center', alignItems: 'center', width: 72, borderRadius: borderRadius.lg },
  swipeDelete: { backgroundColor: '#FF453A' },
  swipeEdit: { backgroundColor: '#0A84FF' },
  swipeArchive: { backgroundColor: '#FF9F0A' },
  swipeShare: { backgroundColor: '#30D5C8' },
  swipeActionText: { color: '#fff', fontSize: 11, marginTop: 4, fontWeight: '500' },
});
