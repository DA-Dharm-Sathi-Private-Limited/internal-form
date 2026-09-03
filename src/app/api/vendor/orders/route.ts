import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/Order';
import { getVendorFromSession } from '@/lib/vendor-auth';
import { withError, fail, success } from '@/lib/api-handler';

export const GET = withError(async (request: NextRequest) => {
  const vendor = await getVendorFromSession();
  if (!vendor) {
    return fail('Unauthorized', 401);
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');

  await dbConnect();

  // Query scoped strictly to orders assigned to this vendor facility
  const query: any = {
    'shipments.vendor': { $regex: new RegExp(`^${vendor.facilityName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
  };

  if (status && status !== 'ALL') {
    query.status = status;
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

  const orders = await Order.find(query).sort({ createdAt: -1 }).lean();

  // Strip all financial fields before returning to vendor
  const sanitizedOrders = orders.map((order: any) => {
    const {
      invoiceTotal,
      discount,
      discountType,
      isDiscountBeforeTax,
      shippingCost,
      ...safeOrder
    } = order;

    if (safeOrder.invoiceItems) {
      safeOrder.invoiceItems = safeOrder.invoiceItems.map((item: any) => ({
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        hsn_or_sac: item.hsn_or_sac,
        carat_size: item.carat_size,
      }));
    }

    if (safeOrder.shipments) {
      safeOrder.shipments = safeOrder.shipments
        .filter((s: any) => s.vendor && s.vendor.toLowerCase() === vendor.facilityName.toLowerCase())
        .map((s: any) => ({
          vendor: s.vendor,
          deliveryPartner: s.deliveryPartner,
          waybill: s.waybill,
          selfShipmentProvider: s.selfShipmentProvider,
          warehouse: s.warehouse,
          paymentMode: s.paymentMode,
          items: s.items,
          createdAt: s.createdAt,
        }));
    }

    return safeOrder;
  });

  return success({ orders: sanitizedOrders });
});
