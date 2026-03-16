import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import { updateInvoice } from '@/lib/zoho';

/**
 * POST /api/orders/:id/resync-zoho
 *
 * Re-pushes the invoice line items stored in our DB to Zoho, using the
 * correct pre-tax rate derived from `final_price` + `tax_percentage`.
 *
 * This is used to correct orders whose Zoho invoice was corrupted by the
 * stale `item.price` bug (where the original Zoho rate was re-sent instead
 * of being recomputed from the user-entered final_price).
 *
 * After a successful push, clears the cached `invoiceTotal` on the order so
 * the revenue dashboard re-fetches the accurate total from Zoho.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const { id } = await params;

        const order = await Order.findOne({
            $or: [
                { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
                { zohoInvoiceId: id },
                { orderId: id },
            ],
        }).lean();

        if (!order) {
            return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
        }

        const orderAny = order as Record<string, unknown>;
        const zohoInvoiceId = typeof orderAny.zohoInvoiceId === 'string' ? orderAny.zohoInvoiceId : '';

        if (!zohoInvoiceId) {
            return NextResponse.json(
                { success: false, error: 'Order has no Zoho Invoice ID' },
                { status: 400 }
            );
        }

        const items = orderAny.invoiceItems as Array<Record<string, unknown>> | undefined;

        if (!items || items.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Order has no invoice items to sync' },
                { status: 400 }
            );
        }

        // Build Zoho line items.
        // Rate = item_total / quantity — this is the pre-tax per-unit rate stored in MongoDB,
        // and is the most reliable source. final_price is tax-inclusive (per unit) and
        // item.price can be stale from an earlier Zoho sync.
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
            return NextResponse.json(
                {
                    success: false,
                    error: `Zoho returned ${result.status}: ${result.data?.message ?? JSON.stringify(result.data)}`,
                },
                { status: 502 }
            );
        }

        // NOTE: do NOT clear invoiceTotal here — it was recalculated from DB and is correct.
        console.log(`[resync-zoho] Successfully synced ${zohoInvoiceId}`);

        return NextResponse.json({
            success: true,
            zohoInvoiceId,
            lineItemsSent: zohoLineItems,
            message: 'Zoho invoice updated successfully. invoiceTotal cache cleared.',
        });
    } catch (error: unknown) {
        console.error('[resync-zoho] Unexpected error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
