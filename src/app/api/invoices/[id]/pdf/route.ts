import { NextRequest, NextResponse } from 'next/server';
import { getInvoicePdf } from '@/lib/zoho';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import mongoose from 'mongoose';
import { withError, fail } from '@/lib/api-handler';

export const GET = withError(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;

  if (!id) {
    return fail('Invoice ID is required', 400);
  }

  await connectDB();
  let zohoInvoiceId = id;

  const order = await Order.findOne({
    $or: [
      { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
      { zohoInvoiceId: id },
      { orderId: id }
    ]
  });

  if (order && order.zohoInvoiceId) {
    zohoInvoiceId = order.zohoInvoiceId;
  }

  const pdfBuffer = await getInvoicePdf(zohoInvoiceId);

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${id}.pdf"`,
      'Content-Length': String(pdfBuffer.byteLength),
    },
  });
});
