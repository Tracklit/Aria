import { TextStyle } from 'react-native';

export const typography = {
  h1: {
    fontSize: 34,
    fontWeight: '700',
    lineHeight: 41,
  } as TextStyle,
  
  h2: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  } as TextStyle,
  
  h3: {
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
} as const;
