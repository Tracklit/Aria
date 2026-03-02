import React from 'react';
import { StyleSheet } from 'react-native';
import { Pressable, Text } from '@gluestack-ui/themed';
import { colors, typography, borderRadius } from '../../theme';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export const Chip: React.FC<ChipProps> = ({ label, selected, onPress }) => {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected ? styles.selected : styles.unselected]}
    >
      <Text style={[styles.text, selected ? styles.selectedText : styles.unselectedText]}>
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: borderRadius.xl,
    marginRight: 12,
  },
  selected: {
    backgroundColor: colors.chip.selected,
  },
  unselected: {
    backgroundColor: colors.chip.unselected,
  },
  text: {
    ...typography.body,
  },
  selectedText: {
    color: colors.text.primary,
  },
  unselectedText: {
    color: colors.text.secondary,
  },
});
