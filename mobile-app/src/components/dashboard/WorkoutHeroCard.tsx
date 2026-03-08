import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface WorkoutHeroCardProps {
  testID: string;
  badge: string;
  title: string;
  description: string;
  gradient: [string, string, string];
  isEmpty?: boolean;
  isCompleted?: boolean;
  onStart: () => void;
}

const WorkoutHeroCard = React.memo(function WorkoutHeroCard({
  testID,
  badge,
  title,
  description,
  gradient,
  isEmpty,
  isCompleted,
  onStart,
}: WorkoutHeroCardProps) {
  const effectiveGradient: [string, string, string] = isCompleted
    ? ['#1B5E20', '#2E7D32', '#1B5E20']
    : gradient;

  return (
    <LinearGradient
      colors={effectiveGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.badgeWrap}>
        {isCompleted && (
          <Ionicons name="checkmark-circle" size={13} color="rgba(255,255,255,0.85)" style={{ marginRight: 4 }} />
        )}
        <Text style={styles.badgeText}>{isCompleted ? 'COMPLETED' : badge}</Text>
      </View>
      <Text style={[styles.title, isCompleted && styles.titleCompleted]}>{title}</Text>
      <Text style={[styles.subtitle, isCompleted && styles.subtitleCompleted]}>{description}</Text>
      {!isEmpty && (
        <TouchableOpacity
          testID={testID}
          style={[styles.button, isCompleted && styles.buttonCompleted]}
          onPress={onStart}
          disabled={isCompleted}
        >
          {isCompleted ? (
            <View style={styles.completedRow}>
              <Ionicons name="checkmark-circle" size={18} color="#2E7D32" />
              <Text style={[styles.buttonText, styles.buttonTextCompleted]}>Completed</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>Start Session</Text>
          )}
        </TouchableOpacity>
      )}
    </LinearGradient>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
  },
  badgeWrap: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 4,
  },
  titleCompleted: {
    opacity: 0.8,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 16,
    marginBottom: 18,
  },
  subtitleCompleted: {
    opacity: 0.7,
  },
  button: {
    borderRadius: 12,
    backgroundColor: '#FFF',
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonCompleted: {
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  buttonText: {
    color: '#0097A7',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonTextCompleted: {
    color: '#2E7D32',
    marginLeft: 6,
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default WorkoutHeroCard;
