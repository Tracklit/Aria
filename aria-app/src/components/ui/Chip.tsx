import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, typography, borderRadius } from '../../theme';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export const Chip: React.FC<ChipProps> = ({ label, selected, onPress }) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.chip, selected ? styles.selected : styles.unselected]}
      activeOpacity={0.7}
    >
      <Text style={[styles.text, selected ? styles.selectedText : styles.unselectedText]}>
        {label}
      </Text>
    </TouchableOpacity>
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
