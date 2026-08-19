import { NextRequest, NextResponse } from 'next/server';
import Order from '@/models/Order';
import connectDB from '@/lib/mongodb';
import { getPersistentOrders } from '@/lib/persistent-orders';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = (searchParams.get('q') || '').trim();
    const type = searchParams.get('type') || 'all';

    let dbOrders: any[] = [];

    try {
      await connectDB();
      let filter: any = {};

      if (query) {
        const qRegex = { $regex: query, $options: 'i' };
        if (type === 'orderId') {
          filter = {
            $or: [
              { orderId: qRegex },
              { zohoInvoiceId: qRegex },
              { waybill: qRegex }
            ]
          };
        } else if (type === 'customer') {
          filter = {
            $or: [
              { 'customerDetails.customer_name': qRegex },
              { 'customerDetails.phone': qRegex },
              { 'customerDetails.city': qRegex }
            ]
          };
        } else if (type === 'astrologer') {
          filter = { 'astrologerDetails.astrologerName': qRegex };
        } else {
          // Universal search
          filter = {
            $or: [
              { orderId: qRegex },
              { zohoInvoiceId: qRegex },
              { 'customerDetails.customer_name': qRegex },
              { 'customerDetails.phone': qRegex },
              { 'customerDetails.city': qRegex },
              { 'customerDetails.state': qRegex },
              { 'astrologerDetails.astrologerName': qRegex },
              { salespersonName: qRegex },
              { waybill: qRegex }
            ]
          };
        }
      }

      dbOrders = await Order.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    } catch (dbErr) {
      console.warn('MongoDB Search error (using fallback local store):', dbErr);
    }

    const localOrders = getPersistentOrders();
    const qLower = query.toLowerCase();

    const filteredLocal = localOrders.filter(o => {
      if (!query) return true;
      const orderId = (o.orderId || '').toLowerCase();
      const zohoId = (o.zohoInvoiceId || '').toLowerCase();
      const custName = (o.customerDetails?.customer_name || '').toLowerCase();
      const custPhone = (o.customerDetails?.phone || '').toLowerCase();
      const astroName = (o.astrologerDetails?.astrologerName || '').toLowerCase();
      const spName = (o.salespersonName || '').toLowerCase();

      if (type === 'orderId') return orderId.includes(qLower) || zohoId.includes(qLower);
      if (type === 'customer') return custName.includes(qLower) || custPhone.includes(qLower);
      if (type === 'astrologer') return astroName.includes(qLower);

      return (
        orderId.includes(qLower) ||
        zohoId.includes(qLower) ||
        custName.includes(qLower) ||
        custPhone.includes(qLower) ||
        astroName.includes(qLower) ||
        spName.includes(qLower)
      );
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
