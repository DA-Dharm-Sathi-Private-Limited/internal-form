import { NextRequest, NextResponse } from 'next/server';
import Order from '@/models/Order';
import { withDb, success } from '@/lib/api-handler';

export const dynamic = 'force-dynamic';

export const GET = withDb(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const fromDateStr = searchParams.get('fromDate');
  const toDateStr = searchParams.get('toDate');
  const limitParam = searchParams.get('limit');
  const warehouseParam = searchParams.get('warehouse');

  const query: any = {
    $or: [
      { 'shipments.waybill': { $exists: true, $ne: '' } },
      { 'waybill': { $exists: true, $ne: '' } },
      { selfShipped: true },
      { status: 'SELF_SHIPPED' },
      { 'shipments.vendor': 'SELF' }
    ]
  };

  if (warehouseParam && warehouseParam !== 'all') {
    query['shipments.warehouse'] = warehouseParam;
  }

  if (fromDateStr || toDateStr) {
    query.createdAt = {};
    if (fromDateStr) {
      const fromDate = new Date(fromDateStr);
      fromDate.setHours(0, 0, 0, 0);
      query.createdAt.$gte = fromDate;
    }
    if (toDateStr) {
      const toDate = new Date(toDateStr);
      toDate.setHours(23, 59, 59, 999);
      query.createdAt.$lte = toDate;
    }
  }

  let limit = 10;
  if (limitParam === 'all') {
    limit = 0;
  } else if (limitParam) {
    limit = parseInt(limitParam, 10);
  } else if (fromDateStr || toDateStr) {
    limit = 50;
  }

  let orderQuery = Order.find(query).sort({ createdAt: -1 });
  if (limit > 0) {
    orderQuery = orderQuery.limit(limit);
  }
  const ordersWithWaybills = await orderQuery.lean();

  const mappedOrders = ordersWithWaybills.map((order: any) => {
    const waybill = order.waybill || (order.shipments && order.shipments.length > 0 ? order.shipments[0].waybill : '');
    const realOrderId = order.orderId || order._id.toString();

    const isSelfShipped = order.selfShipped === true ||
      order.status === 'SELF_SHIPPED' ||
      (order.shipments && order.shipments.some((s: any) => s.vendor === 'SELF'));

    return {
      _id: order._id,
      waybill: waybill,
      orderId: realOrderId,
      customerName: order.customerDetails?.customer_name || 'Unknown',
      status: order.status || 'SHIPPED',
      createdAt: order.createdAt,
      isSelfShipped,
      selfShipmentStatus: order.selfShipmentStatus || 'Order Created',
      selfShipmentNotes: order.selfShipmentNotes || '',
      invoiceItems: order.invoiceItems || [],
    };
  }).filter((o: any) => o.waybill || o.isSelfShipped);

  return success({ waybills: mappedOrders });
});
