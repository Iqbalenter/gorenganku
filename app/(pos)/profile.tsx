import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getDb } from '../../src/db/client';
import { colors, fonts, spacing, radius } from '../../src/constants/theme';
import type { BusinessProfile } from '../../src/types';
import { getCurrentUser, setCurrentUser } from '../../src/auth/session';

export default function ProfileScreen() {
  useEffect(() => {
    if (getCurrentUser()?.role !== 'admin') router.replace('/(pos)/sales');
  }, []);

  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ business_name: '', owner_name: '', location: '', note: '' });
  const [saving, setSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    const db = await getDb();
    const row = await db.getFirstAsync<BusinessProfile>('SELECT * FROM business_profile LIMIT 1');
    if (row) {
      setProfile(row);
      setForm({
        business_name: row.business_name,
        owner_name: row.owner_name,
        location: row.location ?? '',
        note: row.note ?? '',
      });
    }
  }, []);

  useFocusEffect(useCallback(() => { loadProfile(); }, [loadProfile]));

  async function handleSave() {
    if (!form.business_name.trim()) { Alert.alert('Nama usaha wajib diisi'); return; }
    if (!form.owner_name.trim()) { Alert.alert('Nama pemilik wajib diisi'); return; }
    setSaving(true);
    const db = await getDb();
    if (profile) {
      await db.runAsync(
        'UPDATE business_profile SET business_name=?, owner_name=?, location=?, note=? WHERE id=?',
        [form.business_name.trim(), form.owner_name.trim(), form.location.trim() || null, form.note.trim() || null, profile.id]
      );
    }
    setSaving(false);
    setEditing(false);
    loadProfile();
    Alert.alert('Profil tersimpan!');
  }

  function handleLogout() {
    Alert.alert('Keluar', 'Yakin ingin keluar dari aplikasi?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Keluar',
        style: 'destructive',
        onPress: () => {
          setCurrentUser(null);
          router.replace('/login');
        },
      },
    ]);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Avatar usaha */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={{ fontSize: 48 }}>🏪</Text>
          </View>
          <Text style={styles.businessName}>{profile?.business_name ?? 'GorenganKu'}</Text>
          <Text style={styles.ownerName}>Pemilik: {profile?.owner_name ?? '-'}</Text>
        </View>

        {!editing ? (
          <>
            {/* Info view mode */}
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="storefront-outline" size={18} color={colors.primary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Nama Usaha</Text>
                  <Text style={styles.infoValue}>{profile?.business_name ?? '-'}</Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={18} color={colors.primary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Pemilik</Text>
                  <Text style={styles.infoValue}>{profile?.owner_name ?? '-'}</Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={18} color={colors.primary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Lokasi Usaha</Text>
                  <Text style={styles.infoValue}>{profile?.location ?? '-'}</Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Catatan</Text>
                  <Text style={styles.infoValue}>{profile?.note ?? '-'}</Text>
                </View>
              </View>
            </View>

            <Pressable style={styles.editBtn} onPress={() => setEditing(true)}>
              <Ionicons name="pencil-outline" size={18} color={colors.white} />
              <Text style={styles.editBtnText}>Edit Profil</Text>
            </Pressable>
            <Pressable style={styles.logoutBtn} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={18} color={colors.danger} />
              <Text style={styles.logoutText}>Keluar</Text>
            </Pressable>
          </>
        ) : (
          <>
            {/* Form edit mode */}
            <Text style={styles.label}>Nama Usaha *</Text>
            <TextInput style={styles.input} value={form.business_name} onChangeText={v => setForm(f => ({ ...f, business_name: v }))} placeholder="GorenganKu" placeholderTextColor={colors.textMuted} />

            <Text style={styles.label}>Nama Pemilik *</Text>
            <TextInput style={styles.input} value={form.owner_name} onChangeText={v => setForm(f => ({ ...f, owner_name: v }))} placeholder="Pak Arman" placeholderTextColor={colors.textMuted} />

            <Text style={styles.label}>Lokasi Usaha</Text>
            <TextInput style={styles.input} value={form.location} onChangeText={v => setForm(f => ({ ...f, location: v }))} placeholder="Pinggir Jalan Merdeka" placeholderTextColor={colors.textMuted} />

            <Text style={styles.label}>Catatan / Motto</Text>
            <TextInput style={[styles.input, styles.textArea]} value={form.note} onChangeText={v => setForm(f => ({ ...f, note: v }))} placeholder="Tetap semangat!" placeholderTextColor={colors.textMuted} multiline numberOfLines={3} />

            <Pressable style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              <Text style={styles.saveBtnText}>{saving ? 'Menyimpan...' : 'Simpan Profil'}</Text>
            </Pressable>
            <Pressable style={styles.cancelBtn} onPress={() => setEditing(false)}>
              <Text style={styles.cancelBtnText}>Batal</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  avatarSection: { alignItems: 'center', marginBottom: spacing.lg },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  businessName: { fontFamily: fonts.display, fontSize: 22, color: colors.primary },
  ownerName: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  infoCard: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  infoContent: { flex: 1 },
  infoLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted },
  infoValue: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textPrimary, marginTop: 2 },
  editBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: spacing.md, gap: spacing.xs },
  editBtnText: { fontFamily: fonts.bodySemiBold, color: colors.white, fontSize: 15 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderWidth: 1, borderColor: colors.danger, borderRadius: radius.sm, paddingVertical: spacing.md, marginTop: spacing.sm },
  logoutText: { fontFamily: fonts.bodySemiBold, color: colors.danger, fontSize: 14 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textPrimary, marginBottom: spacing.xs, marginTop: spacing.md },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary, backgroundColor: colors.surface },
  textArea: { height: 80, textAlignVertical: 'top' },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.xl },
  saveBtnText: { fontFamily: fonts.bodySemiBold, color: colors.white, fontSize: 15 },
  cancelBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  cancelBtnText: { fontFamily: fonts.bodyMedium, color: colors.textSecondary, fontSize: 14 },
});
