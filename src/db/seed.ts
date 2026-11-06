import { getDb } from './client';
import { localDateTimeStr } from '../utils/format';

export async function seedDatabase() {
  const db = await getDb();

  const profileExists = await db.getFirstAsync('SELECT id FROM business_profile LIMIT 1');
  if (!profileExists) {
    await db.runAsync(
      'INSERT INTO business_profile (business_name, owner_name, location, note) VALUES (?, ?, ?, ?)',
      ['GorenganKu', 'Pak Arman', 'Pinggir Jalan Merdeka', 'Terus semangat dan jaga kualitas rasa']
    );
  }

  const productCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM products'
  );
  if (!productCount || productCount.count === 0) {
    const sampleProducts: [string, number, number, number][] = [
      ['Bakwan', 1000, 500, 50],
      ['Tahu Isi', 1500, 800, 30],
      ['Tempe Goreng', 1000, 500, 40],
      ['Pisang Goreng', 1500, 800, 25],
      ['Ubi Goreng', 1500, 750, 35],
      ['Risoles', 2000, 1100, 15],
      ['Cireng', 1000, 450, 20],
      ['Mendoan', 2000, 1000, 20],
    ];
    for (const [name, price, unitCost, stock] of sampleProducts) {
      await db.runAsync(
        'INSERT INTO products (name, price, unit_cost, category, stock) VALUES (?, ?, ?, ?, ?)',
        [name, price, unitCost, 'Gorengan', stock]
      );
    }

    const sampleTransactions = [
      { days: 6, hour: 8, items: [{ name: 'Bakwan', price: 1000, unitCost: 500, qty: 10 }, { name: 'Tahu Isi', price: 1500, unitCost: 800, qty: 5 }] },
      { days: 3, hour: 11, items: [{ name: 'Bakwan', price: 1000, unitCost: 500, qty: 25 }, { name: 'Pisang Goreng', price: 1500, unitCost: 800, qty: 10 }] },
      { days: 0, hour: 7, items: [{ name: 'Bakwan', price: 1000, unitCost: 500, qty: 15 }, { name: 'Mendoan', price: 2000, unitCost: 1000, qty: 5 }] },
    ];

    for (const transaction of sampleTransactions) {
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - transaction.days);
      createdAt.setHours(transaction.hour, 0, 0, 0);
      const total = transaction.items.reduce((sum, item) => sum + item.price * item.qty, 0);
      const itemCount = transaction.items.reduce((sum, item) => sum + item.qty, 0);
      const result = await db.runAsync(
        'INSERT INTO transactions (total, item_count, created_at) VALUES (?, ?, ?)',
        [total, itemCount, localDateTimeStr(createdAt)]
      );
      for (const item of transaction.items) {
        await db.runAsync(
          `INSERT INTO transaction_items
            (transaction_id, product_name, price, unit_cost, qty)
           VALUES (?, ?, ?, ?, ?)`,
          [result.lastInsertRowId, item.name, item.price, item.unitCost, item.qty]
        );
      }
    }

    const sampleExpenses: [string, number, string][] = [
      ['Minyak Goreng (2 liter)', 20000, 'Bahan'],
      ['Tepung Terigu (1 kg)', 15000, 'Bahan'],
      ['Gas (1 tabung)', 20000, 'Operasional'],
      ['Cabai (1/4 kg)', 5000, 'Bahan'],
    ];
    for (const [name, amount, category] of sampleExpenses) {
      await db.runAsync(
        'INSERT INTO expenses (name, amount, category, created_at) VALUES (?, ?, ?, ?)',
        [name, amount, category, localDateTimeStr()]
      );
    }
  }
}
