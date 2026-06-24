import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Order from '@/models/Order';
import { withDb, success, fail } from '@/lib/api-handler';

export const POST = withDb(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;

  const order = await Order.findOne({
    $or: [
      { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
      { zohoInvoiceId: id },
      { orderId: id },
    ],
  }).lean();

  if (!order) {
    return fail('Order not found', 404);
  }

  const orderAny = order as Record<string, unknown>;
  const items = orderAny.invoiceItems as Array<Record<string, unknown>> | undefined;

  if (!items || items.length === 0) {
    return fail('Order has no invoice items', 400);
  }

  const breakdown = items.map((item) => {
    const itemTotal = typeof item.item_total === 'number' ? item.item_total : 0;
    const taxAmount = typeof item.tax_amount === 'number' ? item.tax_amount : 0;
    return {
      name: item.name,
      item_total: itemTotal,
      tax_amount: taxAmount,
      line_total: itemTotal + taxAmount,
    };
  });

  const invoiceTotal = Math.round(
    breakdown.reduce((sum, b) => sum + b.line_total, 0) * 100
  ) / 100;

  console.log(`[recalculate-total] ${orderAny.orderId} — breakdown:`, breakdown);
  console.log(`[recalculate-total] Computed invoiceTotal: ${invoiceTotal}`);

  await Order.updateOne(
    { _id: (order as Record<string, unknown>)._id },
    { $set: { invoiceTotal } }
  );

  return success({
    orderId: orderAny.orderId,
    invoiceTotal,
    breakdown,
  });
});
