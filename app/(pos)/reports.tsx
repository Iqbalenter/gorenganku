import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getDb } from '../../src/db/client';
import { colors, fonts, spacing, radius, shadow } from '../../src/constants/theme';
import { formatRupiah, formatDateShort, localDateStr } from '../../src/utils/format';
import { getCurrentUser } from '../../src/auth/session';

type Period = 'Harian' | 'Mingguan' | 'Bulanan';
type ProductReport = {
  name: string;
  qty: number;
  revenue: number;
  cost: number;
  profit: number;
};

function getPeriodRange(period: Period, referenceDate: Date) {
  const fromDate = new Date(referenceDate);
  const toDate = new Date(referenceDate);

  if (period === 'Mingguan') {
    const daysSinceMonday = (referenceDate.getDay() + 6) % 7;
    fromDate.setDate(referenceDate.getDate() - daysSinceMonday);
    toDate.setTime(fromDate.getTime());
    toDate.setDate(fromDate.getDate() + 6);
  } else if (period === 'Bulanan') {
    fromDate.setDate(1);
    toDate.setMonth(referenceDate.getMonth() + 1, 0);
  }

  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (toDate > today) toDate.setTime(today.getTime());

  return { from: localDateStr(fromDate), to: localDateStr(toDate) };
}

export default function ReportsScreen() {
  useEffect(() => {
    if (getCurrentUser()?.role !== 'admin') router.replace('/(pos)/sales');
  }, []);

  const [period, setPeriod] = useState<Period>('Harian');
  const [referenceDate, setReferenceDate] = useState(new Date());
  const [totalSales, setTotalSales] = useState(0);
  const [costOfGoodsSold, setCostOfGoodsSold] = useState(0);
  const [operationalCost, setOperationalCost] = useState(0);
  const [txCount, setTxCount] = useState(0);
  const [totalQty, setTotalQty] = useState(0);
  const [items, setItems] = useState<ProductReport[]>([]);
  const [range, setRange] = useState({ from: '', to: '' });

  const loadData = useCallback(async () => {
    const db = await getDb();
    const { from, to } = getPeriodRange(period, referenceDate);
    setRange({ from, to });

    const [sales, productCost, operational, productRows] = await Promise.all([
      db.getFirstAsync<{ total: number; qty: number; count: number }>(
        `SELECT COALESCE(SUM(total), 0) AS total,
                COALESCE(SUM(item_count), 0) AS qty,
                COUNT(*) AS count
         FROM transactions
         WHERE date(created_at) BETWEEN ? AND ?`,
        [from, to]
      ),
      db.getFirstAsync<{ total: number }>(
        `SELECT COALESCE(SUM(ti.qty * ti.unit_cost), 0) AS total
         FROM transaction_items ti
         JOIN transactions t ON t.id = ti.transaction_id
         WHERE date(t.created_at) BETWEEN ? AND ?`,
        [from, to]
      ),
      db.getFirstAsync<{ total: number }>(
        `SELECT COALESCE(SUM(amount), 0) AS total
         FROM expenses
         WHERE date(created_at) BETWEEN ? AND ?
           AND lower(trim(COALESCE(category, ''))) <> 'bahan'`,
        [from, to]
      ),
      db.getAllAsync<ProductReport>(
        `SELECT ti.product_name AS name,
                SUM(ti.qty) AS qty,
                SUM(ti.qty * ti.price) AS revenue,
                SUM(ti.qty * ti.unit_cost) AS cost,
                SUM(ti.qty * (ti.price - ti.unit_cost)) AS profit
         FROM transaction_items ti
         JOIN transactions t ON t.id = ti.transaction_id
         WHERE date(t.created_at) BETWEEN ? AND ?
         GROUP BY ti.product_name
         ORDER BY qty DESC, ti.product_name ASC`,
        [from, to]
      ),
    ]);

    setTotalSales(sales?.total ?? 0);
    setTotalQty(sales?.qty ?? 0);
    setTxCount(sales?.count ?? 0);
    setCostOfGoodsSold(productCost?.total ?? 0);
    setOperationalCost(operational?.total ?? 0);
    setItems(productRows);
  }, [period, referenceDate]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const profit = totalSales - costOfGoodsSold - operationalCost;
  const averageTransaction = txCount > 0 ? Math.round(totalSales / txCount) : 0;
  const rangeLabel = range.from === range.to
    ? formatDateShort(range.from)
    : `${formatDateShort(range.from)} - ${formatDateShort(range.to)}`;
  const canGoNext = range.to < localDateStr();

  function shiftPeriod(direction: -1 | 1) {
    if (direction === 1 && !canGoNext) return;
    setReferenceDate(current => {
      const next = new Date(current);
      if (period === 'Harian') next.setDate(next.getDate() + direction);
      if (period === 'Mingguan') next.setDate(next.getDate() + (direction * 7));
      if (period === 'Bulanan') next.setMonth(next.getMonth() + direction, 1);
      return next;
    });
  }

  function selectPeriod(value: Period) {
    setPeriod(value);
    setReferenceDate(new Date());
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.periodRow}>
        {(['Harian', 'Mingguan', 'Bulanan'] as Period[]).map(value => (
          <Pressable
            key={value}
            style={[styles.periodBtn, period === value && styles.periodBtnActive]}
            onPress={() => selectPeriod(value)}
          >
            <Text style={[styles.periodText, period === value && styles.periodTextActive]}>{value}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.dateRow}>
        <Pressable style={styles.dateNavBtn} onPress={() => shiftPeriod(-1)} hitSlop={8}>
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
        </Pressable>
        <View style={styles.dateLabelWrap}>
          <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
          <Text style={styles.dateText}>{range.from ? rangeLabel : ''}</Text>
        </View>
        <Pressable style={styles.dateNavBtn} onPress={() => shiftPeriod(1)} disabled={!canGoNext} hitSlop={8}>
          <Ionicons name="chevron-forward" size={20} color={canGoNext ? colors.primary : colors.border} />
        </Pressable>
      </View>

      <View style={styles.metric}>
        <Text style={styles.label}>Total Penjualan</Text>
        <Text style={[styles.value, { color: colors.success }]}>{formatRupiah(totalSales)}</Text>
      </View>
      <View style={styles.metric}>
        <Text style={styles.label}>Modal Gorengan Terjual</Text>
        <Text style={[styles.value, { color: colors.danger }]}>{formatRupiah(costOfGoodsSold)}</Text>
      </View>
      <View style={styles.metric}>
        <Text style={styles.label}>Pengeluaran Operasional</Text>
        <Text style={[styles.value, { color: colors.danger }]}>{formatRupiah(operationalCost)}</Text>
      </View>

      <View style={[styles.profitCard, { backgroundColor: colors.accentLight }]}>
        <Text style={styles.label}>KEUNTUNGAN BERSIH PERIODE</Text>
        <Text style={[styles.profitValue, { color: profit >= 0 ? colors.success : colors.danger }]}>
          {formatRupiah(profit)}
        </Text>
        <Text style={styles.hint}>Penjualan - modal gorengan terjual - pengeluaran operasional</Text>
      </View>

      <Text style={styles.sectionTitle}>RINGKASAN</Text>
      <View style={styles.card}>
        {[
          ['Jumlah produk terjual', `${totalQty} pcs`],
          ['Jumlah transaksi', `${txCount} transaksi`],
          ['Rata-rata transaksi', formatRupiah(averageTransaction)],
        ].map(([label, value], index) => (
          <View key={label} style={[styles.summaryRow, index < 2 && styles.borderBottom]}>
            <Text style={styles.summaryLabel}>{label}</Text>
            <Text style={styles.summaryValue}>{value}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>TOTAL SETIAP GORENGAN - {period.toUpperCase()}</Text>
      <View style={styles.card}>
        <View style={[styles.productRow, styles.tableHead]}>
          <Text style={[styles.productName, styles.headText]}>Nama</Text>
          <Text style={[styles.number, styles.headText]}>Qty</Text>
          <Text style={[styles.number, styles.headText]}>Omzet</Text>
        </View>
        {items.length === 0 ? (
          <Text style={styles.empty}>Belum ada penjualan pada periode ini.</Text>
        ) : items.map((item, index) => (
          <View key={`${item.name}-${index}`} style={[styles.productBlock, index < items.length - 1 && styles.borderBottom]}>
            <View style={styles.productRow}>
              <Text style={styles.productName}>{item.name}</Text>
              <Text style={styles.number}>{item.qty}</Text>
              <Text style={styles.number}>{formatRupiah(item.revenue)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailText}>Modal terjual: {formatRupiah(item.cost)}</Text>
              <Text style={styles.profitText}>Laba kotor: {formatRupiah(item.profit)}</Text>
            </View>
          </View>
        ))}
      </View>

      <Pressable style={styles.expenseBtn} onPress={() => router.push('/(pos)/expenses')}>
        <Ionicons name="wallet-outline" size={16} color={colors.white} />
        <Text style={styles.expenseBtnText}>Kelola Pengeluaran</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  periodRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm },
  periodBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, alignItems: 'center', backgroundColor: colors.surface },
  periodBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  periodText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textMuted },
  periodTextActive: { color: colors.white },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  dateNavBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: colors.surface },
  dateLabelWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, flex: 1 },
  dateText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textSecondary },
  metric: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  label: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary },
  value: { fontFamily: fonts.bodySemiBold, fontSize: 18, marginTop: 4 },
  profitCard: { borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  profitValue: { fontFamily: fonts.display, fontSize: 26, marginTop: 4 },
  hint: { fontFamily: fonts.body, fontSize: 10, color: colors.textMuted, marginTop: 4 },
  sectionTitle: { fontFamily: fonts.bodySemiBold, fontSize: 10, color: colors.textMuted, letterSpacing: 0.8, marginBottom: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, marginBottom: spacing.md, ...shadow.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, gap: spacing.sm },
  summaryLabel: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
  summaryValue: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.textPrimary },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: colors.border },
  productBlock: { paddingVertical: spacing.sm },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 5 },
  tableHead: { borderBottomWidth: 1, borderBottomColor: colors.border },
  productName: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textPrimary },
  number: { width: 90, textAlign: 'right', fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.textPrimary },
  headText: { fontFamily: fonts.bodySemiBold, color: colors.textMuted, fontSize: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 },
  detailText: { fontFamily: fonts.body, fontSize: 10, color: colors.textMuted },
  profitText: { fontFamily: fonts.bodySemiBold, fontSize: 10, color: colors.success },
  empty: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.md },
  expenseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md },
  expenseBtnText: { fontFamily: fonts.bodySemiBold, color: colors.white, fontSize: 14 },
});
