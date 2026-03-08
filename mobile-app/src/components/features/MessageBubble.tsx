import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Image,
  Alert,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import * as Clipboard from 'expo-clipboard';
import { useColors, useThemedStyles, typography, spacing, borderRadius } from '../../theme';
import { ThemeColors } from '../../theme/colors';
import { impactLight } from '../../utils/haptics';

// ==================== Types ====================

export interface ChatAttachmentInfo {
  url: string;
  type: 'image' | 'pdf' | 'text' | 'document';
  filename: string;
  size: number;
  mimeType: string;
  textContent?: string;
}

export interface ActionButton {
  label: string;
  action: string;
  params?: Record<string, any>;
}

interface MessageBubbleProps {
  text: string;
  sender: 'ai' | 'user';
  streaming?: boolean;
  animate?: boolean;
  attachments?: ChatAttachmentInfo[];
  onEdit?: (text: string) => void;
  onAction?: (action: ActionButton) => void;
}

// ==================== Action parsing ====================

function parseActions(text: string): { displayText: string; actions: ActionButton[] } {
  const actionsRegex = /\[ACTIONS\]\s*([\s\S]*?)\s*\[\/ACTIONS\]/;
  const match = text.match(actionsRegex);

  if (!match) {
    return { displayText: text, actions: [] };
  }

  const displayText = text.replace(actionsRegex, '').trim();
  const actionsBlock = match[1].trim();
  const actions: ActionButton[] = [];

  for (const line of actionsBlock.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.label && parsed.action) {
        actions.push(parsed);
      }
    } catch {
      // skip malformed lines
    }
  }

  return { displayText, actions };
}

// ==================== Helper: format file size ====================

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ==================== Component ====================

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  text,
  sender,
  streaming,
  animate,
  attachments,
  onEdit,
  onAction,
}) => {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const isAI = sender === 'ai';

  const opacity = useRef(new Animated.Value(animate ? 0 : 1)).current;
  const translateY = useRef(new Animated.Value(animate ? 12 : 0)).current;

  useEffect(() => {
    if (!animate) return;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [animate, opacity, translateY]);

  // Parse actions from AI messages (not during streaming)
  const { displayText, actions } = useMemo(() => {
    if (isAI && !streaming) {
      return parseActions(text);
    }
    return { displayText: text, actions: [] };
  }, [text, isAI, streaming]);

  // Long press handler
  const handleLongPress = useCallback(() => {
    impactLight();
    const buttons: Array<{ text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }> = [
      {
        text: 'Copy',
        onPress: () => {
          Clipboard.setStringAsync(displayText);
        },
      },
    ];

    if (!isAI && onEdit) {
      buttons.push({
        text: 'Edit',
        onPress: () => onEdit(displayText),
      });
    }

    buttons.push({ text: 'Cancel', style: 'cancel' });

    Alert.alert(undefined as any, undefined as any, buttons);
  }, [displayText, isAI, onEdit]);

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

  // Render attachment previews
  const renderAttachments = () => {
    if (!attachments || attachments.length === 0) return null;

    return (
      <View style={styles.attachmentsContainer}>
        {attachments.map((att, index) => {
          if (att.type === 'image') {
            return (
              <Image
                key={index}
                source={{ uri: att.url }}
                style={styles.attachmentImage}
                resizeMode="cover"
              />
            );
          }

          // Document / file card
          const iconName = att.type === 'pdf' ? 'document-text' : 'document-outline';
          return (
            <View key={index} style={styles.fileCard}>
              <Ionicons name={iconName as any} size={22} color={colors.teal} />
              <View style={styles.fileCardInfo}>
                <Text style={styles.fileCardName} numberOfLines={1}>{att.filename}</Text>
                <Text style={styles.fileCardSize}>{formatFileSize(att.size)}</Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  // Render action buttons
  const renderActions = () => {
    if (actions.length === 0 || !onAction) return null;

    return (
      <View style={styles.actionsContainer}>
        {actions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={styles.actionPill}
            onPress={() => {
              impactLight();
              onAction(action);
            }}
          >
            <Text style={styles.actionPillText}>{action.label}</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <Animated.View
      style={[
        styles.container,
        isAI ? styles.aiContainer : styles.userContainer,
        animate ? { opacity, transform: [{ translateY }] } : undefined,
      ]}
    >
      <Pressable
        onLongPress={handleLongPress}
        delayLongPress={400}
        style={[styles.bubble, isAI ? styles.aiBubble : styles.userBubble]}
      >
        {renderAttachments()}
        {isAI && !streaming ? (
          <Markdown style={markdownStyles}>{displayText}</Markdown>
        ) : (
          <Text style={styles.text}>{displayText}</Text>
        )}
        {renderActions()}
      </Pressable>
    </Animated.View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
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
  // Attachment styles
  attachmentsContainer: {
    marginBottom: 8,
    gap: 6,
  },
  attachmentImage: {
    width: '100%',
    height: 180,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.secondary,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: borderRadius.md,
    padding: 10,
    gap: 10,
  },
  fileCardInfo: {
    flex: 1,
  },
  fileCardName: {
    color: colors.text.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  fileCardSize: {
    color: colors.text.secondary,
    fontSize: 11,
    marginTop: 2,
  },
  // Action button styles
  actionsContainer: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(48, 213, 200, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(48, 213, 200, 0.3)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 4,
  },
  actionPillText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
});
