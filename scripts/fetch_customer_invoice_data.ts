/**
 * fetch_customer_invoice_data.ts
 *
 * Generates a report with Invoice number, Customer Name, Customer Phone Number, 
 * and Invoice total for the period Jan 2026 to April 2026 (default).
 * 
 * Rules:
 *   - If data is present only in Zoho: use Zoho data.
 *   - If data is present in both or only in MongoDB: use MongoDB data.
 * 
 * Usage:
 *   npx tsx scripts/fetch_customer_invoice_data.ts
 *   npx tsx scripts/fetch_customer_invoice_data.ts --from=2026-01-01 --to=2026-04-30 --output=report.csv
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '../.env.local' });

import fs from 'fs';
import path from 'path';

// ── Console Colors ──────────────────────────────────────────────
const bold   = (s: string) => `\x1b[1m${s}\x1b[0m`;
const green  = (s: string) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const cyan   = (s: string) => `\x1b[36m${s}\x1b[0m`;
const dim    = (s: string) => `\x1b[2m${s}\x1b[0m`;

// ── CLI & Types ─────────────────────────────────────────────────

interface CliArgs {
    output: string;
    from: string;
    to: string;
}

function parseCliArgs(argv: string[]): CliArgs {
    // Default to Jan 1, 2026 -> April 30, 2026
    const args: CliArgs = { 
        output: 'customer_invoice_data_jan_apr_2026.csv',
        from: '2026-01-01',
        to: '2026-04-30'
    };
    for (const raw of argv) {
        if (raw.startsWith('--output=')) args.output = raw.split('=')[1];
        else if (raw.startsWith('--from=')) args.from = raw.split('=')[1];
        else if (raw.startsWith('--to=')) args.to = raw.split('=')[1];
    }
    return args;
}

// ── Helpers ─────────────────────────────────────────────────────

function escapeCsv(field: string | number | undefined | null): string {
    if (field === null || field === undefined) return '';
    let str = String(field);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        str = str.replace(/"/g, '""');
        return `"${str}"`;
    }
    return str;
}

function isDateInRange(dateStr: string, from?: string, to?: string): boolean {
    if (!dateStr) return true;
    if (from && dateStr < from) return false;
    if (to && dateStr > to) return false;
    return true;
}

function toDateStr(value: string | Date | undefined | null): string {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return d.toISOString().split('T')[0];
}

function extractMongoPhone(order: any): string {
    const details = order.customerDetails;
    if (!details) return '';
    let phone = details.phone || '';
    if (details.country_code && phone && !phone.startsWith(details.country_code) && !phone.startsWith('+')) {
        phone = `${details.country_code} ${phone}`;
    }
    return phone.trim();
}

function extractZohoPhone(invoice: any): string {
    let phone = invoice.shipping_address?.phone || invoice.billing_address?.phone || '';
    if (!phone && invoice.customer_custom_fields) {
        const phoneField = invoice.customer_custom_fields.find((f: any) => 
            f.label?.toLowerCase().includes('phone') || 
            f.label?.toLowerCase().includes('mobile')
        );
        if (phoneField) phone = phoneField.value;
    }
    return phone;
}

// ── Data Fetching ───────────────────────────────────────────────

async function loadDependencies() {
    console.log(dim('Loading dependencies...'));
    const [{ default: connectDB }, { default: Order }, zoho] = await Promise.all([
        import('../src/lib/mongodb'),
        import('../src/models/Order'),
        import('../src/lib/zoho'),
    ]);
    await connectDB();
    console.log(green('✅ MongoDB connected.'));
    return { Order, zoho };
}

async function fetchMongoOrders(Order: any, from: string, to: string) {
    console.log(dim(`Fetching orders from MongoDB (${from} to ${to})...`));
    
    const query: Record<string, any> = {};
    const dateRange: Record<string, any> = {};
    if (from) dateRange.$gte = new Date(from);
    if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        dateRange.$lte = toDate;
    }
    query.createdAt = dateRange;

    const orders = await Order.find(query).lean() as any[];
    console.log(green(`✅ Found ${orders.length} orders in MongoDB.`));
    
    const map = new Map<string, any>();
    for (const o of orders) {
        if (o.orderId) map.set(o.orderId, o);
    }
    return map;
}

async function fetchZohoInvoiceSummaries(zoho: any) {
    console.log(dim('Fetching all invoices from Zoho Billing (paginated)...'));
    const all = await zoho.fetchAllInvoices();
    console.log(green(`✅ Found ${all.length} invoices in Zoho.`));

    const map = new Map<string, any>();
    for (const inv of all) {
        if (inv.status === 'void') continue; // Exclude voided
        if (inv.invoice_number) map.set(inv.invoice_number, inv);
    }
    return map;
}

async function fetchZohoFullDetails(zoho: any, invoiceIds: Array<{ number: string; id: string }>) {
    const BATCH_SIZE = 5;
    const BATCH_DELAY_MS = 500;
    const details = new Map<string, any>();

    for (let i = 0; i < invoiceIds.length; i += BATCH_SIZE) {
        const batch = invoiceIds.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(
            batch.map(async ({ number: num, id }) => {
                try {
                    const res = await zoho.getInvoice(id);
                    if (res.status === 200 && res.data?.invoice) {
                        return { num, invoice: res.data.invoice };
                    }
                } catch {
                    console.warn(yellow(`  ⚠ Failed to fetch Zoho details for ${num}`));
                }
                return null;
            }),
        );

        for (const r of results) {
            if (r) details.set(r.num, r.invoice);
        }

        const progress = Math.min(i + BATCH_SIZE, invoiceIds.length);
        process.stdout.write(`\r  Fetched ${progress}/${invoiceIds.length} full invoices from Zoho...`);

        if (i + BATCH_SIZE < invoiceIds.length) {
            await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
        }
    }
    if (invoiceIds.length > 0) console.log('');
    return details;
}

// ── Main ────────────────────────────────────────────────────────

async function main() {
    const args = parseCliArgs(process.argv.slice(2));

    console.log(bold('\n📊 Customer Invoice Data Report\n'));
    console.log(`Output:       ${cyan(args.output)}`);
    console.log(`Date Filter:  ${args.from} → ${args.to}`);

    const { Order, zoho } = await loadDependencies();

    // 1. Fetch data from sources
    const dbMap = await fetchMongoOrders(Order, args.from, args.to);
    const zohoMap = await fetchZohoInvoiceSummaries(zoho);

    // 2. Classify invoices
    const allInvoiceNumbers = new Set<string>([...dbMap.keys(), ...zohoMap.keys()]);
    console.log(dim(`\nTotal unique invoice numbers across systems: ${allInvoiceNumbers.size}`));

    const inBoth: string[] = [];
    const dbOnly: string[] = [];
    const zohoOnly: Array<{ number: string; id: string }> = [];

    for (const num of allInvoiceNumbers) {
        const inDb = dbMap.has(num);
        const inZoho = zohoMap.has(num);

        if (inDb && inZoho) {
            inBoth.push(num);
        } else if (inDb) {
            dbOnly.push(num);
        } else if (inZoho) {
            const zohoSummary = zohoMap.get(num);
            const zohoDate = toDateStr(zohoSummary.date);
            // Only include Zoho-only invoices if they fall into the date range
            if (isDateInRange(zohoDate, args.from, args.to)) {
                zohoOnly.push({ number: num, id: zohoSummary.invoice_id });
            }
        }
    }

    console.log(`  In both (Using DB):   ${green(String(inBoth.length))}`);
    console.log(`  DB only (Using DB):   ${green(String(dbOnly.length))}`);
    console.log(`  Zoho only (Filtered): ${yellow(String(zohoOnly.length))}`);

    // 3. Fetch full Zoho details for Zoho-only invoices to get phone numbers
    let zohoFullDetails = new Map<string, any>();
    if (zohoOnly.length > 0) {
        console.log(dim('\nFetching full Zoho details for Zoho-only invoices to retrieve contact info...'));
        zohoFullDetails = await fetchZohoFullDetails(zoho, zohoOnly);
        console.log(green(`✅ Fetched ${zohoFullDetails.size} full invoice details.`));
    }

    // 4. Build CSV Rows
    console.log(dim('\nBuilding CSV rows...'));
    const rows: string[][] = [];
    rows.push(['Date', 'Invoice Number', 'Customer Name', 'Customer Phone Number', 'Invoice Total', 'Fetched From']);

    const processMongo = (num: string) => {
        const order = dbMap.get(num);
        if (!order) return;
        const name = order.customerDetails?.customer_name || '';
        const phone = extractMongoPhone(order);
        const total = order.invoiceTotal ?? '';
        
        const zohoSummary = zohoMap.get(num);
        const invoiceDate = zohoSummary?.date ? toDateStr(zohoSummary.date) : toDateStr(order.createdAt);
        
        rows.push([escapeCsv(invoiceDate), escapeCsv(num), escapeCsv(name), escapeCsv(phone), escapeCsv(total), escapeCsv('DB')]);
    };

    // Both & DB Only -> Use MongoDB
    for (const num of inBoth) processMongo(num);
    for (const num of dbOnly) processMongo(num);

    // Zoho Only -> Use Zoho
    let warnCount = 0;
    for (const { number: num } of zohoOnly) {
        const invoice = zohoFullDetails.get(num);
        if (!invoice) {
            warnCount++;
            continue;
        }
        
        const name = invoice.customer_name || '';
        const phone = extractZohoPhone(invoice);
        const total = invoice.total ?? '';
        const invoiceDate = toDateStr(invoice.date);
        
        rows.push([escapeCsv(invoiceDate), escapeCsv(num), escapeCsv(name), escapeCsv(phone), escapeCsv(total), escapeCsv('Zoho')]);
    }

    // 5. Write CSV
    const csvContent = rows.map(r => r.join(',')).join('\n');
    const outputPath = path.resolve(process.cwd(), args.output);
    fs.writeFileSync(outputPath, csvContent, 'utf-8');

    // 6. Summary
    console.log(bold('\n━━━ Summary ━━━'));
    console.log(`Total exported rows: ${green(String(rows.length - 1))}`); // exclude header
    if (warnCount > 0) {
        console.log(`Warnings:            ${yellow(String(warnCount))} (Zoho details fetch failed)`);
    }
    console.log(`\n📁 Saved to: ${cyan(outputPath)}`);

    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
