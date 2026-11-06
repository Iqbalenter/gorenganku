import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getDb } from '../../src/db/client';
import { colors, fonts, spacing, radius } from '../../src/constants/theme';
import { formatRupiah, formatDate, localDateStr } from '../../src/utils/format';
import { getCurrentUser } from '../../src/auth/session';

export default function DashboardScreen() {
  useEffect(() => {
    if (getCurrentUser()?.role !== 'admin') router.replace('/(pos)/sales');
  }, []);

  const [todaySales, setTodaySales] = useState(0);
  const [todayQty, setTodayQty] = useState(0);
  const [todayDeductions, setTodayDeductions] = useState(0);
  const [profit, setProfit] = useState(0);
  const [chartData, setChartData] = useState<{ label: string; total: number }[]>([]);
  const [topProducts, setTopProducts] = useState<{ name: string; qty: number }[]>([]);

  const loadData = useCallback(async () => {
    const db = await getDb();
    const today = localDateStr();

    const [sales, productCost, operationalExpense] = await Promise.all([
      db.getFirstAsync<{ total: number; qty: number }>(
        `SELECT COALESCE(SUM(total),0) as total, COALESCE(SUM(item_count),0) as qty
         FROM transactions WHERE date(created_at) = ?`, [today]
      ),
      db.getFirstAsync<{ total: number }>(
        `SELECT COALESCE(SUM(ti.qty * ti.unit_cost), 0) AS total
         FROM transaction_items ti
         JOIN transactions t ON t.id = ti.transaction_id
         WHERE date(t.created_at) = ?`, [today]
      ),
      db.getFirstAsync<{ total: number }>(
        `SELECT COALESCE(SUM(amount), 0) AS total
         FROM expenses
         WHERE date(created_at) = ?
           AND lower(trim(COALESCE(category, ''))) <> 'bahan'`, [today]
      ),
    ]);
    setTodaySales(sales?.total ?? 0);
    setTodayQty(sales?.qty ?? 0);
    const deductions = (productCost?.total ?? 0) + (operationalExpense?.total ?? 0);
    setTodayDeductions(deductions);
    setProfit((sales?.total ?? 0) - deductions);

    // Grafik 7 hari
    const chartDates = Array.from({ length: 7 }, (_, index) => {
      const i = 6 - index;
      const d = new Date();
      d.setDate(d.getDate() - i);
      return { dateStr: localDateStr(d), label: `${d.getDate()}/${d.getMonth() + 1}` };
    });
    const chart = await Promise.all(chartDates.map(async ({ dateStr, label }) => {
      const row = await db.getFirstAsync<{ total: number }>(
        `SELECT COALESCE(SUM(total),0) as total FROM transactions WHERE date(created_at) = ?`, [dateStr]
      );
      return { label, total: row?.total ?? 0 };
    }));
    setChartData(chart);

    // Top produk 7 hari
    const top = await db.getAllAsync<{ name: string; qty: number }>(
      `SELECT ti.product_name as name, SUM(ti.qty) as qty
       FROM transaction_items ti
       JOIN transactions t ON t.id = ti.transaction_id
       WHERE date(t.created_at) >= date('now','localtime','-6 days')
       GROUP BY ti.product_name ORDER BY qty DESC LIMIT 5`
    );
    setTopProducts(top);
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const maxChart = Math.max(...chartData.map(d => d.total), 1);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header tanggal */}
      <View style={styles.dateRow}>
        <Ionicons name="calendar-outline" size={16} color={colors.white} />
        <Text style={styles.dateText}>{formatDate(new Date().toISOString())}</Text>
      </View>

      {/* Kartu ringkasan */}
      <Text style={styles.sectionTitle}>Ringkasan Hari Ini</Text>
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}>
          <Text style={styles.statLabel}>Total Penjualan</Text>
          <Text style={[styles.statValue, { color: colors.success }]}>{formatRupiah(todaySales)}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}>
          <Text style={styles.statLabel}>Total Terjual</Text>
          <Text style={[styles.statValue, { color: '#1565C0' }]}>{todayQty} pcs</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#FFF3E0' }]}>
          <Text style={styles.statLabel}>Keuntungan Bersih</Text>
          <Text style={[styles.statValue, { color: colors.primary }]}>{formatRupiah(profit)}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#FCE4EC' }]}>
          <Text style={styles.statLabel}>Modal + Operasional</Text>
          <Text style={[styles.statValue, { color: colors.danger }]}>{formatRupiah(todayDeductions)}</Text>
        </View>
      </View>

      {/* Shortcut pengeluaran & profil */}
      <View style={styles.shortcutRow}>
        <Pressable style={styles.shortcutBtn} onPress={() => router.push('/(pos)/expenses')}>
          <Ionicons name="receipt-outline" size={18} color={colors.primary} />
          <Text style={styles.shortcutText}>Pengeluaran</Text>
        </Pressable>
        <Pressable style={styles.shortcutBtn} onPress={() => router.push('/(pos)/profile')}>
          <Ionicons name="storefront-outline" size={18} color={colors.primary} />
          <Text style={styles.shortcutText}>Profil Usaha</Text>
        </Pressable>
      </View>

      {/* Grafik 7 hari */}
      <Text style={styles.sectionTitle}>Penjualan 7 Hari Terakhir</Text>
      <View style={styles.chartCard}>
        <View style={styles.chartBars}>
          {chartData.map((d, idx) => (
            <View key={idx} style={styles.barCol}>
              <View style={styles.barTrack}>
                <View style={[
                  styles.barFill,
                  {
                    height: `${Math.max(4, (d.total / maxChart) * 100)}%`,
                    backgroundColor: idx === 6 ? colors.danger : colors.primary,
                  }
                ]} />
              </View>
              <Text style={styles.barLabel}>{d.label}</Text>
            </View>
          ))}
        </View>
        <View style={styles.chartYAxis}>
          <Text style={styles.chartYLabel}>{formatRupiah(maxChart)}</Text>
          <Text style={styles.chartYLabel}>{formatRupiah(maxChart / 2)}</Text>
          <Text style={styles.chartYLabel}>0</Text>
        </View>
      </View>

      {/* Produk terlaris */}
      <Text style={styles.sectionTitle}>Produk Terlaris</Text>
      <View style={styles.card}>
        {topProducts.length === 0 ? (
          <Text style={styles.emptyText}>Belum ada data penjualan</Text>
        ) : (
          topProducts.map((p, idx) => (
            <View key={idx} style={styles.topRow}>
              <Text style={styles.topRank}>
                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}
              </Text>
              <Text style={styles.topName}>{p.name}</Text>
              <Text style={styles.topQty}>{p.qty} pcs</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xl },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  dateText: { fontFamily: fonts.body, fontSize: 12, color: colors.white },
  sectionTitle: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.textPrimary, marginHorizontal: spacing.md, marginTop: spacing.md, marginBottom: spacing.sm },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.sm, gap: spacing.sm },
  statCard: { width: '47%', borderRadius: radius.md, padding: spacing.md },
  statLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary },
  statValue: { fontFamily: fonts.bodySemiBold, fontSize: 16, marginTop: 4 },
  shortcutRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, marginTop: spacing.sm },
  shortcutBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, backgroundColor: colors.primaryLight, borderRadius: radius.sm, paddingVertical: spacing.sm },
  shortcutText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.primary },
  chartCard: { marginHorizontal: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  chartBars: { flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 4 },
  barCol: { flex: 1, alignItems: 'center' },
  barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 3, minHeight: 4 },
  barLabel: { fontFamily: fonts.body, fontSize: 9, color: colors.textMuted, marginTop: 4 },
  chartYAxis: { position: 'absolute', left: spacing.md, top: spacing.md, bottom: 30, justifyContent: 'space-between' },
  chartYLabel: { fontFamily: fonts.body, fontSize: 8, color: colors.textMuted },
  card: { marginHorizontal: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  topRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.border },
  topRank: { width: 28, fontSize: 16 },
  topName: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textPrimary },
  topQty: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.primary },
  emptyText: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, textAlign: 'center' },
});
