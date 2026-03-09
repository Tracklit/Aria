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
  Image,
  Dimensions,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useChat, useAuth } from '../../src/context';
import { MessageBubble } from '../../src/components/features';
import { ChatAttachmentInfo, ActionButton } from '../../src/components/features/MessageBubble';
import { transcribeVoiceAudio, uploadChatAttachment } from '../../src/lib/api';
import { impactLight, impactMedium, selectionChanged } from '../../src/utils/haptics';
import { useThemedStyles, useColors } from '../../src/theme';
import { ThemeColors } from '../../src/theme/colors';

const { width: screenWidth } = Dimensions.get('window');

const SUGGESTIONS = [
  'Analyze my recent sprint times',
  'Build me a 60m training plan',
  'What should I eat before a meet?',
  'How do I recover after max-effort sprints?',
];

// Color hash for conversation initials
const INITIAL_COLORS = ['#00E5FF', '#30D5C8', '#FF9F0A', '#32D74B', '#FF453A', '#FFD60A'];
function getInitialColor(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  return INITIAL_COLORS[Math.abs(hash) % INITIAL_COLORS.length];
}

export default function ChatScreen() {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
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
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachmentInfo[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const inputRef = useRef<TextInput>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const tabBarHeight = useBottomTabBarHeight();

  // Drawer animation values
  const drawerTranslateX = useRef(new Animated.Value(-screenWidth * 0.8)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Typing indicator bounce animations
  const dot1Anim = useRef(new Animated.Value(0)).current;
  const dot2Anim = useRef(new Animated.Value(0)).current;
  const dot3Anim = useRef(new Animated.Value(0)).current;

  // Recording pulse ring animation
  const recordPulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isSending && !isStreaming) {
      const createDotAnim = (anim: Animated.Value, delay: number) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, { toValue: -4, duration: 200, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }),
          ])
        );
      const a1 = createDotAnim(dot1Anim, 0);
      const a2 = createDotAnim(dot2Anim, 150);
      const a3 = createDotAnim(dot3Anim, 300);
      a1.start();
      a2.start();
      a3.start();
      return () => {
        a1.stop();
        a2.stop();
        a3.stop();
        dot1Anim.setValue(0);
        dot2Anim.setValue(0);
        dot3Anim.setValue(0);
      };
    }
  }, [isSending, isStreaming, dot1Anim, dot2Anim, dot3Anim]);

  // Recording red pulse ring
  useEffect(() => {
    if (isRecording) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(recordPulseAnim, { toValue: 1.4, duration: 600, useNativeDriver: true }),
          Animated.timing(recordPulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => {
        loop.stop();
        recordPulseAnim.setValue(1);
      };
    }
  }, [isRecording, recordPulseAnim]);

  const openDrawer = useCallback(() => {
    setShowDrawer(true);
    Animated.parallel([
      Animated.timing(drawerTranslateX, { toValue: 0, duration: 280, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0.5, duration: 280, useNativeDriver: true }),
    ]).start();
  }, [drawerTranslateX, backdropOpacity]);

  const closeDrawer = useCallback(() => {
    Animated.parallel([
      Animated.timing(drawerTranslateX, { toValue: -screenWidth * 0.8, duration: 240, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: 240, useNativeDriver: true }),
    ]).start(() => setShowDrawer(false));
  }, [drawerTranslateX, backdropOpacity]);

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

  const resetAudioMode = useCallback(async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });
    } catch {
      // Best effort reset
    }
  }, []);

  const formatVoiceError = useCallback((error: unknown, fallback: string) => {
    const message = String((error as any)?.message || '').toLowerCase();
    if (message.includes('permission')) {
      return 'Microphone permission is required for voice input.';
    }
    if (message.includes('simulator')) {
      return 'Microphone recording is not available in iOS Simulator. Please use a physical device.';
    }
    if (message.includes('no speech')) {
      return 'No speech was detected. Please try again and speak clearly.';
    }
    if (message.includes('authentication')) {
      return 'Speech service authentication failed. Please try again in a moment.';
    }
    return fallback;
  }, []);

  const handleVoiceInput = useCallback(async () => {
    if (!hasValidToken) {
      Alert.alert('Sign In Required', 'Please sign in to use voice input.');
      return;
    }

    if (isTranscribing) {
      return;
    }

    if (isRecording) {
      try {
        impactMedium();
        setIsRecording(false);
        stopPulse();

        const recording = recordingRef.current;
        recordingRef.current = null;
        if (!recording) {
          await resetAudioMode();
          return;
        }

        await recording.stopAndUnloadAsync();
        await resetAudioMode();

        const recordingUri = recording.getURI();
        if (!recordingUri) {
          Alert.alert('Recording Failed', 'Could not access the recorded audio file.');
          return;
        }

        setIsTranscribing(true);
        const transcription = await transcribeVoiceAudio(recordingUri, 'en-US');
        const transcriptText = transcription.text.trim();

        if (!transcriptText) {
          Alert.alert('No Speech Detected', 'Please try again and speak clearly.');
          return;
        }

        setInputText((prev) => {
          const existing = prev.trim();
          return existing.length > 0 ? `${existing} ${transcriptText}` : transcriptText;
        });
      } catch (err) {
        console.error('Voice transcription failed:', err);
        Alert.alert('Transcription Error', formatVoiceError(err, 'Could not transcribe your recording.'));
      } finally {
        setIsTranscribing(false);
      }
      return;
    }

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
      impactMedium();
      setIsRecording(true);
      startPulse();
    } catch (err) {
      console.error('Failed to start recording:', err);
      await resetAudioMode();
      Alert.alert('Microphone Error', formatVoiceError(err, 'Could not start microphone recording.'));
    }
  }, [
    formatVoiceError,
    hasValidToken,
    isRecording,
    isTranscribing,
    resetAudioMode,
    startPulse,
    stopPulse,
  ]);

  // ==================== Attachment handling ====================

  const handleAttachPress = useCallback(() => {
    if (!hasValidToken) {
      Alert.alert('Sign In Required', 'Please sign in to attach files.');
      return;
    }

    Alert.alert('Attach', 'Choose an option', [
      {
        text: 'Take Photo',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission Required', 'Camera access is needed to take photos.');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.8,
            allowsEditing: false,
          });
          if (!result.canceled && result.assets[0]) {
            await uploadAttachment(result.assets[0].uri, result.assets[0].fileName || 'photo.jpg');
          }
        },
      },
      {
        text: 'Choose from Library',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
            allowsEditing: false,
          });
          if (!result.canceled && result.assets[0]) {
            await uploadAttachment(result.assets[0].uri, result.assets[0].fileName || 'image.jpg');
          }
        },
      },
      {
        text: 'Choose Document',
        onPress: async () => {
          const result = await DocumentPicker.getDocumentAsync({
            type: ['application/pdf', 'text/csv', 'text/plain'],
            copyToCacheDirectory: true,
          });
          if (!result.canceled && result.assets[0]) {
            await uploadAttachment(result.assets[0].uri, result.assets[0].name || 'document');
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [hasValidToken]);

  const uploadAttachment = useCallback(async (uri: string, filename: string) => {
    setIsUploading(true);
    try {
      const result = await uploadChatAttachment(uri, filename);
      setPendingAttachments((prev) => [...prev, result]);
    } catch (err) {
      console.error('Attachment upload failed:', err);
      Alert.alert('Upload Failed', 'Could not upload the file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, []);

  const removePendingAttachment = useCallback((index: number) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ==================== Edit message handler ====================

  const handleEditMessage = useCallback((text: string) => {
    setInputText(text);
    inputRef.current?.focus();
  }, []);

  // ==================== Action button handler ====================

  const handleAction = useCallback((action: ActionButton) => {
    switch (action.action) {
      case 'create_training_plan':
        router.push('/plan/create' as any);
        break;
      case 'create_nutrition_plan':
        router.push('/nutrition/create' as any);
        break;
      case 'create_event':
        router.push('/events/create' as any);
        break;
      case 'view_workout':
        router.push('/workout/log-workout' as any);
        break;
      case 'start_session':
        router.push('/workout/log-workout' as any);
        break;
      default:
        console.warn('Unknown action:', action.action);
    }
  }, [router]);

  // ==================== Send with attachments ====================

  const handleSend = useCallback(async () => {
    const value = inputText.trim();
    if (!value && pendingAttachments.length === 0) return;
    impactLight();

    const attachments = [...pendingAttachments];
    const messageText = value || (attachments.length > 0 ? `[Attached ${attachments.length} file(s)]` : '');

    setInputText('');
    setPendingAttachments([]);
    await sendMessage(messageText, true, attachments);
  }, [inputText, pendingAttachments, sendMessage]);

  useEffect(() => {
    return () => {
      const cleanup = async () => {
        try {
          if (recordingRef.current) {
            await recordingRef.current.stopAndUnloadAsync();
          }
        } catch {
          // ignore cleanup errors
        } finally {
          recordingRef.current = null;
          await resetAudioMode();
        }
      };

      cleanup();
    };
  }, [resetAudioMode]);

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

  const canSend = (inputText.trim().length > 0 || pendingAttachments.length > 0) && !isSending && !isTranscribing && !isRecording && !isUploading && hasValidToken;

  const renderedMessages = useMemo(() => {
    if (messages.length === 0 && !streamingMessage) return null;

    return (
      <>
        {messages.map((message, index) => {
          const isFirst = index === 0 || messages[index - 1].sender !== message.sender;
          return (
            <MessageBubble
              key={message.id}
              text={message.text}
              sender={message.sender}
              animate={message.animate}
              attachments={(message as any).attachments}
              onEdit={message.sender === 'user' ? handleEditMessage : undefined}
              onAction={message.sender === 'ai' ? handleAction : undefined}
              isFirstInSequence={isFirst}
            />
          );
        })}
        {isStreaming && streamingMessage ? (
          <MessageBubble text={`${streamingMessage}\u2582`} sender="ai" streaming isFirstInSequence />
        ) : null}
      </>
    );
  }, [messages, streamingMessage, isStreaming, handleEditMessage, handleAction]);

  const renderConversationItem = useCallback(({ item: conversation }: { item: typeof conversations[number] }) => {
    const title = conversation.title || 'New Conversation';
    const initial = title.charAt(0).toUpperCase();
    const circleColor = getInitialColor(title);
    const isActive = currentConversationId === conversation.id;

    return (
      <TouchableOpacity
        testID={`chat.conversation.${conversation.id}`}
        onPress={async () => {
          await selectConversation(conversation.id);
          closeDrawer();
        }}
        style={[
          styles.drawerRow,
          isActive && styles.drawerRowActive,
        ]}
      >
        <View style={[styles.drawerRowCircle, { backgroundColor: circleColor }]}>
          <Text style={styles.drawerRowInitial}>{initial}</Text>
        </View>
        <View style={styles.drawerRowContent}>
          <Text
            style={[
              styles.drawerRowText,
              isActive && styles.drawerRowTextActive,
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>
        <Text style={styles.drawerRowDate}>
          {new Date(conversation.updatedAt).toLocaleDateString()}
        </Text>
      </TouchableOpacity>
    );
  }, [currentConversationId, selectConversation, closeDrawer, styles, colors]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            testID="chat.menu"
            style={styles.headerIconBtn}
            onPress={openDrawer}
          >
            <Ionicons name="chatbubbles-outline" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <LinearGradient
              colors={['#30D5C8', '#00E5FF']}
              style={styles.headerAvatar}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Image source={require('../../assets/icon_transparent.png')} style={styles.headerAvatarLogo} />
            </LinearGradient>
            <Text style={styles.headerTitle}>ARIA</Text>
          </View>
          <TouchableOpacity
            testID="chat.new_conversation"
            style={styles.headerIconBtn}
            onPress={() => {
              impactLight();
              startNewConversation();
              closeDrawer();
            }}
          >
            <Ionicons name="create-outline" size={22} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Animated Drawer */}
        {showDrawer ? (
          <>
            <Animated.View
              style={[
                styles.backdrop,
                { opacity: backdropOpacity },
              ]}
              onTouchEnd={closeDrawer}
            />
            <Animated.View
              style={[
                styles.drawer,
                { transform: [{ translateX: drawerTranslateX }] },
              ]}
            >
              {/* Drawer header */}
              <View style={styles.drawerHeader}>
                <LinearGradient
                  colors={['#30D5C8', '#00E5FF']}
                  style={styles.drawerAvatar}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Image source={require('../../assets/icon_transparent.png')} style={styles.drawerAvatarLogo} />
                </LinearGradient>
                <View>
                  <Text style={styles.drawerHeaderTitle}>Aria Coach</Text>
                  <Text style={styles.drawerHeaderSubtitle}>AI Sprint Coach</Text>
                </View>
              </View>

              {/* New Chat button */}
              <TouchableOpacity
                onPress={() => {
                  impactLight();
                  startNewConversation();
                  closeDrawer();
                }}
                style={styles.drawerNewBtn}
              >
                <LinearGradient
                  colors={['#00E5FF', '#30D5C8']}
                  style={styles.drawerNewGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.drawerNewText}>New Chat</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Conversation list */}
              <FlatList
                data={conversations}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderConversationItem}
                style={styles.drawerList}
                showsVerticalScrollIndicator={false}
              />
            </Animated.View>
          </>
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
              <View style={styles.emptyAvatarContainer}>
                <LinearGradient
                  colors={['#30D5C8', '#00E5FF']}
                  style={styles.emptyAvatar}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Image source={require('../../assets/icon_transparent.png')} style={styles.emptyAvatarLogo} />
                </LinearGradient>
              </View>
              <Text style={styles.emptyTitle}>
                {hasValidToken ? 'Your AI Sprint Coach' : 'Sign In Required'}
              </Text>
              <Text style={styles.emptyText}>
                {hasValidToken
                  ? 'Ask me anything about your training, performance, or race strategy.'
                  : 'Please sign in to use chat.'}
              </Text>
              <View style={styles.suggestions}>
                {SUGGESTIONS.map((suggestion) => (
                  <TouchableOpacity
                    key={suggestion}
                    testID={`chat.suggestion.${suggestion}`}
                    style={styles.suggestionChip}
                    onPress={() => { selectionChanged(); setInputText(suggestion); }}
                  >
                    <Ionicons name="chevron-forward-outline" size={12} color={colors.teal} style={{ marginRight: 6 }} />
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {isSending && !isStreaming ? (
            <View style={styles.typingIndicator}>
              <View style={styles.typingDots}>
                <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot1Anim }] }]} />
                <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot2Anim }] }]} />
                <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot3Anim }] }]} />
              </View>
              <Text style={styles.typingText}>Aria is thinking...</Text>
            </View>
          ) : null}
        </ScrollView>

        {/* Pending attachments preview */}
        {pendingAttachments.length > 0 ? (
          <View style={styles.pendingAttachments}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {pendingAttachments.map((att, index) => (
                <View key={index} style={styles.pendingAttItem}>
                  {att.type === 'image' ? (
                    <Image source={{ uri: att.url }} style={styles.pendingAttThumb} resizeMode="cover" />
                  ) : (
                    <View style={styles.pendingAttFileIcon}>
                      <Ionicons
                        name={att.type === 'pdf' ? 'document-text' : 'document-outline'}
                        size={20}
                        color={colors.teal}
                      />
                    </View>
                  )}
                  <Text style={styles.pendingAttName} numberOfLines={1}>{att.filename}</Text>
                  <TouchableOpacity
                    style={styles.pendingAttRemove}
                    onPress={() => removePendingAttachment(index)}
                  >
                    <Ionicons name="close-circle" size={18} color={colors.text.secondary} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={[
          styles.inputDock,
          { paddingBottom: tabBarHeight },
        ]}>
          <View style={[
            styles.inputContainer,
            inputFocused && styles.inputContainerFocused,
          ]}>
            <TouchableOpacity
              style={[styles.attachBtn, isUploading && { opacity: 0.5 }]}
              onPress={handleAttachPress}
              disabled={isUploading || isSending}
            >
              {isUploading ? (
                <ActivityIndicator size="small" color={colors.text.primary} />
              ) : (
                <Ionicons name="attach-outline" size={22} color={colors.text.secondary} />
              )}
            </TouchableOpacity>
            <TextInput
              ref={inputRef}
              testID="chat.input"
              style={styles.input}
              placeholder={isTranscribing ? 'Transcribing voice...' : 'Message Aria...'}
              placeholderTextColor={colors.text.secondary}
              value={inputText}
              onChangeText={setInputText}
              editable={!isSending && !isTranscribing && hasValidToken}
              multiline
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
            />
            <View style={styles.inputActions}>
              {/* Voice button */}
              <TouchableOpacity
                style={[
                  styles.voiceBtn,
                  (isTranscribing || isSending || !hasValidToken) && styles.voiceBtnDisabled,
                ]}
                onPress={handleVoiceInput}
                disabled={isTranscribing || isSending || !hasValidToken}
              >
                {isTranscribing ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : isRecording ? (
                  <View style={styles.voiceRecordingContainer}>
                    <Animated.View style={[
                      styles.voicePulseRing,
                      { transform: [{ scale: recordPulseAnim }] },
                    ]} />
                    <Ionicons name="mic" size={18} color={colors.red} />
                  </View>
                ) : (
                  <Ionicons name="mic-outline" size={18} color={colors.text.secondary} />
                )}
              </TouchableOpacity>
              {/* Send button */}
              <TouchableOpacity
                testID="chat.send"
                style={styles.sendBtnOuter}
                disabled={!canSend}
                onPress={handleSend}
              >
                {isSending ? (
                  <View style={[styles.sendBtn, styles.sendBtnDisabled]}>
                    <ActivityIndicator color={colors.text.primary} size="small" />
                  </View>
                ) : canSend ? (
                  <LinearGradient
                    colors={['#00E5FF', '#30D5C8']}
                    style={styles.sendBtn}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="send" size={18} color="#000" />
                  </LinearGradient>
                ) : (
                  <View style={[styles.sendBtn, styles.sendBtnDisabled]}>
                    <Ionicons name="send" size={18} color={colors.text.tertiary} />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  keyboard: {
    flex: 1,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarLogo: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
  },
  headerTitle: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  // Drawer
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,1)',
    zIndex: 10,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: screenWidth * 0.8,
    height: '100%',
    backgroundColor: '#111111',
    zIndex: 11,
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  drawerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerAvatarLogo: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },
  drawerHeaderTitle: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  drawerHeaderSubtitle: {
    color: colors.text.secondary,
    fontSize: 12,
    marginTop: 2,
  },
  drawerNewBtn: {
    marginBottom: 16,
    borderRadius: 10,
    overflow: 'hidden',
  },
  drawerNewGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 10,
  },
  drawerNewText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '700',
  },
  drawerList: {
    flex: 1,
  },
  drawerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginBottom: 2,
  },
  drawerRowActive: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  drawerRowCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  drawerRowInitial: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  drawerRowContent: {
    flex: 1,
    marginRight: 8,
  },
  drawerRowText: {
    color: colors.text.primary,
    fontSize: 14,
  },
  drawerRowTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  drawerRowDate: {
    color: colors.text.secondary,
    fontSize: 12,
  },
  // Error
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
  // Messages
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
  // Empty state
  emptyState: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  emptyAvatarContainer: {
    marginBottom: 20,
    shadowColor: '#00E5FF',
    shadowRadius: 20,
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 0 },
  },
  emptyAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyAvatarLogo: {
    width: 56,
    height: 56,
    resizeMode: 'contain',
  },
  emptyTitle: {
    color: colors.text.primary,
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    color: colors.text.secondary,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: 'rgba(0,229,255,0.25)',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    margin: 4,
  },
  suggestionText: {
    color: colors.text.primary,
    fontSize: 13,
  },
  // Typing indicator
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
  // Pending attachments
  pendingAttachments: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.background.secondary,
    backgroundColor: colors.background.primary,
  },
  pendingAttItem: {
    width: 80,
    alignItems: 'center',
  },
  pendingAttThumb: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: colors.background.secondary,
  },
  pendingAttFileIcon: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingAttName: {
    color: colors.text.secondary,
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
    width: 72,
  },
  pendingAttRemove: {
    position: 'absolute',
    top: -4,
    right: 4,
  },
  // Input dock
  inputDock: {
    backgroundColor: colors.background.primary,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 24,
    padding: 8,
  },
  inputContainerFocused: {
    borderColor: colors.primary,
  },
  attachBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 100,
    color: colors.text.primary,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 15,
  },
  inputActions: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  voiceBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceBtnDisabled: {
    opacity: 0.55,
  },
  voiceRecordingContainer: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voicePulseRing: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: colors.red,
    opacity: 0.6,
  },
  sendBtnOuter: {
    width: 40,
    height: 40,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: colors.background.secondary,
  },
});
