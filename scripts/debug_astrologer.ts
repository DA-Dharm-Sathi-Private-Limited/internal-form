import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '../.env.local' });

async function main() {
    const { default: connectDB } = await import('../src/lib/mongodb');
    const { default: Order } = await import('../src/models/Order');
    await connectDB();

    // Look at orders after INV-000700 (recent ones with astrologer details)
    const orders = await Order.find({
        createdAt: { $gte: new Date('2026-01-01'), $lte: new Date('2026-04-30') }
    }).sort({ createdAt: -1 }).lean() as any[];

    console.log(`Total orders: ${orders.length}\n`);

    // Filter for orders with orderId >= INV-000700
    const recentOrders = orders.filter((o: any) => {
        const num = parseInt(o.orderId?.replace('INV-', '') || '0', 10);
        return num >= 700;
    });

    console.log(`Orders with INV >= 700: ${recentOrders.length}\n`);

    for (const order of recentOrders.slice(0, 15)) {
        const raw = (order as any).astrologerDetails;
        console.log(`--- ${order.orderId} ---`);
        console.log(`  typeof astrologerDetails: ${typeof raw}`);
        console.log(`  value:`, JSON.stringify(raw));
        // Also dump all top-level keys to see if it's stored differently
        const allKeys = Object.keys(order);
        const astroKeys = allKeys.filter(k => k.toLowerCase().includes('astro'));
        if (astroKeys.length > 0) {
            console.log(`  astro-related keys:`, astroKeys);
            for (const k of astroKeys) console.log(`    ${k}:`, JSON.stringify((order as any)[k]));
        }
        console.log('');
    }

    // Also try raw MongoDB query bypassing Mongoose schema filtering
    const mongoose = (await import('mongoose')).default;
    const db = mongoose.connection.db;
    if (db) {
        console.log('\n=== RAW MongoDB check (bypassing Mongoose schema) ===\n');
        const rawOrders = await db.collection('orders').find({
            orderId: { $regex: /^INV-000[7-9]/ }
        }).limit(10).toArray();

        console.log(`Raw orders found: ${rawOrders.length}\n`);
        for (const order of rawOrders) {
            console.log(`--- ${order.orderId} ---`);
            console.log(`  All keys:`, Object.keys(order));
            // Print any field containing "astro"
            for (const [k, v] of Object.entries(order)) {
                if (k.toLowerCase().includes('astro')) {
                    console.log(`  ${k}:`, JSON.stringify(v));
                }
            }
            console.log('');
        }
    }

    process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
