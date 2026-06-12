export type UserRole = 'client' | 'admin';

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  active: number;
  phone?: string | null;
  email_verified?: number;
  phone_verified?: number;
  created_at: string;
}

export interface SessionUser {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  phone?: string | null;
  canOrder?: boolean;
}

export type TableStatus = 'free' | 'occupied' | 'reserved' | 'billing';

export interface Table {
  id: number;
  name: string;
  capacity: number;
  status: TableStatus;
  zone: string;
}

export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  cost: number;
  active: number;
}

export interface Ingredient {
  id: number;
  name: string;
  unit: string;
  min_stock: number;
  current_stock: number;
  unit_cost: number;
  supplier: string;
}

export interface RecipeLine {
  id: number;
  product_id: number;
  ingredient_id: number;
  quantity: number;
  ingredient_name?: string;
  unit?: string;
}

export type OrderStatus = 'open' | 'preparing' | 'served' | 'paid' | 'cancelled';

export type OrderType = 'pos' | 'online';

export type ServiceMode = 'takeaway' | 'dine_in';

export type PaymentMethod = 'cash' | 'online';

export type PaymentStatus = 'pending' | 'paid';

export interface Order {
  id: number;
  table_id: number | null;
  user_id: number | null;
  order_type: OrderType;
  service_mode?: ServiceMode | null;
  payment_method?: PaymentMethod | null;
  payment_status?: PaymentStatus | null;
  mp_preference_id?: string | null;
  status: OrderStatus;
  subtotal: number;
  tax: number;
  total: number;
  created_at: string;
  paid_at: string | null;
  preparing_at?: string | null;
  served_at?: string | null;
  prep_seconds?: number | null;
  table_name?: string;
  user_name?: string;
  user_email?: string;
}

export interface OrderLine {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  line_total: number;
  product_name?: string;
  display_name?: string;
  modifiers_json?: string;
  category?: string;
}

export interface PurchaseTicket {
  id: number;
  supplier: string;
  raw_text: string;
  total: number;
  created_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ForecastPoint {
  date: string;
  predictedSales: number;
  dayOfWeek: string;
  confidence: number;
}

export interface ProductForecast {
  productId: number;
  productName: string;
  predictedUnits: number;
  trend: 'up' | 'down' | 'stable';
}

export interface Recommendation {
  type: 'purchase' | 'stock_alert' | 'profitability' | 'trend' | 'waste' | 'revenue';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action?: string;
}
