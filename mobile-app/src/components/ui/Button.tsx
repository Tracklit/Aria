import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import {
  Button as GSButton,
  ButtonSpinner,
  ButtonText,
  Pressable,
  Text,
} from '@gluestack-ui/themed';
import { useColors, useThemedStyles, typography, borderRadius } from '../../theme';
import { ThemeColors } from '../../theme/colors';
import { impactLight } from '../../utils/haptics';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'text';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}) => {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);

  const handlePress = () => {
    if (!disabled && !loading) {
      impactLight();
    }
    onPress();
  };

  if (variant === 'primary') {
    return (
      <GSButton
        onPress={handlePress}
        disabled={disabled || loading}
        style={[styles.primaryButton, style]}
        bg={colors.primary}
        borderRadius={borderRadius.md}
      >
        {loading ? <ButtonSpinner color={colors.text.primary} /> : <ButtonText style={styles.primaryText}>{title}</ButtonText>}
      </GSButton>
    );
  }

  if (variant === 'text') {
    return (
      <Pressable
        onPress={handlePress}
        disabled={disabled || loading}
        style={[styles.textButton, style]}
      >
        <Text style={styles.textButtonText}>{title}</Text>
      </Pressable>
    );
  }

  return (
    <GSButton
      onPress={handlePress}
      disabled={disabled || loading}
      style={[styles.secondaryButton, disabled && styles.disabled, style]}
      bg="transparent"
      borderColor={colors.primary}
      borderWidth={2}
      borderRadius={borderRadius.md}
    >
      {loading ? <ButtonSpinner color={colors.primary} /> : <ButtonText style={styles.secondaryText}>{title}</ButtonText>}
    </GSButton>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  primaryButton: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryText: {
    ...typography.bodyBold,
    color: colors.text.primary,
  },
  secondaryButton: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryText: {
    ...typography.bodyBold,
    color: colors.primary,
  },
  textButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  textButtonText: {
    ...typography.body,
    color: colors.primary,
  },
  disabled: {
    opacity: 0.5,
  },
});
