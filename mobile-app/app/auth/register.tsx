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
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../../src/context';
import { env } from '../../src/config/env';
import { colors, typography, spacing, borderRadius } from '../../src/theme';

WebBrowser.maybeCompleteAuthSession();

type FieldErrors = {
  name?: string;
  email?: string;
  username?: string;
  password?: string;
  confirmPassword?: string;
};

export default function RegisterScreen() {
  const { register, appleLogin, googleLogin, isLoading, error, clearError } = useAuth();
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);
  const googleClientIdForPlatform =
    Platform.OS === 'ios'
      ? env.GOOGLE_IOS_CLIENT_ID
      : Platform.OS === 'android'
        ? env.GOOGLE_ANDROID_CLIENT_ID
        : env.GOOGLE_WEB_CLIENT_ID;
  const hasGoogleClientId = Boolean(googleClientIdForPlatform);

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
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const validateForm = (): boolean => {
    const errors: FieldErrors = {};
    if (!name.trim()) errors.name = 'Please enter your name';
    if (!email.trim()) errors.email = 'Please enter your email';
    if (!username.trim()) errors.username = 'Please enter a username';
    if (!password.trim()) {
      errors.password = 'Please enter a password';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match';

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        username: username.trim(),
        password,
      });
    } catch (err: any) {
      // Error is handled in context
    }
  };

  const clearFieldError = (field: keyof FieldErrors) => {
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleAppleSignIn = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        Alert.alert('Sign Up Failed', 'No identity token received from Apple.');
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
      Alert.alert('Apple Sign Up Failed', err.message || 'An unexpected error occurred.');
    }
  };

  const handleGoogleSignIn = async () => {
    if (!googleRequest) {
      Alert.alert('Google Sign Up Unavailable', 'Google auth is not configured for this build.');
      return;
    }

    try {
      const result = await googlePromptAsync();

      if (result.type !== 'success') {
        return;
      }

      const idToken = (result.params as Record<string, string | undefined>)?.id_token;
      if (!idToken) {
        Alert.alert('Sign Up Failed', 'No identity token received from Google.');
        return;
      }

      await googleLogin({ idToken });
    } catch (err: any) {
      Alert.alert('Google Sign Up Failed', err.message || 'An unexpected error occurred.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity
            testID="auth.register.back"
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>A</Text>
            </View>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Start your training journey with Aria</Text>
          </View>

          {error && (
            <TouchableOpacity style={styles.errorBanner} onPress={clearError}>
              <Text style={styles.errorText}>{error}</Text>
              <Ionicons name="close-circle" size={20} color="#FF3B30" />
            </TouchableOpacity>
          )}

          <View style={styles.form}>
            <View
              style={[
                styles.inputContainer,
                focusedField === 'name' && styles.inputContainerFocused,
                fieldErrors.name && styles.inputContainerError,
              ]}
            >
              <Ionicons name="person-outline" size={20} color={colors.text.tertiary} />
              <TextInput
                style={styles.input}
                placeholder="Name"
                placeholderTextColor={colors.text.tertiary}
                value={name}
                onChangeText={(text) => { setName(text); clearFieldError('name'); }}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
                autoCapitalize="words"
              />
            </View>
            {fieldErrors.name && <Text style={styles.fieldError}>{fieldErrors.name}</Text>}

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
                onChangeText={(text) => { setEmail(text); clearFieldError('email'); }}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {fieldErrors.email && <Text style={styles.fieldError}>{fieldErrors.email}</Text>}

            <View
              style={[
                styles.inputContainer,
                focusedField === 'username' && styles.inputContainerFocused,
                fieldErrors.username && styles.inputContainerError,
              ]}
            >
              <Ionicons name="person-circle-outline" size={20} color={colors.text.tertiary} />
              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor={colors.text.tertiary}
                value={username}
                onChangeText={(text) => { setUsername(text); clearFieldError('username'); }}
                onFocus={() => setFocusedField('username')}
                onBlur={() => setFocusedField(null)}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {fieldErrors.username && <Text style={styles.fieldError}>{fieldErrors.username}</Text>}

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
                placeholder="Password (min 8 characters)"
                placeholderTextColor={colors.text.tertiary}
                value={password}
                onChangeText={(text) => { setPassword(text); clearFieldError('password'); }}
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

            <View
              style={[
                styles.inputContainer,
                focusedField === 'confirmPassword' && styles.inputContainerFocused,
                fieldErrors.confirmPassword && styles.inputContainerError,
              ]}
            >
              <Ionicons name="lock-closed-outline" size={20} color={colors.text.tertiary} />
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor={colors.text.tertiary}
                value={confirmPassword}
                onChangeText={(text) => { setConfirmPassword(text); clearFieldError('confirmPassword'); }}
                onFocus={() => setFocusedField('confirmPassword')}
                onBlur={() => setFocusedField(null)}
                secureTextEntry={!showPassword}
              />
            </View>
            {fieldErrors.confirmPassword && <Text style={styles.fieldError}>{fieldErrors.confirmPassword}</Text>}

            <TouchableOpacity
              style={[styles.registerButton, isLoading && styles.registerButtonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.text.primary} />
              ) : (
                <Text style={styles.registerButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>

          {hasSocialSignIn && (
            <>
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
            </>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/auth/login')}>
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.termsText}>
            By creating an account, you agree to our{' '}
            <Text
              style={styles.termsLink}
              onPress={() => Linking.openURL('https://aria.coach/terms')}
            >
              Terms of Service
            </Text>
            {' '}and{' '}
            <Text
              style={styles.termsLink}
              onPress={() => Linking.openURL('https://aria.coach/privacy')}
            >
              Privacy Policy
            </Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  logoText: {
    ...typography.h1,
    color: colors.text.primary,
    fontSize: 36,
  },
  title: {
    ...typography.h1,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
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
  registerButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  registerButtonDisabled: {
    opacity: 0.7,
  },
  registerButtonText: {
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
    marginBottom: spacing.lg,
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
  termsText: {
    ...typography.caption,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  termsLink: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});
