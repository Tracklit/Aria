import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
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
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useLocalSearchParams } from 'expo-router';
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
  const { prefill } = useLocalSearchParams<{ prefill?: string }>();
  const [showDrawer, setShowDrawer] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const tabBarHeight = useBottomTabBarHeight();

  const startPulse = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  const stopPulse = useCallback(() => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  }, [pulseAnim]);

  const handleVoiceInput = useCallback(async () => {
    if (isRecording) {
      // Stop recording
      try {
        setIsRecording(false);
        stopPulse();
        if (recordingRef.current) {
          await recordingRef.current.stopAndUnloadAsync();
          await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
          // Recording captured — transcription requires a cloud STT service or dev build with @react-native-voice/voice
          Alert.alert(
            'Voice Recorded',
            'Voice-to-text transcription requires a development build. Audio was captured but cannot be transcribed in Expo Go.',
          );
          recordingRef.current = null;
        }
      } catch (err) {
        console.error('Failed to stop recording:', err);
      }
    } else {
      // Start recording
      try {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Microphone access is needed for voice input.');
          return;
        }
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        const recording = new Audio.Recording();
        await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        await recording.startAsync();
        recordingRef.current = recording;
        setIsRecording(true);
        startPulse();
      } catch (err) {
        console.error('Failed to start recording:', err);
        Alert.alert('Error', 'Could not start voice recording.');
      }
    }
  }, [isRecording, startPulse, stopPulse]);

  useEffect(() => {
    if (prefill && hasValidToken) {
      setInputText(prefill);
    }
  }, [prefill, hasValidToken]);

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
            <Ionicons name="menu-outline" size={24} color={colors.text.primary} />
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
            <Ionicons name="create-outline" size={22} color={colors.text.primary} />
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
            <Ionicons name="close-circle" size={18} color={colors.text.primary} />
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
              <Ionicons name="sparkles" size={36} color={colors.teal} style={styles.emptyIcon} />
              <Text style={styles.emptyTitle}>
                {hasValidToken ? 'Chat with Aria' : 'Sign In Required'}
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
              <Text style={styles.typingText}>Aria is thinking...</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={[styles.inputDock, { paddingBottom: tabBarHeight }]}>
          <TouchableOpacity style={styles.attachBtn}>
            <Ionicons name="add" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <TextInput
            testID="chat.input"
            style={styles.input}
            placeholder="Type a message"
            placeholderTextColor={colors.text.secondary}
            value={inputText}
            onChangeText={setInputText}
            editable={!isSending && hasValidToken}
            multiline
          />
          <TouchableOpacity style={[styles.voiceBtn, isRecording && styles.voiceBtnRecording]} onPress={handleVoiceInput}>
            <Animated.View style={{ transform: [{ scale: isRecording ? pulseAnim : 1 }] }}>
              <Ionicons name={isRecording ? 'mic' : 'mic-outline'} size={20} color={isRecording ? colors.red : colors.text.primary} />
            </Animated.View>
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
              <ActivityIndicator color={colors.text.primary} size="small" />
            ) : (
              <Ionicons name="arrow-up" size={24} color={canSend ? colors.teal : colors.text.tertiary} />
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
  keyboard: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.background.secondary,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headerIconBtn: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: colors.text.primary,
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
    backgroundColor: colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: colors.background.secondary,
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  drawerTitle: {
    color: colors.text.primary,
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
    borderBottomColor: colors.background.secondary,
    paddingVertical: 10,
  },
  drawerRowActive: {
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  drawerRowText: {
    color: colors.text.primary,
    fontSize: 14,
    marginBottom: 4,
  },
  drawerRowTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  drawerRowDate: {
    color: colors.text.secondary,
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
    color: colors.text.primary,
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
    color: colors.text.primary,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: {
    color: colors.text.secondary,
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 20,
  },
  suggestions: {
    marginTop: 6,
  },
  suggestionsTitle: {
    color: colors.text.secondary,
    fontSize: 12,
    marginBottom: 8,
  },
  emptyIcon: {
    marginBottom: 12,
  },
  suggestionChip: {
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: 'rgba(48, 213, 200, 0.3)',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  suggestionText: {
    color: colors.text.primary,
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
    color: colors.text.secondary,
    fontSize: 12,
  },
  inputDock: {
    borderTopWidth: 1,
    borderTopColor: colors.background.secondary,
    backgroundColor: colors.background.primary,
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
    backgroundColor: colors.background.secondary,
    color: colors.text.primary,
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
    backgroundColor: colors.background.cardSolid,
    borderWidth: 1,
    borderColor: colors.background.secondary,
  },
  voiceBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.secondary,
  },
  voiceBtnRecording: {
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
    borderWidth: 1,
    borderColor: colors.red,
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
