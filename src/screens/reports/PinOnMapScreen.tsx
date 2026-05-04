import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import MapView, { Marker, MapPressEvent, Region } from 'react-native-maps';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ReportsStackParamList } from '../../types';
import { APP_THEME } from '../../constants';

type Props = NativeStackScreenProps<ReportsStackParamList, 'PinOnMap'>;

const DEFAULT_REGION: Region = {
  latitude: 37.7749,
  longitude: -122.4194,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export function PinOnMapScreen({ route, navigation }: Props) {
  const { onCoordinateSelected } = route.params;
  const [pin, setPin] = useState<{ latitude: number; longitude: number } | null>(null);

  function handleMapPress(e: MapPressEvent) {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setPin({ latitude, longitude });
  }

  function handleConfirm() {
    if (!pin) {
      Alert.alert('No pin placed', 'Tap on the map to place a pin first.');
      return;
    }
    const address = `${pin.latitude.toFixed(5)}, ${pin.longitude.toFixed(5)}`;
    onCoordinateSelected([pin.latitude, pin.longitude], address);
    navigation.goBack();
  }

  return (
    <View style={styles.container}>
      <View style={styles.banner}>
        <Text style={styles.bannerText}>Tap on the map to place a pin at the incident location.</Text>
      </View>

      <MapView
        style={styles.map}
        initialRegion={DEFAULT_REGION}
        onPress={handleMapPress}
        showsUserLocation
      >
        {pin && <Marker coordinate={pin} pinColor={APP_THEME.accent} />}
      </MapView>

      <View style={styles.footer}>
        {pin ? (
          <Text style={styles.coords}>
            📍 {pin.latitude.toFixed(5)}, {pin.longitude.toFixed(5)}
          </Text>
        ) : (
          <Text style={styles.hint}>No location selected</Text>
        )}
        <View style={styles.buttons}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.confirmBtn, !pin && styles.confirmDisabled]}
            onPress={handleConfirm}
            disabled={!pin}
          >
            <Text style={styles.confirmText}>Use This Location</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  banner: { backgroundColor: APP_THEME.primary, padding: 12, alignItems: 'center' },
  bannerText: { color: '#fff', fontSize: 13, textAlign: 'center' },
  map: { flex: 1 },
  footer: { backgroundColor: APP_THEME.surface, padding: 16, paddingBottom: 32 },
  coords: { fontSize: 13, color: APP_THEME.text, textAlign: 'center', marginBottom: 12 },
  hint: { fontSize: 13, color: APP_THEME.textSecondary, textAlign: 'center', marginBottom: 12 },
  buttons: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: APP_THEME.border, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  cancelText: { color: APP_THEME.text, fontWeight: '600' },
  confirmBtn: { flex: 2, backgroundColor: APP_THEME.primary, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  confirmDisabled: { opacity: 0.4 },
  confirmText: { color: '#fff', fontWeight: '700' },
});
