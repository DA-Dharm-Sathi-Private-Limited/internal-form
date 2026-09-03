import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/Order';
import Vendor from '@/models/Vendor';
import { withError, success } from '@/lib/api-handler';

export const GET = withError(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const vendorParam = searchParams.get('vendor');
  const partnerParam = searchParams.get('deliveryPartner');
  const statusParam = searchParams.get('status');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');

  await dbConnect();

  const query: any = {};

  if (vendorParam && vendorParam !== 'ALL') {
    query['shipments.vendor'] = { $regex: new RegExp(`^${vendorParam.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') };
  }

  if (partnerParam && partnerParam !== 'ALL') {
    query['shipments.deliveryPartner'] = { $regex: new RegExp(`^${partnerParam.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') };
  }

  if (statusParam && statusParam !== 'ALL') {
    query.status = statusParam;
  }

  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }

  const [orders, vendorDocs] = await Promise.all([
    Order.find(query).lean(),
    Vendor.find().select('facilityName status').lean(),
  ]);

  let totalAssigned = orders.length;
  let totalShipped = 0;
  let totalPending = 0;
  let totalDelayed = 0;
  let totalDispatchMs = 0;
  let shippedWithTimeCount = 0;
  let onTimeCount = 0;

  const partnerBreakdown: Record<string, { total: number; shipped: number; pending: number }> = {};
  const vendorBreakdown: Record<string, { assigned: number; shipped: number; pending: number; delayed: number; avgHours: number; onTimeRate: number; totalMs: number }> = {};

  // Initialize vendor breakdown
  vendorDocs.forEach((v: any) => {
    vendorBreakdown[v.facilityName] = {
      assigned: 0,
      shipped: 0,
      pending: 0,
      delayed: 0,
      avgHours: 0,
      onTimeRate: 100,
      totalMs: 0,
    };
  });

  const now = new Date();

  for (const order of orders) {
    const mainShipment = order.shipments?.[0] || {};
    const vendorName = mainShipment.vendor || 'Office';
    const partnerName = mainShipment.deliveryPartner || 'Delhivery';

    const isShipped = ['SHIPPED', 'DTDC_SCHEDULED', 'SHADOWFAX_SCHEDULED', 'SELF_SHIPPED'].includes(order.status);
    const createdTime = new Date(order.createdAt).getTime();

    if (!partnerBreakdown[partnerName]) {
      partnerBreakdown[partnerName] = { total: 0, shipped: 0, pending: 0 };
    }
    partnerBreakdown[partnerName].total++;

    if (!vendorBreakdown[vendorName]) {
      vendorBreakdown[vendorName] = {
        assigned: 0,
        shipped: 0,
        pending: 0,
        delayed: 0,
        avgHours: 0,
        onTimeRate: 100,
        totalMs: 0,
      };
    }
    vendorBreakdown[vendorName].assigned++;

    if (isShipped) {
      totalShipped++;
      partnerBreakdown[partnerName].shipped++;
      vendorBreakdown[vendorName].shipped++;

      const updatedTime = new Date(order.updatedAt || order.createdAt).getTime();
      const diffMs = Math.max(0, updatedTime - createdTime);
      totalDispatchMs += diffMs;
      shippedWithTimeCount++;
      vendorBreakdown[vendorName].totalMs += diffMs;

      if (diffMs <= 48 * 3600 * 1000) {
        onTimeCount++;
      }
    } else {
      totalPending++;
      partnerBreakdown[partnerName].pending++;
      vendorBreakdown[vendorName].pending++;

      const pendingMs = now.getTime() - createdTime;
      if (pendingMs > 48 * 3600 * 1000) {
        totalDelayed++;
        vendorBreakdown[vendorName].delayed++;
      }
    }
  }

  // Calculate vendor averages
  Object.keys(vendorBreakdown).forEach((vName) => {
    const vData = vendorBreakdown[vName];
    if (vData.shipped > 0) {
      vData.avgHours = Math.round((vData.totalMs / vData.shipped / (3600 * 1000)) * 10) / 10;
    }
  });

  const avgDispatchHours = shippedWithTimeCount > 0
    ? Math.round((totalDispatchMs / shippedWithTimeCount / (3600 * 1000)) * 10) / 10
    : 0;

  const overallOnTimeRate = totalShipped > 0 ? Math.round((onTimeCount / totalShipped) * 100) : 100;

  return success({
    summary: {
      totalAssigned,
      totalShipped,
      totalPending,
      totalDelayed,
      avgDispatchHours,
      overallOnTimeRate,
    },
    partnerBreakdown,
    vendorBreakdown,
  });
});
