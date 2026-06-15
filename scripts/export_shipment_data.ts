/**
 * export_shipment_data.ts
 *
 * Exports a shipment-level CSV from MongoDB orders.
 * Each row represents a single shipment from the order's `shipments` array.
 *
 * CSV columns:
 *   Date (DD/MM/YYYY),
 *   Order ID,
 *   Shipment Type (Delhivery / DTDC / Self),
 *   Vendor,
 *   Warehouse,
 *   Delivery Partner.
 *
 * Since shipment data is stored exclusively in MongoDB, Zoho is not called.
 *
 * Usage:
 *   npx tsx scripts/export_shipment_data.ts
 *   npx tsx scripts/export_shipment_data.ts --from=2026-01-01 --to=2026-06-30 --output=shipment_data.csv
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '../.env.local' });

import fs from 'fs';
import path from 'path';

const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;

interface CliArgs {
    output: string;
    from: string;
    to: string;
}

function parseCliArgs(argv: string[]): CliArgs {
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const defaultTo = endOfMonth.toISOString().split('T')[0];

    const args: CliArgs = {
        output: 'shipment_data.csv',
        from: '2026-01-01',
        to: defaultTo,
    };

    for (const raw of argv) {
        if (raw.startsWith('--output=')) args.output = raw.split('=')[1];
        else if (raw.startsWith('--from=')) args.from = raw.split('=')[1];
        else if (raw.startsWith('--to=')) args.to = raw.split('=')[1];
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

function formatDateDDMMYYYY(value: string | Date | undefined | null): string {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

/**
 * Derive a high-level shipment type from the deliveryPartner field.
 *   - 'Delhivery' → 'Delhivery'
 *   - 'DTDC'      → 'DTDC'
 *   - 'SELF'      → 'Self'
 *   - anything else → the raw value (covers all SHIPPING_PROVIDERS)
 */
function getShipmentType(deliveryPartner: string | undefined | null): string {
    if (!deliveryPartner) return '';
    const upper = deliveryPartner.trim().toUpperCase();
    if (upper === 'DELHIVERY') return 'Delhivery';
    if (upper === 'DTDC') return 'DTDC';
    if (upper === 'SELF') return 'Self';
    return deliveryPartner.trim();
}

async function main() {
    const args = parseCliArgs(process.argv.slice(2));

    console.log(bold('\n📦 Shipment-Level Export\n'));
    console.log(`Output:       ${cyan(args.output)}`);
    console.log(`Date Filter:  ${args.from} → ${args.to}`);

    // Load dependencies
    console.log(dim('Loading dependencies...'));
    const [{ default: connectDB }, { default: Order }] = await Promise.all([
        import('../src/lib/mongodb'),
        import('../src/models/Order'),
    ]);
    await connectDB();
    console.log(green('✅ MongoDB connected.'));

    // Fetch orders
    console.log(dim(`Fetching orders from MongoDB (${args.from} to ${args.to})...`));

    const query: Record<string, any> = {};
    const dateRange: Record<string, any> = {};
    if (args.from) dateRange.$gte = new Date(args.from);
    if (args.to) {
        const toDate = new Date(args.to);
        toDate.setHours(23, 59, 59, 999);
        dateRange.$lte = toDate;
    }
    query.createdAt = dateRange;

    const orders = await Order.find(query).lean() as any[];
    console.log(green(`✅ Found ${orders.length} orders in MongoDB.`));

    // Build CSV
    console.log(dim('\nBuilding CSV rows...'));
    const rows: string[][] = [];
    rows.push([
        'Date',
        'Order ID',
        'Shipment Type',
        'Vendor',
        'Warehouse',
        'Delivery Partner',
    ]);

    let shipmentCount = 0;
    let ordersWithShipments = 0;

    for (const order of orders) {
        const shipments = Array.isArray(order.shipments) ? order.shipments : [];
        if (shipments.length === 0) continue;

        ordersWithShipments++;

        for (const shipment of shipments) {
            // Use shipment-level createdAt if available, else fall back to order createdAt
            const shipmentDate = formatDateDDMMYYYY(shipment.createdAt || order.createdAt);
            const orderId = order.orderId || '';
            const deliveryPartner = shipment.deliveryPartner || '';
            const shipmentType = getShipmentType(deliveryPartner);
            const vendor = shipment.vendor || '';
            const warehouse = shipment.warehouse || '';

            rows.push([
                escapeCsv(shipmentDate),
                escapeCsv(orderId),
                escapeCsv(shipmentType),
                escapeCsv(vendor),
                escapeCsv(warehouse),
                escapeCsv(deliveryPartner),
            ]);

            shipmentCount++;
        }
    }

    // Write CSV
    const csvContent = rows.map((row) => row.join(',')).join('\n');
    const outputPath = path.resolve(process.cwd(), args.output);
    fs.writeFileSync(outputPath, csvContent, 'utf-8');

    console.log(bold('\n━━━ Summary ━━━'));
    console.log(`Total orders with shipments: ${green(String(ordersWithShipments))}`);
    console.log(`Total shipment rows:         ${green(String(shipmentCount))}`);
    console.log(`\n📁 Saved to: ${cyan(outputPath)}`);

    process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
