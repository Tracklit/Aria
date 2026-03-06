import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import Animated, { FadeIn, FadeInUp, useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../../src/context';
import { env } from '../../src/config/env';
import { useThemedStyles, useColors, typography, spacing, borderRadius } from '../../src/theme';
import { ThemeColors } from '../../src/theme/colors';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const reducedMotion = useReducedMotion();
  const { login, appleLogin, googleLogin, isLoading, error, clearError } = useAuth();
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);

  const googleClientIdForPlatform =
    Platform.OS === 'ios'
      ? env.GOOGLE_IOS_CLIENT_ID
      : Platform.OS === 'android'
        ? env.GOOGLE_ANDROID_CLIENT_ID
        : env.GOOGLE_WEB_CLIENT_ID;
  const hasGoogleClientId = Boolean(googleClientIdForPlatform);

  // The hook requires a clientId or it throws. Pass a placeholder when unconfigured
  // so the hook is always called (rules of hooks) but google auth stays disabled.
  const [googleRequest, _googleResponse, googlePromptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: env.GOOGLE_IOS_CLIENT_ID || 'placeholder.apps.googleusercontent.com',
    androidClientId: env.GOOGLE_ANDROID_CLIENT_ID || 'placeholder.apps.googleusercontent.com',
    webClientId: env.GOOGLE_WEB_CLIENT_ID || 'placeholder.apps.googleusercontent.com',
    scopes: ['openid', 'profile', 'email'],
  });

  const googleAuthAvailable = hasGoogleClientId && Boolean(googleRequest);
  const hasSocialSignIn = appleAuthAvailable || googleAuthAvailable;

  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setAppleAuthAvailable);
    }
  }, []);

  const handleAppleSignIn = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        Alert.alert('Sign In Failed', 'No identity token received from Apple.');
        return;
      }

      await appleLogin({
        identityToken: credential.identityToken,
        authorizationCode: credential.authorizationCode || '',
        user: {
          email: credential.email || undefined,
          name: credential.fullName ? {
            firstName: credential.fullName.givenName || undefined,
            lastName: credential.fullName.familyName || undefined,
          } : undefined,
        },
      });
    } catch (err: any) {
      if (err.code === 'ERR_REQUEST_CANCELED') {
        return;
      }
      Alert.alert('Apple Sign In Failed', err.message || 'An unexpected error occurred.');
    }
  };

  const handleGoogleSignIn = async () => {
    if (!googleRequest) {
      Alert.alert('Google Sign In Unavailable', 'Google auth is not configured for this build.');
      return;
    }

    try {
      const result = await googlePromptAsync();

      if (result.type !== 'success') {
        return;
      }

      const idToken = (result.params as Record<string, string | undefined>)?.id_token;
      if (!idToken) {
        Alert.alert('Sign In Failed', 'No identity token received from Google.');
        return;
      }

      await googleLogin({ idToken });
    } catch (err: any) {
      Alert.alert('Google Sign In Failed', err.message || 'An unexpected error occurred.');
    }
  };

  const handleLogin = async () => {
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) errors.email = 'Please enter your email';
    if (!password.trim()) errors.password = 'Please enter your password';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    try {
      await login({ email: email.trim(), password });
    } catch (err: any) {
      // Error is handled in context
    }
  };

  const handleForgotPassword = () => {
    Alert.alert('Reset Password', 'Please contact support at support@aria.coach');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity
            testID="auth.login.back"
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(500).delay(200)} style={styles.logoContainer}>
            <Image
              source={require('../../assets/AriaIconAppDark.png')}
              style={styles.logoImage}
            />
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue your training</Text>
          </Animated.View>

          {error && (
            <TouchableOpacity style={styles.errorBanner} onPress={clearError}>
              <Text style={styles.errorText}>{error}</Text>
              <Ionicons name="close-circle" size={20} color="#FF3B30" />
            </TouchableOpacity>
          )}

          <View style={styles.form}>
            <Animated.View entering={reducedMotion ? undefined : FadeInUp.duration(400).delay(300)}>
            <View
              style={[
                styles.inputContainer,
                focusedField === 'email' && styles.inputContainerFocused,
                fieldErrors.email && styles.inputContainerError,
              ]}
            >
              <Ionicons name="mail-outline" size={20} color={colors.text.tertiary} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={colors.text.tertiary}
                value={email}
                onChangeText={(text) => { setEmail(text); setFieldErrors((prev) => ({ ...prev, email: undefined })); }}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />
            </View>
            {fieldErrors.email && <Text style={styles.fieldError}>{fieldErrors.email}</Text>}
            </Animated.View>

            <Animated.View entering={reducedMotion ? undefined : FadeInUp.duration(400).delay(360)}>
            <View
              style={[
                styles.inputContainer,
                focusedField === 'password' && styles.inputContainerFocused,
                fieldErrors.password && styles.inputContainerError,
              ]}
            >
              <Ionicons name="lock-closed-outline" size={20} color={colors.text.tertiary} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={colors.text.tertiary}
                value={password}
                onChangeText={(text) => { setPassword(text); setFieldErrors((prev) => ({ ...prev, password: undefined })); }}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.text.tertiary}
                />
              </TouchableOpacity>
            </View>
            {fieldErrors.password && <Text style={styles.fieldError}>{fieldErrors.password}</Text>}
            </Animated.View>

            <TouchableOpacity style={styles.forgotPassword} onPress={handleForgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <Animated.View entering={reducedMotion ? undefined : FadeInUp.duration(400).delay(500)}>
            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.text.primary} />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>
            </Animated.View>
          </View>

          {hasSocialSignIn && (
            <Animated.View entering={reducedMotion ? undefined : FadeInUp.duration(400).delay(600)}>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              {appleAuthAvailable && (
                <TouchableOpacity
                  style={[styles.appleButton, googleAuthAvailable ? styles.socialButtonStacked : styles.socialButtonLast]}
                  onPress={handleAppleSignIn}
                  disabled={isLoading}
                >
                  <Ionicons name="logo-apple" size={24} color="#000" />
                  <Text style={styles.socialButtonText}>Continue with Apple</Text>
                </TouchableOpacity>
              )}

              {googleAuthAvailable && (
                <TouchableOpacity
                  style={styles.googleButton}
                  onPress={handleGoogleSignIn}
                  disabled={isLoading}
                >
                  <Ionicons name="logo-google" size={22} color="#000" />
                  <Text style={styles.socialButtonText}>Continue with Google</Text>
                </TouchableOpacity>
              )}
            </Animated.View>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/auth/register')}>
              <Text style={styles.footerLink}>Sign Up</Text>
            </TouchableOpacity>
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
  keyboardView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: 24,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h1,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    ...typography.caption,
    color: '#FF3B30',
    flex: 1,
  },
  form: {
    marginBottom: spacing.xl,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputContainerFocused: {
    borderColor: colors.primary,
  },
  inputContainerError: {
    borderColor: '#FF3B30',
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.text.primary,
    paddingVertical: spacing.md,
    marginLeft: spacing.sm,
  },
  fieldError: {
    ...typography.caption,
    color: '#FF3B30',
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
    marginLeft: spacing.md,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: spacing.lg,
  },
  forgotPasswordText: {
    ...typography.caption,
    color: colors.primary,
  },
  loginButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.background.secondary,
  },
  dividerText: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginHorizontal: spacing.md,
  },
  appleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.xl,
  },
  socialButtonStacked: {
    marginBottom: spacing.md,
  },
  socialButtonLast: {
    marginBottom: spacing.xl,
  },
  socialButtonText: {
    ...typography.body,
    color: '#000',
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footerText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  footerLink: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
});
