import { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, Modal, ScrollView, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getDb } from '../../src/db/client';
import { colors, fonts, spacing, radius } from '../../src/constants/theme';
import { formatRupiah, formatDate, formatTime } from '../../src/utils/format';
import type { Transaction, TransactionItem } from '../../src/types';
import { getCurrentUser } from '../../src/auth/session';
import { localDateStr } from '../../src/utils/format';

interface TxWithItems extends Transaction {
  items: TransactionItem[];
}

export default function HistoryScreen() {
  useEffect(() => {
    if (getCurrentUser()?.role !== 'admin') router.replace('/(pos)/sales');
  }, []);

  const [transactions, setTransactions] = useState<TxWithItems[]>([]);
  const [selected, setSelected] = useState<TxWithItems | null>(null);
  const [date, setDate] = useState(new Date());

  const loadData = useCallback(async () => {
    const db = await getDb();
    const txs = await db.getAllAsync<Transaction>(
      `SELECT * FROM transactions WHERE date(created_at) = ? ORDER BY created_at DESC`,
      [localDateStr(date)]
    );
    const result: TxWithItems[] = [];
    for (const tx of txs) {
      const items = await db.getAllAsync<TransactionItem>(
        'SELECT * FROM transaction_items WHERE transaction_id = ?', [tx.id]
      );
      result.push({ ...tx, items });
    }
    setTransactions(result);
  }, [date]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  function shiftDay(delta: number) {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + delta);
    if (nextDate > new Date()) return;
    setDate(nextDate);
  }

  function handleDelete(transaction: TxWithItems) {
    Alert.alert('Hapus transaksi?', 'Stok produk akan dikembalikan.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          const db = await getDb();
          await db.withTransactionAsync(async () => {
            for (const item of transaction.items) {
              if (item.product_id) {
                await db.runAsync(
                  'UPDATE products SET stock = stock + ? WHERE id = ?',
                  [item.qty, item.product_id]
                );
              }
            }
            await db.runAsync('DELETE FROM transactions WHERE id = ?', [transaction.id]);
          });
          setSelected(null);
          loadData();
        },
      },
    ]);
  }

  const total = transactions.reduce((sum, transaction) => sum + transaction.total, 0);
  const isToday = localDateStr(date) === localDateStr();

  return (
    <View style={styles.container}>
      <View style={styles.todayCard}>
        <Pressable onPress={() => shiftDay(-1)} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </Pressable>
        <View style={styles.dateCenter}>
          <Text style={styles.todayLabel}>{formatDate(date.toISOString())}</Text>
          <Text style={styles.todayTotal}>Total: {formatRupiah(total)} · {transactions.length} transaksi</Text>
        </View>
        <Pressable onPress={() => shiftDay(1)} hitSlop={10} disabled={isToday}>
          <Ionicons
            name="chevron-forward"
            size={22}
            color={isToday ? 'rgba(255,255,255,0.3)' : colors.white}
          />
        </Pressable>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>Belum ada penjualan pada tanggal ini</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => setSelected(item)}>
            <View style={styles.cardLeft}>
              <Text style={styles.txTime}>{formatTime(item.created_at)}</Text>
            </View>
            <View style={styles.cardMiddle}>
              {item.items.map((i, idx) => (
                <Text key={idx} style={styles.itemText}>
                  {i.product_name} ({i.qty})
                </Text>
              ))}
            </View>
            <View style={styles.cardRight}>
              <Text style={styles.txTotal}>{formatRupiah(item.total)}</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
            </View>
          </Pressable>
        )}
      />

      {/* Modal detail transaksi */}
      <Modal visible={!!selected} animationType="slide" onRequestClose={() => setSelected(null)}>
        {selected && (
          <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent}>
            <Pressable style={styles.closeBtn} onPress={() => setSelected(null)}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </Pressable>
            <Text style={styles.modalTitle}>Detail Transaksi #{selected.id}</Text>
            <Text style={styles.modalDate}>{formatDate(selected.created_at)} · {formatTime(selected.created_at)}</Text>

            <View style={styles.detailCard}>
              {selected.items.map((item, idx) => (
                <View key={idx} style={styles.detailRow}>
                  <Text style={styles.detailName}>{item.product_name}</Text>
                  <Text style={styles.detailQty}>x{item.qty}</Text>
                  <Text style={styles.detailPrice}>{formatRupiah(item.price * item.qty)}</Text>
                </View>
              ))}
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailTotal}>Total</Text>
                <Text style={styles.detailTotalPrice}>{formatRupiah(selected.total)}</Text>
              </View>
              {selected.note && (
                <Text style={styles.noteText}>Catatan: {selected.note}</Text>
              )}
            </View>
            <Pressable style={styles.deleteBtn} onPress={() => handleDelete(selected)}>
              <Ionicons name="trash-outline" size={16} color={colors.white} />
              <Text style={styles.deleteBtnText}>Hapus Transaksi</Text>
            </Pressable>
          </ScrollView>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  todayCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.primary, padding: spacing.md },
  dateCenter: { flex: 1, alignItems: 'center' },
  todayLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.primaryLight },
  todayTotal: { fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.white },
  list: { padding: spacing.md, paddingBottom: spacing.xl },
  card: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm, padding: spacing.md, alignItems: 'center' },
  cardLeft: { width: 50, alignItems: 'center' },
  txTime: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.textPrimary },
  cardMiddle: { flex: 1, paddingHorizontal: spacing.sm },
  itemText: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary },
  cardRight: { alignItems: 'flex-end', flexDirection: 'row', gap: 4 },
  txTotal: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.primary },
  empty: { alignItems: 'center', paddingTop: spacing.xl * 2 },
  emptyText: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, marginTop: spacing.md },
  modal: { flex: 1, backgroundColor: colors.background },
  modalContent: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  closeBtn: { alignSelf: 'flex-end', marginBottom: spacing.sm },
  modalTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.primary },
  modalDate: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 4, marginBottom: spacing.md },
  detailCard: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  detailName: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: colors.textPrimary },
  detailQty: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, marginHorizontal: spacing.sm },
  detailPrice: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textPrimary },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  detailTotal: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.textPrimary },
  detailTotalPrice: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.primary },
  noteText: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: spacing.sm },
  deleteBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.danger, borderRadius: radius.sm, paddingVertical: spacing.md, marginTop: spacing.md },
  deleteBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.white },
});
