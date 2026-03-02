import { config as defaultConfig } from '@gluestack-ui/config';

// Mock-driven color and spacing bridge so gluestack stays aligned
// with patient-app HTML source-of-truth tokens.
export const mockTokens = {
  colors: {
    ariaBgDark: '#000000',
    ariaBgCard: '#111111',
    ariaBgCardElevated: '#1A1A1C',
    ariaTextPrimary: '#FFFFFF',
    ariaTextSecondary: '#AAAAAA',
    ariaBrandBlue: '#007AFF',
    ariaBrandCyan: '#00E5FF',
    ariaBrandGreen: '#00E676',
    ariaBrandRed: '#FF3B30',
  },
  space: {
    4: 4,
    8: 8,
    12: 12,
    16: 16,
    20: 20,
    24: 24,
    32: 32,
  },
  radii: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },
} as const;

export const gluestackConfig = {
  ...defaultConfig,
  tokens: {
    ...defaultConfig.tokens,
    colors: {
      ...defaultConfig.tokens.colors,
      ...mockTokens.colors,
    },
    space: {
      ...defaultConfig.tokens.space,
      ...mockTokens.space,
    },
    radii: {
      ...defaultConfig.tokens.radii,
      ...mockTokens.radii,
    },
  },
};

