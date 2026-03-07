import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface WorkoutHeroCardProps {
  testID: string;
  badge: string;
  title: string;
  description: string;
  gradient: [string, string, string];
  isEmpty?: boolean;
  onStart: () => void;
}

const WorkoutHeroCard = React.memo(function WorkoutHeroCard({
  testID,
  badge,
  title,
  description,
  gradient,
  isEmpty,
  onStart,
}: WorkoutHeroCardProps) {
  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.badgeWrap}>
        <Text style={styles.badgeText}>{badge}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{description}</Text>
      {!isEmpty && (
        <TouchableOpacity
          testID={testID}
          style={styles.button}
          onPress={onStart}
        >
          <Text style={styles.buttonText}>Start Session</Text>
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
  subtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 16,
    marginBottom: 18,
  },
  button: {
    borderRadius: 12,
    backgroundColor: '#FFF',
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#0097A7',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default WorkoutHeroCard;
