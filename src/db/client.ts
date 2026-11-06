import * as SQLite from 'expo-sqlite';
import { SCHEMA_STATEMENTS } from './schema';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDb() {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync('gorenganku.db');
  }
  return dbInstance;
}

export async function initDb() {
  const db = await getDb();
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  for (const statement of SCHEMA_STATEMENTS) {
    await db.execAsync(statement);
  }

  const productColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(products)');
  if (!productColumns.some(column => column.name === 'unit_cost')) {
    await db.execAsync('ALTER TABLE products ADD COLUMN unit_cost REAL NOT NULL DEFAULT 0;');
  }

  const itemColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(transaction_items)');
  if (!itemColumns.some(column => column.name === 'unit_cost')) {
    await db.execAsync('ALTER TABLE transaction_items ADD COLUMN unit_cost REAL NOT NULL DEFAULT 0;');
  }
}
