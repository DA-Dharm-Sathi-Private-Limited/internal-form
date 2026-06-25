import { NextRequest } from 'next/server';
import Order from '@/models/Order';
import { withDb, success } from '@/lib/api-handler';

export const POST = withDb(async (request: NextRequest) => {
  const body = await request.json();
  const { awb_number, order_id, status, event, current_location, rider_name, rider_contact } = body;

  if (!awb_number && !order_id) {
    return success({ received: true });
  }

  const updateFields: Record<string, unknown> = {};

  if (status) {
    const mappedStatus = mapShadowfaxStatus(status);
    if (mappedStatus) {
      updateFields.status = mappedStatus;
    }
  }

  if (event === 'assigned_for_pickup' && rider_name) {
    updateFields['selfShipmentNotes'] = `Rider: ${rider_name} (${rider_contact || 'N/A'}) - ${current_location || ''}`;
  }

  const query: Record<string, unknown> = {};
  if (order_id) {
    query['orderId'] = order_id;
    query['shipments.deliveryPartner'] = 'Shadowfax';
  } else if (awb_number) {
    query['shipments.waybill'] = awb_number;
  }

  if (Object.keys(updateFields).length > 0 && Object.keys(query).length > 0) {
    await Order.findOneAndUpdate(query, { $set: updateFields });
  }

  return success({ received: true });
});

function mapShadowfaxStatus(sfStatus: string): string | null {
  const lower = sfStatus.toLowerCase();
  if (lower === 'new') return 'PENDING_SHIPPING';
  if (lower === 'assigned_for_delivery') return 'SHIPPED';
  if (lower === 'ofd' || lower === 'out_for_delivery') return 'SHIPPED';
  if (lower === 'delivered') return 'SHIPPED';
  if (lower === 'rto') return 'RTO';
  if (lower === 'cancelled') return 'PENDING_SHIPPING';
  return null;
}
