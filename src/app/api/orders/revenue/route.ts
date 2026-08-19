import { NextRequest, NextResponse } from 'next/server';
import Order from '@/models/Order';
import connectDB from '@/lib/mongodb';
import { getPersistentOrders } from '@/lib/persistent-orders';
import { SALESPERSONS } from '@/types/invoice';

export async function GET(request: NextRequest) {
  try {
    let dbOrders: any[] = [];
    try {
      await connectDB();
      dbOrders = await Order.find({ status: { $ne: 'RTO' } }).sort({ createdAt: -1 }).lean();
    } catch {
      // Offline fallback
    }

    const localOrders = getPersistentOrders();
    const orderMap = new Map<string, any>();
    [...dbOrders, ...localOrders].forEach(o => {
      const key = o.orderId || o.zohoInvoiceId || String(o._id);
      if (!orderMap.has(key)) {
        orderMap.set(key, o);
      }
    });

    const orders = Array.from(orderMap.values());

    const revenueMap: Record<string, { totalRevenue: number; orders: any[] }> = {};
    for (const sp of SALESPERSONS) {
      revenueMap[sp] = { totalRevenue: 0, orders: [] };
    }

    orders.forEach(order => {
      const name = order.salespersonName;
      if (!name) return;

      const total = typeof order.invoiceTotal === 'number' ? order.invoiceTotal : 0;
      if (!revenueMap[name]) {
        revenueMap[name] = { totalRevenue: 0, orders: [] };
      }
      revenueMap[name].totalRevenue += total;
      revenueMap[name].orders.push(order);
    });

    const result = Object.entries(revenueMap)
      .map(([salespersonName, data]) => ({
        salespersonName,
        totalRevenue: Math.round(data.totalRevenue * 100) / 100,
        orderCount: data.orders.length,
        orders: data.orders,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error('Revenue API Error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch revenue' }, { status: 500 });
  }
}
