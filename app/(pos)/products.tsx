import { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, Alert, TextInput, Modal, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getDb } from '../../src/db/client';
import { colors, fonts, spacing, radius } from '../../src/constants/theme';
import { formatRupiah } from '../../src/utils/format';
import type { Product } from '../../src/types';
import { getCurrentUser } from '../../src/auth/session';

export default function ProductsScreen() {
  useEffect(() => {
    if (getCurrentUser()?.role !== 'admin') router.replace('/(pos)/sales');
  }, []);

  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: '', price: '', unit_cost: '', category: '', stock: '' });

  const loadProducts = useCallback(async () => {
    const db = await getDb();
    const rows = await db.getAllAsync<Product>('SELECT * FROM products ORDER BY name ASC');
    setProducts(rows);
  }, []);

  useFocusEffect(useCallback(() => { loadProducts(); }, [loadProducts]));

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  function openAdd() {
    setEditProduct(null);
    setForm({ name: '', price: '', unit_cost: '', category: 'Gorengan', stock: '' });
    setModalVisible(true);
  }

  function openEdit(product: Product) {
    setEditProduct(product);
    setForm({
      name: product.name,
      price: String(product.price),
      unit_cost: String(product.unit_cost),
      category: product.category ?? '',
      stock: String(product.stock),
    });
    setModalVisible(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { Alert.alert('Nama produk wajib diisi'); return; }
    const price = parseFloat(form.price);
    if (isNaN(price) || price <= 0) { Alert.alert('Harga tidak valid'); return; }
    const unitCost = parseFloat(form.unit_cost);
    if (isNaN(unitCost) || unitCost < 0) { Alert.alert('Modal per buah tidak valid'); return; }
    const stock = parseInt(form.stock);
    if (isNaN(stock) || stock < 0) { Alert.alert('Stok tidak valid'); return; }

    const db = await getDb();
    if (editProduct) {
      await db.withTransactionAsync(async () => {
        await db.runAsync(
          'UPDATE products SET name=?, price=?, unit_cost=?, category=?, stock=? WHERE id=?',
          [form.name.trim(), price, unitCost, form.category.trim() || null, stock, editProduct.id]
        );
        await db.runAsync(
          `UPDATE transaction_items
           SET unit_cost = ?
           WHERE product_id = ? AND unit_cost = 0`,
          [unitCost, editProduct.id]
        );
      });
    } else {
      await db.runAsync(
        'INSERT INTO products (name, price, unit_cost, category, stock) VALUES (?, ?, ?, ?, ?)',
        [form.name.trim(), price, unitCost, form.category.trim() || null, stock]
      );
    }
    setModalVisible(false);
    loadProducts();
  }

  async function handleDelete(product: Product) {
    Alert.alert('Nonaktifkan produk?', `"${product.name}" tidak akan tampil di kasir, tetapi riwayatnya tetap disimpan.`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Nonaktifkan', style: 'destructive', onPress: async () => {
          const db = await getDb();
          await db.runAsync('UPDATE products SET is_active = 0 WHERE id = ?', [product.id]);
          loadProducts();
        },
      },
    ]);
  }

  async function handleActivate(product: Product) {
    const db = await getDb();
    await db.runAsync('UPDATE products SET is_active = 1 WHERE id = ?', [product.id]);
    loadProducts();
  }

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Cari produk..."
            placeholderTextColor={colors.textMuted}
          />
        </View>
        <Pressable style={styles.addBtn} onPress={openAdd}>
          <Ionicons name="add" size={22} color={colors.white} />
        </Pressable>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Belum ada produk</Text>}
        renderItem={({ item }) => (
          <View style={[styles.card, !item.is_active && styles.cardInactive]}>
            <View style={styles.cardIcon}>
              <Text style={{ fontSize: 28 }}>🍟</Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.productName}>{item.name}</Text>
              <Text style={styles.productCategory}>{item.category ?? '-'}</Text>
              <Text style={styles.productPrice}>{formatRupiah(item.price)}</Text>
              <Text style={styles.productCost}>Modal: {formatRupiah(item.unit_cost)}</Text>
              <Text style={styles.productStock}>Stok: {item.stock}</Text>
            </View>
            <View style={styles.cardActions}>
              <Pressable style={styles.actionBtn} onPress={() => openEdit(item)}>
                <Ionicons name="pencil-outline" size={20} color={colors.primary} />
              </Pressable>
              <Pressable
                style={styles.actionBtn}
                onPress={() => item.is_active ? handleDelete(item) : handleActivate(item)}
              >
                <Ionicons
                  name={item.is_active ? 'close-circle-outline' : 'refresh-outline'}
                  size={20}
                  color={item.is_active ? colors.danger : colors.success}
                />
              </Pressable>
            </View>
          </View>
        )}
      />

      {/* Modal form */}
      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editProduct ? 'Edit Produk' : 'Tambah Produk'}</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </Pressable>
            </View>

            <Text style={styles.label}>Nama Produk *</Text>
            <TextInput style={styles.input} value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} placeholder="Bakwan, Tahu Isi, dll..." placeholderTextColor={colors.textMuted} />

            <Text style={styles.label}>Harga (Rp) *</Text>
            <TextInput style={styles.input} value={form.price} onChangeText={v => setForm(f => ({ ...f, price: v }))} keyboardType="numeric" placeholder="1000" placeholderTextColor={colors.textMuted} />

            <Text style={styles.label}>Modal Bahan per Buah (Rp) *</Text>
            <TextInput style={styles.input} value={form.unit_cost} onChangeText={v => setForm(f => ({ ...f, unit_cost: v }))} keyboardType="numeric" placeholder="500" placeholderTextColor={colors.textMuted} />

            <Text style={styles.label}>Kategori</Text>
            <TextInput style={styles.input} value={form.category} onChangeText={v => setForm(f => ({ ...f, category: v }))} placeholder="Gorengan" placeholderTextColor={colors.textMuted} />

            <Text style={styles.label}>Stok *</Text>
            <TextInput style={styles.input} value={form.stock} onChangeText={v => setForm(f => ({ ...f, stock: v }))} keyboardType="numeric" placeholder="50" placeholderTextColor={colors.textMuted} />

            <Pressable style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Simpan</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchRow: { flexDirection: 'row', padding: spacing.md, gap: spacing.sm, alignItems: 'center' },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.sm, gap: spacing.xs },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary, paddingVertical: spacing.sm },
  addBtn: { backgroundColor: colors.primary, borderRadius: radius.sm, padding: spacing.sm },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  card: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm, padding: spacing.sm, alignItems: 'center' },
  cardInactive: { opacity: 0.5 },
  cardIcon: { width: 56, height: 56, borderRadius: radius.sm, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  cardInfo: { flex: 1 },
  productName: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textPrimary },
  productCategory: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted },
  productPrice: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.primary, marginTop: 2 },
  productCost: { fontFamily: fonts.body, fontSize: 10, color: colors.textMuted },
  productStock: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary },
  cardActions: { gap: spacing.xs },
  actionBtn: { padding: spacing.xs },
  empty: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
  modal: { flex: 1, backgroundColor: colors.background },
  modalContent: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  modalTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.primary },
  label: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textPrimary, marginBottom: spacing.xs, marginTop: spacing.md },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary, backgroundColor: colors.surface },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.xl },
  saveBtnText: { fontFamily: fonts.bodySemiBold, color: colors.white, fontSize: 15 },
});
