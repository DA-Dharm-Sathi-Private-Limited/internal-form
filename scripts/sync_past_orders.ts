import { config } from 'dotenv';
config({ path: '../.env.local' });

import Order from '../src/models/Order';
import { getInvoice } from '../src/lib/zoho';
import connectDB from '../src/lib/mongodb';

async function main() {
    console.log('Connecting to database...');
    await connectDB();

    console.log('Fetching March orders from database...');
    const startOfMonth = new Date(new Date().getFullYear(), 2, 1); // March 1st
    const orders = await Order.find({ createdAt: { $gte: startOfMonth } }).lean();
    console.log(`Found ${orders.length} orders.`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const order of orders) {
        try {
            const zohoInvoiceId = order.zohoInvoiceId;
            if (!zohoInvoiceId) {
                console.warn(`Order ${order.orderId} is missing zohoInvoiceId, skipping...`);
                continue;
            }

            // Check if the order already has Delivery Charges or COD Charges
            // We can also just force-sync all of them for safety. Let's do that to be 100% accurate.

            process.stdout.write(`Syncing ${order.orderId} (Zoho ID: ${zohoInvoiceId})... `);
            const zohoRes = await getInvoice(zohoInvoiceId);

            if (zohoRes.status !== 200 || !zohoRes.data.invoice) {
                process.stdout.write(`FAILED (Zoho HTTP ${zohoRes.status})\n`);
                errorCount++;
                continue;
            }

            const incomingItems: any[] = zohoRes.data.invoice.invoice_items || [];

            // Map Zoho format to our schema format
            const mappedItems = incomingItems.map((it: any) => {
                const taxPct = it.tax_percentage || 0;
                // Compute the actual final price via item_total + percentage if tax_amount isn't reliable
                const finalTaxAmt = it.tax_amount || (it.item_total * (taxPct / 100));

                return {
                    item_id: it.item_id,
                    name: it.name,
                    description: it.description || '',
                    quantity: it.quantity,
                    rate: it.rate,
                    item_total: it.item_total,
                    tax_id: it.tax_id,
                    tax_percentage: taxPct,
                    tax_amount: finalTaxAmt,
                    final_price: it.item_total + finalTaxAmt,
                    hsn_or_sac: it.hsn_or_sac || '',
                    carat_size: '', // Zoho doesn't track this explicitly
                };
            });

            await Order.updateOne(
                { _id: order._id },
                {
                    $set: {
                        invoiceItems: mappedItems,
                        salespersonName: zohoRes.data.invoice.salesperson_name || ''
                    }
                }
            );

            process.stdout.write(`OK (Items: ${mappedItems.length})\n`);
            updatedCount++;
        } catch (err: any) {
            process.stdout.write(`ERROR: ${err.message}\n`);
            errorCount++;
        }
    }

    console.log('\n--- Sync Complete ---');
    console.log(`Total Orders Processed: ${orders.length}`);
    console.log(`Successfully Updated : ${updatedCount}`);
    console.log(`Errors               : ${errorCount}`);

    process.exit(0);
}

main().catch(err => {
    console.error('Fatal execution error:', err);
    process.exit(1);
});
