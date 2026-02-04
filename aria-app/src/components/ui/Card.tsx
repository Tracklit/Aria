import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius, shadows } from '../../theme';

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
      <View style={[styles.card, styles.shadow, style]}>
        <BlurView intensity={20} tint="dark" style={styles.blurContainer}>
          {children}
        </BlurView>
      </View>
    );
  }

  return (
    <View style={[styles.card, styles.solidCard, styles.shadow, style]}>
      {children}
    </View>
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
  solidCard: {
    backgroundColor: colors.background.card,
    padding: 20,
  },
  gradientCard: {
    padding: 20,
  },
  shadow: {
    ...shadows.card,
  },
});
