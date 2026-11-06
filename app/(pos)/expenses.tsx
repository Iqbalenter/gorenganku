import { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, Alert, TextInput, Modal, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getDb } from '../../src/db/client';
import { colors, fonts, spacing, radius } from '../../src/constants/theme';
import { formatRupiah, formatDateTime, localDateStr, localDateTimeStr } from '../../src/utils/format';
import type { Expense } from '../../src/types';
import { getCurrentUser } from '../../src/auth/session';

const CATEGORIES = ['Bahan', 'Operasional', 'Lainnya'];

export default function ExpensesScreen() {
  useEffect(() => {
    if (getCurrentUser()?.role !== 'admin') router.replace('/(pos)/sales');
  }, []);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [todayTotal, setTodayTotal] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState({ name: '', amount: '', category: 'Bahan', note: '', date: localDateStr() });

  const loadData = useCallback(async () => {
    const db = await getDb();
    const today = localDateStr();
    const rows = await db.getAllAsync<Expense>(
      'SELECT * FROM expenses ORDER BY created_at DESC LIMIT 50'
    );
    setExpenses(rows);
    const total = await db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE date(created_at) = ?`, [today]
    );
    setTodayTotal(total?.total ?? 0);
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  async function handleSave() {
    if (!form.name.trim()) { Alert.alert('Nama pengeluaran wajib diisi'); return; }
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) { Alert.alert('Jumlah tidak valid'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) {
      Alert.alert('Tanggal tidak valid', 'Gunakan format YYYY-MM-DD.');
      return;
    }
    const currentTime = localDateTimeStr().slice(11);
    const db = await getDb();
    await db.runAsync(
      'INSERT INTO expenses (name, amount, category, note, created_at) VALUES (?, ?, ?, ?, ?)',
      [form.name.trim(), amount, form.category, form.note.trim() || null, `${form.date} ${currentTime}`]
    );
    setModalVisible(false);
    setForm({ name: '', amount: '', category: 'Bahan', note: '', date: localDateStr() });
    loadData();
  }

  async function handleDelete(id: number) {
    Alert.alert('Hapus pengeluaran?', '', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus', style: 'destructive', onPress: async () => {
          const db = await getDb();
          await db.runAsync('DELETE FROM expenses WHERE id = ?', [id]);
          loadData();
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.headerLabel}>Pengeluaran Hari Ini</Text>
        <Text style={styles.headerTotal}>{formatRupiah(todayTotal)}</Text>
      </View>

      <FlatList
        data={expenses}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Belum ada pengeluaran tercatat</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardIcon}>
              <Text style={{ fontSize: 22 }}>
                {item.category === 'Bahan' ? '🛒' : item.category === 'Operasional' ? '⚙️' : '📦'}
              </Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.expenseName}>{item.name}</Text>
              <Text style={styles.expenseCategory}>{item.category} · {formatDateTime(item.created_at)}</Text>
              {item.note && <Text style={styles.expenseNote}>{item.note}</Text>}
            </View>
            <View style={styles.cardRight}>
              <Text style={styles.expenseAmount}>{formatRupiah(item.amount)}</Text>
              <Pressable onPress={() => handleDelete(item.id)}>
                <Ionicons name="trash-outline" size={16} color={colors.danger} />
              </Pressable>
            </View>
          </View>
        )}
      />

      <Pressable style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={28} color={colors.white} />
      </Pressable>

      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tambah Pengeluaran</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </Pressable>
            </View>

            <Text style={styles.label}>Nama Pengeluaran *</Text>
            <TextInput style={styles.input} value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} placeholder="Minyak goreng, Gas, dll..." placeholderTextColor={colors.textMuted} />

            <Text style={styles.label}>Jumlah (Rp) *</Text>
            <TextInput style={styles.input} value={form.amount} onChangeText={v => setForm(f => ({ ...f, amount: v }))} keyboardType="numeric" placeholder="20000" placeholderTextColor={colors.textMuted} />

            <Text style={styles.label}>Tanggal Pembelian *</Text>
            <TextInput style={styles.input} value={form.date} onChangeText={v => setForm(f => ({ ...f, date: v }))} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} />

            <Text style={styles.label}>Kategori</Text>
            <View style={styles.categoryRow}>
              {CATEGORIES.map(cat => (
                <Pressable
                  key={cat}
                  style={[styles.catBtn, form.category === cat && styles.catBtnActive]}
                  onPress={() => setForm(f => ({ ...f, category: cat }))}
                >
                  <Text style={[styles.catBtnText, form.category === cat && styles.catBtnTextActive]}>{cat}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Keterangan</Text>
            <TextInput style={styles.input} value={form.note} onChangeText={v => setForm(f => ({ ...f, note: v }))} placeholder="Opsional..." placeholderTextColor={colors.textMuted} />

            <Pressable style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Simpan Pengeluaran</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerCard: { backgroundColor: colors.danger, padding: spacing.md },
  headerLabel: { fontFamily: fonts.body, fontSize: 12, color: '#FFCDD2' },
  headerTotal: { fontFamily: fonts.bodySemiBold, fontSize: 22, color: colors.white },
  list: { padding: spacing.md, paddingBottom: 100 },
  card: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm, padding: spacing.sm, alignItems: 'center' },
  cardIcon: { width: 44, height: 44, borderRadius: radius.sm, backgroundColor: '#FFF3E0', alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  cardInfo: { flex: 1 },
  expenseName: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textPrimary },
  expenseCategory: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted },
  expenseNote: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary },
  cardRight: { alignItems: 'flex-end', gap: spacing.xs },
  expenseAmount: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.danger },
  fab: { position: 'absolute', bottom: spacing.xl, right: spacing.lg, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  empty: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
  modal: { flex: 1, backgroundColor: colors.background },
  modalContent: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  modalTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.primary },
  label: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textPrimary, marginBottom: spacing.xs, marginTop: spacing.md },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary, backgroundColor: colors.surface },
  categoryRow: { flexDirection: 'row', gap: spacing.sm },
  catBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  catBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catBtnText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textSecondary },
  catBtnTextActive: { color: colors.white },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.xl },
  saveBtnText: { fontFamily: fonts.bodySemiBold, color: colors.white, fontSize: 15 },
});
