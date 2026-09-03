import { NextRequest } from 'next/server';
import { updateOrderShipmentStatus } from '@/lib/shipment-service';
import { withError, fail, success } from '@/lib/api-handler';

export const POST = withError(async (request: NextRequest, context?: any) => {
  const { id } = await context.params;
  const body = await request.json();
  const { deliveryPartner, waybill, vendorFacility, selfShipmentProvider, notes } = body;

  if (!deliveryPartner || !deliveryPartner.trim()) {
    return fail('Courier / Delivery Partner is required.', 400);
  }

  if (!waybill || !waybill.trim()) {
    return fail('AWB / Tracking number is required.', 400);
  }

  const updatedOrder = await updateOrderShipmentStatus({
    orderId: id,
    vendorFacility,
    deliveryPartner,
    waybill,
    selfShipmentProvider,
    actorType: 'staff',
    actorName: 'Staff Member',
    notes,
  });

  return success({ order: updatedOrder, message: 'Order marked as shipped by staff.' });
});
