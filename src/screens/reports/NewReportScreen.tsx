import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ReportsStackParamList, NewReportForm, ReportSeverity } from '../../types';
import { supabase } from '../../services/supabase';
import { uploadReportImage } from '../../services/storage';
import { useAuthContext } from '../../hooks/useAuthContext';
import { REPORT_CATEGORIES, APP_THEME } from '../../constants';

type Props = NativeStackScreenProps<ReportsStackParamList, 'NewReport'>;

const SEVERITIES: ReportSeverity[] = ['Low', 'Medium', 'High'];

const INITIAL_FORM: NewReportForm = {
  title: '',
  description: '',
  category: 'Other',
  severity: 'Medium',
  location: '',
  coordinates: null,
  imageUri: null,
};

export function NewReportScreen({ navigation }: Props) {
  const { user } = useAuthContext();
  const [form, setForm] = useState<NewReportForm>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);

  function updateForm<K extends keyof NewReportForm>(key: K, value: NewReportForm[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleCurrentLocation() {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to use current location. You can pin a location on the map instead.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = loc.coords;

      const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
      const readable = address
        ? [address.name, address.street, address.city, address.region].filter(Boolean).join(', ')
        : `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

      updateForm('coordinates', [latitude, longitude]);
      updateForm('location', readable);
    } catch {
      Alert.alert('Error', 'Could not retrieve your location. Please try again or use the map.');
    } finally {
      setLocating(false);
    }
  }

  function handlePinOnMap() {
    navigation.navigate('PinOnMap', {
      onCoordinateSelected: (coords, address) => {
        updateForm('coordinates', coords);
        updateForm('location', address);
      },
    });
  }

  async function handlePickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Photo library access is required to attach images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      updateForm('imageUri', result.assets[0].uri);
    }
  }

  async function handleTakePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera access is required to take photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      updateForm('imageUri', result.assets[0].uri);
    }
  }

  async function handleSubmit() {
    if (!form.title.trim()) {
      Alert.alert('Missing Title', 'Please provide a title for the report.');
      return;
    }
    if (!form.coordinates && !form.location.trim()) {
      Alert.alert('Missing Location', 'Please set a location using GPS or the map.');
      return;
    }

    setSubmitting(true);
    try {
      let imageUrl: string | null = null;
      if (form.imageUri) {
        imageUrl = await uploadReportImage(form.imageUri);
      }

      const { error } = await supabase.from('reports').insert({
        title: form.title.trim(),
        description: form.description.trim() || null,
        category: form.category,
        severity: form.severity,
        location: form.location.trim() || null,
        coordinates: form.coordinates,
        image_url: imageUrl,
        source: 'mobile',
        reporter_id: user?.id ?? null,
        status: 'Open',
      });

      if (error) throw error;

      Alert.alert('Report Submitted', 'Your report has been submitted successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: unknown) {
      Alert.alert('Submission Failed', e instanceof Error ? e.message : 'An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

      {/* Title */}
      <Text style={styles.label}>Title <Text style={styles.required}>*</Text></Text>
      <TextInput
        style={styles.input}
        value={form.title}
        onChangeText={v => updateForm('title', v)}
        placeholder="Brief description of the issue"
        maxLength={120}
        returnKeyType="next"
      />

      {/* Description */}
      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={form.description}
        onChangeText={v => updateForm('description', v)}
        placeholder="Provide more details about the incident…"
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      {/* Category */}
      <Text style={styles.label}>Category</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
        {REPORT_CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.chip, form.category === cat && styles.chipActive]}
            onPress={() => updateForm('category', cat)}
          >
            <Text style={[styles.chipText, form.category === cat && styles.chipTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Severity */}
      <Text style={styles.label}>Severity</Text>
      <View style={styles.severityRow}>
        {SEVERITIES.map(sev => (
          <TouchableOpacity
            key={sev}
            style={[styles.severityBtn, form.severity === sev && styles.severityBtnActive(sev)]}
            onPress={() => updateForm('severity', sev)}
          >
            <Text style={[styles.severityText, form.severity === sev && styles.severityTextActive]}>{sev}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Location */}
      <Text style={styles.label}>Location <Text style={styles.required}>*</Text></Text>
      {form.location ? (
        <View style={styles.locationSet}>
          <Text style={styles.locationText} numberOfLines={2}>📍 {form.location}</Text>
          <TouchableOpacity onPress={() => { updateForm('location', ''); updateForm('coordinates', null); }}>
            <Text style={styles.clearLocation}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <View style={styles.locationButtons}>
        <TouchableOpacity style={styles.locationBtn} onPress={handleCurrentLocation} disabled={locating}>
          {locating
            ? <ActivityIndicator size="small" color={APP_THEME.primary} />
            : <Text style={styles.locationBtnText}>📡 Use GPS</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.locationBtn} onPress={handlePinOnMap}>
          <Text style={styles.locationBtnText}>🗺️ Pin on Map</Text>
        </TouchableOpacity>
      </View>

      {/* Photo */}
      <Text style={styles.label}>Photo (optional)</Text>
      {form.imageUri ? (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: form.imageUri }} style={styles.imagePreview} resizeMode="cover" />
          <TouchableOpacity style={styles.removeImage} onPress={() => updateForm('imageUri', null)}>
            <Text style={styles.removeImageText}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.photoButtons}>
          <TouchableOpacity style={styles.photoBtn} onPress={handleTakePhoto}>
            <Text style={styles.photoBtnText}>📷 Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.photoBtn} onPress={handlePickImage}>
            <Text style={styles.photoBtnText}>🖼️ Choose from Library</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitBtn, submitting && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.submitText}>Submit Report</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const SEVERITY_ACTIVE_COLORS: Record<ReportSeverity, string> = {
  High: '#D32F2F',
  Medium: '#F57C00',
  Low: '#388E3C',
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: APP_THEME.background },
  content: { padding: 16, paddingBottom: 48 },
  label: { fontSize: 14, fontWeight: '600', color: APP_THEME.text, marginTop: 16, marginBottom: 6 },
  required: { color: APP_THEME.error },
  input: { backgroundColor: APP_THEME.surface, borderWidth: 1, borderColor: APP_THEME.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: APP_THEME.text },
  multiline: { height: 100, paddingTop: 12 },
  chipRow: { flexGrow: 0, marginBottom: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: APP_THEME.border, backgroundColor: APP_THEME.surface, marginRight: 8 },
  chipActive: { backgroundColor: APP_THEME.primary, borderColor: APP_THEME.primary },
  chipText: { fontSize: 13, color: APP_THEME.text },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  severityRow: { flexDirection: 'row', gap: 10 },
  severityBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: APP_THEME.border, backgroundColor: APP_THEME.surface, alignItems: 'center' },
  severityBtnActive: (sev: ReportSeverity) => ({ backgroundColor: SEVERITY_ACTIVE_COLORS[sev], borderColor: SEVERITY_ACTIVE_COLORS[sev] }),
  severityText: { fontSize: 14, fontWeight: '600', color: APP_THEME.text },
  severityTextActive: { color: '#fff' },
  locationSet: { flexDirection: 'row', alignItems: 'center', backgroundColor: APP_THEME.primary + '15', borderRadius: 10, padding: 10, marginBottom: 8 },
  locationText: { flex: 1, fontSize: 13, color: APP_THEME.primary },
  clearLocation: { fontSize: 16, color: APP_THEME.textSecondary, paddingHorizontal: 6 },
  locationButtons: { flexDirection: 'row', gap: 10 },
  locationBtn: { flex: 1, backgroundColor: APP_THEME.surface, borderWidth: 1, borderColor: APP_THEME.border, borderRadius: 10, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  locationBtnText: { fontSize: 14, fontWeight: '600', color: APP_THEME.primary },
  imagePreviewContainer: { position: 'relative', borderRadius: 12, overflow: 'hidden', marginBottom: 4 },
  imagePreview: { width: '100%', height: 200, borderRadius: 12 },
  removeImage: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  removeImageText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  photoButtons: { flexDirection: 'row', gap: 10 },
  photoBtn: { flex: 1, backgroundColor: APP_THEME.surface, borderWidth: 1, borderColor: APP_THEME.border, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  photoBtnText: { fontSize: 13, fontWeight: '600', color: APP_THEME.primary },
  submitBtn: { marginTop: 28, backgroundColor: APP_THEME.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
