import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useColors } from './useColors';
import { ThemeColors } from './colors';

type NamedStyles<T> = StyleSheet.NamedStyles<T>;

/** Hook that memoizes a style factory keyed on the current theme colors */
export function useThemedStyles<T extends NamedStyles<T>>(
  factory: (colors: ThemeColors) => T,
): T {
  const colors = useColors();
  return useMemo(() => factory(colors), [colors, factory]);
}
