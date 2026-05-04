import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useReports } from '../../hooks/useReports';
import { ReportCard } from '../../components/ReportCard';
import { FloatingActionButton } from '../../components/FloatingActionButton';
import { ReportsStackParamList } from '../../types';
import { APP_THEME } from '../../constants';

type NavProp = NativeStackNavigationProp<ReportsStackParamList>;

export function ReportsListScreen() {
  const { reports, loading, refetch } = useReports();
  const navigation = useNavigation<NavProp>();
  const [search, setSearch] = useState('');

  const filtered = reports.filter(r =>
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.category.toLowerCase().includes(search.toLowerCase()) ||
    (r.description ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search reports…"
          placeholderTextColor={APP_THEME.textSecondary}
          clearButtonMode="while-editing"
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <ReportCard
            report={item}
            onPress={() => navigation.navigate('ReportDetails', { reportId: item.id })}
          />
        )}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={APP_THEME.primary} />}
        contentContainerStyle={filtered.length === 0 ? styles.empty : styles.list}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContent}>
              <Text style={styles.emptyIcon}>🗂️</Text>
              <Text style={styles.emptyTitle}>{search ? 'No matching reports' : 'No reports yet'}</Text>
              <Text style={styles.emptySubtitle}>
                {search ? 'Try a different search term.' : 'Be the first to report a local incident.'}
              </Text>
            </View>
          ) : null
        }
      />

      <FloatingActionButton onPress={() => navigation.navigate('NewReport')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: APP_THEME.background },
  searchBar: { padding: 12, paddingBottom: 4 },
  searchInput: {
    backgroundColor: APP_THEME.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: APP_THEME.text,
    borderWidth: 1,
    borderColor: APP_THEME.border,
  },
  list: { paddingTop: 4, paddingBottom: 100 },
  empty: { flex: 1 },
  emptyContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: APP_THEME.text, marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: APP_THEME.textSecondary, textAlign: 'center', paddingHorizontal: 32 },
});
