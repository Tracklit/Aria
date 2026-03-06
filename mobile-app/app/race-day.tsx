import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles, useColors } from '../src/theme';
import { ThemeColors } from '../src/theme/colors';

const SUGGESTIONS = ['What if it rains?', 'Pre-race dinner ideas?', 'Warmup drills?'];

export default function RaceDayScreen() {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const router = useRouter();
  const [message, setMessage] = useState('');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity testID="raceDay.back" onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text testID="raceDay.title" style={styles.headerTitle}>Insights</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.emoji}>🎉</Text>
          <Text testID="raceDay.hero_title" style={styles.heroTitle}>Congrats Alex!</Text>
          <Text style={styles.heroText}>
            You&apos;re officially ready for the Half Marathon. Here&apos;s your final race day strategy.
          </Text>
        </View>

        {[
          { title: 'Pacing Strategy', message: "Start conservative at 8:15/mi for the first 3 miles. Settle into 7:55/mi for miles 4-10. Empty the tank the last 5K.", color: colors.green },
          { title: 'Nutrition', message: "Take a gel every 45 minutes. Hydrate at every other aid station. Don't try anything new on race morning.", color: colors.primary },
          { title: 'Race Morning Routine', message: "Wake up 3 hours before the gun. Eat your standard pre-long run breakfast. Arrive 45 minutes early for dynamic warmups.", color: colors.red },
        ].map((tip) => (
          <View key={tip.title} style={[styles.tipCard, { borderLeftColor: tip.color, backgroundColor: `${tip.color}1A` }]}>
            <Text style={styles.tipTitle}>{tip.title}</Text>
            <Text style={styles.tipMessage}>{tip.message}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.chatDock}>
        <Text style={styles.chatDockTitle}>Ask SprintGPT about Race Day:</Text>
        <View style={styles.suggestionWrap}>
          {SUGGESTIONS.map((item) => (
              <TouchableOpacity
                key={item}
                style={styles.suggestionChip}
                testID={`raceDay.suggestion.${item.replace(/[^a-zA-Z0-9]+/g, '_')}`}
                onPress={() => setMessage(item)}
              >
              <Text style={styles.suggestionText}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.inputRow}>
          <TextInput
            testID="raceDay.input"
            style={styles.input}
            placeholder="Type a message"
            placeholderTextColor={colors.text.tertiary}
            value={message}
            onChangeText={setMessage}
          />
          <TouchableOpacity
            testID="raceDay.send"
            style={styles.sendButton}
            onPress={() => {
              router.push('/(tabs)/chat');
            }}
          >
            <Ionicons name="send" size={20} color={colors.teal} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 24,
  },
  headerTitle: {
    fontSize: 18,
    color: colors.text.primary,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 28,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  heroTitle: {
    color: colors.text.primary,
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  heroText: {
    color: colors.text.secondary,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 23,
    paddingHorizontal: 8,
  },
  tipCard: {
    borderLeftWidth: 4,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  tipTitle: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  tipMessage: {
    color: colors.text.secondary,
    fontSize: 15,
    lineHeight: 22,
  },
  chatDock: {
    borderTopWidth: 1,
    borderTopColor: colors.background.secondary,
    backgroundColor: colors.background.cardSolid,
    padding: 16,
  },
  chatDockTitle: {
    color: colors.text.tertiary,
    fontWeight: '600',
    marginBottom: 10,
    fontSize: 14,
  },
  suggestionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  suggestionChip: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.background.secondary,
    backgroundColor: colors.background.cardSolid,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  suggestionText: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.background.cardSolid,
    color: colors.text.primary,
    paddingHorizontal: 14,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#004d40',
  },
});
