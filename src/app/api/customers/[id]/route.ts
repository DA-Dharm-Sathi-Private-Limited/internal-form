import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Customer from '@/models/Customer';
import { withError, fail } from '@/lib/api-handler';

export const GET = withError(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const resolvedParams = await params;
  await connectDB();

  const customer = await Customer.findOne({
    $or: [
      { customer_id: resolvedParams.id },
      { _id: resolvedParams.id }
    ]
  }).lean();

  if (customer) {
    return NextResponse.json({ customer }, { status: 200 });
  }

  return NextResponse.json({
    customer: {
      customer_id: resolvedParams.id,
      display_name: 'Customer',
    }
  }, { status: 200 });
});

export const PUT = withError(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const resolvedParams = await params;
  const body = await request.json();

  await connectDB();

  const updateFields: Record<string, unknown> = {};

  if (body.phone) updateFields.phone = String(body.phone).replace(/[^\d]/g, '').slice(-10);
  if (body.display_name) updateFields.display_name = body.display_name;
  if (body.billing_address) {
    updateFields.billing_address = {
      attention: body.billing_address.attention || body.display_name || '',
      address: body.billing_address.address || body.billing_address.street || '',
      street2: body.billing_address.street2 || body.billing_address.address2 || '',
      city: body.billing_address.city || '',
      state: body.billing_address.state || '',
      zip: body.billing_address.zip || body.billing_address.pincode || '',
      country: body.billing_address.country || 'India',
    };
  }

  const updated = await Customer.findOneAndUpdate(
    { customer_id: resolvedParams.id },
    { $set: updateFields },
    { new: true, upsert: true }
  );

  return NextResponse.json({ customer: updated }, { status: 200 });
});
