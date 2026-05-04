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
  Modal,
} from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ReportsStackParamList, NewReportForm, ReportSeverity } from '../../types';
import { supabase } from '../../services/supabase';
import { uploadReportImage } from '../../services/storage';
import { analyzeReportImage, AIReportAnalysis } from '../../services/aiAnalysis';
import { useAuthContext } from '../../hooks/useAuthContext';
import { REPORT_CATEGORIES, APP_THEME, SEVERITY_COLORS } from '../../constants';

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

const TEAM_ROLE_LABELS: Record<string, string> = {
  road_maintenance: 'Road Maintenance',
  sanitation: 'Sanitation',
  safety: 'Safety',
  electrical: 'Electrical',
  animal_control: 'Animal Control',
  drainage: 'Drainage',
  water_services: 'Water Services',
};

export function NewReportScreen({ navigation }: Props) {
  const { user } = useAuthContext();
  const [form, setForm] = useState<NewReportForm>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AIReportAnalysis | null>(null);

  function updateForm<K extends keyof NewReportForm>(key: K, value: NewReportForm[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function processImage(uri: string) {
    updateForm('imageUri', uri);
    setAiResult(null);
    setAnalyzing(true);

    try {
      const analysis = await analyzeReportImage(uri);
      setAiResult(analysis);
      // Auto-fill all form fields from AI analysis
      setForm(prev => ({
        ...prev,
        imageUri: uri,
        title: analysis.title,
        description: analysis.description,
        category: analysis.category,
        severity: analysis.severity,
      }));
    } catch (e: unknown) {
      // AI failed — don't block the user, just show a warning
      Alert.alert(
        'AI Analysis Unavailable',
        'Could not analyze the image automatically. Please fill in the details manually.\n\n' +
          (e instanceof Error ? e.message : 'Unknown error'),
        [{ text: 'OK' }]
      );
    } finally {
      setAnalyzing(false);
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
      await processImage(result.assets[0].uri);
    }
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
      await processImage(result.assets[0].uri);
    }
  }

  async function handleCurrentLocation() {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required. You can pin a location on the map instead.');
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
        ai_analysis: aiResult
          ? {
              title: aiResult.title,
              description: aiResult.description,
              category: aiResult.category,
              severity: aiResult.severity,
              suggestedTeamRole: aiResult.suggestedTeamRole,
              confidence: aiResult.confidence,
              reasoning: aiResult.reasoning,
              analyzedAt: new Date().toISOString(),
            }
          : null,
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
    <>
      {/* AI Analyzing Overlay */}
      <Modal visible={analyzing} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.overlayCard}>
            <ActivityIndicator size="large" color={APP_THEME.primary} style={{ marginBottom: 16 }} />
            <Text style={styles.overlayTitle}>Analyzing Image…</Text>
            <Text style={styles.overlaySubtitle}>AI is identifying the incident and filling in the report details for you.</Text>
          </View>
        </View>
      </Modal>

      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Photo Section — first, since it drives AI fill */}
        <Text style={styles.sectionHeader}>📷 Photo</Text>
        <Text style={styles.sectionHint}>Take or upload a photo — AI will fill in the details automatically.</Text>

        {form.imageUri ? (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: form.imageUri }} style={styles.imagePreview} resizeMode="cover" />
            <TouchableOpacity
              style={styles.removeImage}
              onPress={() => { updateForm('imageUri', null); setAiResult(null); }}
            >
              <Text style={styles.removeImageText}>✕</Text>
            </TouchableOpacity>
            {aiResult && (
              <View style={styles.aiConfidenceBadge}>
                <Text style={styles.aiConfidenceText}>
                  ✨ AI {Math.round(aiResult.confidence * 100)}% confident
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.photoButtons}>
            <TouchableOpacity style={styles.photoBtn} onPress={handleTakePhoto}>
              <Text style={styles.photoBtnIcon}>📷</Text>
              <Text style={styles.photoBtnText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoBtn} onPress={handlePickImage}>
              <Text style={styles.photoBtnIcon}>🖼️</Text>
              <Text style={styles.photoBtnText}>Choose from Library</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* AI Result Banner */}
        {aiResult && (
          <View style={styles.aiBanner}>
            <Text style={styles.aiBannerTitle}>✨ AI Analysis Complete</Text>
            <Text style={styles.aiBannerText}>
              Suggested team: <Text style={styles.aiBannerBold}>{TEAM_ROLE_LABELS[aiResult.suggestedTeamRole] ?? aiResult.suggestedTeamRole}</Text>
            </Text>
            <Text style={styles.aiBannerReasoning}>{aiResult.reasoning}</Text>
            <Text style={styles.aiBannerEdit}>Review and edit the fields below before submitting.</Text>
          </View>
        )}

        {/* Title */}
        <Text style={styles.label}>
          Title <Text style={styles.required}>*</Text>
          {aiResult ? <Text style={styles.aiFilledTag}> ✨ AI filled</Text> : null}
        </Text>
        <TextInput
          style={styles.input}
          value={form.title}
          onChangeText={v => updateForm('title', v)}
          placeholder="Brief description of the issue"
          maxLength={120}
          returnKeyType="next"
        />

        {/* Description */}
        <Text style={styles.label}>
          Description
          {aiResult ? <Text style={styles.aiFilledTag}> ✨ AI filled</Text> : null}
        </Text>
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
        <Text style={styles.label}>
          Category
          {aiResult ? <Text style={styles.aiFilledTag}> ✨ AI filled</Text> : null}
        </Text>
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
        <Text style={styles.label}>
          Severity
          {aiResult ? <Text style={styles.aiFilledTag}> ✨ AI filled</Text> : null}
        </Text>
        <View style={styles.severityRow}>
          {SEVERITIES.map(sev => (
            <TouchableOpacity
              key={sev}
              style={[
                styles.severityBtn,
                form.severity === sev && { backgroundColor: SEVERITY_COLORS[sev], borderColor: SEVERITY_COLORS[sev] },
              ]}
              onPress={() => updateForm('severity', sev)}
            >
              <Text style={[styles.severityText, form.severity === sev && styles.severityTextActive]}>
                {sev}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Assigned Team (read-only display) */}
        {aiResult && (
          <>
            <Text style={styles.label}>Suggested Team <Text style={styles.aiFilledTag}>✨ AI assigned</Text></Text>
            <View style={styles.teamBadge}>
              <Text style={styles.teamBadgeText}>
                🏢 {TEAM_ROLE_LABELS[aiResult.suggestedTeamRole] ?? aiResult.suggestedTeamRole}
              </Text>
            </View>
          </>
        )}

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
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: APP_THEME.background },
  content: { padding: 16, paddingBottom: 48 },

  // AI overlay
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  overlayCard: { backgroundColor: '#fff', borderRadius: 16, padding: 28, alignItems: 'center', marginHorizontal: 32 },
  overlayTitle: { fontSize: 18, fontWeight: '700', color: APP_THEME.text, marginBottom: 8 },
  overlaySubtitle: { fontSize: 14, color: APP_THEME.textSecondary, textAlign: 'center', lineHeight: 20 },

  // Section headers
  sectionHeader: { fontSize: 16, fontWeight: '700', color: APP_THEME.text, marginTop: 8, marginBottom: 4 },
  sectionHint: { fontSize: 13, color: APP_THEME.textSecondary, marginBottom: 12 },

  // Photo
  photoButtons: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  photoBtn: { flex: 1, backgroundColor: APP_THEME.surface, borderWidth: 1.5, borderColor: APP_THEME.border, borderRadius: 12, paddingVertical: 18, alignItems: 'center', borderStyle: 'dashed' },
  photoBtnIcon: { fontSize: 28, marginBottom: 6 },
  photoBtnText: { fontSize: 13, fontWeight: '600', color: APP_THEME.primary },
  imagePreviewContainer: { position: 'relative', borderRadius: 12, overflow: 'hidden', marginBottom: 12 },
  imagePreview: { width: '100%', height: 220, borderRadius: 12 },
  removeImage: { position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  removeImageText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  aiConfidenceBadge: { position: 'absolute', bottom: 10, left: 10, backgroundColor: 'rgba(21,101,192,0.85)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  aiConfidenceText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // AI banner
  aiBanner: { backgroundColor: APP_THEME.primary + '12', borderWidth: 1, borderColor: APP_THEME.primary + '40', borderRadius: 12, padding: 14, marginBottom: 8 },
  aiBannerTitle: { fontSize: 14, fontWeight: '700', color: APP_THEME.primary, marginBottom: 4 },
  aiBannerText: { fontSize: 13, color: APP_THEME.text, marginBottom: 2 },
  aiBannerBold: { fontWeight: '700', color: APP_THEME.primary },
  aiBannerReasoning: { fontSize: 13, color: APP_THEME.textSecondary, fontStyle: 'italic', marginBottom: 4 },
  aiBannerEdit: { fontSize: 12, color: APP_THEME.textSecondary },

  // Form
  label: { fontSize: 14, fontWeight: '600', color: APP_THEME.text, marginTop: 16, marginBottom: 6 },
  required: { color: APP_THEME.error },
  aiFilledTag: { fontSize: 12, color: APP_THEME.primary, fontWeight: '500' },
  input: { backgroundColor: APP_THEME.surface, borderWidth: 1, borderColor: APP_THEME.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: APP_THEME.text },
  multiline: { height: 100, paddingTop: 12 },
  chipRow: { flexGrow: 0, marginBottom: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: APP_THEME.border, backgroundColor: APP_THEME.surface, marginRight: 8 },
  chipActive: { backgroundColor: APP_THEME.primary, borderColor: APP_THEME.primary },
  chipText: { fontSize: 13, color: APP_THEME.text },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  severityRow: { flexDirection: 'row', gap: 10 },
  severityBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: APP_THEME.border, backgroundColor: APP_THEME.surface, alignItems: 'center' },
  severityText: { fontSize: 14, fontWeight: '600', color: APP_THEME.text },
  severityTextActive: { color: '#fff' },

  // Team badge
  teamBadge: { backgroundColor: APP_THEME.primary + '15', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: APP_THEME.primary + '30' },
  teamBadgeText: { fontSize: 15, fontWeight: '700', color: APP_THEME.primary },

  // Location
  locationSet: { flexDirection: 'row', alignItems: 'center', backgroundColor: APP_THEME.primary + '15', borderRadius: 10, padding: 10, marginBottom: 8 },
  locationText: { flex: 1, fontSize: 13, color: APP_THEME.primary },
  clearLocation: { fontSize: 16, color: APP_THEME.textSecondary, paddingHorizontal: 6 },
  locationButtons: { flexDirection: 'row', gap: 10 },
  locationBtn: { flex: 1, backgroundColor: APP_THEME.surface, borderWidth: 1, borderColor: APP_THEME.border, borderRadius: 10, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  locationBtnText: { fontSize: 14, fontWeight: '600', color: APP_THEME.primary },

  // Submit
  submitBtn: { marginTop: 28, backgroundColor: APP_THEME.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
