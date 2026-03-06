import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { Box } from '@gluestack-ui/themed';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors, borderRadius, shadows } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  blur?: boolean;
  gradient?: boolean;
  gradientColors?: string[];
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  blur = true,
  gradient = false,
  gradientColors,
}) => {
  const colors = useColors();
  const { effectiveTheme } = useTheme();

  if (gradient) {
    const gradColors = gradientColors || colors.gradient.primary;
    return (
      <LinearGradient
        colors={[gradColors[0], gradColors[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.card, styles.gradientCard, style]}
      >
        {children}
      </LinearGradient>
    );
  }

  if (blur) {
    return (
      <Box style={[styles.card, styles.shadow, style]}>
        <BlurView intensity={20} tint={effectiveTheme === 'dark' ? 'dark' : 'light'} style={styles.blurContainer}>
          {children}
        </BlurView>
      </Box>
    );
  }

  return (
    <Box style={[styles.card, { backgroundColor: colors.background.card }, styles.shadow, style]}>
      {children}
    </Box>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  blurContainer: {
    padding: 20,
    borderRadius: borderRadius.lg,
  },
  gradientCard: {
    padding: 20,
  },
  shadow: {
    ...shadows.card,
  },
});
