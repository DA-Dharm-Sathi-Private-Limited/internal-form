/**
 * compare_all_totals.ts
 *
 * Compares order totals between MongoDB and Zoho Billing.
 * Reports any mismatch > 5rs.
 *
 * Usage:
 *   npx tsx scripts/compare_all_totals.ts
 */

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
    // console.log(bold('\n🔍 Starting Order Total Discrepancy Check\n'));

    // Dynamic imports
    const [{ default: connectDB }, { default: Order }, zoho] = await Promise.all([
        import('../src/lib/mongodb'),
        import('../src/models/Order'),
        import('../src/lib/zoho'),
    ]);

    // 1. Connect to Database
    // console.log(dim('Connecting to MongoDB...'));
    await connectDB();
    // console.log(green('✅ MongoDB connected.'));

    // 2. Fetch all orders from Database
    // console.log(dim('Fetching orders from Database...'));
    const dbOrders = await Order.find({}).lean() as any[];
    // console.log(green(`✅ Found ${dbOrders.length} orders in Database.`));

    // 3. Fetch all invoices from Zoho
    // console.log(dim('Fetching invoices from Zoho Billing...'));
    const allZohoInvoices = await zoho.fetchAllInvoices();
    
    // Filter out voided invoices as requested
    const zohoInvoices = allZohoInvoices.filter((inv: any) => inv.status !== 'void');
    // console.log(green(`✅ Found ${zohoInvoices.length} active invoices in Zoho (filtered out voided).`));

    // Create a map for quick lookup
    const zohoMap = new Map();
    for (const inv of zohoInvoices) {
        zohoMap.set(inv.invoice_number, inv);
    }

    // 4. Compare
    // console.log(bold('\n━━━ Results ━━━\n'));

    let checkedCount = 0;
    let mismatchCount = 0;
    let missingInZoho = 0;

    const discrepancies: any[] = [];

    for (const dbOrder of dbOrders) {
        checkedCount++;
        const orderId = dbOrder.orderId;
        
        let dbTotal = dbOrder.invoiceTotal;
        let wasCalculated = false;

        // Fallback: Calculate total from items if field is missing/null
        if (dbTotal === null || dbTotal === undefined) {
            dbTotal = (dbOrder.invoiceItems || []).reduce((sum: number, item: any) => sum + (Number(item.final_price) || 0), 0);
            wasCalculated = true;
        }

        const zohoInv = zohoMap.get(orderId);

        if (!zohoInv) {
            // Check if it was voided (we keep a record of allZohoInvoices too)
            const isVoided = allZohoInvoices.some((inv: any) => inv.invoice_number === orderId && inv.status === 'void');
            if (isVoided) {
                // Ignore voided as requested
                continue;
            }
            
            // Truly missing or mismatch in ID
            missingInZoho++;
            // console.log(cyan(`ℹ️  ${orderId}: Missing in Zoho active invoices (might be draft/deleted or ID mismatch).`));
            continue;
        }

        const zohoTotal = Number(zohoInv.total) || 0;
        const diff = Math.abs(dbTotal - zohoTotal);

        if (diff > 5) {
            mismatchCount++;
            // console.log(red(`❌ ${orderId}: Discrepancy found!`));
            // console.log(`   DB Total:   ₹${dbTotal.toFixed(2)}${wasCalculated ? dim(' (Calculated from items)') : ''}`);
            // console.log(`   Zoho Total: ₹${zohoTotal.toFixed(2)}`);
            // console.log(`   Difference: ₹${diff.toFixed(2)}`);
            // console.log(`   Status:     ${zohoInv.status}`);
            // console.log('');
            
            discrepancies.push({
                orderId,
                dbTotal,
                zohoTotal,
                diff,
                status: zohoInv.status
            });
        }
    }

    // 5. Summary
    // console.log(bold('\n━━━ Summary ━━━'));
    // console.log(`Total Orders in DB:    ${dbOrders.length}`);
    // console.log(`Mismatches (> ₹5):     ${red(String(mismatchCount))}`);
    // console.log(`Missing in Zoho:       ${yellow(String(missingInZoho))}`);
    
    if (mismatchCount === 0) {
        // console.log(green('\n🎉 No major discrepancies found.'));
    } else {
        // console.log(yellow(`\n⚠️  Found ${mismatchCount} orders with total mismatch > ₹5.`));
        // console.log(dim('Note: This script only reports differences; no data was modified.'));
    }

    await mongoose.disconnect();
    process.exit(0);
}

main().catch(err => {
    console.error(red('Fatal error:'), err);
    process.exit(1);
});
