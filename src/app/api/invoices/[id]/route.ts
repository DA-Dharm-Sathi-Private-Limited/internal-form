import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import Order from '@/models/Order';
import { withDb, success, fail } from '@/lib/api-handler';

/**
 * GET /api/invoices/[id]
 * Returns invoice and discount metadata for the given order ID or Zoho Invoice ID.
 */
export const GET = withDb(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;

  const order = await Order.findOne({
    $or: [
      { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
      { zohoInvoiceId: id },
      { orderId: id }
    ]
  }).lean() as Record<string, any> | null;

  if (!order) return fail('Order not found', 404);

  return success({
    order,
    discount: Number(order.discount) || 0,
    discount_type: order.discountType || 'entity_level',
    is_discount_before_tax: order.isDiscountBeforeTax ?? false,
  });
});

/**
 * PUT /api/invoices/[id]
 * Updates invoice items, prices, taxes, discounts, and recalculates total in MongoDB directly.
 */
export const PUT = withDb(async (
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

  const body = await request.json();
  const rawItems = body.invoice_items || body.invoiceItems;

  if (!rawItems || !Array.isArray(rawItems) || rawItems.length === 0) {
    return fail('At least one invoice item is required', 400);
  }

  const discount = body.discount !== undefined ? Number(body.discount) : (order.discount || 0);
  const discountType = body.discount_type || order.discountType || 'entity_level';
  const isDiscountBeforeTax = body.is_discount_before_tax !== undefined ? Boolean(body.is_discount_before_tax) : (order.isDiscountBeforeTax ?? false);

  let grossSum = 0;
  const updatedItemsForDb = rawItems.map((frontendItem: any) => {
    const qty = Number(frontendItem.quantity) || 1;
    const finalPrice = typeof frontendItem.final_price === 'number' && frontendItem.final_price > 0
      ? frontendItem.final_price
      : Number(frontendItem.price || frontendItem.rate || 0);
    
    const lineTotal = finalPrice * qty;
    grossSum += lineTotal;

    return {
      item_id: frontendItem.item_id || frontendItem.zoho_item_id || '',
      name: String(frontendItem.name || '').trim(),
      description: frontendItem.description ? String(frontendItem.description) : '',
      quantity: qty,
      rate: Number(frontendItem.price || frontendItem.rate || 0),
      item_total: Number(frontendItem.item_total) || (frontendItem.price ? frontendItem.price * qty : lineTotal),
      tax_id: frontendItem.tax_id || 'NO_TAX',
      tax_percentage: Number(frontendItem.tax_percentage) || 0,
      tax_amount: Number(frontendItem.tax_amount) || 0,
      final_price: finalPrice,
      hsn_or_sac: frontendItem.hsn_or_sac || '',
      carat_size: frontendItem.carat_size !== undefined ? String(frontendItem.carat_size) : undefined,
      cost_price: Number(frontendItem.cost_price) || 0,
    };
  });

  const invoiceTotal = Math.max(0, grossSum - discount);

  const updatedOrder = await Order.findOneAndUpdate(
    { _id: order._id },
    {
      $set: {
        invoiceItems: updatedItemsForDb,
        invoiceTotal,
        discount,
        discountType,
        isDiscountBeforeTax,
      },
    },
    { new: true }
  ).lean();

  return success({
    message: 'Invoice updated successfully',
    order: updatedOrder,
  });
});
