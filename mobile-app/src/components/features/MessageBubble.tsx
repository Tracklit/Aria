import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { colors, typography, spacing, borderRadius } from '../../theme';

interface MessageBubbleProps {
  text: string;
  sender: 'ai' | 'user';
}

const markdownStyles = {
  body: {
    ...typography.body,
    color: colors.text.primary,
  },
  heading1: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: colors.text.primary,
    marginBottom: 8,
    marginTop: 4,
  },
  heading2: {
    fontSize: 19,
    fontWeight: '600' as const,
    color: colors.text.primary,
    marginBottom: 6,
    marginTop: 4,
  },
  heading3: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: colors.text.primary,
    marginBottom: 4,
    marginTop: 4,
  },
  strong: {
    fontWeight: '700' as const,
    color: colors.text.primary,
  },
  em: {
    fontStyle: 'italic' as const,
    color: colors.text.primary,
  },
  bullet_list: {
    marginVertical: 4,
  },
  ordered_list: {
    marginVertical: 4,
  },
  list_item: {
    marginVertical: 2,
  },
  code_inline: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: colors.teal,
    borderRadius: 4,
    paddingHorizontal: 4,
    fontFamily: 'Courier',
    fontSize: 15,
  },
  fence: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: 10,
    marginVertical: 6,
    fontFamily: 'Courier',
    fontSize: 14,
    color: colors.text.primary,
  },
  blockquote: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderLeftWidth: 3,
    borderLeftColor: colors.teal,
    paddingLeft: 10,
    paddingVertical: 4,
    marginVertical: 4,
  },
  link: {
    color: colors.primary,
    textDecorationLine: 'underline' as const,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 6,
  },
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({ text, sender }) => {
  const isAI = sender === 'ai';

  return (
    <View style={[styles.container, isAI ? styles.aiContainer : styles.userContainer]}>
      <View style={[styles.bubble, isAI ? styles.aiBubble : styles.userBubble]}>
        {isAI ? (
          <Markdown style={markdownStyles}>{text}</Markdown>
        ) : (
          <Text style={styles.text}>{text}</Text>
        )}
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
