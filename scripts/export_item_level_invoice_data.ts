/**
 * export_item_level_invoice_data.ts
 *
 * Exports an item-level CSV with MongoDB-first / Zoho-fallback precedence.
 *
 * Rules:
 *   - If an invoice exists in both MongoDB and Zoho, use MongoDB.
 *   - If an invoice exists only in MongoDB, use MongoDB.
 *   - Only if an invoice is absent in MongoDB, use Zoho.
 *
 * CSV columns:
 *   Invoice number,
 *   Invoice date (DD/MM/YYYY),
 *   Customer name,
 *   Customer phone number,
 *   Astrologer name,
 *   Astrologer phone number,
 *   Address,
 *   City,
 *   State,
 *   Pincode,
 *   Price of each item,
 *   Tax of each item,
 *   Category of each item (based on mapped HSNs),
 *   Cost price of each item (DB orders only),
 *   Order total,
 *   Discount,
 *   Invoice total.
 *
 * Notes:
 *   - Order total and Invoice total are tax-inclusive.
 *   - For MongoDB rows, order total is the sum of tax-inclusive line totals.
 *   - For MongoDB rows, invoice total prefers stored invoiceTotal and falls back to order total.
 *   - Discount is derived as max(order total - invoice total, 0).
 *   - Astrologer fields are DB-only and are exported from stored order data when present.
 *
 * Usage:
 *   npx tsx scripts/export_item_level_invoice_data.ts
 *   npx tsx scripts/export_item_level_invoice_data.ts --from=2026-01-01 --to=2026-04-30 --output=item_level_invoice_data.csv
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '../.env.local' });

import fs from 'fs';
import path from 'path';
import { HSN_TAX_RATES } from '../src/lib/tax';

const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;

interface CliArgs {
    output: string;
    from: string;
    to: string;
    dbOnly: boolean;
}

interface HsnCategory {
    code: string;
    name: string;
}

interface ExportAddress {
    address: string;
    city: string;
    state: string;
    pincode: string;
}

const HSN_CATEGORIES: HsnCategory[] = [
    { code: '14049070', name: 'Rudrakshas' },
    { code: '05080010', name: 'Gemstones and Raw Crystals' },
    { code: '71179090', name: 'Bracelets, Malas and Decorative Items' },
    { code: '83062990', name: 'Vastu Metal' },
    { code: '74198090', name: 'Vastu Copper/Brass' },
    { code: '44209090', name: 'Vastu Wooden' },
    { code: '39269090', name: 'Miscellaneous Goods' },
    { code: '999591', name: 'Poojas and Services' },
    { code: '999799', name: 'Miscellaneous Services' },
    { code: '996812', name: 'Shipping and Delivery Services' },
];

const HSN_CATEGORY_MAP = new Map(HSN_CATEGORIES.map((entry) => [entry.code, entry.name]));

function parseCliArgs(argv: string[]): CliArgs {
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const defaultTo = endOfMonth.toISOString().split('T')[0];

    const args: CliArgs = {
        output: 'item_level_invoice_data.csv',
        from: '2026-01-01',
        to: defaultTo,
        dbOnly: false,
    };

    for (const raw of argv) {
        if (raw.startsWith('--output=')) args.output = raw.split('=')[1];
        else if (raw.startsWith('--from=')) args.from = raw.split('=')[1];
        else if (raw.startsWith('--to=')) args.to = raw.split('=')[1];
        else if (raw === '--db-only') args.dbOnly = true;
    }

    return args;
}

function escapeCsv(field: string | number | undefined | null): string {
    if (field === null || field === undefined) return '';
    let str = String(field);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        str = str.replace(/"/g, '""');
        return `"${str}"`;
    }
    return str;
}

function round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toDateStr(value: string | Date | undefined | null): string {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toISOString().split('T')[0];
}

function isDateInRange(dateStr: string, from?: string, to?: string): boolean {
    if (!dateStr) return true;
    if (from && dateStr < from) return false;
    if (to && dateStr > to) return false;
    return true;
}

function formatMoney(value: number): string {
    return round2(value).toFixed(2);
}

function formatDateDDMMYYYY(value: string | Date | undefined | null): string {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
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

function parseAstrologerDetails(order: any): { astrologerName: string; astrologerNumber: string } {
    let details = order?.astrologerDetails;
    if (!details) return { astrologerName: '', astrologerNumber: '' };

    // Handle case where astrologerDetails was stored as a JSON string
    if (typeof details === 'string') {
        try {
            details = JSON.parse(details);
        } catch {
            return { astrologerName: '', astrologerNumber: '' };
        }
    }

    return {
        astrologerName: String(details?.astrologerName || '').trim(),
        astrologerNumber: String(details?.astrologerNumber || '').trim(),
    };
}

function extractMongoAstrologerName(order: any): string {
    return parseAstrologerDetails(order).astrologerName;
}

function extractMongoAstrologerPhone(order: any): string {
    return parseAstrologerDetails(order).astrologerNumber;
}

function extractMongoAddress(order: any): ExportAddress {
    const details = order?.customerDetails || {};
    return {
        address: String(details.address || '').trim(),
        city: String(details.city || '').trim(),
        state: String(details.state || '').trim(),
        pincode: String(details.pincode || '').trim(),
    };
}

function buildAddressFromSource(source: any): ExportAddress {
    const addressParts = [
        source.attention,
        source.address,
        source.street,
        source.street2,
    ]
        .filter((value: unknown, index: number, arr: unknown[]) => {
            const normalized = String(value || '').trim();
            return normalized && arr.findIndex((entry) => String(entry || '').trim() === normalized) === index;
        })
        .map((value: unknown) => String(value).trim());

    return {
        address: addressParts.join(', '),
        city: String(source.city || '').trim(),
        state: String(source.state || '').trim(),
        pincode: String(source.zip || source.postal_code || '').trim(),
    };
}

function extractZohoAddress(invoice: any): ExportAddress {
    const shipping = invoice?.shipping_address || {};
    const billing = invoice?.billing_address || {};
    const source = (shipping.street || shipping.address || shipping.city || shipping.state || shipping.zip)
        ? shipping
        : billing;

    return buildAddressFromSource(source);
}

function isAddressEmpty(addr: ExportAddress): boolean {
    return !addr.address && !addr.city && !addr.state && !addr.pincode;
}

function getCategoryFromHsn(hsn: string | undefined | null): string {
    if (!hsn) return 'Unknown';
    return HSN_CATEGORY_MAP.get(String(hsn)) || `Unknown (${hsn})`;
}

function getMongoItemPrice(item: any): number {
    const qty = Number(item?.quantity) || 0;
    const finalPrice = Number(item?.final_price);
    if (Number.isFinite(finalPrice) && finalPrice > 0) return round2(finalPrice);

    const itemTotal = Number(item?.item_total) || 0;
    const taxAmount = Number(item?.tax_amount) || 0;
    if (qty > 0) return round2((itemTotal + taxAmount) / qty);

    return 0;
}

function getMongoItemTax(item: any): number {
    const qty = Number(item?.quantity) || 0;
    const taxAmount = Number(item?.tax_amount) || 0;
    if (qty > 0) return round2(taxAmount / qty);
    return round2(taxAmount);
}

function getMongoItemTaxPct(item: any): number {
    if (item?.tax_percentage !== undefined) return Number(item.tax_percentage);
    const hsn = String(item?.hsn_or_sac || '');
    const mappedPct = HSN_TAX_RATES[hsn];
    if (Number.isFinite(mappedPct)) return mappedPct;
    return 0;
}

function getMongoOrderTotal(order: any): number {
    const items = Array.isArray(order?.invoiceItems) ? order.invoiceItems : [];
    return round2(items.reduce((sum: number, item: any) => {
        return sum + (Number(item?.item_total) || 0) + (Number(item?.tax_amount) || 0);
    }, 0));
}

function getMongoInvoiceTotal(order: any): number {
    const invoiceTotal = Number(order?.invoiceTotal);
    if (Number.isFinite(invoiceTotal)) return round2(invoiceTotal);
    return getMongoOrderTotal(order);
}

function getMongoDiscount(order: any): number {
    const orderTotal = getMongoOrderTotal(order);
    const invoiceTotal = getMongoInvoiceTotal(order);
    return round2(Math.max(orderTotal - invoiceTotal, 0));
}

function getZohoItemPrice(item: any): number {
    const qty = Number(item?.quantity) || 0;
    const rate = Number(item?.rate) || 0;
    const taxAmount = Number(item?.tax_amount) || 0;
    if (qty > 0) return round2(rate + (taxAmount / qty));
    return round2(rate);
}

function getZohoItemTax(item: any): number {
    const qty = Number(item?.quantity) || 1;
    const taxAmount = Number(item?.tax_amount) || Number(item?.item_tax) || 0;
    if (qty > 0) return round2(taxAmount / qty);

    const rate = Number(item?.rate) || 0;
    const taxPct = Number(item?.tax_percentage);
    if (Number.isFinite(taxPct)) return round2(rate * (taxPct / 100));

    const hsn = String(item?.hsn_or_sac || '');
    const mappedPct = HSN_TAX_RATES[hsn];
    if (Number.isFinite(mappedPct)) return round2(rate * (mappedPct / 100));

    return round2(taxAmount);
}

function getZohoItemTaxPct(item: any): number {
    if (item?.tax_percentage !== undefined) return Number(item.tax_percentage);
    const hsn = String(item?.hsn_or_sac || '');
    const mappedPct = HSN_TAX_RATES[hsn];
    if (Number.isFinite(mappedPct)) return mappedPct;
    return 0;
}

function getZohoOrderTotal(invoice: any): number {
    const subTotal = Number(invoice?.sub_total);
    const taxTotal = Number(invoice?.tax_total);
    if (Number.isFinite(subTotal) || Number.isFinite(taxTotal)) {
        return round2((Number.isFinite(subTotal) ? subTotal : 0) + (Number.isFinite(taxTotal) ? taxTotal : 0));
    }

    const items = Array.isArray(invoice?.invoice_items) ? invoice.invoice_items : (Array.isArray(invoice?.line_items) ? invoice.line_items : []);
    return round2(items.reduce((sum: number, item: any) => {
        return sum + ((Number(item?.item_total) || 0) + (Number(item?.tax_amount) || 0));
    }, 0));
}

function getZohoInvoiceTotal(invoice: any): number {
    const total = Number(invoice?.total);
    if (Number.isFinite(total)) return round2(total);
    return getZohoOrderTotal(invoice);
}

function getZohoDiscount(invoice: any): number {
    const orderTotal = getZohoOrderTotal(invoice);
    const invoiceTotal = getZohoInvoiceTotal(invoice);
    const explicitDiscount = Number(invoice?.discount_total);
    if (Number.isFinite(explicitDiscount) && explicitDiscount > 0) return round2(explicitDiscount);
    return round2(Math.max(orderTotal - invoiceTotal, 0));
}

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
    for (const order of orders) {
        if (order.orderId) map.set(order.orderId, order);
    }
    return map;
}

async function fetchZohoInvoiceSummaries(zoho: any, from: string, to: string) {
    console.log(dim(`Fetching invoices from Zoho Billing (${from} to ${to})...`));
    const all = await zoho.fetchAllInvoices({ dateStart: from, dateEnd: to });
    console.log(green(`✅ Found ${all.length} invoices in Zoho.`));

    const map = new Map<string, any>();
    for (const invoice of all) {
        if (invoice.status === 'void') continue;
        if (invoice.invoice_number) map.set(invoice.invoice_number, invoice);
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
            batch.map(async ({ number, id }) => {
                try {
                    const res = await zoho.getInvoice(id);
                    if (res.status === 200 && res.data?.invoice) {
                        return { number, invoice: res.data.invoice };
                    }
                } catch {
                    console.warn(yellow(`  ⚠ Failed to fetch Zoho details for ${number}`));
                }
                return null;
            })
        );

        for (const result of results) {
            if (result) details.set(result.number, result.invoice);
        }

        const progress = Math.min(i + BATCH_SIZE, invoiceIds.length);
        process.stdout.write(`\r  Fetched ${progress}/${invoiceIds.length} full invoices from Zoho...`);

        if (i + BATCH_SIZE < invoiceIds.length) {
            await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
        }
    }

    if (invoiceIds.length > 0) console.log('');
    return details;
}

async function main() {
    const args = parseCliArgs(process.argv.slice(2));

    console.log(bold('\n📦 Item-Level Invoice Export\n'));
    console.log(`Output:       ${cyan(args.output)}`);
    console.log(`Date Filter:  ${args.from} → ${args.to}`);
    if (args.dbOnly) console.log(yellow('Mode:         DB-only (skipping Zoho)'));

    const { Order, zoho } = await loadDependencies();

    const dbMap = await fetchMongoOrders(Order, args.from, args.to);

    let zohoMap = new Map<string, any>();
    if (!args.dbOnly) {
        zohoMap = await fetchZohoInvoiceSummaries(zoho, args.from, args.to);
    }

    const allInvoiceNumbers = new Set<string>([...dbMap.keys(), ...zohoMap.keys()]);
    console.log(dim(`\nTotal unique invoice numbers across systems: ${allInvoiceNumbers.size}`));

    const inBoth: string[] = [];
    const dbOnly: string[] = [];
    const zohoOnly: Array<{ number: string; id: string }> = [];

    for (const invoiceNumber of allInvoiceNumbers) {
        const inDb = dbMap.has(invoiceNumber);
        const inZoho = zohoMap.has(invoiceNumber);

        if (inDb && inZoho) {
            inBoth.push(invoiceNumber);
        } else if (inDb) {
            dbOnly.push(invoiceNumber);
        } else if (inZoho) {
            const zohoSummary = zohoMap.get(invoiceNumber);
            const zohoDate = toDateStr(zohoSummary?.date);
            if (isDateInRange(zohoDate, args.from, args.to)) {
                zohoOnly.push({ number: invoiceNumber, id: zohoSummary.invoice_id });
            }
        }
    }

    console.log(`  In both (Using DB):   ${green(String(inBoth.length))}`);
    console.log(`  DB only (Using DB):   ${green(String(dbOnly.length))}`);
    console.log(`  Zoho only (Using Zoho): ${yellow(String(zohoOnly.length))}`);

    let zohoFullDetails = new Map<string, any>();
    if (zohoOnly.length > 0) {
        console.log(dim('\nFetching full Zoho details for Zoho-only invoices...'));
        zohoFullDetails = await fetchZohoFullDetails(zoho, zohoOnly);
        console.log(green(`✅ Fetched ${zohoFullDetails.size} full invoice details.`));
    }

    console.log(dim('\nBuilding CSV rows...'));
    const rows: string[][] = [];
    rows.push([
        'Invoice Number',
        'Invoice Date',
        'Customer Name',
        'Customer Phone Number',
        'Astrologer Name',
        'Astrologer Phone Number',
        'Salesperson Name',
        'Address',
        'City',
        'State',
        'Pincode',
        'Item Name',
        'Quantity',
        'Price of Each Item',
        'Tax of Each Item',
        'Tax Percentage',
        'HSN Code',
        'Category of Each Item',
        'Cost Price',
        'Order Total',
        'Discount',
        'Invoice Total',
        'Fetched From',
    ]);

    const processMongoInvoice = (invoiceNumber: string) => {
        const order = dbMap.get(invoiceNumber);
        if (!order) return;

        const items = Array.isArray(order.invoiceItems) ? order.invoiceItems : [];
        const invoiceDate = formatDateDDMMYYYY(order.createdAt);
        const customerName = order.customerDetails?.customer_name || '';
        const customerPhone = extractMongoPhone(order);
        const astrologerName = extractMongoAstrologerName(order);
        const astrologerPhone = extractMongoAstrologerPhone(order);
        const salespersonName = order.salespersonName || '';
        const customerAddress = extractMongoAddress(order);
        const orderTotal = getMongoOrderTotal(order);
        const discount = getMongoDiscount(order);
        const invoiceTotal = getMongoInvoiceTotal(order);

        if (items.length === 0) {
            rows.push([
                escapeCsv(invoiceNumber),
                escapeCsv(invoiceDate),
                escapeCsv(customerName),
                escapeCsv(customerPhone),
                escapeCsv(astrologerName),
                escapeCsv(astrologerPhone),
                escapeCsv(salespersonName),
                escapeCsv(customerAddress.address),
                escapeCsv(customerAddress.city),
                escapeCsv(customerAddress.state),
                escapeCsv(customerAddress.pincode),
                escapeCsv(''),
                escapeCsv(''),
                escapeCsv(formatMoney(0)),
                escapeCsv(formatMoney(0)),
                escapeCsv('0%'),
                escapeCsv(''),
                escapeCsv('Unknown'),
                escapeCsv(''),
                escapeCsv(formatMoney(orderTotal)),
                escapeCsv(formatMoney(discount)),
                escapeCsv(formatMoney(invoiceTotal)),
                escapeCsv('DB'),
            ]);
            return;
        }

        for (const item of items) {
            const costPrice = Number(item?.cost_price);
            rows.push([
                escapeCsv(invoiceNumber),
                escapeCsv(invoiceDate),
                escapeCsv(customerName),
                escapeCsv(customerPhone),
                escapeCsv(astrologerName),
                escapeCsv(astrologerPhone),
                escapeCsv(salespersonName),
                escapeCsv(customerAddress.address),
                escapeCsv(customerAddress.city),
                escapeCsv(customerAddress.state),
                escapeCsv(customerAddress.pincode),
                escapeCsv(item?.name || ''),
                escapeCsv(item?.quantity || 1),
                escapeCsv(formatMoney(getMongoItemPrice(item))),
                escapeCsv(formatMoney(getMongoItemTax(item))),
                escapeCsv(`${getMongoItemTaxPct(item)}%`),
                escapeCsv(item?.hsn_or_sac || ''),
                escapeCsv(getCategoryFromHsn(item?.hsn_or_sac)),
                escapeCsv(Number.isFinite(costPrice) ? formatMoney(costPrice) : ''),
                escapeCsv(formatMoney(orderTotal)),
                escapeCsv(formatMoney(discount)),
                escapeCsv(formatMoney(invoiceTotal)),
                escapeCsv('DB'),
            ]);
        }
    };

    for (const invoiceNumber of inBoth) processMongoInvoice(invoiceNumber);
    for (const invoiceNumber of dbOnly) processMongoInvoice(invoiceNumber);

    // Pre-fetch customer details for Zoho-only invoices with missing addresses.
    // We collect customer_ids that need fetching, then batch-fetch them.
    const customerDetailsCache = new Map<string, any>();

    async function getZohoCustomerAddress(customerId: string): Promise<ExportAddress> {
        if (!customerId) return { address: '', city: '', state: '', pincode: '' };

        if (customerDetailsCache.has(customerId)) {
            const customer = customerDetailsCache.get(customerId);
            return extractCustomerAddress(customer);
        }

        try {
            const res = await zoho.getCustomer(customerId);
            if (res.status === 200 && res.data?.customer) {
                customerDetailsCache.set(customerId, res.data.customer);
                return extractCustomerAddress(res.data.customer);
            }
        } catch {
            console.warn(yellow(`  ⚠ Failed to fetch customer details for ${customerId}`));
        }

        return { address: '', city: '', state: '', pincode: '' };
    }

    function extractCustomerAddress(customer: any): ExportAddress {
        // Try shipping_address first, then billing_address
        const shipping = customer?.shipping_address || {};
        const billing = customer?.billing_address || {};
        const source = (shipping.street || shipping.address || shipping.city || shipping.state || shipping.zip)
            ? shipping
            : billing;

        return buildAddressFromSource(source);
    }

    let zohoWarnCount = 0;
    for (const { number: invoiceNumber } of zohoOnly) {
        const invoice = zohoFullDetails.get(invoiceNumber);
        if (!invoice) {
            zohoWarnCount++;
            continue;
        }

        const items = Array.isArray(invoice?.invoice_items) ? invoice.invoice_items : (Array.isArray(invoice?.line_items) ? invoice.line_items : []);
        const invoiceDate = formatDateDDMMYYYY(invoice.date);
        const customerName = invoice.customer_name || '';
        const customerPhone = extractZohoPhone(invoice);
        const salespersonName = invoice.salesperson_name || '';
        let customerAddress = extractZohoAddress(invoice);

        // If the invoice address is empty, try fetching from the customer record
        if (isAddressEmpty(customerAddress) && invoice.customer_id) {
            customerAddress = await getZohoCustomerAddress(invoice.customer_id);
        }

        const orderTotal = getZohoOrderTotal(invoice);
        const discount = getZohoDiscount(invoice);
        const invoiceTotal = getZohoInvoiceTotal(invoice);

        if (items.length === 0) {
            rows.push([
                escapeCsv(invoiceNumber),
                escapeCsv(invoiceDate),
                escapeCsv(customerName),
                escapeCsv(customerPhone),
                escapeCsv(''),
                escapeCsv(''),
                escapeCsv(salespersonName),
                escapeCsv(customerAddress.address),
                escapeCsv(customerAddress.city),
                escapeCsv(customerAddress.state),
                escapeCsv(customerAddress.pincode),
                escapeCsv(''),
                escapeCsv(''),
                escapeCsv(formatMoney(0)),
                escapeCsv(formatMoney(0)),
                escapeCsv('0%'),
                escapeCsv(''),
                escapeCsv('Unknown'),
                escapeCsv(''),
                escapeCsv(formatMoney(orderTotal)),
                escapeCsv(formatMoney(discount)),
                escapeCsv(formatMoney(invoiceTotal)),
                escapeCsv('Zoho'),
            ]);
            continue;
        }

        for (const item of items) {
            rows.push([
                escapeCsv(invoiceNumber),
                escapeCsv(invoiceDate),
                escapeCsv(customerName),
                escapeCsv(customerPhone),
                escapeCsv(''),
                escapeCsv(''),
                escapeCsv(salespersonName),
                escapeCsv(customerAddress.address),
                escapeCsv(customerAddress.city),
                escapeCsv(customerAddress.state),
                escapeCsv(customerAddress.pincode),
                escapeCsv(item?.name || ''),
                escapeCsv(item?.quantity || 1),
                escapeCsv(formatMoney(getZohoItemPrice(item))),
                escapeCsv(formatMoney(getZohoItemTax(item))),
                escapeCsv(`${getZohoItemTaxPct(item)}%`),
                escapeCsv(item?.hsn_or_sac || ''),
                escapeCsv(getCategoryFromHsn(item?.hsn_or_sac)),
                escapeCsv(''),
                escapeCsv(formatMoney(orderTotal)),
                escapeCsv(formatMoney(discount)),
                escapeCsv(formatMoney(invoiceTotal)),
                escapeCsv('Zoho'),
            ]);
        }
    }

    const csvContent = rows.map((row) => row.join(',')).join('\n');
    const outputPath = path.resolve(process.cwd(), args.output);
    fs.writeFileSync(outputPath, csvContent, 'utf-8');

    console.log(bold('\n━━━ Summary ━━━'));
    console.log(`Total exported rows: ${green(String(rows.length - 1))}`);
    if (zohoWarnCount > 0) {
        console.log(`Warnings:            ${yellow(String(zohoWarnCount))} (Zoho details fetch failed)`);
    }
    console.log(`\n📁 Saved to: ${cyan(outputPath)}`);

    process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
