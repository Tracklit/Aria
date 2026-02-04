import React, { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react';
import {
  getConversations,
  createConversation,
  getConversationMessages,
  deleteConversation,
  sendChatMessage,
  sendChatMessageStream,
  ChatResponse,
} from '../lib/api';
import { getToken } from '../lib/tokenStorage';
import { ToastManager } from '../components/Toast';
import { retryWithBackoff, isRetryableError } from '../lib/retry';

export interface Message {
  id: string;
  text: string;
  timestamp: Date;
  sender: 'ai' | 'user';
}

export interface Conversation {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
}

const FALLBACK_AI_RESPONSE =
  "I'm having trouble connecting to my AI coach brain right now. Please try again in a moment!";

interface ChatState {
  conversations: Conversation[];
  currentConversationId: number | null;
  messages: Message[];
  streamingMessage: string | null;
  isLoading: boolean;
  isSending: boolean;
  isStreaming: boolean;
  error: string | null;
}

interface ChatContextType extends ChatState {
  loadConversations: () => Promise<void>;
  selectConversation: (id: number) => Promise<void>;
  startNewConversation: () => void;
  sendMessage: (text: string, useStreaming?: boolean) => Promise<void>;
  deleteCurrentConversation: () => Promise<void>;
  clearError: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ChatState>({
    conversations: [],
    currentConversationId: null,
    messages: [],
    streamingMessage: null,
    isLoading: false,
    isSending: false,
    isStreaming: false,
    error: null,
  });

  const streamingMessageRef = useRef<string>('');

  const loadConversations = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const conversations = await getConversations() as Conversation[];
      setState((prev) => ({
        ...prev,
        conversations,
        isLoading: false,
      }));
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to load conversations';
      ToastManager.error(errorMessage);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, []);

  const selectConversation = useCallback(async (id: number) => {
    setState((prev) => ({ ...prev, isLoading: true, currentConversationId: id, error: null }));
    try {
      const apiMessages = await getConversationMessages(id) as any[];
      const messages: Message[] = apiMessages.map((msg) => ({
        id: msg.id.toString(),
        text: msg.content,
        timestamp: new Date(msg.createdAt),
        sender: msg.role === 'user' ? 'user' : 'ai',
      }));
      setState((prev) => ({
        ...prev,
        messages,
        isLoading: false,
      }));
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to load messages';
      ToastManager.error(errorMessage);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, []);

  const startNewConversation = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentConversationId: null,
      messages: [],
      error: null,
    }));
  }, []);

  const sendMessage = useCallback(async (text: string, useStreaming = true) => {
    const token = await getToken();
    if (!token) {
      setState((prev) => ({
        ...prev,
        error: 'Sign in required to chat with Sprinthia.',
        isSending: false,
      }));
      return;
    }

    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      text,
      timestamp: new Date(),
      sender: 'user',
    };

    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isSending: true,
      isStreaming: useStreaming,
      streamingMessage: useStreaming ? '' : null,
      error: null,
    }));

    const chatInput = {
      message: text,
      conversationId: state.currentConversationId || undefined,
    };

    if (__DEV__) {
      console.log('[Chat] sprinthia request', {
        conversationId: chatInput.conversationId ?? null,
        messageLength: chatInput.message.length,
        streaming: useStreaming,
      });
    }

    try {
      if (useStreaming) {
        // Streaming mode
        streamingMessageRef.current = '';

        await sendChatMessageStream(
          chatInput,
          (chunk: string) => {
            // Accumulate chunks
            streamingMessageRef.current += chunk;
            setState((prev) => ({
              ...prev,
              streamingMessage: streamingMessageRef.current,
            }));
          },
          () => {
            // On complete
            const finalText = streamingMessageRef.current;
            const aiMessage: Message = {
              id: `ai-${Date.now()}`,
              text: finalText,
              timestamp: new Date(),
              sender: 'ai',
            };

            setState((prev) => {
              const updatedMessages = prev.messages.map((msg) =>
                msg.id === userMessage.id ? { ...msg, id: `user-${Date.now()}` } : msg
              );

              return {
                ...prev,
                messages: [...updatedMessages, aiMessage],
                streamingMessage: null,
                isSending: false,
                isStreaming: false,
              };
            });

            // Refresh conversations list if this was a new conversation
            if (!state.currentConversationId) {
              loadConversations();
            }

            streamingMessageRef.current = '';
          },
          (error: Error) => {
            // On error, fall back to non-streaming
            if (__DEV__) {
              console.log('[Chat] Streaming failed, falling back to non-streaming:', error.message);
            }
            setState((prev) => ({
              ...prev,
              streamingMessage: null,
              isStreaming: false,
            }));
            // Retry without streaming
            sendMessage(text, false);
          }
        );
      } else {
        // Non-streaming mode (fallback) with retry logic
        const response: ChatResponse = await retryWithBackoff(
          async () => {
            const res = await sendChatMessage(chatInput);
            // Treat fallback AI response as retryable error
            if (res.response?.trim() === FALLBACK_AI_RESPONSE) {
              const error = new Error('AI service temporarily unavailable');
              (error as any).status = 503; // Service unavailable
              throw error;
            }
            return res;
          },
          {
            maxRetries: 2,
            baseDelay: 750,
            shouldRetry: (error) => {
              // Retry on network errors or 5xx errors
              return isRetryableError(error);
            },
          }
        ).catch((error) => {
          // If all retries fail, return fallback response instead of throwing
          return {
            response: FALLBACK_AI_RESPONSE,
            conversationId: state.currentConversationId || 0,
          };
        });

        const aiMessage: Message = {
          id: `ai-${Date.now()}`,
          text: response.response,
          timestamp: new Date(),
          sender: 'ai',
        };

        setState((prev) => {
          const updatedMessages = prev.messages.map((msg) =>
            msg.id === userMessage.id ? { ...msg, id: `user-${Date.now()}` } : msg
          );

          return {
            ...prev,
            currentConversationId: response.conversationId,
            messages: [...updatedMessages, aiMessage],
            isSending: false,
            isStreaming: false,
            streamingMessage: null,
            error:
              response.response?.trim() === FALLBACK_AI_RESPONSE
                ? 'Sprinthia AI is unavailable. Please try again.'
                : null,
          };
        });

        // Refresh conversations list if this was a new conversation
        if (!state.currentConversationId) {
          loadConversations();
        }
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to send message';
      ToastManager.error(errorMessage);
      setState((prev) => ({
        ...prev,
        isSending: false,
        isStreaming: false,
        streamingMessage: null,
        error: errorMessage,
      }));
    }
  }, [state.currentConversationId, loadConversations]);

  const deleteCurrentConversation = useCallback(async () => {
    if (!state.currentConversationId) return;

    try {
      await deleteConversation(state.currentConversationId);
      setState((prev) => ({
        ...prev,
        conversations: prev.conversations.filter((c) => c.id !== prev.currentConversationId),
        currentConversationId: null,
        messages: [],
      }));
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to delete conversation';
      ToastManager.error(errorMessage);
      setState((prev) => ({
        ...prev,
        error: errorMessage,
      }));
    }
  }, [state.currentConversationId]);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return (
    <ChatContext.Provider
      value={{
        ...state,
        loadConversations,
        selectConversation,
        startNewConversation,
        sendMessage,
        deleteCurrentConversation,
        clearError,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
