import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const INVOICE_NUMBERS = [
    'INV-000227', 'INV-000228', 'INV-000231', 'INV-000247',
    'INV-000251', 'INV-000256', 'INV-000259', 'INV-000261',
    'INV-000262', 'INV-000454', 'INV-000326', 'INV-000328',
    'INV-000332', 'INV-000333', 'INV-000334', 'INV-000343',
    'INV-000357', 'INV-000386', 'INV-000400', 'INV-000406',
    'INV-000435', 'INV-000397',
];

async function main() {
    await mongoose.connect(process.env.MONGODB_URI as string);
    const col = mongoose.connection.collection('orders');

    const orders = await col.find(
        { orderId: { $in: INVOICE_NUMBERS } },
        { projection: { orderId: 1, shipments: 1 } }
    ).toArray();

    for (const order of orders) {
        console.log(`\n${order.orderId}`);
        const shipments = (order.shipments as any[]) || [];
        if (shipments.length === 0) {
            console.log('  No shipments');
        }
        for (const s of shipments) {
            console.log(`  vendor: ${s.vendor ?? '—'}  |  warehouse: ${s.warehouse ?? '—'}`);
        }
    }

    const foundIds = new Set(orders.map(o => o.orderId));
    const missing = INVOICE_NUMBERS.filter(id => !foundIds.has(id));
    if (missing.length) console.log('\nNot found:', missing.join(', '));

    await mongoose.disconnect();
}

main().catch(console.error);