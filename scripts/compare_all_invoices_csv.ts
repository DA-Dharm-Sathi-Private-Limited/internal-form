/**
 * compare_all_invoices_csv.ts
 *
 * Compares every invoice between Zoho Billing and MongoDB, performing a deep
 * line-item-level comparison of all parameters and saves the results to a CSV.
 *
 * Usage:
 *   npx tsx scripts/compare_all_invoices_csv.ts
 *   npx tsx scripts/compare_all_invoices_csv.ts --output=my_report.csv
 *   npx tsx scripts/compare_all_invoices_csv.ts --from=2026-03-01 --to=2026-03-31
 *
 * Output CSV columns:
 *   Invoice Number, Source, Status, Field, DB Value, Zoho Value, Match
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '../.env.local' });

import fs from 'fs';
import path from 'path';

// ── CLI Args ────────────────────────────────────────────────────
function parseArgs(argv: string[]) {
    const args: { output: string; from?: string; to?: string } = {
        output: 'invoice_comparison_report.csv',
    };
    for (const raw of argv) {
        if (raw.startsWith('--output=')) args.output = raw.split('=')[1];
        else if (raw.startsWith('--from=')) args.from = raw.split('=')[1];
        else if (raw.startsWith('--to=')) args.to = raw.split('=')[1];
    }
    return args;
}

// ── CSV Helper ──────────────────────────────────────────────────
function escapeCsv(field: string | number | undefined | null): string {
    if (field === null || field === undefined) return '';
    let str = String(field);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        str = str.replace(/"/g, '""');
        return `"${str}"`;
    }
    return str;
}

// ── Types ───────────────────────────────────────────────────────
interface ComparisonRow {
    invoiceNumber: string;
    source: 'BOTH' | 'ZOHO_ONLY' | 'DB_ONLY';
    zohoStatus: string;
    dbStatus: string;
    field: string;
    dbValue: string;
    zohoValue: string;
    match: 'YES' | 'NO' | 'N/A';
}

// ── Console Colors ──────────────────────────────────────────────
const bold  = (s: string) => `\x1b[1m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red   = (s: string) => `\x1b[31m${s}\x1b[0m`;
const yellow= (s: string) => `\x1b[33m${s}\x1b[0m`;
const cyan  = (s: string) => `\x1b[36m${s}\x1b[0m`;
const dim   = (s: string) => `\x1b[2m${s}\x1b[0m`;

// ── Main ────────────────────────────────────────────────────────
async function main() {
    const args = parseArgs(process.argv.slice(2));
    // console.log(bold('\n📊 Zoho ↔ MongoDB Invoice Deep Comparison\n'));
    // console.log(`Output: ${cyan(args.output)}`);
    if (args.from || args.to) console.log(`Date filter: ${args.from || '—'} → ${args.to || '—'}`);

    // Dynamic imports (dotenv must load first)
    const [{ default: connectDB }, { default: Order }, zoho] = await Promise.all([
        import('../src/lib/mongodb'),
        import('../src/models/Order'),
        import('../src/lib/zoho'),
    ]);

    // ── 1. Connect to MongoDB ───────────────────────────────────
    // console.log(dim('\nConnecting to MongoDB...'));
    await connectDB();
    // console.log(green('✅ MongoDB connected.'));

    // ── 2. Fetch all orders from DB ─────────────────────────────
    // console.log(dim('Fetching orders from Database...'));
    const dateQuery: Record<string, any> = {};
    if (args.from) dateQuery.$gte = new Date(args.from);
    if (args.to) {
        const to = new Date(args.to);
        to.setHours(23, 59, 59, 999);
        dateQuery.$lte = to;
    }

    const dbQuery: Record<string, any> = {};
    if (Object.keys(dateQuery).length > 0) dbQuery.createdAt = dateQuery;

    const dbOrders = await Order.find(dbQuery).lean() as any[];
    // console.log(green(`✅ Found ${dbOrders.length} orders in Database.`));

    // Build DB lookup maps
    const dbByOrderId = new Map<string, any>();
    const dbByZohoId = new Map<string, any>();
    for (const o of dbOrders) {
        if (o.orderId) dbByOrderId.set(o.orderId, o);
        if (o.zohoInvoiceId) dbByZohoId.set(o.zohoInvoiceId, o);
    }

    // ── 3. Fetch all invoices from Zoho ─────────────────────────
    // console.log(dim('Fetching all invoices from Zoho Billing (paginated)...'));
    const allZohoInvoices = await zoho.fetchAllInvoices();
    // console.log(green(`✅ Found ${allZohoInvoices.length} invoices in Zoho.`));

    // Build Zoho lookup map by invoice_number
    const zohoByNumber = new Map<string, any>();
    const zohoById = new Map<string, any>();
    for (const inv of allZohoInvoices) {
        zohoByNumber.set(inv.invoice_number, inv);
        zohoById.set(inv.invoice_id, inv);
    }

    // ── 4. Collect all unique invoice identifiers ───────────────
    const allInvoiceNumbers = new Set<string>();
    for (const o of dbOrders) {
        if (o.orderId) allInvoiceNumbers.add(o.orderId);
    }
    for (const inv of allZohoInvoices) {
        if (inv.invoice_number) allInvoiceNumbers.add(inv.invoice_number);
    }

    // console.log(dim(`\nTotal unique invoice numbers to compare: ${allInvoiceNumbers.size}`));

    // ── 5. Fetch full details from Zoho for matched invoices ────
    // The list endpoint doesn't return line items, so we need to
    // fetch individual invoices that exist in both systems.
    // console.log(dim('Fetching full invoice details from Zoho for line-item comparison...'));

    const matchedInvoiceNumbers: string[] = [];
    for (const num of allInvoiceNumbers) {
        if (dbByOrderId.has(num) && zohoByNumber.has(num)) {
            matchedInvoiceNumbers.push(num);
        }
    }
    // console.log(dim(`Invoices in both systems: ${matchedInvoiceNumbers.length}`));

    // Fetch full Zoho details in batches
    const BATCH_SIZE = 5;
    const BATCH_DELAY_MS = 500;
    const zohoFullDetails = new Map<string, any>();

    for (let i = 0; i < matchedInvoiceNumbers.length; i += BATCH_SIZE) {
        const batch = matchedInvoiceNumbers.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(
            batch.map(async (num) => {
                const summary = zohoByNumber.get(num);
                if (!summary) return null;
                try {
                    const res = await zoho.getInvoice(summary.invoice_id);
                    if (res.status === 200 && res.data?.invoice) {
                        return { num, invoice: res.data.invoice };
                    }
                } catch (err) {
                    console.warn(yellow(`  ⚠ Failed to fetch Zoho details for ${num}`));
                }
                return null;
            })
        );

        for (const r of results) {
            if (r) zohoFullDetails.set(r.num, r.invoice);
        }

        const progress = Math.min(i + BATCH_SIZE, matchedInvoiceNumbers.length);
        process.stdout.write(`\r  Fetched ${progress}/${matchedInvoiceNumbers.length} full invoices from Zoho...`);

        if (i + BATCH_SIZE < matchedInvoiceNumbers.length) {
            await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
        }
    }
    // console.log(green('\n✅ Full Zoho details fetched.'));

    // ── 6. Deep Comparison ──────────────────────────────────────
    // console.log(bold('\n━━━ Running Deep Comparison ━━━\n'));

    const rows: ComparisonRow[] = [];
    let matchCount = 0;
    let mismatchCount = 0;
    let zohoOnlyCount = 0;
    let dbOnlyCount = 0;

    const sorted = Array.from(allInvoiceNumbers).sort();

    for (const invoiceNum of sorted) {
        const dbOrder = dbByOrderId.get(invoiceNum);
        const zohoSummary = zohoByNumber.get(invoiceNum);
        const zohoFull = zohoFullDetails.get(invoiceNum);

        // ── Case A: Only in Zoho ────────────────────────────────
        if (!dbOrder && zohoSummary) {
            zohoOnlyCount++;
            rows.push({
                invoiceNumber: invoiceNum,
                source: 'ZOHO_ONLY',
                zohoStatus: zohoSummary.status || '',
                dbStatus: '',
                field: 'ENTIRE_INVOICE',
                dbValue: 'MISSING',
                zohoValue: `Total: ₹${zohoSummary.total}, Customer: ${zohoSummary.customer_name}`,
                match: 'NO',
            });
            continue;
        }

        // ── Case B: Only in DB ──────────────────────────────────
        if (dbOrder && !zohoSummary) {
            dbOnlyCount++;
            rows.push({
                invoiceNumber: invoiceNum,
                source: 'DB_ONLY',
                zohoStatus: '',
                dbStatus: dbOrder.status || '',
                field: 'ENTIRE_INVOICE',
                dbValue: `Total: ₹${dbOrder.invoiceTotal ?? 'N/A'}, Customer: ${dbOrder.customerDetails?.customer_name || ''}`,
                zohoValue: 'MISSING',
                match: 'NO',
            });
            continue;
        }

        // ── Case C: Both exist — Deep comparison ────────────────
        if (!dbOrder || !zohoSummary) continue;

        const zohoInv = zohoFull || zohoSummary; // Use full details if available
        const dbStatus = dbOrder.status || '';
        const zohoStatus = zohoInv.status || zohoSummary.status || '';

        // Helper to add a comparison row
        const addRow = (field: string, dbVal: any, zohoVal: any) => {
            const dbStr = String(dbVal ?? '');
            const zohoStr = String(zohoVal ?? '');
            const isMatch = dbStr === zohoStr;
            if (!isMatch) mismatchCount++;
            else matchCount++;
            rows.push({
                invoiceNumber: invoiceNum,
                source: 'BOTH',
                zohoStatus,
                dbStatus,
                field,
                dbValue: dbStr,
                zohoValue: zohoStr,
                match: isMatch ? 'YES' : 'NO',
            });
        };

        // --- Header-level fields ---
        addRow('Zoho Invoice ID', dbOrder.zohoInvoiceId, zohoInv.invoice_id || zohoSummary.invoice_id);
        addRow('Invoice Total', dbOrder.invoiceTotal ?? '', zohoInv.total ?? zohoSummary.total);
        addRow('Salesperson', dbOrder.salespersonName || '', zohoInv.salesperson_name || zohoSummary.salesperson_name || '');
        addRow('Customer Name', dbOrder.customerDetails?.customer_name || '', zohoInv.customer_name || zohoSummary.customer_name || '');
        addRow('Customer Email', dbOrder.customerDetails?.email || '', zohoInv.email || '');
        addRow('Payment Mode', dbOrder.paymentMode || '', zohoSummary.balance === 0 ? 'Prepaid' : 'COD');

        // --- Item count ---
        const dbItems: any[] = dbOrder.invoiceItems || [];
        const zohoItems: any[] = zohoInv.invoice_items || [];
        addRow('Item Count', dbItems.length, zohoItems.length);

        // --- Line item comparison ---
        const maxItems = Math.max(dbItems.length, zohoItems.length);
        for (let i = 0; i < maxItems; i++) {
            const dbItem = dbItems[i];
            const zohoItem = zohoItems[i];
            const prefix = `Item[${i}]`;

            if (!dbItem && zohoItem) {
                rows.push({
                    invoiceNumber: invoiceNum,
                    source: 'BOTH',
                    zohoStatus,
                    dbStatus,
                    field: `${prefix} — MISSING IN DB`,
                    dbValue: 'MISSING',
                    zohoValue: `${zohoItem.name} × ${zohoItem.quantity} @ ₹${zohoItem.rate}`,
                    match: 'NO',
                });
                mismatchCount++;
                continue;
            }

            if (dbItem && !zohoItem) {
                rows.push({
                    invoiceNumber: invoiceNum,
                    source: 'BOTH',
                    zohoStatus,
                    dbStatus,
                    field: `${prefix} — EXTRA IN DB`,
                    dbValue: `${dbItem.name} × ${dbItem.quantity} @ ₹${dbItem.rate}`,
                    zohoValue: 'MISSING',
                    match: 'NO',
                });
                mismatchCount++;
                continue;
            }

            if (dbItem && zohoItem) {
                // DB stores tax-INCLUDED prices; Zoho stores tax-EXCLUDED.
                // Use Zoho's ACTUAL tax_percentage (DB's is often 0 even when tax_id is set).
                const zohoTaxPct = Number(zohoItem.tax_percentage || 0);
                const taxMultiplier = 1 + (zohoTaxPct / 100);
                const qty = Number(dbItem.quantity || 1);
                const dbFinalPrice = Number(dbItem.final_price || 0);

                // Derive tax-excluded per-unit rate from DB's tax-included final_price
                // e.g. final_price=270, tax=3% → 270 / 1.03 = 262.14
                let dbRateExclTax: number;
                if (dbFinalPrice > 0) {
                    dbRateExclTax = Number((dbFinalPrice / taxMultiplier / qty).toFixed(2));
                } else {
                    // Fallback to rate field
                    const dbRate = Number(dbItem.rate || 0);
                    dbRateExclTax = taxMultiplier > 1
                        ? Number((dbRate / taxMultiplier).toFixed(2))
                        : dbRate;
                }

                // Tax-excluded line total
                const dbItemTotalExclTax = Number((dbRateExclTax * qty).toFixed(2));

                addRow(`${prefix}.item_id`, dbItem.item_id || '', zohoItem.item_id || '');
                addRow(`${prefix}.name`, dbItem.name || '', zohoItem.name || '');
                addRow(`${prefix}.description`, dbItem.description || '', zohoItem.description || '');
                addRow(`${prefix}.quantity`, dbItem.quantity ?? '', zohoItem.quantity ?? '');
                addRow(`${prefix}.rate (excl. tax)`, dbRateExclTax.toFixed(2), Number(zohoItem.rate ?? 0).toFixed(2));
                addRow(`${prefix}.item_total (excl. tax)`, dbItemTotalExclTax.toFixed(2), Number(zohoItem.item_total ?? 0).toFixed(2));
                addRow(`${prefix}.tax_id`, dbItem.tax_id || '', zohoItem.tax_id || '');
                addRow(`${prefix}.tax_percentage (Zoho)`, zohoTaxPct, zohoItem.tax_percentage ?? '');
                addRow(`${prefix}.tax_amount`,
                    typeof dbItem.tax_amount === 'number' ? dbItem.tax_amount.toFixed(2) : String(dbItem.tax_amount ?? ''),
                    typeof zohoItem.tax_amount === 'number' ? zohoItem.tax_amount.toFixed(2) : String(zohoItem.tax_amount ?? ''),
                );
                addRow(`${prefix}.hsn_or_sac`, dbItem.hsn_or_sac || '', zohoItem.hsn_or_sac || '');

                // final_price: DB is tax-included, show tax-excluded for comparison
                // Zoho: item_total is already tax-excluded
                addRow(`${prefix}.final_price (excl. tax)`,
                    dbItemTotalExclTax.toFixed(2),
                    Number(zohoItem.item_total || 0).toFixed(2),
                );

                // Also show the original DB tax-included values for reference
                rows.push({
                    invoiceNumber: invoiceNum,
                    source: 'BOTH',
                    zohoStatus,
                    dbStatus,
                    field: `${prefix}.rate (DB original, tax-incl)`,
                    dbValue: String(dbItem.rate ?? ''),
                    zohoValue: 'N/A',
                    match: 'N/A',
                });
                rows.push({
                    invoiceNumber: invoiceNum,
                    source: 'BOTH',
                    zohoStatus,
                    dbStatus,
                    field: `${prefix}.final_price (DB original, tax-incl)`,
                    dbValue: String(dbItem.final_price ?? ''),
                    zohoValue: 'N/A',
                    match: 'N/A',
                });

                // cost_price only exists in DB (Zoho doesn't store it)
                rows.push({
                    invoiceNumber: invoiceNum,
                    source: 'BOTH',
                    zohoStatus,
                    dbStatus,
                    field: `${prefix}.cost_price (DB only)`,
                    dbValue: String(dbItem.cost_price ?? ''),
                    zohoValue: 'N/A',
                    match: 'N/A',
                });
            }
        }

        // --- Address comparison (if Zoho full details available) ---
        if (zohoFull) {
            const dbCust = dbOrder.customerDetails || {};
            const zohoShip = zohoFull.shipping_address || {};
            const zohoBill = zohoFull.billing_address || {};

            addRow('Address.city', dbCust.city || '', zohoShip.city || zohoBill.city || '');
            addRow('Address.state', dbCust.state || '', zohoShip.state || zohoBill.state || '');
            addRow('Address.country', dbCust.country || '', zohoShip.country || zohoBill.country || '');
            addRow('Address.pincode', dbCust.pincode || '', zohoShip.zip || zohoBill.zip || '');
        }
    }

    // ── 7. Write CSV ────────────────────────────────────────────
    const csvHeaders = ['Invoice Number', 'Source', 'Zoho Status', 'DB Status', 'Field', 'DB Value', 'Zoho Value', 'Match'];
    const csvLines: string[] = [csvHeaders.join(',')];

    for (const row of rows) {
        csvLines.push([
            escapeCsv(row.invoiceNumber),
            escapeCsv(row.source),
            escapeCsv(row.zohoStatus),
            escapeCsv(row.dbStatus),
            escapeCsv(row.field),
            escapeCsv(row.dbValue),
            escapeCsv(row.zohoValue),
            escapeCsv(row.match),
        ].join(','));
    }

    const outputPath = path.resolve(process.cwd(), args.output);
    fs.writeFileSync(outputPath, csvLines.join('\n'), 'utf-8');

    // ── 8. Summary ──────────────────────────────────────────────
    const mismatchRows = rows.filter(r => r.match === 'NO');

    // console.log(bold('\n━━━ Summary ━━━'));
    // console.log(`Total unique invoices:     ${allInvoiceNumbers.size}`);
    // console.log(`In both systems:           ${matchedInvoiceNumbers.length}`);
    // console.log(`Zoho only:                 ${yellow(String(zohoOnlyCount))}`);
    // console.log(`DB only:                   ${yellow(String(dbOnlyCount))}`);
    // console.log(`Total field comparisons:   ${rows.length}`);
    // console.log(`Matching fields:           ${green(String(matchCount))}`);
    // console.log(`Mismatched fields:         ${red(String(mismatchCount))}`);
    // console.log(`\n📁 CSV saved to: ${cyan(outputPath)}`);
    // console.log(`   Total rows: ${rows.length}`);

    if (mismatchRows.length > 0) {
        // console.log(yellow(`\n⚠️  ${mismatchRows.length} mismatched field(s) found. Open the CSV for details.`));

        // Show top 10 mismatches in console
        // console.log(bold('\nTop mismatches (first 10):'));
        for (const row of mismatchRows.slice(0, 10)) {
            // console.log(`  ${red('✗')} ${row.invoiceNumber} → ${row.field}`);
            // console.log(`    DB:   ${row.dbValue}`);
            // console.log(`    Zoho: ${row.zohoValue}`);
        }
        if (mismatchRows.length > 10) {
            // console.log(dim(`  ... and ${mismatchRows.length - 10} more (see CSV)`));
        }
    } else {
        // console.log(green('\n🎉 All fields match! No discrepancies found.'));
    }

    process.exit(0);
}

main().catch(err => {
    console.error(red('Fatal error:'), err);
    process.exit(1);
});
