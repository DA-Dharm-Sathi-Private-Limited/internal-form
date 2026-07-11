import { NextRequest, NextResponse } from 'next/server';
import Order from '@/models/Order';
import Grievance from '@/models/Grievance';
import {
  getAccessToken,
  getInvoice,
  voidInvoice,
  deleteInvoice,
  fetchTaxes,
} from '@/lib/zoho';
import { getCorrectTaxId, isInterstateOrder } from '@/lib/tax';
import { withDb, success, fail } from '@/lib/api-handler';

const ZOHO_API_BASE = 'https://www.zohoapis.in/billing/v1';

/**
 * GET /api/invoices/[orderId]
 * Returns the Zoho invoice's discount metadata for the given order.
 * Used by the edit-invoice page to hydrate discount state (esp. for legacy orders).
 */
export const GET = withDb(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id: orderId } = await params;

  const order = await Order.findOne({ orderId }).lean() as Record<string, any> | null;
  if (!order) return fail('Order not found', 404);
  if (!order.zohoInvoiceId) return fail('Order has no Zoho Invoice ID', 400);

  // Return DB-stored discount if available (non-legacy orders)
  const dbDiscount = Number(order.discount) || 0;
  if (dbDiscount > 0) {
    return success({
      discount: dbDiscount,
      discount_type: order.discountType || 'entity_level',
      is_discount_before_tax: order.isDiscountBeforeTax ?? false,
    });
  }

  // Fallback: fetch from Zoho for legacy orders
  try {
    const zohoRes = await getInvoice(order.zohoInvoiceId);
    if (zohoRes.status === 200 && zohoRes.data?.invoice) {
      const inv = zohoRes.data.invoice;
      return success({
        discount: Number(inv.discount) || 0,
        discount_type: inv.discount_type || 'entity_level',
        is_discount_before_tax: inv.is_discount_before_tax ?? false,
      });
    }
  } catch { /* non-fatal */ }

  return success({ discount: 0, discount_type: 'entity_level', is_discount_before_tax: false });
});

export const PUT = withDb(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id: orderId } = await params;

  // ── 1. Find order in DB ────────────────────────────────────
  const order = await Order.findOne({ orderId }).lean() as Record<string, any> | null;
  if (!order) {
    return fail('Order not found', 404);
  }

  const zohoInvoiceId = order.zohoInvoiceId;
  if (!zohoInvoiceId) {
    return fail('Order has no Zoho Invoice ID', 400);
  }

  const body = await request.json();
  const { invoice_items: rawItems } = body;

  // Discount fields from the frontend (may be undefined for legacy callers)
  const bodyDiscount = body.discount !== undefined ? Number(body.discount) : undefined;
  const bodyDiscountType = body.discount_type as string | undefined;
  const bodyIsDiscountBeforeTax = body.is_discount_before_tax as boolean | undefined;

  if (!rawItems || !Array.isArray(rawItems) || rawItems.length === 0) {
    return fail('At least one invoice item is required', 400);
  }

  // ── 2. Fetch old Zoho invoice to get customer_id, date, status ──
  const oldInvoiceRes = await getInvoice(zohoInvoiceId);
  if (oldInvoiceRes.status !== 200 || !oldInvoiceRes.data?.invoice) {
    return fail('Failed to fetch existing Zoho invoice', 502);
  }

  const oldInvoice = oldInvoiceRes.data.invoice;
  const oldStatus = oldInvoice.status;
  const customerId = oldInvoice.customer_id;
  const origNumber = oldInvoice.invoice_number;
  const origDate = oldInvoice.date;

  // Resolve discount: prefer frontend value, fall back to old Zoho invoice
  const resolvedDiscount = bodyDiscount ?? (Number(oldInvoice.discount) || 0);
  const resolvedDiscountType = bodyDiscountType || oldInvoice.discount_type || 'entity_level';
  const resolvedIsDiscountBeforeTax = bodyIsDiscountBeforeTax ?? (oldInvoice.is_discount_before_tax ?? false);

  if (oldStatus === 'paid' || oldStatus === 'partially_paid') {
    return fail(`Cannot modify a ${oldStatus} invoice. Void or delete payments in Zoho first.`, 400);
  }

  // ── 3. Fetch tax list for 0% tax fallback ──────────────────
  const isInterstate = isInterstateOrder(order.customerDetails?.state);
  let taxList: any[] = [];
  const taxMap = new Map<string, number>();
  try {
    const taxRes = await fetchTaxes();
    taxList = taxRes.data || [];
    taxList.forEach((t: any) => {
      if (t.tax_id && t.tax_percentage !== undefined) {
        taxMap.set(t.tax_id, Number(t.tax_percentage));
      }
    });
  } catch { /* non-fatal */ }

  // ── 4. Build Zoho line items (same logic as sync_db_to_zoho) ──
  const zohoLineItems = rawItems.map((item: any) => {
    const qty = Number(item.quantity || 1);

    let correctTaxId = 'NO_TAX';
    if (item.hsn_or_sac) {
      correctTaxId = getCorrectTaxId(item.hsn_or_sac, isInterstate);
    } else if (item.tax_id && !['NO_TAX', '0', 'null'].includes(String(item.tax_id))) {
      correctTaxId = item.tax_id;
    }

    if (correctTaxId === 'NO_TAX') {
      const zeroTaxes = taxList.filter((t: any) => Number(t.tax_percentage) === 0);
      if (zeroTaxes.length > 0) {
        const bestZero = zeroTaxes.find((t: any) => {
          const name = String(t.tax_name).toUpperCase();
          if (isInterstate) return name.includes('IGST');
          return name.includes('GST0') || name.includes('GROUP');
        });
        correctTaxId = bestZero ? bestZero.tax_id : zeroTaxes[0].tax_id;
      }
    }

    const taxPct = Number(
      (correctTaxId !== 'NO_TAX' && taxMap.get(correctTaxId)) || item.tax_percentage || 0
    );
    const taxMultiplier = 1 + (taxPct / 100);

    let rateExclTax = 0;
    if (typeof item.item_total === 'number' && item.item_total > 0) {
      rateExclTax = Number((item.item_total / qty).toFixed(2));
    } else if (typeof item.final_price === 'number' && item.final_price > 0) {
      rateExclTax = Number((item.final_price / taxMultiplier).toFixed(2));
    } else {
      const rawRate = Number(item.rate || item.price || 0);
      rateExclTax = Number((rawRate / (taxMultiplier > 1 ? taxMultiplier : 1)).toFixed(2));
    }

    return {
      name: item.name,
      description: item.description || '',
      quantity: qty,
      rate: rateExclTax,
      price: rateExclTax,
      hsn_or_sac: item.hsn_or_sac || '',
      ...(correctTaxId !== 'NO_TAX' ? { tax_id: correctTaxId } : { tax_id: "" }),
    };
  });

  // ── 5. Transactional Replacement ─────────────────────────────
  const token = await getAccessToken();
  const orgId = process.env.ZOHO_ORG_ID!;
  const headers = {
    Authorization: `Zoho-oauthtoken ${token}`,
    'X-com-zoho-subscriptions-organizationid': orgId,
    'Content-Type': 'application/json',
  };

  // Step A: Rename old invoice to temp number
  const renameSuffix = `-OLD-${Math.floor(Math.random() * 10000)}`;
  const tempNumber = `${origNumber}${renameSuffix}`;

  const renameRes = await fetch(
    `${ZOHO_API_BASE}/invoices/${zohoInvoiceId}?ignore_auto_number_generation=true`,
    {
      method: 'PUT',
      headers,
      body: JSON.stringify({ invoice_number: tempNumber }),
    }
  );

  if (!renameRes.ok) {
    console.warn(`Rename failed (${renameRes.status}).`);

    if (oldStatus !== 'draft') {
      return fail(
        `Zoho rejected renaming the ${oldStatus} invoice (Status: ${renameRes.status}). Since it's not a draft, we cannot safely recreate it without renaming. Please void it manually in Zoho and create a new invoice.`,
        400
      );
    }

    console.warn(`Falling back to direct delete-then-create for draft invoice.`);
    await deleteInvoice(zohoInvoiceId);

    const createOpts = {
      customerId,
      invoiceNumber: origNumber,
      date: origDate,
      lineItems: zohoLineItems,
      salespersonName: order.salespersonName,
      discount: resolvedDiscount,
      discountType: resolvedDiscountType,
      isDiscountBeforeTax: resolvedIsDiscountBeforeTax,
    };

    let newInvoiceData: any;
    try {
      newInvoiceData = await createReplacementInvoice(headers, createOpts);
    } catch (firstErr: any) {
      console.warn(`Fallback create attempt 1 failed: ${firstErr.message}. Retrying in 1.5s...`);

      await new Promise(resolve => setTimeout(resolve, 1500));

      try {
        newInvoiceData = await createReplacementInvoice(headers, createOpts);
      } catch (secondErr: any) {
        console.error(`Fallback create attempt 2 also failed: ${secondErr.message}`);

        await Grievance.create({
          invoiceId: orderId,
          salespersonName: order.salespersonName || 'System',
          grievanceType: 'invoice_deleted_updation_failed',
          grievanceDescription:
            `Old Zoho invoice (${zohoInvoiceId}) was ${oldStatus === 'draft' ? 'deleted' : 'voided'} ` +
            `but replacement invoice creation failed after 2 attempts. ` +
            `Error: ${secondErr.message}`,
        });

        return fail(
          'Invoice update failed critically: the old invoice was deleted but the new invoice could not be created. ' +
          'A grievance has been logged. Please contact the system administrator immediately.',
          502
        );
      }
    }

    await updateDbAfterSync(order, rawItems, newInvoiceData, resolvedDiscount, resolvedDiscountType, resolvedIsDiscountBeforeTax);

    return success({
      message: 'Invoice replaced successfully (fallback path)',
      order: await Order.findById(order._id).lean(),
    });
  }

  // Step B: Create new invoice with original number
  let newInvoiceData: any;
  try {
    newInvoiceData = await createReplacementInvoice(headers, {
      customerId,
      invoiceNumber: origNumber,
      date: origDate,
      lineItems: zohoLineItems,
      salespersonName: order.salespersonName,
      discount: resolvedDiscount,
      discountType: resolvedDiscountType,
      isDiscountBeforeTax: resolvedIsDiscountBeforeTax,
    });
  } catch (err: any) {
    console.error('Creation failed, rolling back rename...', err.message);
    await fetch(
      `${ZOHO_API_BASE}/invoices/${zohoInvoiceId}?ignore_auto_number_generation=true`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify({ invoice_number: origNumber }),
      }
    );
    return fail(`Failed to create replacement invoice: ${err.message}`, 502);
  }

  // Step C: Void/Delete old invoice
  try {
    if (oldStatus === 'draft') {
      await deleteInvoice(zohoInvoiceId);
    } else {
      await voidInvoice(zohoInvoiceId);
    }
  } catch (err) {
    console.warn('Failed to void/delete old invoice (non-fatal):', err);
  }

  // Step D: Update MongoDB
  await updateDbAfterSync(order, rawItems, newInvoiceData, resolvedDiscount, resolvedDiscountType, resolvedIsDiscountBeforeTax);

  return success({
    message: 'Invoice replaced and synced successfully',
    order: await Order.findById(order._id).lean(),
  });
});

// ── Helpers ──────────────────────────────────────────────────────

async function createReplacementInvoice(
  headers: Record<string, string>,
  opts: {
    customerId: string;
    invoiceNumber: string;
    date: string;
    lineItems: any[];
    salespersonName?: string;
    discount?: number;
    discountType?: string;
    isDiscountBeforeTax?: boolean;
  }
) {
  const payload: any = {
    customer_id: opts.customerId,
    invoice_number: opts.invoiceNumber,
    date: opts.date,
    invoice_items: opts.lineItems,
    is_round_off_applied: true,
    notes: 'Updated via Edit Invoice.',
  };
  if (opts.salespersonName) payload.salesperson_name = opts.salespersonName;
  if (opts.discount && opts.discount > 0) {
    payload.discount = opts.discount;
    payload.discount_type = opts.discountType || 'entity_level';
    payload.is_discount_before_tax = opts.isDiscountBeforeTax ?? false;
  }

  const res = await fetch(
    `${ZOHO_API_BASE}/invoices?ignore_auto_number_generation=true`,
    { method: 'POST', headers, body: JSON.stringify(payload) }
  );

  const data = await res.json();
  if (!res.ok || data.code !== 0) {
    throw new Error(data.message || `Zoho returned ${res.status}`);
  }

  return data.invoice;
}

async function updateDbAfterSync(
  order: Record<string, any>,
  rawItems: any[],
  newInvoice: any,
  discount: number = 0,
  discountType: string = 'entity_level',
  isDiscountBeforeTax: boolean = false,
) {
  const newInvoiceId = newInvoice.invoice_id;
  const newInvoiceTotal = newInvoice.total;

  const updatedItemsForDb = rawItems.map((frontendItem: any) => ({
    item_id: frontendItem.item_id || '',
    name: frontendItem.name,
    description: frontendItem.description || '',
    quantity: Number(frontendItem.quantity) || 1,
    rate: Number(frontendItem.price || frontendItem.rate) || 0,
    item_total: Number(frontendItem.item_total) || 0,
    tax_id: frontendItem.tax_id || 'NO_TAX',
    tax_percentage: Number(frontendItem.tax_percentage) || 0,
    tax_amount: Number(frontendItem.tax_amount) || 0,
    final_price: Number(frontendItem.final_price) || 0,
    hsn_or_sac: frontendItem.hsn_or_sac || '',
    carat_size: frontendItem.carat_size !== undefined ? String(frontendItem.carat_size) : undefined,
    cost_price: Number(frontendItem.cost_price) || 0,
  }));

  const Order = (await import('@/models/Order')).default;
  await Order.updateOne(
    { _id: order._id },
    {
      $set: {
        zohoInvoiceId: newInvoiceId,
        invoiceItems: updatedItemsForDb,
        invoiceTotal: newInvoiceTotal,
        discount,
        discountType,
        isDiscountBeforeTax,
      },
    }
  );
}
