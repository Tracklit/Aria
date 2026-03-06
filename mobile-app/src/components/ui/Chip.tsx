import React from 'react';
import { StyleSheet } from 'react-native';
import { Pressable, Text } from '@gluestack-ui/themed';
import { useThemedStyles, typography, borderRadius } from '../../theme';
import { ThemeColors } from '../../theme/colors';
import { selectionChanged } from '../../utils/haptics';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export const Chip: React.FC<ChipProps> = ({ label, selected, onPress }) => {
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      onPress={() => { selectionChanged(); onPress(); }}
      style={[styles.chip, selected ? styles.selected : styles.unselected]}
    >
      <Text style={[styles.text, selected ? styles.selectedText : styles.unselectedText]}>
        {label}
      </Text>
    </Pressable>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
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
