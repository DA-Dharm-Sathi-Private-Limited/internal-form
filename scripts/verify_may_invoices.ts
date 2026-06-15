import { config } from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';

// Load environment variables
config({ path: '.env.local' });

// Colors for output
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;

async function main() {
    console.log(bold('\n🔍 Starting May 2026 Order Total Verification\n'));

    const [{ default: connectDB }, { default: Order }, zoho] = await Promise.all([
        import('../src/lib/mongodb'),
        import('../src/models/Order'),
        import('../src/lib/zoho'),
    ]);

    // 1. Connect to Database
    console.log(dim('Connecting to MongoDB...'));
    await connectDB();
    console.log(green('✅ MongoDB connected.'));

    // 2. Fetch all orders from Database
    console.log(dim('Fetching orders from Database...'));
    // Filter DB orders by createdAt in May 2026
    const startDate = new Date('2026-05-01T00:00:00.000Z');
    const endDate = new Date('2026-06-01T00:00:00.000Z');
    
    const dbOrders = await Order.find({
        createdAt: { $gte: startDate, $lt: endDate }
    }).lean() as any[];
    console.log(green(`✅ Found ${dbOrders.length} orders in Database for May 2026.`));

    // 3. Fetch all invoices from Zoho
    console.log(dim('Fetching invoices from Zoho Billing...'));
    const allZohoInvoices = await zoho.fetchAllInvoices();
    
    // Filter Zoho invoices by date (May 2026) and not voided. Includes drafts.
    const zohoInvoices = allZohoInvoices.filter((inv: any) => {
        if (inv.status === 'void') return false;
        
        const d1 = inv.date || '';
        const d2 = inv.invoice_date || '';
        const d3 = inv.created_time || '';
        
        return d1.startsWith('2026-05') || d2.startsWith('2026-05') || d3.startsWith('2026-05');
    });
    console.log(green(`✅ Found ${zohoInvoices.length} active invoices in Zoho for May 2026.`));

    // Mappings
    const dbMap = new Map<string, any>();
    for (const order of dbOrders) {
        dbMap.set(order.orderId, order);
    }

    const zohoMap = new Map<string, any>();
    for (const inv of zohoInvoices) {
        zohoMap.set(inv.invoice_number, inv);
    }

    // Tracking variables
    let totalDbAmount = 0;
    let totalZohoAmount = 0;
    
    const onlyInDb: string[] = [];
    const onlyInZoho: string[] = [];
    const mismatches: { orderId: string, dbTotal: number, zohoTotal: number, diff: number }[] = [];

    // Process DB Orders
    for (const dbOrder of dbOrders) {
        const orderId = dbOrder.orderId;
        
        let dbTotal = dbOrder.invoiceTotal;
        if (dbTotal === null || dbTotal === undefined) {
            dbTotal = (dbOrder.invoiceItems || []).reduce((sum: number, item: any) => sum + (Number(item.final_price) || 0), 0);
        }
        
        totalDbAmount += dbTotal;

        if (!zohoMap.has(orderId)) {
            onlyInDb.push(orderId);
        }
    }

    // Process Zoho Invoices
    for (const zohoInv of zohoInvoices) {
        const orderId = zohoInv.invoice_number;
        const zohoTotal = Number(zohoInv.total) || 0;
        
        totalZohoAmount += zohoTotal;

        if (!dbMap.has(orderId)) {
            onlyInZoho.push(orderId);
        }
    }

    // Compare Matching Invoices
    for (const dbOrder of dbOrders) {
        const orderId = dbOrder.orderId;
        if (zohoMap.has(orderId)) {
            const zohoInv = zohoMap.get(orderId);
            
            let dbTotal = dbOrder.invoiceTotal;
            if (dbTotal === null || dbTotal === undefined) {
                dbTotal = (dbOrder.invoiceItems || []).reduce((sum: number, item: any) => sum + (Number(item.final_price) || 0), 0);
            }
            
            const zohoTotal = Number(zohoInv.total) || 0;
            const diff = Math.abs(dbTotal - zohoTotal);

            // We report any discrepancy > 1 rupee to account for fractional rounding.
            if (diff > 1) {
                mismatches.push({
                    orderId,
                    dbTotal,
                    zohoTotal,
                    diff
                });
            }
        }
    }

    console.log(bold('\n━━━ Presence Check ━━━'));
    if (onlyInDb.length > 0) {
        console.log(yellow(`Found ${onlyInDb.length} invoices in DB but NOT in Zoho (for May):`));
        console.log(dim(onlyInDb.join(', ')));
    } else {
        console.log(green('✅ No invoices found exclusively in DB.'));
    }

    if (onlyInZoho.length > 0) {
        console.log(yellow(`\nFound ${onlyInZoho.length} invoices in Zoho but NOT in DB (for May):`));
        console.log(dim(onlyInZoho.join(', ')));
    } else {
        console.log(green('\n✅ No invoices found exclusively in Zoho.'));
    }

    console.log(bold('\n━━━ Amount Mismatches ━━━'));
    if (mismatches.length > 0) {
        console.log(red(`Found ${mismatches.length} matching invoices with different totals:`));
        for (const m of mismatches) {
            console.log(`❌ ${m.orderId}: DB Total = ₹${m.dbTotal.toFixed(2)} | Zoho Total = ₹${m.zohoTotal.toFixed(2)} | Diff = ₹${m.diff.toFixed(2)}`);
        }
    } else {
        console.log(green('✅ All matching invoices have identical totals.'));
    }

    console.log(bold('\n━━━ Summary Totals (May 2026) ━━━'));
    console.log(`Total Orders in DB (May):     ${dbOrders.length}`);
    console.log(`Total Invoices in Zoho (May): ${zohoInvoices.length}`);
    console.log(cyan(`Overall DB Total Amount:      ₹${totalDbAmount.toFixed(2)}`));
    console.log(cyan(`Overall Zoho Total Amount:    ₹${totalZohoAmount.toFixed(2)}`));
    console.log('');

    await mongoose.disconnect();
    process.exit(0);
}

main().catch(err => {
    console.error(red('Fatal error:'), err);
    process.exit(1);
});
