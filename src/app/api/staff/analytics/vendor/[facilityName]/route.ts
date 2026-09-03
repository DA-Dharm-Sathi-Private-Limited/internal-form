import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/Order';
import { withError, success } from '@/lib/api-handler';

export const GET = withError(async (request: NextRequest, context?: any) => {
  const { facilityName } = await context.params;
  const decodedFacility = decodeURIComponent(facilityName);
  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');

  await dbConnect();

  const query: any = {
    'shipments.vendor': { $regex: new RegExp(`^${decodedFacility.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
  };

  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }

  const orders = await Order.find(query).lean();

  let assigned = orders.length;
  let shipped = 0;
  let pending = 0;
  let delayed = 0; // >48h pending
  let totalDispatchTimeMs = 0;
  let shippedWithTimeCount = 0;
  let onTimeCount = 0;

  const now = new Date();

  for (const order of orders) {
    const isShipped = ['SHIPPED', 'DTDC_SCHEDULED', 'SHADOWFAX_SCHEDULED', 'SELF_SHIPPED'].includes(order.status);
    const createdTime = new Date(order.createdAt).getTime();

    if (isShipped) {
      shipped++;
      const updatedTime = new Date(order.updatedAt || order.createdAt).getTime();
      const diffMs = Math.max(0, updatedTime - createdTime);
      totalDispatchTimeMs += diffMs;
      shippedWithTimeCount++;

      // On-time if dispatched within 48h (172,800,000 ms)
      if (diffMs <= 48 * 3600 * 1000) {
        onTimeCount++;
      }
    } else {
      pending++;
      const pendingMs = now.getTime() - createdTime;
      if (pendingMs > 48 * 3600 * 1000) {
        delayed++;
      }
    }
  }

  const avgDispatchHours = shippedWithTimeCount > 0
    ? Math.round((totalDispatchTimeMs / shippedWithTimeCount / (3600 * 1000)) * 10) / 10
    : 0;

  const onTimeRate = shipped > 0 ? Math.round((onTimeCount / shipped) * 100) : 100;

  return success({
    analytics: {
      facilityName: decodedFacility,
      assigned,
      shipped,
      pending,
      delayed,
      avgDispatchHours,
      onTimeRate,
    },
  });
});
