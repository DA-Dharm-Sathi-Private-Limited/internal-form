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
    const istNow = new Date(now.getTime() + (330 * 60 * 1000));
    
    // IST Time Boundaries
    const todayStart = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate(), 0, 0, 0) - (330 * 60 * 1000));
    const todayEnd = new Date(todayStart.getTime() + (24 * 3600 * 1000) - 1);

    const weekStart = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - todayStart.getDay());

    const monthStart = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), 1, 0, 0, 0) - (330 * 60 * 1000));
    const yearStart = new Date(Date.UTC(istNow.getUTCFullYear(), 0, 1, 0, 0, 0) - (330 * 60 * 1000));

    // Global Distinction Summary
    let totalDaily = 0;
    let totalWeekly = 0;
    let totalMonthly = 0;
    let totalYearly = 0;
    let totalLifetime = 0;

    allOrders.forEach(o => {
      const rev = Number(o.invoiceTotal) || 0;
      const rawDate = o.createdAt || o.invoiceDate || o.date || o.created_time || now;
      const oDate = new Date(rawDate);

      totalLifetime += rev;
      if (oDate >= yearStart) totalYearly += rev;
      if (oDate >= monthStart) totalMonthly += rev;
      if (oDate >= weekStart) totalWeekly += rev;
      if (oDate >= todayStart && oDate <= todayEnd) totalDaily += rev;
    });

    // Date filtering logic for the selected query range
    let filteredOrders = allOrders;

    if (startDateParam) {
      const start = new Date(startDateParam);
      filteredOrders = filteredOrders.filter(o => {
        const rawDate = o.createdAt || o.invoiceDate || o.date || o.created_time || 0;
        const oDate = new Date(rawDate);
        return oDate >= start;
      });
    }

    if (endDateParam) {
      const end = new Date(endDateParam);
      filteredOrders = filteredOrders.filter(o => {
        const rawDate = o.createdAt || o.invoiceDate || o.date || o.created_time || 0;
        const oDate = new Date(rawDate);
        return oDate <= end;
      });
    }

    const revenueMap: Record<string, {
      selectedRevenue: number;
      dailyRevenue: number;
      weeklyRevenue: number;
      monthlyRevenue: number;
      yearlyRevenue: number;
      lifetimeRevenue: number;
      firstOrderDate: Date | null;
      orders: any[];
    }> = {};

    for (const sp of SALESPERSONS) {
      revenueMap[sp] = {
        selectedRevenue: 0,
        dailyRevenue: 0,
        weeklyRevenue: 0,
        monthlyRevenue: 0,
        yearlyRevenue: 0,
        lifetimeRevenue: 0,
        firstOrderDate: null,
        orders: [],
      };
    }

    // First pass: compute all-time distinctions for badges & join date
    allOrders.forEach(order => {
      const name = (order.salespersonName || '').trim();
      if (!name || name === 'UNASSIGNED') return;

      const total = typeof order.invoiceTotal === 'number' ? order.invoiceTotal : 0;
      const rawDate = order.createdAt || order.invoiceDate || order.date || order.created_time || now;
      const oDate = new Date(rawDate);

      if (!revenueMap[name]) {
        revenueMap[name] = {
          selectedRevenue: 0,
          dailyRevenue: 0,
          weeklyRevenue: 0,
          monthlyRevenue: 0,
          yearlyRevenue: 0,
          lifetimeRevenue: 0,
          firstOrderDate: null,
          orders: [],
        };
      }

      revenueMap[name].lifetimeRevenue += total;
      if (oDate >= yearStart) revenueMap[name].yearlyRevenue += total;
      if (oDate >= monthStart) revenueMap[name].monthlyRevenue += total;
      if (oDate >= weekStart) revenueMap[name].weeklyRevenue += total;
      if (oDate >= todayStart && oDate <= todayEnd) revenueMap[name].dailyRevenue += total;

      if (!revenueMap[name].firstOrderDate || oDate < revenueMap[name].firstOrderDate!) {
        revenueMap[name].firstOrderDate = oDate;
      }
    });

    // Second pass: compute selected range revenue & orders
    filteredOrders.forEach(order => {
      const name = (order.salespersonName || '').trim();
      if (!name || name === 'UNASSIGNED') return;

      const total = typeof order.invoiceTotal === 'number' ? order.invoiceTotal : 0;

      if (revenueMap[name]) {
        revenueMap[name].selectedRevenue += total;
        revenueMap[name].orders.push(order);
      }
    });

    const isFiltered = Boolean(startDateParam || endDateParam);

    const result = Object.entries(revenueMap)
      .map(([salespersonName, data]) => ({
        salespersonName,
        totalRevenue: Math.round(data.selectedRevenue), // Displays revenue FOR THE SELECTED TIMEFRAME!
        dailyRevenue: Math.round(data.dailyRevenue),
        weeklyRevenue: Math.round(data.weeklyRevenue),
        monthlyRevenue: Math.round(data.monthlyRevenue),
        yearlyRevenue: Math.round(data.yearlyRevenue),
        lifetimeRevenue: Math.round(data.lifetimeRevenue),
        firstOrderDate: data.firstOrderDate ? data.firstOrderDate.toISOString() : null,
        orderCount: data.orders.length,
        orders: data.orders,
      }))
      .filter(sp => isFiltered ? sp.orderCount > 0 : sp.lifetimeRevenue > 0)
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    return NextResponse.json({
      success: true,
      data: result,
      summary: {
        totalDaily: Math.round(totalDaily),
        totalWeekly: Math.round(totalWeekly),
        totalMonthly: Math.round(totalMonthly),
        totalYearly: Math.round(totalYearly),
        totalLifetime: Math.round(totalLifetime),
        totalOrderCount: filteredOrders.length,
      }
    });
  } catch (err) {
    console.error('Revenue API Error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch revenue' }, { status: 500 });
  }
}
