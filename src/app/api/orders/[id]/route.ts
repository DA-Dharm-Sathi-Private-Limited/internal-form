import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Order from '@/models/Order';
import { updateInvoice, voidInvoice } from '@/lib/zoho';
import { InvoiceItem } from '@/types/invoice';
import { withDb, success, fail } from '@/lib/api-handler';

export const GET = withDb(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  const order = await Order.findOne({
    $or: [
      { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
      { zohoInvoiceId: id },
      { orderId: id }
    ]
  });

  if (!order) {
    return fail('Order not found', 404);
  }

  return success({ order });
});

export const PATCH = withDb(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  const data = await request.json();

  const { shipmentsAppend, ...rest } = data ?? {};

  const existingOrder = await Order.findOne({
    $or: [
      { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
      { zohoInvoiceId: id },
      { orderId: id }
    ]
  });

  if (!existingOrder) {
    return fail('Order not found', 404);
  }

  const safeSetParams: Record<string, unknown> = {};

  const allowedFields = ['status', 'selfShipped', 'waybill', 'waybills', 'shippingCost', 'selfShipmentStatus', 'selfShipmentNotes'];
  for (const field of allowedFields) {
    if (rest[field] !== undefined) {
      safeSetParams[field] = rest[field];
    }
  }

  if (rest.invoiceItems && Array.isArray(rest.invoiceItems) && Array.isArray(existingOrder.invoiceItems)) {
    const protectedItems = existingOrder.invoiceItems.map((dbItem: any, idx: number) => {
      const incomingItem = rest.invoiceItems[idx];
      if (incomingItem && typeof incomingItem.cost_price === 'number') {
        const base = dbItem.toObject ? dbItem.toObject() : dbItem;
        return { ...base, cost_price: incomingItem.cost_price };
      }
      return dbItem;
    });
    safeSetParams.invoiceItems = protectedItems;
  }

  const update: Record<string, unknown> = {};
  if (Object.keys(safeSetParams).length > 0) {
    update.$set = safeSetParams;
  }

  if (Array.isArray(shipmentsAppend) && shipmentsAppend.length > 0) {
    update.$push = {
      shipments: { $each: shipmentsAppend },
    };
  }

  const order = await Order.findOneAndUpdate(
    { _id: existingOrder._id },
    Object.keys(update).length > 0 ? update : { $set: {} },
    { new: true }
  );

  if (!order) {
    return fail('Order not found', 404);
  }

  const zohoUpdated = false;
  return success({ order, zohoUpdated });
});

export const DELETE = withDb(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;

  const order = await Order.findOne({
    $or: [
      { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
      { zohoInvoiceId: id },
      { orderId: id }
    ]
  });

  if (!order) {
    return fail('Order not found', 404);
  }

  let zohoVoided = false;
  if (order.zohoInvoiceId) {
    try {
      const result = await voidInvoice(order.zohoInvoiceId);
      zohoVoided = result.status === 200;
      if (!zohoVoided) {
        console.warn(`Zoho invoice voiding returned ${result.status}:`, result.data?.message);
      }
    } catch (err) {
      console.warn('Failed to void invoice in Zoho:', err);
    }
  }

  await Order.deleteOne({ _id: order._id });

  return success({
    zohoVoided,
    message: zohoVoided
      ? 'Order deleted and Zoho invoice voided successfully'
      : 'Order deleted from database. Zoho invoice may need manual voiding.',
  });
});
