import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing, radius } from '../src/constants/theme';
import { setCurrentUser } from '../src/auth/session';

const { height } = Dimensions.get('window');

const ACCOUNTS = [
  { username: 'admin', password: 'gorengan123', role: 'admin' as const, displayName: 'Admin' },
  { username: 'pengguna', password: 'pengguna123', role: 'user' as const, displayName: 'Pengguna' },
];

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleLogin() {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Lengkapi data', 'Username dan password wajib diisi.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const account = ACCOUNTS.find(
        item => item.username === username.trim().toLowerCase() && item.password === password
      );
      if (account) {
        setCurrentUser({
          username: account.username,
          role: account.role,
          displayName: account.displayName,
        });
        router.replace('/(pos)');
      } else {
        Alert.alert('Login Gagal', 'Username atau password salah.');
      }
    }, 800);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Background atas */}
      <View style={styles.topBg}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />
        <View style={styles.logoBox}>
          <Text style={styles.logoEmoji}>🍟</Text>
        </View>
        <Text style={styles.brandName}>GorenganKu</Text>
        <Text style={styles.brandTagline}>Aplikasi Kasir Gorengan</Text>
      </View>

      {/* Form card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Masuk ke Aplikasi</Text>
        <Text style={styles.cardSub}>Gunakan akun pemilik warung</Text>

        <Text style={styles.label}>USERNAME</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="person-outline" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Masukkan username"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <Text style={styles.label}>PASSWORD</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Masukkan password"
            placeholderTextColor={colors.textMuted}
            secureTextEntry={!showPass}
            autoCapitalize="none"
          />
          <Pressable onPress={() => setShowPass(!showPass)}>
            <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
          </Pressable>
        </View>

        <Pressable
          style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <Text style={styles.loginBtnText}>Memverifikasi...</Text>
          ) : (
            <>
              <Text style={styles.loginBtnText}>Masuk</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.white} />
            </>
          )}
        </Pressable>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
          <Text style={styles.infoText}>
            Admin: <Text style={styles.infoHighlight}>admin / gorengan123</Text>{'\n'}
            Pengguna: <Text style={styles.infoHighlight}>pengguna / pengguna123</Text>
          </Text>
        </View>
      </View>

      <Text style={styles.footer}>GorenganKu © 2024 · Aplikasi Kasir Warung Gorengan</Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBg: {
    backgroundColor: colors.primaryDark,
    height: height * 0.38,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  circle1: {
    position: 'absolute', width: 260, height: 260, borderRadius: 130,
    backgroundColor: 'rgba(255,255,255,0.05)', top: -80, right: -60,
  },
  circle2: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.05)', bottom: -40, left: -40,
  },
  logoBox: {
    width: 80, height: 80, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
  },
  logoEmoji: { fontSize: 40 },
  brandName: { fontFamily: fonts.display, fontSize: 28, color: colors.white, letterSpacing: 0.5 },
  brandTagline: { fontFamily: fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 4 },
  card: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginTop: -spacing.xl,
    borderRadius: radius.lg,
    padding: spacing.lg,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  cardTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.primary, marginBottom: 4 },
  cardSub: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginBottom: spacing.lg },
  label: { fontFamily: fonts.bodySemiBold, fontSize: 10, color: colors.textMuted, letterSpacing: 0.8, marginBottom: spacing.xs, marginTop: spacing.sm },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.sm, paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2, backgroundColor: colors.background, gap: spacing.sm,
  },
  input: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary },
  loginBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.primary,
    borderRadius: radius.md, paddingVertical: spacing.md, marginTop: spacing.lg,
  },
  loginBtnDisabled: { backgroundColor: colors.textMuted },
  loginBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.white },
  infoBox: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    marginTop: spacing.md, backgroundColor: colors.background,
    borderRadius: radius.sm, padding: spacing.sm,
  },
  infoText: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted },
  infoHighlight: { fontFamily: fonts.bodySemiBold, color: colors.primary },
  footer: { fontFamily: fonts.body, fontSize: 10, color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg },
});
