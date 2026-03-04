import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle, ColorValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GradientCardProps {
  colors: [string, string, ...string[]];
  onPress?: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
  testID?: string;
}

export const GradientCard: React.FC<GradientCardProps> = ({
  colors: gradientColors,
  onPress,
  children,
  style,
  testID,
}) => {
  const content = (
    <LinearGradient
      colors={gradientColors as readonly [ColorValue, ColorValue, ...ColorValue[]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradient, style]}
    >
      {children}
    </LinearGradient>
  );

  if (onPress) {
    return (
      <TouchableOpacity testID={testID} activeOpacity={0.7} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  gradient: {
    borderRadius: 16,
    padding: 16,
  },
});
