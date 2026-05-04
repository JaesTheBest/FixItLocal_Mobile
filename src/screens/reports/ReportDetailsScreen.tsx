import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ReportsStackParamList, Report, ReportResponse } from '../../types';
import { supabase } from '../../services/supabase';
import { useAuthContext } from '../../hooks/useAuthContext';
import { SeverityBadge } from '../../components/SeverityBadge';
import { StatusBadge } from '../../components/StatusBadge';
import { SEVERITY_COLORS, APP_THEME } from '../../constants';

type Props = NativeStackScreenProps<ReportsStackParamList, 'ReportDetails'>;

export function ReportDetailsScreen({ route }: Props) {
  const { reportId } = route.params;
  const { user } = useAuthContext();
  const [report, setReport] = useState<Report | null>(null);
  const [responses, setResponses] = useState<ReportResponse[]>([]);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);

  const fetchReport = useCallback(async () => {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .single();
    if (!error && data) setReport(data as Report);
  }, [reportId]);

  const fetchResponses = useCallback(async () => {
    const { data } = await supabase
      .from('report_responses')
      .select('*, profiles(name, avatar_url)')
      .eq('report_id', reportId)
      .order('created_at', { ascending: true });
    if (data) setResponses(data as ReportResponse[]);
  }, [reportId]);

  useEffect(() => {
    Promise.all([fetchReport(), fetchResponses()]).finally(() => setLoading(false));

    // increment view count
    supabase.rpc('increment_report_views', { report_id: reportId }).catch(() => {});

    const channel = supabase
      .channel(`report-${reportId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'report_responses', filter: `report_id=eq.${reportId}` }, payload => {
        setResponses(prev => [...prev, payload.new as ReportResponse]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'reports', filter: `id=eq.${reportId}` }, payload => {
        setReport(payload.new as Report);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchReport, fetchResponses, reportId]);

  async function handleSubmitComment() {
    if (!comment.trim()) return;
    if (!user) {
      Alert.alert('Sign In Required', 'You must be signed in to comment.');
      return;
    }
    setSubmittingComment(true);
    try {
      const { error } = await supabase.from('report_responses').insert({
        report_id: reportId,
        user_id: user.id,
        message: comment.trim(),
      });
      if (error) throw error;
      setComment('');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to post comment.');
    } finally {
      setSubmittingComment(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={APP_THEME.primary} />
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Report not found.</Text>
      </View>
    );
  }

  const hasCoords = report.coordinates && report.coordinates.length === 2;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={88}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.headerSection}>
          <View style={styles.badgeRow}>
            <SeverityBadge severity={report.severity} />
            <View style={styles.badgeSpacer} />
            <StatusBadge status={report.status} />
          </View>
          <Text style={styles.category}>{report.category}</Text>
          <Text style={styles.title}>{report.title}</Text>
          <Text style={styles.meta}>
            {new Date(report.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            {' · '}
            {report.views} view{report.views !== 1 ? 's' : ''}
            {' · '}
            {report.source}
          </Text>
        </View>

        {/* Image */}
        {report.image_url ? (
          <Image source={{ uri: report.image_url }} style={styles.image} resizeMode="cover" />
        ) : null}

        {/* Description */}
        {report.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{report.description}</Text>
          </View>
        ) : null}

        {/* Location */}
        {report.location ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            <Text style={styles.locationText}>📍 {report.location}</Text>
          </View>
        ) : null}

        {/* Map */}
        {hasCoords ? (
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: report.coordinates![0],
                longitude: report.coordinates![1],
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
              pointerEvents="none"
            >
              <Marker
                coordinate={{ latitude: report.coordinates![0], longitude: report.coordinates![1] }}
                pinColor={SEVERITY_COLORS[report.severity]}
              />
            </MapView>
          </View>
        ) : null}

        {/* Comments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Comments ({responses.length})</Text>
          {responses.length === 0 ? (
            <Text style={styles.noComments}>No comments yet. Be the first to respond.</Text>
          ) : (
            responses.map(response => <CommentItem key={response.id} response={response} />)
          )}
        </View>
      </ScrollView>

      {/* Comment Input */}
      <View style={styles.commentBar}>
        <TextInput
          style={styles.commentInput}
          value={comment}
          onChangeText={setComment}
          placeholder="Add a comment…"
          placeholderTextColor={APP_THEME.textSecondary}
          returnKeyType="send"
          onSubmitEditing={handleSubmitComment}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!comment.trim() || submittingComment) && styles.sendDisabled]}
          onPress={handleSubmitComment}
          disabled={!comment.trim() || submittingComment}
        >
          {submittingComment
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.sendText}>Send</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function CommentItem({ response }: { response: ReportResponse }) {
  const initials = response.profiles?.name
    ? response.profiles.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';
  const date = new Date(response.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <View style={commentStyles.container}>
      <View style={commentStyles.avatar}>
        <Text style={commentStyles.avatarText}>{initials}</Text>
      </View>
      <View style={commentStyles.body}>
        <View style={commentStyles.header}>
          <Text style={commentStyles.name}>{response.profiles?.name ?? 'Anonymous'}</Text>
          <Text style={commentStyles.date}>{date}</Text>
        </View>
        <Text style={commentStyles.message}>{response.message}</Text>
      </View>
    </View>
  );
}

const commentStyles = StyleSheet.create({
  container: { flexDirection: 'row', marginBottom: 14 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: APP_THEME.primary, alignItems: 'center', justifyContent: 'center', marginRight: 10, marginTop: 2 },
  avatarText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  body: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  name: { fontSize: 13, fontWeight: '700', color: APP_THEME.text },
  date: { fontSize: 12, color: APP_THEME.textSecondary },
  message: { fontSize: 14, color: APP_THEME.text, lineHeight: 20 },
});

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: APP_THEME.background },
  scroll: { flex: 1 },
  content: { paddingBottom: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: APP_THEME.textSecondary, fontSize: 16 },
  headerSection: { backgroundColor: APP_THEME.surface, padding: 16, marginBottom: 1 },
  badgeRow: { flexDirection: 'row', marginBottom: 10 },
  badgeSpacer: { flex: 1 },
  category: { fontSize: 12, color: APP_THEME.primary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  title: { fontSize: 22, fontWeight: '800', color: APP_THEME.text, lineHeight: 28, marginBottom: 8 },
  meta: { fontSize: 12, color: APP_THEME.textSecondary },
  image: { width, height: width * 0.6 },
  section: { backgroundColor: APP_THEME.surface, margin: 12, marginTop: 8, borderRadius: 12, padding: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: APP_THEME.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  description: { fontSize: 15, color: APP_THEME.text, lineHeight: 22 },
  locationText: { fontSize: 14, color: APP_THEME.text, lineHeight: 20 },
  mapContainer: { marginHorizontal: 12, marginTop: 0, marginBottom: 8, borderRadius: 12, overflow: 'hidden', height: 160 },
  map: { flex: 1 },
  noComments: { fontSize: 14, color: APP_THEME.textSecondary, fontStyle: 'italic' },
  commentBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: APP_THEME.surface,
    borderTopWidth: 1,
    borderTopColor: APP_THEME.border,
    gap: 10,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: APP_THEME.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: APP_THEME.text,
    maxHeight: 100,
    backgroundColor: APP_THEME.background,
  },
  sendBtn: { backgroundColor: APP_THEME.primary, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 10 },
  sendDisabled: { opacity: 0.4 },
  sendText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
