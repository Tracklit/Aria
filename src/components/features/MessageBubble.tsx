import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../../theme';

interface MessageBubbleProps {
  text: string;
  sender: 'ai' | 'user';
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ text, sender }) => {
  const isAI = sender === 'ai';
  
  return (
    <View style={[styles.container, isAI ? styles.aiContainer : styles.userContainer]}>
      <View style={[styles.bubble, isAI ? styles.aiBubble : styles.userBubble]}>
        <Text style={styles.text}>{text}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  aiContainer: {
    alignItems: 'flex-start',
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  bubble: {
    maxWidth: '85%',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  aiBubble: {
    backgroundColor: colors.background.cardSolid,
  },
  userBubble: {
    backgroundColor: colors.primary,
  },
  text: {
    ...typography.body,
    color: colors.text.primary,
  },
});
