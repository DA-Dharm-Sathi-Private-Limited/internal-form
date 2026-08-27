import { NextRequest, NextResponse } from 'next/server';
import Order from '@/models/Order';
import connectDB from '@/lib/mongodb';
import { getPersistentOrders } from '@/lib/persistent-orders';
import { SALESPERSONS } from '@/types/invoice';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDateParam = searchParams.get('startDate') || '';
    const endDateParam = searchParams.get('endDate') || '';

    let dbOrders: any[] = [];
    try {
      await connectDB();
      dbOrders = await Order.find({}).sort({ createdAt: -1 }).lean();
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

    const allOrders = Array.from(orderMap.values());

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - todayStart.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    // Global Distinction Summary
    let totalWeekly = 0;
    let totalMonthly = 0;
    let totalYearly = 0;
    let totalLifetime = 0;
    let totalOrderCount = 0;

    allOrders.forEach(o => {
      const rev = Number(o.invoiceTotal) || 0;
      const oDate = new Date(o.createdAt || o.invoiceDate || now);

      totalLifetime += rev;
      totalOrderCount += 1;
      if (oDate >= yearStart) totalYearly += rev;
      if (oDate >= monthStart) totalMonthly += rev;
      if (oDate >= weekStart) totalWeekly += rev;
    });

    // Date filtering logic if custom parameters are provided
    let filteredOrders = allOrders;

    if (startDateParam) {
      const start = new Date(startDateParam);
      start.setHours(0, 0, 0, 0);
      filteredOrders = filteredOrders.filter(o => {
        const oDate = new Date(o.createdAt || o.invoiceDate || 0);
        return oDate >= start;
      });
    }

    if (endDateParam) {
      const end = new Date(endDateParam);
      end.setHours(23, 59, 59, 999);
      filteredOrders = filteredOrders.filter(o => {
        const oDate = new Date(o.createdAt || o.invoiceDate || 0);
        return oDate <= end;
      });
    }

    const revenueMap: Record<string, {
      totalRevenue: number;
      weeklyRevenue: number;
      monthlyRevenue: number;
      yearlyRevenue: number;
      lifetimeRevenue: number;
      firstOrderDate: Date | null;
      orders: any[];
    }> = {};

    for (const sp of SALESPERSONS) {
      revenueMap[sp] = {
        totalRevenue: 0,
        weeklyRevenue: 0,
        monthlyRevenue: 0,
        yearlyRevenue: 0,
        lifetimeRevenue: 0,
        firstOrderDate: null,
        orders: [],
      };
    }

    filteredOrders.forEach(order => {
      const name = (order.salespersonName || '').trim();
      if (!name || name === 'UNASSIGNED') return;

      const total = typeof order.invoiceTotal === 'number' ? order.invoiceTotal : 0;
      const oDate = new Date(order.createdAt || order.invoiceDate || now);

      if (!revenueMap[name]) {
        revenueMap[name] = {
          totalRevenue: 0,
          weeklyRevenue: 0,
          monthlyRevenue: 0,
          yearlyRevenue: 0,
          lifetimeRevenue: 0,
          firstOrderDate: null,
          orders: [],
        };
      }

      revenueMap[name].totalRevenue += total;
      revenueMap[name].lifetimeRevenue += total;
      if (oDate >= yearStart) revenueMap[name].yearlyRevenue += total;
      if (oDate >= monthStart) revenueMap[name].monthlyRevenue += total;
      if (oDate >= weekStart) revenueMap[name].weeklyRevenue += total;

      if (!revenueMap[name].firstOrderDate || oDate < revenueMap[name].firstOrderDate!) {
        revenueMap[name].firstOrderDate = oDate;
      }

      revenueMap[name].orders.push(order);
    });

    const result = Object.entries(revenueMap)
      .map(([salespersonName, data]) => ({
        salespersonName,
        totalRevenue: Math.round(data.totalRevenue),
        weeklyRevenue: Math.round(data.weeklyRevenue),
        monthlyRevenue: Math.round(data.monthlyRevenue),
        yearlyRevenue: Math.round(data.yearlyRevenue),
        lifetimeRevenue: Math.round(data.lifetimeRevenue),
        firstOrderDate: data.firstOrderDate ? data.firstOrderDate.toISOString() : null,
        orderCount: data.orders.length,
        orders: data.orders,
      }))
      .filter(sp => sp.orderCount > 0 || sp.totalRevenue > 0)
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    return NextResponse.json({
      success: true,
      data: result,
      summary: {
        totalWeekly: Math.round(totalWeekly),
        totalMonthly: Math.round(totalMonthly),
        totalYearly: Math.round(totalYearly),
        totalLifetime: Math.round(totalLifetime),
        totalOrderCount,
      }
    });
  } catch (err) {
    console.error('Revenue API Error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch revenue' }, { status: 500 });
  }
}
