import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import connectDB from '../src/lib/mongodb';
import Order from '../src/models/Order';

async function test() {
    await connectDB();
    const order = await Order.findOne({ orderId: 'INV-000296' }).lean();
    console.log("DB Order INV-000296 invoiceItems:");
    console.log(JSON.stringify(order.invoiceItems, null, 2));
    process.exit(0);
}
test();
