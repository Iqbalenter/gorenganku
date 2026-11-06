# GorenganKu - Aplikasi Kasir Warung Gorengan

Aplikasi kasir lokal berbasis Expo SDK 54, Expo Router, TypeScript, dan SQLite.

## Menjalankan aplikasi

1. Jalankan `npm install`.
2. Jalankan `npx expo start --clear`.
3. Buka aplikasi melalui Expo Go yang kompatibel dengan SDK 54.

## Akun bawaan

- Admin: `admin` / `gorengan123` - akses penuh.
- Pengguna: `pengguna` / `pengguna123` - akses penjualan dan keranjang.

## Hak akses

Admin dapat mengelola produk, harga, modal per buah, stok, transaksi, riwayat,
laporan, pengeluaran, dan profil usaha. Pengguna hanya dapat melakukan transaksi
penjualan.

## Penyimpanan data

Data disimpan secara lokal pada perangkat melalui `expo-sqlite`. Aplikasi tidak
memiliki sinkronisasi antarperangkat atau backend server.

## Perhitungan laporan

Keuntungan periode dihitung dari total penjualan dikurangi modal gorengan yang
benar-benar terjual (`unit_cost × qty`) dan pengeluaran non-Bahan. Pembelian bahan
manual tidak dikurangkan lagi agar modal yang sama tidak dihitung dua kali.

Laporan Harian, Mingguan, dan Bulanan menampilkan jumlah, omzet, modal terjual,
serta laba kotor untuk setiap jenis gorengan. Periode sebelumnya dapat dibuka
dengan tombol navigasi tanggal.
