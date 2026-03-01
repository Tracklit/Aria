export const colors = {
  // Background
  background: {
    primary: '#0A0A0A',
    secondary: '#1A1A1A',
    card: 'rgba(28, 28, 30, 0.8)',
    cardSolid: '#1C1C1E',
  },
  
  // Accent Colors
  primary: '#0A84FF',
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
    selected: '#0A84FF',
    unselected: '#1C1C1E',
  },
  
  // Tab Bar
  tab: {
    active: '#0A84FF',
    inactive: '#8E8E93',
    background: 'rgba(28, 28, 30, 0.9)',
  },
  
  // Gradients
  gradient: {
    primary: ['#0A84FF', '#32D74B'] as [string, string],
    avatar: ['#30D5C8', '#0A84FF'] as [string, string],
    progress: ['#0A84FF', '#30D5C8', '#FFD60A', '#FF453A'] as [string, string, string, string],
  },
} as const;
