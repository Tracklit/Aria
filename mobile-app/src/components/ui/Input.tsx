import React from 'react';
import { StyleSheet, TextInputProps } from 'react-native';
import {
  FormControl,
  FormControlLabel,
  FormControlLabelText,
  Input as GSInput,
  InputField,
} from '@gluestack-ui/themed';
import { useColors, useThemedStyles, typography, borderRadius, spacing } from '../../theme';
import { ThemeColors } from '../../theme/colors';

interface InputProps extends TextInputProps {
  label?: string;
}

export const Input: React.FC<InputProps> = ({ label, style, ...props }) => {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);

  return (
    <FormControl style={styles.container}>
      {label ? (
        <FormControlLabel>
          <FormControlLabelText style={styles.label}>{label}</FormControlLabelText>
        </FormControlLabel>
      ) : null}
      <GSInput style={styles.input}>
        <InputField
          style={style as any}
          color={colors.text.primary}
          placeholderTextColor={colors.text.tertiary}
          {...props}
        />
      </GSInput>
    </FormControl>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.label,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  input: {
    ...typography.body,
    backgroundColor: colors.background.cardSolid,
    color: colors.text.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    height: 50,
  },
});
