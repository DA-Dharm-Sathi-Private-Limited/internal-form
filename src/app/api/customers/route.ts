import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Customer from '@/models/Customer';
import Order from '@/models/Order';
import { withError, fail } from '@/lib/api-handler';

export const GET = withError(async (request: NextRequest) => {
  const q = request.nextUrl.searchParams.get('q') || '';

  if (q.length < 2) {
    return NextResponse.json({ customers: [] });
  }

  await connectDB();

  const regex = new RegExp(q, 'i');

  // 1. Search Customer collection in MongoDB
  const dbCustomers = await Customer.find({
    $or: [
      { display_name: regex },
      { phone: regex },
      { 'billing_address.city': regex }
    ]
  }).limit(10).lean();

  const results: any[] = [...dbCustomers];

  // 2. Also search previous Order records in MongoDB for customer suggestions
  if (results.length < 10) {
    const previousOrders = await Order.find({
      $or: [
        { 'customerDetails.customer_name': regex },
        { 'customerDetails.phone': regex },
        { 'customerDetails.city': regex }
      ]
    }).sort({ createdAt: -1 }).limit(10).lean();

    previousOrders.forEach(o => {
      const cd = o.customerDetails;
      if (cd && cd.customer_name) {
        const exists = results.some(r => (r.display_name || '').toLowerCase() === cd.customer_name.toLowerCase());
        if (!exists) {
          results.push({
            customer_id: o.orderId || `CUST-${Date.now()}`,
            display_name: cd.customer_name,
            phone: cd.phone || '',
            email: cd.email || '',
            address: cd.address || '',
            pincode: cd.pincode || '',
            city: cd.city || '',
            state: cd.state || '',
            billing_address: {
              attention: cd.customer_name,
              address: cd.address || '',
              city: cd.city || '',
              state: cd.state || '',
              zip: cd.pincode || '',
              pincode: cd.pincode || '',
              country: cd.country || 'India'
            }
          });
        }
      }
    });
  }

  return NextResponse.json({ customers: results.slice(0, 10) }, { status: 200 });
});

export const POST = withError(async (request: NextRequest) => {
  const body = await request.json();

  const displayName = (body.display_name || body.customer_name || 'Direct Customer').trim();
  const phone = (body.phone || body.mobile || '').replace(/[^\d]/g, '').slice(-10);

  await connectDB();

  // 1. Check if customer already exists in MongoDB
  let existing = await Customer.findOne({
    $or: [
      { display_name: new RegExp(`^${displayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      ...(phone ? [{ phone }] : [])
    ]
  });

  if (existing) {
    return NextResponse.json({
      code: 0,
      message: 'Existing customer reused (Native Engine)',
      customer: existing,
      contact: existing
    }, { status: 200 });
  }

  // 2. Create native customer record in MongoDB
  const customerId = `CUST-${Date.now()}`;
  const newCustomer = await Customer.create({
    customer_id: customerId,
    display_name: displayName,
    phone: phone,
    email: body.email || '',
    company_name: body.company_name || displayName,
    gst_treatment: body.gst_treatment || 'consumer',
    gst_no: body.gst_no || '',
    billing_address: {
      attention: body.billing_address?.attention || displayName,
      address: body.billing_address?.address || body.billing_address?.street || body.address || '',
      street2: body.billing_address?.street2 || body.billing_address?.address2 || '',
      city: body.billing_address?.city || body.city || '',
      state: body.billing_address?.state || body.state || '',
      zip: body.billing_address?.zip || body.billing_address?.pincode || body.pincode || '',
      country: body.billing_address?.country || 'India',
    }
  });

  return NextResponse.json({
    code: 0,
    message: 'Customer created successfully (Native Engine)',
    customer: newCustomer,
    contact: newCustomer
  }, { status: 200 });
});
