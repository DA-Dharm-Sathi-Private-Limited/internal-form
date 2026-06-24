import { NextRequest } from 'next/server';
import Order from '@/models/Order';
import { SALESPERSONS } from '@/types/invoice';
import { getInvoice } from '@/lib/zoho';
import { withDb, success } from '@/lib/api-handler';
import { mapWithConcurrency } from '@/lib/concurrency';

export const GET = withDb(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');

  const query: any = { status: { $ne: 'RTO' } };
  if (startDateParam || endDateParam) {
    query.createdAt = {};
    if (startDateParam) {
      query.createdAt.$gte = new Date(startDateParam);
    }
    if (endDateParam) {
      const endDate = new Date(endDateParam);
      endDate.setHours(23, 59, 59, 999);
      query.createdAt.$lte = endDate;
    }
  }

  const orders = await Order.find(query).sort({ createdAt: -1 }).lean();

  const revenueMap: Record<string, { totalRevenue: number; orders: typeof orders }> = {};

  for (const sp of SALESPERSONS) {
    revenueMap[sp] = { totalRevenue: 0, orders: [] };
  }

  const ordersWithTotals = await mapWithConcurrency(
    orders,
    5,
    async (order) => {
      const orderAny = order as Record<string, unknown>;
      const invoiceTotal = typeof orderAny.invoiceTotal === 'number' ? orderAny.invoiceTotal : null;
      if (invoiceTotal != null) return { order, total: invoiceTotal };

      const zohoInvoiceId = typeof orderAny.zohoInvoiceId === 'string' ? orderAny.zohoInvoiceId : '';
      if (zohoInvoiceId) {
        try {
          const inv = await getInvoice(zohoInvoiceId);
          const zohoTotal = Number(inv.data?.invoice?.total);
          if (inv.status === 200 && Number.isFinite(zohoTotal)) {
            Order.updateOne({ zohoInvoiceId }, { $set: { invoiceTotal: zohoTotal } }).catch(() => null);
            return { order, total: zohoTotal };
          }
        } catch {
          // ignore Zoho fetch failures and fall back to line totals
        }
      }

      const items = orderAny.invoiceItems as Array<{ item_total?: number; tax_amount?: number }> | undefined;
      let sum = 0;
      if (items && Array.isArray(items)) {
        for (const item of items) {
          sum += (item.item_total || 0) + (item.tax_amount || 0);
        }
      }
      return { order, total: sum };
    }
  );

  for (const { order, total } of ordersWithTotals) {
    const name = (order as Record<string, unknown>).salespersonName as string;
    if (!name) continue;

    if (!revenueMap[name]) {
      revenueMap[name] = { totalRevenue: 0, orders: [] };
    }

    revenueMap[name].totalRevenue += total;
    revenueMap[name].orders.push(order);
  }

  const result = Object.entries(revenueMap)
    .map(([salespersonName, data]) => ({
      salespersonName,
      totalRevenue: Math.round(data.totalRevenue * 100) / 100,
      orderCount: data.orders.length,
      orders: data.orders,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

  return success({ data: result });
});
