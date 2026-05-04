import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Switch,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useAuthContext } from '../../hooks/useAuthContext';
import { supabase } from '../../services/supabase';
import { UserSettings } from '../../types';
import { APP_THEME } from '../../constants';

export function ProfileScreen() {
  const { profile, signOut } = useAuthContext();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!profile) return;
    supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', profile.id)
      .single()
      .then(({ data }) => {
        if (data) setSettings(data as UserSettings);
      });
  }, [profile]);

  async function handleToggle(key: keyof UserSettings, value: boolean) {
    if (!profile || !settings) return;
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await supabase
      .from('user_settings')
      .upsert({ ...updated, user_id: profile.id, updated_at: new Date().toISOString() });
  }

  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          try {
            await signOut();
          } catch {
            setSigningOut(false);
          }
        },
      },
    ]);
  }

  const initials = profile?.name
    ? profile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{profile?.name ?? 'Reporter'}</Text>
        <Text style={styles.email}>{profile?.email ?? ''}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{(profile?.role ?? 'reporter').replace(/_/g, ' ')}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <SettingRow
          label="Email Notifications"
          value={settings?.email_notif ?? true}
          onToggle={v => handleToggle('email_notif', v)}
        />
        <SettingRow
          label="Push Notifications"
          value={settings?.push_notif ?? true}
          onToggle={v => handleToggle('push_notif', v)}
        />
        <SettingRow
          label="SMS Alerts"
          value={settings?.sms_alert ?? false}
          onToggle={v => handleToggle('sms_alert', v)}
        />
        <SettingRow
          label="Sound Enabled"
          value={settings?.sound_enabled ?? true}
          onToggle={v => handleToggle('sound_enabled', v)}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacy</Text>
        <SettingRow
          label="Public Profile"
          value={settings?.public_profile ?? false}
          onToggle={v => handleToggle('public_profile', v)}
        />
      </View>

      <TouchableOpacity
        style={[styles.signOutButton, signingOut && styles.signOutDisabled]}
        onPress={handleSignOut}
        disabled={signingOut}
      >
        {signingOut ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.signOutText}>Sign Out</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.version}>FixItLocal v1.0.0</Text>
    </ScrollView>
  );
}

function SettingRow({
  label,
  value,
  onToggle,
}: {
  label: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ true: APP_THEME.primary, false: APP_THEME.border }}
        thumbColor="#fff"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: APP_THEME.background },
  content: { paddingBottom: 40 },
  avatarSection: { alignItems: 'center', paddingVertical: 32, backgroundColor: APP_THEME.surface },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: APP_THEME.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  name: { fontSize: 22, fontWeight: '700', color: APP_THEME.text },
  email: { fontSize: 14, color: APP_THEME.textSecondary, marginTop: 4 },
  roleBadge: { marginTop: 10, backgroundColor: APP_THEME.primary + '18', paddingHorizontal: 14, paddingVertical: 4, borderRadius: 20 },
  roleText: { color: APP_THEME.primary, fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
  section: { backgroundColor: APP_THEME.surface, marginTop: 20, marginHorizontal: 16, borderRadius: 12, overflow: 'hidden' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: APP_THEME.textSecondary, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: APP_THEME.border },
  settingLabel: { fontSize: 15, color: APP_THEME.text },
  signOutButton: { marginTop: 28, marginHorizontal: 16, backgroundColor: APP_THEME.error, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  signOutDisabled: { opacity: 0.6 },
  signOutText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  version: { textAlign: 'center', color: APP_THEME.textSecondary, fontSize: 12, marginTop: 20 },
});
