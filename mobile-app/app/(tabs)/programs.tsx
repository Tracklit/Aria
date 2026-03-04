import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { usePrograms, Program } from '../../src/context/ProgramsContext';
import { ProgramCard } from '../../src/components/features/ProgramCard';
import { ChipGroup } from '../../src/components/features/ChipGroup';
import { colors, typography, spacing, borderRadius } from '../../src/theme';

const CATEGORIES = ['all', 'sprint', 'endurance', 'strength', 'flexibility'];

export default function ProgramsTabScreen() {
  const { programs, isLoading, fetchPrograms, uploadProgram, importSheet } = usePrograms();
  const [filter, setFilter] = useState<string[]>(['all']);
  const [showImport, setShowImport] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const [sheetTitle, setSheetTitle] = useState('');

  useEffect(() => { fetchPrograms(); }, [fetchPrograms]);

  const filtered = filter[0] === 'all' ? programs : programs.filter(p => p.category === filter[0]);

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'],
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const formData = new FormData();
        // @ts-ignore - RN FormData
        formData.append('file', { uri: asset.uri, name: asset.name, type: asset.mimeType || 'application/octet-stream' });
        formData.append('title', asset.name.replace(/\.[^.]+$/, ''));
        await uploadProgram(formData);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      Alert.alert('Error', 'Failed to upload file');
    }
  };

  const handleImportSheet = async () => {
    if (!sheetTitle || !sheetUrl) return;
    try {
      await importSheet({ title: sheetTitle, googleSheetUrl: sheetUrl });
      setShowImport(false);
      setSheetUrl('');
      setSheetTitle('');
    } catch (error) {
      Alert.alert('Error', 'Failed to import Google Sheet');
    }
  };

  const downloadTemplate = async () => {
    const csv = 'Day,Title,Description,Exercises,IsRestDay\n1,Sprint Drills,Warm up and drills,"100m Sprint x3",false\n2,Rest Day,Recovery,,true';
    const file = new FileSystem.File(FileSystem.Paths.cache, 'program-template.csv');
    file.write(csv);
    await Sharing.shareAsync(file.uri);
  };

  const showActions = () => {
    Alert.alert('Add Program', 'Choose how to add a program', [
      { text: 'Create Manually', onPress: () => router.push('/programs/create') },
      { text: 'Generate with AI', onPress: () => router.push('/programs/create?mode=ai') },
      { text: 'Upload File', onPress: handleUpload },
      { text: 'Import Google Sheet', onPress: () => setShowImport(true) },
      { text: 'Download Template', onPress: downloadTemplate },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Programs</Text>

      <View style={styles.filterRow}>
        <ChipGroup options={CATEGORIES} selected={filter} onToggle={(val) => setFilter([val])} />
      </View>

      <FlatList
        data={filtered}
        renderItem={({ item }) => (
          <ProgramCard program={item} onPress={() => router.push(`/programs/${item.id}` as any)} />
        )}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchPrograms} tintColor={colors.primary} />}
        ListEmptyComponent={!isLoading ? (
          <View style={styles.empty}>
            <Ionicons name="barbell-outline" size={64} color={colors.text.tertiary} />
            <Text style={styles.emptyTitle}>No Programs</Text>
            <Text style={styles.emptySubtitle}>Create, upload, or generate a training program</Text>
          </View>
        ) : null}
      />

      {showImport && (
        <View style={styles.importOverlay}>
          <View style={styles.importCard}>
            <Text style={styles.importTitle}>Import Google Sheet</Text>
            <TextInput style={styles.importInput} value={sheetTitle} onChangeText={setSheetTitle} placeholder="Program title" placeholderTextColor={colors.text.tertiary} />
            <TextInput style={styles.importInput} value={sheetUrl} onChangeText={setSheetUrl} placeholder="Google Sheets URL" placeholderTextColor={colors.text.tertiary} autoCapitalize="none" />
            <View style={styles.importButtons}>
              <TouchableOpacity onPress={() => setShowImport(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.importBtn} onPress={handleImportSheet}><Text style={styles.importBtnText}>Import</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <TouchableOpacity style={styles.fab} onPress={showActions}>
        <Ionicons name="add" size={28} color={colors.text.primary} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  title: { ...typography.h1, color: colors.text.primary, paddingHorizontal: spacing.lg, marginTop: spacing.md, marginBottom: spacing.md },
  filterRow: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: 120 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { ...typography.h2, color: colors.text.primary, marginTop: spacing.lg },
  emptySubtitle: { ...typography.body, color: colors.text.secondary, textAlign: 'center', marginTop: spacing.sm },
  fab: { position: 'absolute', bottom: 100, right: spacing.lg, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
  importOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  importCard: { backgroundColor: colors.background.cardSolid, borderRadius: borderRadius.lg, padding: spacing.lg, width: '100%' },
  importTitle: { ...typography.h3, color: colors.text.primary, marginBottom: spacing.md },
  importInput: { ...typography.body, color: colors.text.primary, backgroundColor: colors.background.secondary, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md },
  importButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md },
  cancelText: { ...typography.body, color: colors.text.secondary, padding: spacing.sm },
  importBtn: { backgroundColor: colors.primary, borderRadius: borderRadius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  importBtnText: { ...typography.body, color: colors.text.primary, fontWeight: '600' },
});
