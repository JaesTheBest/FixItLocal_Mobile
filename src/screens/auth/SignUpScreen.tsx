import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types';
import { useAuthContext } from '../../hooks/useAuthContext';
import { APP_THEME } from '../../constants';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignUp'>;

export function SignUpScreen({ navigation }: Props) {
  const { signUp } = useAuthContext();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await signUp(email.trim().toLowerCase(), password, name.trim());
      Alert.alert(
        'Account Created',
        'Please check your email to verify your account, then sign in.',
        [{ text: 'OK', onPress: () => navigation.navigate('SignIn') }]
      );
    } catch (e: unknown) {
      Alert.alert('Sign Up Failed', e instanceof Error ? e.message : 'An error occurred.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>📍</Text>
          <Text style={styles.appName}>FixItLocal</Text>
          <Text style={styles.tagline}>Create your reporter account</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Jane Smith" autoCapitalize="words" returnKeyType="next" />

          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} returnKeyType="next" />

          <Text style={styles.label}>Password</Text>
          <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Min. 6 characters" secureTextEntry returnKeyType="next" />

          <Text style={styles.label}>Confirm Password</Text>
          <TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Repeat password" secureTextEntry returnKeyType="done" onSubmitEditing={handleSignUp} />

          <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSignUp} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Account</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('SignIn')}>
            <Text style={styles.linkText}>Already have an account? <Text style={styles.linkBold}>Sign In</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: APP_THEME.background },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 32 },
  logo: { fontSize: 48, marginBottom: 8 },
  appName: { fontSize: 28, fontWeight: '800', color: APP_THEME.primary },
  tagline: { fontSize: 14, color: APP_THEME.textSecondary, marginTop: 4 },
  form: { backgroundColor: APP_THEME.surface, borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  label: { fontSize: 13, fontWeight: '600', color: APP_THEME.text, marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: APP_THEME.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: APP_THEME.text, backgroundColor: APP_THEME.background },
  button: { backgroundColor: APP_THEME.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  link: { alignItems: 'center', marginTop: 16 },
  linkText: { fontSize: 14, color: APP_THEME.textSecondary },
  linkBold: { color: APP_THEME.primary, fontWeight: '700' },
});
