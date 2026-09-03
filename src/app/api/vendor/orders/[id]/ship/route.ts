import { NextRequest } from 'next/server';
import { getVendorFromSession } from '@/lib/vendor-auth';
import { updateOrderShipmentStatus } from '@/lib/shipment-service';
import { withError, fail, success } from '@/lib/api-handler';

export const POST = withError(async (request: NextRequest, context?: any) => {
  const vendor = await getVendorFromSession();
  if (!vendor) {
    return fail('Unauthorized', 401);
  }

  const { id } = await context.params;
  const body = await request.json();
  const { deliveryPartner, waybill, selfShipmentProvider, notes } = body;

  if (!deliveryPartner || !deliveryPartner.trim()) {
    return fail('Courier / Delivery Partner is required.', 400);
  }

  if (!waybill || !waybill.trim()) {
    return fail('AWB / Tracking number is required.', 400);
  }

  const updatedOrder = await updateOrderShipmentStatus({
    orderId: id,
    vendorFacility: vendor.facilityName,
    deliveryPartner,
    waybill,
    selfShipmentProvider,
    actorType: 'vendor',
    actorName: vendor.facilityName,
    notes,
  });

  return success({ order: updatedOrder, message: 'Shipment updated successfully.' });
});
