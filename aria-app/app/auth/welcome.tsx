import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../src/theme';
import { useAuth } from '../../src/context';

export default function WelcomeScreen() {
  const { demoLogin } = useAuth();

  const handleDemoLogin = async () => {
    try {
      await demoLogin();
    } catch (error) {
      console.error('Demo login failed:', error);
    }
  };
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.heroSection}>
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={[colors.primary, '#0066CC']}
              style={styles.logoGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.logoText}>A</Text>
            </LinearGradient>
          </View>

          <Text style={styles.title}>Aria</Text>
          <Text style={styles.tagline}>Your AI Running Coach</Text>

          <View style={styles.featuresContainer}>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="fitness-outline" size={24} color={colors.primary} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>Personalized Training</Text>
                <Text style={styles.featureDescription}>
                  Plans tailored to your goals and fitness level
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="chatbubbles-outline" size={24} color={colors.primary} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>AI Coaching</Text>
                <Text style={styles.featureDescription}>
                  Get expert advice anytime with Aria
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="analytics-outline" size={24} color={colors.primary} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>Smart Analytics</Text>
                <Text style={styles.featureDescription}>
                  Track progress and optimize performance
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/auth/register')}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={styles.secondaryButtonText}>I already have an account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.demoButton}
            onPress={handleDemoLogin}
          >
            <Ionicons name="flask-outline" size={18} color={colors.teal} style={styles.demoIcon} />
            <Text style={styles.demoButtonText}>Try Demo (No Server Required)</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'space-between',
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  heroSection: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  logoContainer: {
    marginBottom: spacing.lg,
  },
  logoGradient: {
    width: 100,
    height: 100,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.text.primary,
  },
  title: {
    ...typography.h1,
    fontSize: 42,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  tagline: {
    ...typography.h3,
    color: colors.primary,
    marginBottom: spacing.xl * 2,
  },
  featuresContainer: {
    width: '100%',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  featureDescription: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  buttonsContainer: {
    paddingTop: spacing.xl,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  primaryButtonText: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  secondaryButtonText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.teal,
    borderStyle: 'dashed',
  },
  demoIcon: {
    marginRight: spacing.sm,
  },
  demoButtonText: {
    ...typography.body,
    color: colors.teal,
    fontWeight: '500',
  },
});
