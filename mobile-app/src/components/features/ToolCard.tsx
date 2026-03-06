import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, useThemedStyles, typography, spacing, borderRadius } from '../../theme';
import { ThemeColors } from '../../theme/colors';
import { impactLight } from '../../utils/haptics';

interface ToolCardProps {
  title: string;
  subtitle?: string;
  description?: string;
  icon: string;
  onPress: () => void;
  testID?: string;
  variant?: 'grid' | 'list';
  accentColor?: string;
}

export const ToolCard: React.FC<ToolCardProps> = ({
  title,
  subtitle,
  description,
  icon,
  onPress,
  testID,
  variant = 'grid',
  accentColor,
}) => {
  const colors = useColors();
  const listS = useThemedStyles(createListStyles);
  const gridS = useThemedStyles(createGridStyles);
  const accent = accentColor || colors.primary;

  if (variant === 'list') {
    const displayDescription = description || subtitle;
    return (
      <TouchableOpacity
        style={listS.container}
        onPress={() => { impactLight(); onPress(); }}
        activeOpacity={0.7}
        testID={testID}
      >
        <View style={[listS.iconCircle, { backgroundColor: accent + '33' }]}>
          <Ionicons name={icon as any} size={20} color={accent} />
        </View>
        <View style={listS.textContainer}>
          <Text style={listS.title}>{title}</Text>
          {displayDescription && (
            <Text style={listS.description} numberOfLines={2}>
              {displayDescription}
            </Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={gridS.container}
      onPress={() => { impactLight(); onPress(); }}
      activeOpacity={0.7}
      testID={testID}
    >
      <Ionicons name={icon as any} size={32} color={accent} style={gridS.icon} />
      <Text style={gridS.title}>{title}</Text>
      {subtitle && <Text style={gridS.subtitle}>{subtitle}</Text>}
    </TouchableOpacity>
  );
};

const createListStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.cardSolid,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.background.secondary,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  title: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  description: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
});

const createGridStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.cardSolid,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.background.secondary,
    margin: spacing.xs,
  },
  icon: {
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  subtitle: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: 2,
  },
});
