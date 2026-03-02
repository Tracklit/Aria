import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import {
  Button as GSButton,
  ButtonSpinner,
  ButtonText,
  Pressable,
  Text,
} from '@gluestack-ui/themed';
import { colors, typography, borderRadius } from '../../theme';

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
  if (variant === 'primary') {
    return (
      <GSButton
        onPress={onPress}
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
        onPress={onPress}
        disabled={disabled || loading}
        style={[styles.textButton, style]}
      >
        <Text style={styles.textButtonText}>{title}</Text>
      </Pressable>
    );
  }

  return (
    <GSButton
      onPress={onPress}
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

const styles = StyleSheet.create({
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
