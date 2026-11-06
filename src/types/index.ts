export interface Product {
  id: number;
  name: string;
  price: number;
  unit_cost: number;
  category: string | null;
  stock: number;
  photo_uri: string | null;
  is_active: number;
  created_at: string;
}

export interface Transaction {
  id: number;
  total: number;
  item_count: number;
  note: string | null;
  created_at: string;
}

export interface TransactionItem {
  id: number;
  transaction_id: number;
  product_id: number | null;
  product_name: string;
  price: number;
  unit_cost: number;
  qty: number;
}

export interface Expense {
  id: number;
  name: string;
  amount: number;
  category: string | null;
  note: string | null;
  created_at: string;
}

export interface BusinessProfile {
  id: number;
  business_name: string;
  owner_name: string;
  location: string | null;
  note: string | null;
  photo_uri: string | null;
}
