export const darkColors = {
  // Background
  background: {
    primary: '#0A0A0A',
    secondary: '#1A1A1A',
    card: 'rgba(28, 28, 30, 0.8)',
    cardSolid: '#1C1C1E',
  },

  // Accent Colors
  primary: '#00E5FF',
  primaryMuted: '#30D5C8',
  teal: '#30D5C8',
  green: '#32D74B',
  yellow: '#FFD60A',
  orange: '#FF9F0A',
  red: '#FF453A',

  // Text
  text: {
    primary: '#FFFFFF',
    secondary: '#8E8E93',
    tertiary: '#636366',
  },

  // Chip/Button States
  chip: {
    selected: '#00E5FF',
    unselected: '#1C1C1E',
  },

  // Tab Bar
  tab: {
    active: '#00E5FF',
    inactive: '#8E8E93',
    background: 'rgba(28, 28, 30, 0.9)',
  },

  // Gradients
  gradient: {
    primary: ['#00E5FF', '#30D5C8'] as [string, string],
    avatar: ['#30D5C8', '#00E5FF'] as [string, string],
    accent: ['#00E5FF', '#32D74B'] as [string, string],
    workout: ['#0A1628', '#0D2137', '#0A1A2E'] as [string, string, string],
    progress: ['#00E5FF', '#30D5C8', '#FFD60A', '#FF453A'] as [string, string, string, string],
  },
} as const;

export const lightColors = {
  // Background
  background: {
    primary: '#FFFFFF',
    secondary: '#F2F2F7',
    card: 'rgba(242, 242, 247, 0.8)',
    cardSolid: '#FFFFFF',
  },

  // Accent Colors (same as dark)
  primary: '#00E5FF',
  primaryMuted: '#30D5C8',
  teal: '#30D5C8',
  green: '#32D74B',
  yellow: '#FFD60A',
  orange: '#FF9F0A',
  red: '#FF453A',

  // Text
  text: {
    primary: '#000000',
    secondary: '#3C3C43',
    tertiary: '#8E8E93',
  },

  // Chip/Button States
  chip: {
    selected: '#00E5FF',
    unselected: '#F2F2F7',
  },

  // Tab Bar
  tab: {
    active: '#00E5FF',
    inactive: '#8E8E93',
    background: 'rgba(242, 242, 247, 0.9)',
  },

  // Gradients (same as dark)
  gradient: {
    primary: ['#00E5FF', '#30D5C8'] as [string, string],
    avatar: ['#30D5C8', '#00E5FF'] as [string, string],
    accent: ['#00E5FF', '#32D74B'] as [string, string],
    workout: ['#0A1628', '#0D2137', '#0A1A2E'] as [string, string, string],
    progress: ['#00E5FF', '#30D5C8', '#FFD60A', '#FF453A'] as [string, string, string, string],
  },
} as const;

// Default export for backward compatibility (used by static StyleSheet.create calls)
export const colors = darkColors;

export type ThemeColors = {
  background: { primary: string; secondary: string; card: string; cardSolid: string };
  primary: string;
  primaryMuted: string;
  teal: string;
  green: string;
  yellow: string;
  orange: string;
  red: string;
  text: { primary: string; secondary: string; tertiary: string };
  chip: { selected: string; unselected: string };
  tab: { active: string; inactive: string; background: string };
  gradient: {
    primary: [string, string];
    avatar: [string, string];
    accent: [string, string];
    workout: [string, string, string];
    progress: [string, string, string, string];
  };
};
