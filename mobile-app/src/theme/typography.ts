import { TextStyle } from 'react-native';

export const typography = {
  h1: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 34,
    fontWeight: '700',
    lineHeight: 41,
  } as TextStyle,

  h2: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  } as TextStyle,

  h3: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 28,
  } as TextStyle,
  
  body: {
    fontSize: 17,
    fontWeight: '400',
    lineHeight: 22,
  } as TextStyle,
  
  bodyBold: {
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 22,
  } as TextStyle,
  
  caption: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  } as TextStyle,
  
  captionBold: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  } as TextStyle,
  
  label: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 20,
  } as TextStyle,

  sectionLabel: {
    fontFamily: 'SpaceGrotesk_300Light',
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
  } as TextStyle,

  data: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 17,
  } as TextStyle,
} as const;
