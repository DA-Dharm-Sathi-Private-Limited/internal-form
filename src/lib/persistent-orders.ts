import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'orders_store.json');

function ensureStoreExists() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(STORE_PATH, JSON.stringify([], null, 2), 'utf-8');
  }
}

export function getPersistentOrders(): any[] {
  try {
    ensureStoreExists();
    const content = fs.readFileSync(STORE_PATH, 'utf-8');
    return JSON.parse(content || '[]');
  } catch (err) {
    console.error('Error reading persistent orders:', err);
    return [];
  }
}

export function savePersistentOrder(order: any): any {
  try {
    ensureStoreExists();
    const orders = getPersistentOrders();
    const newOrder = {
      _id: `ord_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      createdAt: order.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...order
    };
    orders.unshift(newOrder);
    fs.writeFileSync(STORE_PATH, JSON.stringify(orders, null, 2), 'utf-8');
    return newOrder;
  } catch (err) {
    console.error('Error saving persistent order:', err);
    return order;
  }
}
