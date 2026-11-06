import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Alert, ScrollView, TextInput } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDb } from '../../src/db/client';
import { colors, fonts, spacing, radius } from '../../src/constants/theme';
import { formatRupiah } from '../../src/utils/format';
import { localDateTimeStr } from '../../src/utils/format';
import type { Product } from '../../src/types';
import { getCurrentUser, setCurrentUser } from '../../src/auth/session';

interface CartItem { product: Product; qty: number; }

export default function SalesScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const insets = useSafeAreaInsets();
  const currentUser = getCurrentUser();

  const loadProducts = useCallback(async () => {
    const db = await getDb();
    const rows = await db.getAllAsync<Product>(
      'SELECT * FROM products WHERE is_active = 1 ORDER BY name ASC'
    );
    setProducts(rows);
  }, []);

  useFocusEffect(useCallback(() => { loadProducts(); }, [loadProducts]));

  function addToCart(product: Product) {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) {
          Alert.alert('Stok tidak cukup', `Stok ${product.name}: ${product.stock}`);
          return prev;
        }
        return prev.map(i => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      if (product.stock <= 0) { Alert.alert('Stok habis'); return prev; }
      return [...prev, { product, qty: 1 }];
    });
  }

  function updateQty(productId: number, delta: number) {
    setCart(prev => prev.flatMap(item => {
      if (item.product.id !== productId) return [item];
      const nextQty = item.qty + delta;
      if (nextQty <= 0) return [];
      if (nextQty > item.product.stock) {
        Alert.alert('Stok tidak cukup', `Stok ${item.product.name}: ${item.product.stock}`);
        return [item];
      }
      return [{ ...item, qty: nextQty }];
    }));
  }

  const totalItems = cart.reduce((s, i) => s + i.qty, 0);
  const totalPrice = cart.reduce((s, i) => s + i.product.price * i.qty, 0);

  async function handleSave() {
    if (cart.length === 0) { Alert.alert('Keranjang kosong'); return; }
    setSaving(true);
    try {
      const db = await getDb();
      await db.withTransactionAsync(async () => {
        for (const item of cart) {
          const current = await db.getFirstAsync<{ stock: number }>(
            'SELECT stock FROM products WHERE id = ?',
            [item.product.id]
          );
          if (!current || current.stock < item.qty) {
            throw new Error(`Stok ${item.product.name} tidak mencukupi`);
          }
        }

        const txResult = await db.runAsync(
          'INSERT INTO transactions (total, item_count, note, created_at) VALUES (?, ?, ?, ?)',
          [totalPrice, totalItems, note.trim() || null, localDateTimeStr()]
        );
        for (const item of cart) {
          await db.runAsync(
            `INSERT INTO transaction_items
              (transaction_id, product_id, product_name, price, unit_cost, qty)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              txResult.lastInsertRowId,
              item.product.id,
              item.product.name,
              item.product.price,
              item.product.unit_cost,
              item.qty,
            ]
          );
          await db.runAsync(
            'UPDATE products SET stock = stock - ? WHERE id = ?',
            [item.qty, item.product.id]
          );
        }
      });
      setCart([]);
      setNote('');
      loadProducts();
      Alert.alert('✅ Penjualan tersimpan!', `Total: ${formatRupiah(totalPrice)}`);
    } catch (e: any) {
      Alert.alert('Gagal', e?.message ?? 'Coba lagi');
    } finally {
      setSaving(false);
    }
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
    <View style={styles.container}>
      {/* Daftar produk */}
      <FlatList
        data={products}
        keyExtractor={item => String(item.id)}
        numColumns={3}
        contentContainerStyle={styles.productList}
        columnWrapperStyle={styles.productRow}
        ListHeaderComponent={(
          <View style={styles.salesHeader}>
            <View>
              <Text style={styles.sectionTitle}>Pilih Produk</Text>
              <Text style={styles.roleText}>Masuk sebagai {currentUser?.displayName ?? 'Pengguna'}</Text>
            </View>
            <Pressable style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={17} color={colors.danger} />
              <Text style={styles.logoutButtonText}>Keluar</Text>
            </Pressable>
          </View>
        )}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.productCard, item.stock <= 0 && styles.productCardDisabled]}
            onPress={() => addToCart(item)}
            disabled={item.stock <= 0}
          >
            <Text style={styles.productEmoji}>🍟</Text>
            <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.productPrice}>{formatRupiah(item.price)}</Text>
            <Text style={styles.productStock}>Stok: {item.stock}</Text>
          </Pressable>
        )}
      />

      {/* Cart & total */}
      <View style={[styles.cartPanel, { paddingBottom: insets.bottom + spacing.sm }]}>
        <Text style={styles.cartTitle}>Keranjang</Text>
        {cart.length === 0 ? (
          <Text style={styles.cartEmpty}>Ketuk produk untuk menambahkan</Text>
        ) : (
          <>
            <ScrollView style={styles.cartList} nestedScrollEnabled>
              {cart.map(item => (
                <View key={item.product.id} style={styles.cartRow}>
                  <Text style={styles.cartName} numberOfLines={1}>{item.product.name}</Text>
                  <View style={styles.qtyRow}>
                    <Pressable style={styles.qtyBtn} onPress={() => updateQty(item.product.id, -1)}>
                      <Ionicons name="remove" size={14} color={colors.primary} />
                    </Pressable>
                    <Text style={styles.qtyText}>{item.qty}</Text>
                    <Pressable style={styles.qtyBtn} onPress={() => updateQty(item.product.id, 1)}>
                      <Ionicons name="add" size={14} color={colors.primary} />
                    </Pressable>
                  </View>
                  <Text style={styles.cartSubtotal}>{formatRupiah(item.product.price * item.qty)}</Text>
                  <Pressable onPress={() => updateQty(item.product.id, -item.qty)}>
                    <Ionicons name="close" size={16} color={colors.danger} />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="Catatan (opsional)..."
              placeholderTextColor={colors.textMuted}
            />
            <View style={styles.totalRow}>
              <View>
                <Text style={styles.totalLabel}>Total Item: {totalItems} pcs</Text>
                <Text style={styles.totalPrice}>{formatRupiah(totalPrice)}</Text>
              </View>
              <Pressable style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                <Text style={styles.saveBtnText}>{saving ? 'Menyimpan...' : 'SIMPAN PENJUALAN'}</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  salesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: spacing.md },
  sectionTitle: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.textPrimary, padding: spacing.md, paddingBottom: spacing.sm },
  roleText: { fontFamily: fonts.body, fontSize: 10, color: colors.textMuted, paddingHorizontal: spacing.md, marginTop: -spacing.xs, marginBottom: spacing.sm },
  logoutButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderWidth: 1, borderColor: colors.danger, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  logoutButtonText: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.danger },
  productList: { paddingHorizontal: spacing.sm },
  productRow: { justifyContent: 'flex-start', gap: spacing.sm },
  productCard: { width: '30%', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.sm, alignItems: 'center', marginBottom: spacing.sm },
  productCardDisabled: { opacity: 0.4 },
  productEmoji: { fontSize: 28 },
  productName: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.textPrimary, textAlign: 'center', marginTop: 4 },
  productPrice: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.primary, marginTop: 2 },
  productStock: { fontFamily: fonts.body, fontSize: 10, color: colors.textMuted },
  cartPanel: { backgroundColor: colors.surface, borderTopWidth: 2, borderTopColor: colors.primary, padding: spacing.md, maxHeight: 300 },
  cartTitle: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.textPrimary, marginBottom: spacing.xs },
  cartEmpty: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.sm },
  cartList: { maxHeight: 120 },
  cartRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.xs },
  cartName: { flex: 1, fontFamily: fonts.body, fontSize: 12, color: colors.textPrimary },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  qtyBtn: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.textPrimary, minWidth: 20, textAlign: 'center' },
  cartSubtotal: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.primary, width: 70, textAlign: 'right' },
  noteInput: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, fontFamily: fonts.body, fontSize: 12, marginTop: spacing.xs },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  totalLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted },
  totalPrice: { fontFamily: fonts.bodySemiBold, fontSize: 18, color: colors.primary },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  saveBtnText: { fontFamily: fonts.bodySemiBold, color: colors.white, fontSize: 13 },
});
