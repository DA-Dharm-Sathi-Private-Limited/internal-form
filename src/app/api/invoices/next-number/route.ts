import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import { withError } from '@/lib/api-handler';

export async function fetchNextInvoiceNumber(): Promise<string> {
  await connectDB();
  
  // Find highest existing invoice number
  const latestOrders = await Order.find({
    $or: [
      { orderId: { $regex: /INV-\d+/i } },
      { zohoInvoiceId: { $regex: /INV-\d+/i } }
    ]
  })
  .sort({ createdAt: -1 })
  .limit(100)
  .lean();

  let maxNum = 1129; // Baseline from MongoDB
  for (const o of latestOrders) {
    const matchOrder = o.orderId?.match(/INV-(\d+)/i);
    if (matchOrder) {
      const num = parseInt(matchOrder[1], 10);
      if (num > maxNum && num < 900000) maxNum = num;
    }
    const matchZoho = o.zohoInvoiceId?.match(/INV-(\d+)/i);
    if (matchZoho) {
      const num = parseInt(matchZoho[1], 10);
      if (num > maxNum && num < 900000) maxNum = num;
    }
  }

  const nextNum = maxNum + 1;
  return `INV-${String(nextNum).padStart(6, '0')}`;
}

export const GET = withError(async () => {
  const nextInvoiceNumber = await fetchNextInvoiceNumber();
  return NextResponse.json({ invoiceNumber: nextInvoiceNumber }, { status: 200 });
});
