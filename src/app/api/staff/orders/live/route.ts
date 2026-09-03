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
  const search = searchParams.get('search');

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
    if (dateFrom) {
      query.createdAt.$gte = new Date(dateFrom);
    }
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }

  if (search && search.trim()) {
    const term = search.trim();
    query.$or = [
      { orderId: { $regex: term, $options: 'i' } },
      { zohoInvoiceId: { $regex: term, $options: 'i' } },
      { 'customerDetails.customer_name': { $regex: term, $options: 'i' } },
      { 'customerDetails.phone': { $regex: term, $options: 'i' } },
      { waybill: { $regex: term, $options: 'i' } },
    ];
  }

  const [orders, vendorDocs] = await Promise.all([
    Order.find(query).sort({ createdAt: -1 }).limit(200).lean(),
    Vendor.find().select('facilityName status').lean(),
  ]);

  const vendorStatusMap: Record<string, string> = {};
  vendorDocs.forEach((v: any) => {
    vendorStatusMap[v.facilityName.toLowerCase()] = v.status;
  });

  const formattedOrders = orders.map((order: any) => {
    const mainShipment = order.shipments?.[0] || {};
    const vendorName = mainShipment.vendor || 'Office';
    const vendorAccountStatus = vendorStatusMap[vendorName.toLowerCase()] || 'active';

    return {
      id: order._id,
      orderId: order.orderId,
      zohoInvoiceId: order.zohoInvoiceId,
      customerName: order.customerDetails?.customer_name || 'N/A',
      phone: order.customerDetails?.phone || 'N/A',
      address: `${order.customerDetails?.address || ''}, ${order.customerDetails?.city || ''} (${order.customerDetails?.pincode || ''})`,
      product: order.invoiceItems?.[0]?.name || 'N/A',
      quantity: order.invoiceItems?.[0]?.quantity || 1,
      vendor: vendorName,
      vendorAccountStatus,
      deliveryPartner: mainShipment.deliveryPartner || 'Delhivery',
      waybill: mainShipment.waybill || order.waybill || '',
      status: order.status,
      invoiceTotal: order.invoiceTotal || 0,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  });

  return success({
    orders: formattedOrders,
    timestamp: new Date().toISOString(),
  });
});
