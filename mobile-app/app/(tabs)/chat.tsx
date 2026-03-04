import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useChat, useAuth } from '../../src/context';
import { MessageBubble } from '../../src/components/features';
import { colors } from '../../src/theme';

const SUGGESTIONS = [
  'How should I prepare for my first 5K?',
  'What to eat before a long run?',
];

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
  const [showDrawer, setShowDrawer] = useState(false);
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const tabBarHeight = useBottomTabBarHeight();

  useEffect(() => {
    if (isAuthenticated && hasValidToken) {
      loadConversations();
    }
  }, [isAuthenticated, hasValidToken, loadConversations]);

  useEffect(() => {
    const timeout = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    return () => clearTimeout(timeout);
  }, [messages, streamingMessage, isSending]);

  const canSend = inputText.trim().length > 0 && !isSending && hasValidToken;

  const renderedMessages = useMemo(() => {
    if (messages.length === 0 && !streamingMessage) return null;

    return (
      <>
        {messages.map((message) => (
          <MessageBubble key={message.id} text={message.text} sender={message.sender} />
        ))}
        {isStreaming && streamingMessage ? (
          <MessageBubble text={`${streamingMessage}▊`} sender="ai" />
        ) : null}
      </>
    );
  }, [messages, streamingMessage, isStreaming]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity
            testID="chat.menu"
            style={styles.headerIconBtn}
            onPress={() => setShowDrawer((s) => !s)}
          >
            <Ionicons name="menu-outline" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chat</Text>
          <TouchableOpacity
            testID="chat.new_conversation"
            style={styles.headerIconBtn}
            onPress={() => {
              startNewConversation();
              setShowDrawer(false);
            }}
          >
            <Ionicons name="create-outline" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>

        {showDrawer ? (
          <View style={styles.drawer}>
            <Text style={styles.drawerTitle}>Conversation History</Text>
            <TouchableOpacity
              style={styles.drawerNew}
              onPress={() => {
                startNewConversation();
                setShowDrawer(false);
              }}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
              <Text style={styles.drawerNewText}>New Chat</Text>
            </TouchableOpacity>
            <ScrollView>
              {conversations.map((conversation) => (
                <TouchableOpacity
                  testID={`chat.conversation.${conversation.id}`}
                  key={conversation.id}
                  onPress={async () => {
                    await selectConversation(conversation.id);
                    setShowDrawer(false);
                  }}
                  style={[
                    styles.drawerRow,
                    currentConversationId === conversation.id && styles.drawerRowActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.drawerRowText,
                      currentConversationId === conversation.id && styles.drawerRowTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {conversation.title}
                  </Text>
                  <Text style={styles.drawerRowDate}>
                    {new Date(conversation.updatedAt).toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {error ? (
          <TouchableOpacity testID="chat.error_banner" style={styles.errorBanner} onPress={clearError}>
            <Text style={styles.errorText}>{error}</Text>
            <Ionicons name="close-circle" size={18} color="#FFF" />
          </TouchableOpacity>
        ) : null}

        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={[
            styles.messagesContent,
            { paddingBottom: tabBarHeight + 110 },
            messages.length === 0 && !streamingMessage ? { flex: 1, justifyContent: 'center' } : null,
          ]}
          showsVerticalScrollIndicator={false}
        >
          {isLoading && messages.length === 0 ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : renderedMessages ? (
            renderedMessages
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="sparkles" size={36} color="#00E5FF" style={styles.emptyIcon} />
              <Text style={styles.emptyTitle}>
                {hasValidToken ? 'Chat with SprintGPT' : 'Sign In Required'}
              </Text>
              <Text style={styles.emptyText}>
                {hasValidToken
                  ? 'Ask anything about endurance, workouts, and recovery.'
                  : 'Please sign in to use chat.'}
              </Text>
              <View style={styles.suggestions}>
                <Text style={styles.suggestionsTitle}>Try asking:</Text>
                {SUGGESTIONS.map((suggestion) => (
                  <TouchableOpacity
                    key={suggestion}
                    testID={`chat.suggestion.${suggestion.replace(/[^a-zA-Z0-9]+/g, '_')}`}
                    style={styles.suggestionChip}
                    onPress={() => setInputText(suggestion)}
                  >
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {isSending && !isStreaming ? (
            <View style={styles.typingIndicator}>
              <View style={styles.typingDots}>
                <View style={[styles.typingDot, { opacity: 0.4 }]} />
                <View style={[styles.typingDot, { opacity: 0.6 }]} />
                <View style={[styles.typingDot, { opacity: 0.8 }]} />
              </View>
              <Text style={styles.typingText}>SprintGPT is thinking...</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={[styles.inputDock, { paddingBottom: tabBarHeight }]}>
          <TouchableOpacity style={styles.attachBtn}>
            <Ionicons name="add" size={24} color="#FFF" />
          </TouchableOpacity>
          <TextInput
            testID="chat.input"
            style={styles.input}
            placeholder="Type a message"
            placeholderTextColor="#8E8E93"
            value={inputText}
            onChangeText={setInputText}
            editable={!isSending && hasValidToken}
            multiline
          />
          <TouchableOpacity style={styles.voiceBtn}>
            <Ionicons name="mic-outline" size={20} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity
            testID="chat.send"
            style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
            disabled={!canSend}
            onPress={async () => {
              const value = inputText.trim();
              if (!value) return;
              setInputText('');
              await sendMessage(value, true);
            }}
          >
            {isSending ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Ionicons name="arrow-up" size={24} color={canSend ? colors.teal : '#666'} />
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
    backgroundColor: '#000',
  },
  keyboard: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#111',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headerIconBtn: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  drawer: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
    backgroundColor: '#000',
    borderTopWidth: 1,
    borderTopColor: '#111',
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  drawerTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  drawerNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  drawerNewText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  drawerRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#181818',
    paddingVertical: 10,
  },
  drawerRowActive: {
    backgroundColor: '#101010',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  drawerRowText: {
    color: '#FFF',
    fontSize: 14,
    marginBottom: 4,
  },
  drawerRowTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  drawerRowDate: {
    color: '#8E8E93',
    fontSize: 11,
  },
  errorBanner: {
    marginHorizontal: 12,
    marginTop: 10,
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    color: '#FFF',
    flex: 1,
    fontSize: 12,
  },
  messages: {
    flex: 1,
  },
  messagesContent: {
    paddingTop: 14,
  },
  center: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyState: {
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: {
    color: '#9A9A9A',
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 20,
  },
  suggestions: {
    marginTop: 6,
  },
  suggestionsTitle: {
    color: '#8E8E93',
    fontSize: 12,
    marginBottom: 8,
  },
  emptyIcon: {
    marginBottom: 12,
  },
  suggestionChip: {
    backgroundColor: '#131316',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  suggestionText: {
    color: '#F2F2F2',
    fontSize: 14,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
    marginTop: 4,
  },
  typingDots: {
    flexDirection: 'row',
    marginRight: 8,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginRight: 3,
  },
  typingText: {
    color: '#8E8E93',
    fontSize: 12,
  },
  inputDock: {
    borderTopWidth: 1,
    borderTopColor: '#111',
    backgroundColor: '#000',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 100,
    borderRadius: 21,
    backgroundColor: '#151518',
    color: '#FFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  attachBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  voiceBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#222',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#004d40',
  },
  sendBtnDisabled: {
    backgroundColor: '#1F3430',
  },
});
