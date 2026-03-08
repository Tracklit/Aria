import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../theme';
import { ThemeColors } from '../../theme/colors';
import { useThemedStyles } from '../../theme';
import { Country, countries } from '../../data/countries';
import { impactLight } from '../../utils/haptics';

interface CountryPickerProps {
  value: string;
  onSelect: (country: Country) => void;
  visible: boolean;
  onClose: () => void;
}

export function CountryPicker({ value, onSelect, visible, onClose }: CountryPickerProps) {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return countries;
    const lower = search.toLowerCase().trim();
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(lower) ||
        c.code.toLowerCase().includes(lower)
    );
  }, [search]);

  const handleSelect = useCallback(
    (country: Country) => {
      impactLight();
      onSelect(country);
      setSearch('');
      onClose();
    },
    [onSelect, onClose]
  );

  const handleClose = useCallback(() => {
    setSearch('');
    onClose();
  }, [onClose]);

  const renderItem = useCallback(
    ({ item }: { item: Country }) => (
      <TouchableOpacity
        style={[styles.countryRow, item.name === value && styles.countryRowSelected]}
        onPress={() => handleSelect(item)}
        activeOpacity={0.6}
      >
        <Text style={styles.flag}>{item.flag}</Text>
        <Text style={styles.countryName} numberOfLines={1}>
          {item.name}
        </Text>
        {item.name === value && (
          <Ionicons name="checkmark" size={20} color={colors.primary} />
        )}
      </TouchableOpacity>
    ),
    [value, handleSelect, styles, colors.primary]
  );

  const keyExtractor = useCallback((item: Country) => item.code, []);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Select Country</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={18}
            color={colors.text.tertiary}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search countries..."
            placeholderTextColor={colors.text.tertiary}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <FlatList
            data={filtered}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={30}
            maxToRenderPerBatch={30}
            windowSize={10}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No countries found</Text>
              </View>
            }
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.primary,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.background.secondary,
    },
    closeButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text.primary,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background.secondary,
      borderRadius: 10,
      marginHorizontal: 16,
      marginVertical: 12,
      paddingHorizontal: 12,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: colors.text.primary,
      paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    },
    listContent: {
      paddingBottom: 40,
    },
    countryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.background.secondary,
    },
    countryRowSelected: {
      backgroundColor: colors.background.secondary,
    },
    flag: {
      fontSize: 24,
      marginRight: 12,
    },
    countryName: {
      flex: 1,
      fontSize: 16,
      color: colors.text.primary,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
    },
    emptyText: {
      fontSize: 16,
      color: colors.text.tertiary,
    },
  });
