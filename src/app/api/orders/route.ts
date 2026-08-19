import { NextRequest, NextResponse } from 'next/server';
import Order from '@/models/Order';
import connectDB from '@/lib/mongodb';
import { getPersistentOrders, savePersistentOrder } from '@/lib/persistent-orders';

export async function GET(request: NextRequest) {
  try {
    const showAll = request.nextUrl.searchParams.get('all') === 'true';
    let dbOrders: any[] = [];
    
    try {
      await connectDB();
      const filter = showAll ? {} : { status: { $in: ['PENDING_SHIPPING', 'PARTIALLY_SHIPPED'] } };
      dbOrders = await Order.find(filter).sort({ createdAt: -1 }).lean();
    } catch {
      // MongoDB offline
    }

    const localOrders = getPersistentOrders();
    const allOrders = [...dbOrders, ...localOrders];

    return NextResponse.json({ success: true, orders: allOrders });
  } catch (err) {
    console.error('Error fetching orders:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    let savedOrder: any = null;

    try {
      await connectDB();
      savedOrder = await Order.create(data);
    } catch {
      // MongoDB offline - save to persistent JSON store
      savedOrder = savePersistentOrder(data);
    }

    return NextResponse.json({ success: true, order: savedOrder }, { status: 201 });
  } catch (err) {
    console.error('Error creating order:', err);
    return NextResponse.json({ success: false, error: 'Failed to create order' }, { status: 500 });
  }
}
