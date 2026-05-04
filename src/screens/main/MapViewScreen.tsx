import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import MapView, { Marker, Callout, Region } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useReports } from '../../hooks/useReports';
import { FloatingActionButton } from '../../components/FloatingActionButton';
import { ReportsStackParamList, Report } from '../../types';
import { SEVERITY_COLORS, APP_THEME } from '../../constants';

type NavProp = NativeStackNavigationProp<ReportsStackParamList>;

const DEFAULT_REGION: Region = {
  latitude: 37.7749,
  longitude: -122.4194,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

export function MapViewScreen() {
  const { reports, loading } = useReports();
  const navigation = useNavigation<NavProp>();
  const mapRef = useRef<MapView>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const reportsWithCoords = reports.filter(r => r.coordinates && r.coordinates.length === 2);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={DEFAULT_REGION}
        showsUserLocation
        showsMyLocationButton
      >
        {reportsWithCoords.map(report => (
          <Marker
            key={report.id}
            coordinate={{
              latitude: report.coordinates![0],
              longitude: report.coordinates![1],
            }}
            pinColor={SEVERITY_COLORS[report.severity]}
            onPress={() => setSelectedReport(report)}
          >
            <Callout
              tooltip
              onPress={() => navigation.navigate('ReportDetails', { reportId: report.id })}
            >
              <View style={styles.callout}>
                <Text style={styles.calloutTitle} numberOfLines={2}>{report.title}</Text>
                <Text style={styles.calloutCategory}>{report.category}</Text>
                <View style={[styles.severityDot, { backgroundColor: SEVERITY_COLORS[report.severity] }]}>
                  <Text style={styles.severityText}>{report.severity}</Text>
                </View>
                <Text style={styles.calloutCta}>Tap for details →</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {loading && (
        <View style={styles.loadingBanner}>
          <Text style={styles.loadingText}>Loading reports…</Text>
        </View>
      )}

      <View style={styles.legend}>
        {(['High', 'Medium', 'Low'] as const).map(sev => (
          <View key={sev} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: SEVERITY_COLORS[sev] }]} />
            <Text style={styles.legendLabel}>{sev}</Text>
          </View>
        ))}
        <Text style={styles.legendCount}>{reportsWithCoords.length} reports</Text>
      </View>

      <FloatingActionButton onPress={() => navigation.navigate('NewReport')} />
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  loadingBanner: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  loadingText: { color: '#fff', fontSize: 13 },
  callout: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    width: Math.min(width * 0.65, 260),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  calloutTitle: { fontSize: 14, fontWeight: '700', color: APP_THEME.text, marginBottom: 4 },
  calloutCategory: { fontSize: 12, color: APP_THEME.textSecondary, marginBottom: 6 },
  severityDot: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginBottom: 6 },
  severityText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  calloutCta: { fontSize: 12, color: APP_THEME.primary, fontWeight: '600', textAlign: 'right' },
  legend: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 12, color: APP_THEME.text },
  legendCount: { fontSize: 12, color: APP_THEME.textSecondary, marginLeft: 4 },
});
