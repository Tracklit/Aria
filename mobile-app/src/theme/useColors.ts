import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from './colors';

/** Convenience hook — returns the current theme's color palette */
export const useColors = (): ThemeColors => useTheme().themeColors;
