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
import { colors } from '../src/theme';

const SUGGESTIONS = ['What if it rains?', 'Pre-race dinner ideas?', 'Warmup drills?'];

function TipCard({
  title,
  message,
  color,
}: {
  title: string;
  message: string;
  color: string;
}) {
  return (
    <View style={[styles.tipCard, { borderLeftColor: color, backgroundColor: `${color}1A` }]}>
      <Text style={styles.tipTitle}>{title}</Text>
      <Text style={styles.tipMessage}>{message}</Text>
    </View>
  );
}

export default function RaceDayScreen() {
  const router = useRouter();
  const [message, setMessage] = useState('');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity testID="raceDay.back" onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
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

        <TipCard
          title="Pacing Strategy"
          message="Start conservative at 8:15/mi for the first 3 miles. Settle into 7:55/mi for miles 4-10. Empty the tank the last 5K."
          color="#00E676"
        />
        <TipCard
          title="Nutrition"
          message="Take a gel every 45 minutes. Hydrate at every other aid station. Don&apos;t try anything new on race morning."
          color="#007AFF"
        />
        <TipCard
          title="Race Morning Routine"
          message="Wake up 3 hours before the gun. Eat your standard pre-long run breakfast. Arrive 45 minutes early for dynamic warmups."
          color="#FF3B30"
        />
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
            placeholderTextColor="#8E8E93"
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
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
    color: '#FFF',
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
    color: '#FFF',
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  heroText: {
    color: 'rgba(255,255,255,0.8)',
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
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  tipMessage: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 15,
    lineHeight: 22,
  },
  chatDock: {
    borderTopWidth: 1,
    borderTopColor: '#222',
    backgroundColor: '#0f0f11',
    padding: 16,
  },
  chatDockTitle: {
    color: '#8E8E93',
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
    borderColor: '#333',
    backgroundColor: '#17171A',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  suggestionText: {
    color: '#C7C7CC',
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
    backgroundColor: '#1c1c1e',
    color: '#FFF',
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
