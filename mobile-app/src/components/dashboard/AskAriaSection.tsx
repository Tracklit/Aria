import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { selectionChanged } from '../../utils/haptics';
import { useColors, spacing, borderRadius } from '../../theme';

const CHIPS = [
  'What should I train today?',
  'Analyze my last sprint',
];

const AskAriaSection = React.memo(function AskAriaSection() {
  const colors = useColors();
  const [chatInput, setChatInput] = useState('');

  const navigateToChat = (message?: string) => {
    const text = message || chatInput;
    if (text.trim()) {
      router.push({ pathname: '/(tabs)/chat', params: { prefill: text.trim() } });
    } else {
      router.push('/(tabs)/chat');
    }
    setChatInput('');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background.cardSolid }]}>
      <View style={styles.header}>
        <Ionicons name="sparkles" size={16} color={colors.primary} />
        <Text style={[styles.label, { color: colors.primary }]}>Ask Aria</Text>
      </View>
      <View style={styles.chipsWrap}>
        {CHIPS.map((chip) => (
          <TouchableOpacity
            key={chip}
            testID={`dashboard.chip.${chip.replace(/[^a-zA-Z0-9]+/g, '_')}`}
            style={[styles.chip, { backgroundColor: colors.background.secondary }]}
            onPress={() => { selectionChanged(); navigateToChat(chip); }}
          >
            <Text style={[styles.chipText, { color: colors.text.secondary }]}>{chip}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.inputRow}>
        <TouchableOpacity
          testID="dashboard.mic"
          style={[styles.micButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/(tabs)/chat')}
        >
          <Ionicons name="mic" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <TextInput
          testID="dashboard.chat_input"
          style={[styles.input, { backgroundColor: colors.background.secondary, color: colors.text.primary }]}
          placeholder="Ask Aria anything..."
          placeholderTextColor={colors.text.tertiary}
          value={chatInput}
          onChangeText={setChatInput}
          onSubmitEditing={() => navigateToChat()}
          returnKeyType="send"
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 24,
    marginTop: 16,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    paddingTop: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.md,
  },
  chip: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  micButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
  },
});

export default AskAriaSection;
