import dbConnect from './mongodb';
import Order from '@/models/Order';
import VendorActivityLog from '@/models/VendorActivityLog';
import Notification from '@/models/Notification';

export interface UpdateShipmentParams {
  orderId: string;
  vendorFacility?: string;
  deliveryPartner: string;
  waybill: string;
  selfShipmentProvider?: string;
  actorType: 'staff' | 'vendor';
  actorName: string;
  notes?: string;
}

export async function updateOrderShipmentStatus(params: UpdateShipmentParams) {
  await dbConnect();

  const {
    orderId,
    vendorFacility,
    deliveryPartner,
    waybill,
    selfShipmentProvider,
    actorType,
    actorName,
    notes,
  } = params;

  // Rule 2 & 3: Cannot commit shipped state without courier + AWB
  if (!deliveryPartner || !deliveryPartner.trim()) {
    throw new Error('Delivery Partner / Courier is required to mark shipment as shipped.');
  }

  if (!waybill || !waybill.trim()) {
    throw new Error('AWB / Tracking number is required to mark shipment as shipped.');
  }

  const cleanPartner = deliveryPartner.trim();
  const cleanWaybill = waybill.trim();

  // Find target order
  const order = await Order.findOne({
    $or: [{ _id: orderId }, { orderId: orderId }],
  });

  if (!order) {
    throw new Error(`Order ${orderId} not found.`);
  }

  // If actor is vendor, verify ownership/assignment
  if (actorType === 'vendor' && vendorFacility) {
    const isAssigned = (order.shipments || []).some((s: any) =>
      s.vendor && s.vendor.toLowerCase() === vendorFacility.toLowerCase()
    );
    if (!isAssigned) {
      throw new Error(`Unauthorized: Order ${order.orderId} is not assigned to vendor ${vendorFacility}.`);
    }
  }

  // Map high level order status based on delivery partner
  let newStatus = 'SHIPPED';
  if (cleanPartner.toUpperCase() === 'DTDC') {
    newStatus = 'DTDC_SCHEDULED';
  } else if (cleanPartner.toUpperCase() === 'SHADOWFAX') {
    newStatus = 'SHADOWFAX_SCHEDULED';
  } else if (cleanPartner.toUpperCase() === 'SELF') {
    newStatus = 'SELF_SHIPPED';
  }

  // Update shipment record inside order.shipments array
  let updatedShipment = false;
  const targetVendor = vendorFacility || (order.shipments?.[0]?.vendor) || 'Office';

  if (order.shipments && order.shipments.length > 0) {
    for (const shipment of order.shipments) {
      if (!vendorFacility || (shipment.vendor && shipment.vendor.toLowerCase() === vendorFacility.toLowerCase())) {
        shipment.deliveryPartner = cleanPartner;
        shipment.waybill = cleanWaybill;
        if (selfShipmentProvider) {
          shipment.selfShipmentProvider = selfShipmentProvider;
        }
        updatedShipment = true;
      }
    }
  }

  if (!updatedShipment) {
    order.shipments.push({
      vendor: targetVendor,
      deliveryPartner: cleanPartner,
      waybill: cleanWaybill,
      selfShipmentProvider: selfShipmentProvider || '',
      createdAt: new Date(),
    });
  }

  order.status = newStatus;
  order.waybill = cleanWaybill;
  if (cleanPartner.toUpperCase() === 'SELF') {
    order.selfShipped = true;
    order.selfShipmentStatus = 'Order shipped';
    if (notes) {
      order.selfShipmentNotes = notes;
    }
  }

  await order.save();

  // Log Vendor Activity
  await VendorActivityLog.create({
    orderId: order.orderId,
    vendorFacility: targetVendor,
    action: 'ORDER_SHIPPED',
    detail: `Shipped via ${cleanPartner} (AWB: ${cleanWaybill}) by ${actorType} (${actorName})`,
    timestamp: new Date(),
  });

  // Create Notification for the opposite role
  if (actorType === 'vendor') {
    // Notify staff
    await Notification.create({
      recipientType: 'staff',
      recipientId: 'all',
      type: 'order_shipped_by_vendor',
      orderId: order.orderId,
      message: `Vendor ${targetVendor} marked Order #${order.orderId} as shipped via ${cleanPartner} (AWB: ${cleanWaybill}).`,
    });
  } else {
    // Notify vendor
    await Notification.create({
      recipientType: 'vendor',
      recipientId: targetVendor,
      type: 'order_assigned',
      orderId: order.orderId,
      message: `Order #${order.orderId} status updated to Shipped (${cleanPartner}: ${cleanWaybill}) by staff.`,
    });
  }

  return order;
}
