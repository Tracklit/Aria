import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { SettingsRow } from '../../src/components/features';
import { Avatar } from '../../src/components/ui';
import { useAuth } from '../../src/context';
import { colors, typography, spacing, borderRadius } from '../../src/theme';
import { ToastManager } from '../../src/components/Toast';

export default function MoreScreen() {
  const { profile, logout, uploadProfilePicture } = useAuth();
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const handlePress = (item: string) => {
    Alert.alert('Navigation', `Navigate to ${item}`);
  };

  const handleEditProfile = () => {
    router.push('/onboarding/step1');
  };

  const handleChangePhoto = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library to upload a profile picture.');
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) {
        return;
      }

      const imageUri = result.assets[0].uri;

      // Compress and resize image
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 400, height: 400 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );

      setIsUploadingPhoto(true);

      // Upload to backend
      await uploadProfilePicture(manipulatedImage.uri);

      ToastManager.success('Profile picture updated successfully!');
    } catch (error) {
      console.error('Failed to upload photo:', error);
      ToastManager.error('Failed to upload profile picture. Please try again.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              // Navigation will be handled by the root layout
            } catch (error) {
              Alert.alert('Error', 'Failed to log out. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Settings</Text>

        {/* Profile Header */}
        {profile && (
          <View style={styles.profileCard}>
            <TouchableOpacity onPress={handleChangePhoto} disabled={isUploadingPhoto}>
              {isUploadingPhoto ? (
                <View style={styles.profileAvatar}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : (
                <Avatar
                  uri={profile.photoUrl}
                  size="large"
                  style={styles.avatarWrapper}
                />
              )}
              <Text style={styles.changePhotoText}>Change Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileInfo} onPress={handleEditProfile}>
              <Text style={styles.profileName}>{profile.displayName || 'Athlete'}</Text>
              <Text style={styles.profileSport}>
                {profile.sport ? profile.sport.charAt(0).toUpperCase() + profile.sport.slice(1) : 'Running'}
                {' '}
                {profile.experienceLevel ? `(${profile.experienceLevel})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>ACCOUNT</Text>
          <View style={styles.group}>
            <SettingsRow title="Edit Profile" onPress={handleEditProfile} />
            <View style={styles.divider} />
            <SettingsRow title="Notifications" onPress={() => handlePress('Notifications')} />
            <View style={styles.divider} />
            <SettingsRow title="Privacy" onPress={() => handlePress('Privacy')} />
          </View>
        </View>

        {/* Training Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>TRAINING</Text>
          <View style={styles.group}>
            <SettingsRow
              title="Units of Measure"
              onPress={() => handlePress('Units of Measure')}
            />
            <View style={styles.divider} />
            <SettingsRow title="AI Coaching Style" onPress={() => handlePress('AI Coaching Style')} />
            <View style={styles.divider} />
            <SettingsRow title="Voice Feedback" onPress={() => handlePress('Voice Feedback')} />
          </View>
        </View>

        {/* Integrations Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>INTEGRATIONS</Text>
          <View style={styles.group}>
            <SettingsRow title="Apple Health" onPress={() => handlePress('Apple Health')} />
            <View style={styles.divider} />
            <SettingsRow title="Garmin Connect" onPress={() => handlePress('Garmin')} />
            <View style={styles.divider} />
            <SettingsRow title="Strava" onPress={() => handlePress('Strava')} />
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>SUPPORT</Text>
          <View style={styles.group}>
            <SettingsRow title="Help & FAQ" onPress={() => handlePress('Help')} />
            <View style={styles.divider} />
            <SettingsRow title="Contact Us" onPress={() => handlePress('Contact')} />
            <View style={styles.divider} />
            <SettingsRow title="Rate the App" onPress={() => handlePress('Rate')} />
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Version 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
  },
  title: {
    ...typography.h1,
    color: colors.text.primary,
    marginBottom: spacing.lg,
    marginTop: spacing.md,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.cardSolid,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarWrapper: {
    marginBottom: spacing.xs,
  },
  changePhotoText: {
    ...typography.caption,
    color: colors.primary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  profileInitial: {
    ...typography.h2,
    color: colors.text.primary,
  },
  profileInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  profileName: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  profileSport: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '600',
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
  },
  group: {
    backgroundColor: colors.background.cardSolid,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    backgroundColor: colors.background.secondary,
    marginLeft: spacing.md,
  },
  logoutButton: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  logoutText: {
    ...typography.body,
    color: '#FF3B30',
  },
  versionText: {
    ...typography.caption,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
});
