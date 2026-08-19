import { NextRequest, NextResponse } from 'next/server';
import Order from '@/models/Order';
import connectDB from '@/lib/mongodb';
import { getPersistentOrders } from '@/lib/persistent-orders';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const type = searchParams.get('type') || 'customer';

    if (!query.trim()) {
      return NextResponse.json({ success: true, orders: [] });
    }

    const q = query.trim().toLowerCase();
    let dbOrders: any[] = [];

    try {
      await connectDB();
      let filter = {};
      if (type === 'orderId') {
        filter = { orderId: { $regex: q, $options: 'i' } };
      } else if (type === 'customer') {
        filter = { 'customerDetails.customer_name': { $regex: q, $options: 'i' } };
      } else if (type === 'astrologer') {
        filter = { 'astrologerDetails.astrologerName': { $regex: q, $options: 'i' } };
      }
      dbOrders = await Order.find(filter).sort({ createdAt: -1 }).limit(50).lean();
    } catch {
      // Offline fallback
    }

    const localOrders = getPersistentOrders();
    const filteredLocal = localOrders.filter(o => {
      if (type === 'orderId') {
        return (o.orderId || '').toLowerCase().includes(q) || (o.zohoInvoiceId || '').toLowerCase().includes(q);
      } else if (type === 'customer') {
        return (o.customerDetails?.customer_name || '').toLowerCase().includes(q) || (o.customerDetails?.phone || '').includes(q);
      } else if (type === 'astrologer') {
        return (o.astrologerDetails?.astrologerName || '').toLowerCase().includes(q);
      }
      return true;
    });

    const orderMap = new Map<string, any>();
    [...dbOrders, ...filteredLocal].forEach(o => {
      const key = o.orderId || o.zohoInvoiceId || String(o._id);
      if (!orderMap.has(key)) {
        orderMap.set(key, o);
      }
    });

    return NextResponse.json({ success: true, orders: Array.from(orderMap.values()) });
  } catch (err) {
    console.error('Search API Error:', err);
    return NextResponse.json({ success: false, error: 'Search failed' }, { status: 500 });
  }
}
