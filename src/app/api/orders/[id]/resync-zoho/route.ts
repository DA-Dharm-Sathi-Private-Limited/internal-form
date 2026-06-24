import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import Order from '@/models/Order';
import { updateInvoice } from '@/lib/zoho';
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
  const zohoInvoiceId = typeof orderAny.zohoInvoiceId === 'string' ? orderAny.zohoInvoiceId : '';

  if (!zohoInvoiceId) {
    return fail('Order has no Zoho Invoice ID', 400);
  }

  const items = orderAny.invoiceItems as Array<Record<string, unknown>> | undefined;

  if (!items || items.length === 0) {
    return fail('Order has no invoice items to sync', 400);
  }

  const zohoLineItems = items.map((item) => {
    const itemTotal = typeof item.item_total === 'number' ? item.item_total : 0;
    const qty = typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1;
    const pretaxRate = Math.round((itemTotal / qty) * 100) / 100;

    const line: Record<string, unknown> = {
      name: item.name,
      rate: pretaxRate,
      quantity: item.quantity,
    };

    if (item.hsn_or_sac) line.hsn_or_sac = item.hsn_or_sac;
    if (item.item_id) line.item_id = item.item_id;
    if (item.description) line.description = item.description;
    if (item.tax_id && item.tax_id !== 'NO_TAX') line.tax_id = item.tax_id;
    if (typeof item.discount === 'number') line.discount = item.discount;
    if (item.unit) line.unit = item.unit;

    return line;
  });

  console.log(`[resync-zoho] Re-syncing ${zohoInvoiceId} with`, zohoLineItems.length, 'items');
  console.log('[resync-zoho] Line items:', JSON.stringify(zohoLineItems, null, 2));

  const result = await updateInvoice(zohoInvoiceId, { invoice_items: zohoLineItems });

  if (result.status !== 200) {
    console.error('[resync-zoho] Zoho returned error:', result.status, result.data);
    return fail(
      `Zoho returned ${result.status}: ${result.data?.message ?? JSON.stringify(result.data)}`,
      502
    );
  }

  console.log(`[resync-zoho] Successfully synced ${zohoInvoiceId}`);

  return success({
    zohoInvoiceId,
    lineItemsSent: zohoLineItems,
    message: 'Zoho invoice updated successfully. invoiceTotal cache cleared.',
  });
});
