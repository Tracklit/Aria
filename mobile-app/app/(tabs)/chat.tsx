import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { MessageBubble } from '../../src/components/features';
import { useChat, useAuth } from '../../src/context';
import { colors, typography, spacing, borderRadius } from '../../src/theme';

export default function ChatScreen() {
  const {
    messages,
    streamingMessage,
    conversations,
    currentConversationId,
    isLoading,
    isSending,
    isStreaming,
    error,
    loadConversations,
    selectConversation,
    startNewConversation,
    sendMessage,
    clearError,
  } = useChat();
  const { isAuthenticated, hasValidToken } = useAuth();

  const [inputText, setInputText] = useState('');
  const [showConversationList, setShowConversationList] = useState(false);
  const [inputHeight, setInputHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const tabBarHeight = useBottomTabBarHeight();
  const messagesPaddingBottom = inputHeight + tabBarHeight;
  const isOutOfPrompts = false;

  useEffect(() => {
    if (isAuthenticated && hasValidToken) {
      loadConversations();
    }
  }, [isAuthenticated, hasValidToken, loadConversations]);

  useEffect(() => {
    // Scroll to bottom when messages change or streaming message updates
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages, streamingMessage]);

  const handleSend = async () => {
    if (inputText.trim() && !isSending) {
      if (!isAuthenticated || !hasValidToken) {
        return;
      }
      const text = inputText.trim();
      setInputText('');
      await sendMessage(text);
    }
  };

  const handleSelectConversation = async (id: number) => {
    await selectConversation(id);
    setShowConversationList(false);
  };

  const handleNewConversation = () => {
    startNewConversation();
    setShowConversationList(false);
  };

  const renderConversationList = () => (
    <View style={styles.conversationListContainer}>
      <View style={styles.conversationListHeader}>
        <Text style={styles.conversationListTitle}>Conversations</Text>
        <TouchableOpacity onPress={() => setShowConversationList(false)}>
          <Ionicons name="close" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.newConversationButton} onPress={handleNewConversation}>
        <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
        <Text style={styles.newConversationText}>New Conversation</Text>
      </TouchableOpacity>

      <ScrollView style={styles.conversationList}>
        {conversations.map((conv) => (
          <TouchableOpacity
            key={conv.id}
            style={[
              styles.conversationItem,
              currentConversationId === conv.id && styles.conversationItemActive,
            ]}
            onPress={() => handleSelectConversation(conv.id)}
          >
            <Text
              style={[
                styles.conversationTitle,
                currentConversationId === conv.id && styles.conversationTitleActive,
              ]}
              numberOfLines={1}
            >
              {conv.title}
            </Text>
            <Text style={styles.conversationDate}>
              {new Date(conv.updatedAt).toLocaleDateString()}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyStateIcon}>
        <Ionicons name="chatbubbles-outline" size={48} color={colors.text.tertiary} />
      </View>
      <Text style={styles.emptyStateTitle}>
        {isAuthenticated && hasValidToken ? 'Chat with Aria' : 'Sign In Required'}
      </Text>
      <Text style={styles.emptyStateText}>
        {isAuthenticated && hasValidToken
          ? "Ask me anything about training, recovery, nutrition, or race strategy. I'm here to help you reach your goals!"
          : 'Please sign in to chat with Sprinthia AI.'}
      </Text>
      <View style={styles.suggestionsContainer}>
        <Text style={styles.suggestionsTitle}>Try asking:</Text>
        {[
          'How should I prepare for my first 5K?',
          'What should I eat before a long run?',
          'How do I prevent running injuries?',
        ].map((suggestion, index) => (
          <TouchableOpacity
            key={index}
            style={styles.suggestionChip}
            onPress={() => {
              setInputText(suggestion);
            }}
          >
            <Text style={styles.suggestionText}>{suggestion}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setShowConversationList(!showConversationList)}
          >
            <Ionicons name="menu" size={28} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Aria</Text>
          <TouchableOpacity style={styles.newButton} onPress={handleNewConversation}>
            <Ionicons name="create-outline" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        {showConversationList && renderConversationList()}

        {(!hasValidToken || error) && (
          <TouchableOpacity style={styles.errorBanner} onPress={clearError}>
            <Text style={styles.errorText}>
              {!hasValidToken ? 'Sign in required to chat with Sprinthia.' : error}
            </Text>
            <Ionicons name="close-circle" size={20} color={colors.text.primary} />
          </TouchableOpacity>
        )}

        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={[
            styles.messagesContent,
            { paddingBottom: messagesPaddingBottom },
            messages.length === 0 && styles.messagesContentEmpty,
          ]}
        >
          {isLoading && messages.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading conversation...</Text>
            </View>
          ) : messages.length === 0 ? (
            renderEmptyState()
          ) : (
            <>
              {messages.map((message) => (
                <MessageBubble key={message.id} text={message.text} sender={message.sender} />
              ))}
              {isStreaming && streamingMessage && (
                <MessageBubble
                  key="streaming"
                  text={streamingMessage + '▊'}
                  sender="ai"
                />
              )}
              {isSending && !isStreaming && (
                <View style={styles.typingIndicator}>
                  <View style={styles.typingDots}>
                    <View style={[styles.typingDot, styles.typingDot1]} />
                    <View style={[styles.typingDot, styles.typingDot2]} />
                    <View style={[styles.typingDot, styles.typingDot3]} />
                  </View>
                  <Text style={styles.typingText}>Aria is thinking...</Text>
                </View>
              )}
            </>
          )}
        </ScrollView>

        <View
          style={[styles.inputContainer, { paddingBottom: tabBarHeight }]}
          onLayout={(event: LayoutChangeEvent) => setInputHeight(event.nativeEvent.layout.height)}
        >
          <TextInput
            style={styles.input}
            placeholder="Ask Aria anything..."
            placeholderTextColor={colors.text.tertiary}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSend}
            multiline
            maxLength={2000}
            editable={!isSending && hasValidToken}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || isSending) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || isSending || !hasValidToken}
          >
            {isSending ? (
              <ActivityIndicator size="small" color={colors.text.primary} />
            ) : (
              <Ionicons
                name="send"
                size={20}
                color={inputText.trim() ? colors.text.primary : colors.text.tertiary}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.secondary,
  },
  menuButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
  },
  newButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conversationListContainer: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background.primary,
    zIndex: 100,
    paddingHorizontal: spacing.lg,
  },
  conversationListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.secondary,
  },
  conversationListTitle: {
    ...typography.h3,
    color: colors.text.primary,
  },
  newConversationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  newConversationText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  conversationList: {
    flex: 1,
  },
  conversationItem: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.secondary,
  },
  conversationItemActive: {
    backgroundColor: colors.background.secondary,
    marginHorizontal: -spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  conversationTitle: {
    ...typography.body,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  conversationTitleActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  conversationDate: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: borderRadius.md,
  },
  errorText: {
    ...typography.caption,
    color: colors.text.primary,
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: spacing.lg,
    paddingBottom: 100,
  },
  messagesContentEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  loadingText: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyStateTitle: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptyStateText: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  suggestionsContainer: {
    width: '100%',
  },
  suggestionsTitle: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginBottom: spacing.sm,
  },
  suggestionChip: {
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  suggestionText: {
    ...typography.body,
    color: colors.text.primary,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginHorizontal: 2,
    opacity: 0.4,
  },
  typingDot1: {
    opacity: 0.4,
  },
  typingDot2: {
    opacity: 0.6,
  },
  typingDot3: {
    opacity: 0.8,
  },
  typingText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingBottom: spacing.xl,
    backgroundColor: colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: colors.background.secondary,
  },
  input: {
    flex: 1,
    ...typography.body,
    backgroundColor: colors.background.cardSolid,
    color: colors.text.primary,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.background.secondary,
  },
});
