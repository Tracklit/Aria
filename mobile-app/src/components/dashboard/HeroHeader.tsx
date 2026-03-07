import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../ui';
import { useColors, spacing } from '../../theme';

interface HeroHeaderProps {
  greeting: string;
  displayName: string;
  subtitle: string;
  photoUrl?: string;
  onSettingsPress: () => void;
}

const HeroHeader = React.memo(function HeroHeader({
  greeting,
  displayName,
  subtitle,
  photoUrl,
  onSettingsPress,
}: HeroHeaderProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <View style={styles.avatarContainer}>
        <LinearGradient
          colors={['#00E5FF', '#00BCD4', '#0097A7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatarRing}
        >
          <View style={[styles.avatarInner, { backgroundColor: colors.background.primary }]}>
            <Avatar
              uri={photoUrl}
              size="large"
              fallbackText={displayName.charAt(0).toUpperCase()}
              style={styles.avatar}
            />
          </View>
        </LinearGradient>
      </View>

      <Text style={[styles.greeting, { color: colors.text.primary }]}>
        {greeting}, {displayName}
      </Text>
      <Text style={[styles.subtitle, { color: colors.teal }]}>{subtitle}</Text>

      <TouchableOpacity
        testID="dashboard.settings"
        style={[styles.settingsButton, { backgroundColor: colors.background.secondary }]}
        onPress={onSettingsPress}
      >
        <Ionicons name="settings-outline" size={22} color={colors.text.secondary} />
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 16,
    marginBottom: 24,
    position: 'relative',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatarRing: {
    width: 128,
    height: 128,
    borderRadius: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 116,
    height: 116,
    borderRadius: 58,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  settingsButton: {
    position: 'absolute',
    top: 0,
    right: 24,
    padding: 8,
    borderRadius: 20,
  },
});

export default HeroHeader;
