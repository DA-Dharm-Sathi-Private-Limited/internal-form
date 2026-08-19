import { NextRequest, NextResponse } from 'next/server';
import { getInvoicePdf } from '@/lib/zoho';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import mongoose from 'mongoose';
import { withError, fail } from '@/lib/api-handler';

function generateHtmlInvoice(order: any): string {
  const customer = order.customerDetails || {};
  const items = order.invoiceItems || [];
  const dateStr = new Date(order.createdAt || Date.now()).toLocaleDateString('en-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });

  const grandTotal = order.invoiceTotal || items.reduce((acc: number, it: any) => acc + ((it.final_price || it.rate || 0) * (it.quantity || 1)), 0);

  const rows = items.map((it: any, idx: number) => {
    const qty = it.quantity || 1;
    const finalPrice = it.final_price || it.rate || 0;
    const preTax = it.price || Math.round((finalPrice / 1.03) * 100) / 100;
    const taxAmt = it.tax_amount || Math.round((finalPrice - preTax) * 100) / 100;
    const lineTotal = (finalPrice * qty).toFixed(2);

    return `
      <tr>
        <td style="padding:8px; border:1px solid #ddd; text-align:center;">${idx + 1}</td>
        <td style="padding:8px; border:1px solid #ddd; font-weight:bold;">${it.name || 'Item'}</td>
        <td style="padding:8px; border:1px solid #ddd; text-align:center;">${it.hsn_or_sac || '71179090'}</td>
        <td style="padding:8px; border:1px solid #ddd; text-align:center;">${qty}</td>
        <td style="padding:8px; border:1px solid #ddd; text-align:right;">₹${preTax.toFixed(2)}</td>
        <td style="padding:8px; border:1px solid #ddd; text-align:right;">₹${(taxAmt * qty).toFixed(2)}</td>
        <td style="padding:8px; border:1px solid #ddd; text-align:right; font-weight:bold;">₹${lineTotal}</td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Tax Invoice - ${order.orderId || 'HP-INV'}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f4f4f5; padding: 20px; margin: 0; color: #18181b; }
    .invoice-card { max-width: 800px; margin: 0 auto; background: #fff; border: 1px solid #e4e4e7; border-radius: 12px; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #18181b; padding-bottom: 16px; margin-bottom: 24px; }
    .title { font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; text-align: right; }
    .company { font-size: 14px; font-weight: bold; }
    .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
    th { background: #f1f5f9; padding: 10px; border: 1px solid #cbd5e1; text-align: left; }
    .total-box { text-align: right; font-size: 18px; font-weight: bold; margin-top: 16px; color: #6d28d9; }
    .btn-bar { max-width: 800px; margin: 0 auto 16px auto; display: flex; justify-content: flex-end; gap: 12px; }
    .btn { padding: 10px 20px; background: #7c3aed; color: #fff; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 14px; }
    @media print { .btn-bar { display: none; } body { background: #fff; padding: 0; } .invoice-card { border: none; box-shadow: none; } }
  </style>
</head>
<body>
  <div class="btn-bar">
    <button class="btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
  </div>
  <div class="invoice-card">
    <div class="header">
      <div>
        <div class="company">D A Dharm Sathi Private Limited</div>
        <div style="font-size:12px; color:#64748b;">GSTIN: 06AALCD7494B1ZI</div>
        <div style="font-size:12px; color:#64748b;">namaste@humarapandit.com</div>
      </div>
      <div>
        <div class="title">TAX INVOICE</div>
        <div style="font-size:13px; text-align:right; font-weight:bold; color:#475569;"># ${order.orderId || 'HP-INV'}</div>
        <div style="font-size:12px; text-align:right; color:#64748b;">Date: ${dateStr}</div>
      </div>
    </div>

    <div class="details-grid">
      <div>
        <strong>Bill To / Ship To:</strong><br/>
        <span style="font-size:15px; font-weight:bold;">${customer.customer_name || 'Customer'}</span><br/>
        ${customer.address || ''}, ${customer.city || ''}, ${customer.state || ''} - ${customer.pincode || ''}<br/>
        📱 Phone: +91${customer.phone || ''}
      </div>
      <div>
        <strong>Payment Mode:</strong> ${order.paymentMode || 'Prepaid'}<br/>
        <strong>Salesperson:</strong> ${order.salespersonName || 'Direct'}<br/>
        ${order.astrologerDetails?.astrologerName ? `<strong>Astrologer Partner:</strong> ${order.astrologerDetails.astrologerName}` : ''}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:30px; text-align:center;">#</th>
          <th>Description</th>
          <th style="text-align:center;">HSN/SAC</th>
          <th style="text-align:center;">Qty</th>
          <th style="text-align:right;">Rate</th>
          <th style="text-align:right;">GST Tax</th>
          <th style="text-align:right;">Total (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <div class="total-box">
      Grand Total: ₹${Number(grandTotal).toFixed(2)}
    </div>
  </div>
  <script>
    // Auto prompt print/save on load if requested
    if (window.location.search.includes('print=true')) {
      window.onload = function() { window.print(); };
    }
  </script>
</body>
</html>`;
}

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

  // 1. If test/local ID, immediately return clean HTML invoice
  if (zohoInvoiceId.startsWith('TEST-') || zohoInvoiceId.startsWith('zoho_') || !zohoInvoiceId) {
    if (order) {
      const htmlInvoice = generateHtmlInvoice(order);
      return new NextResponse(htmlInvoice, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `inline; filename="invoice-${id}.html"`,
        },
      });
    }
  }

  // 2. Try fetching PDF from Zoho Billing API
  try {
    const pdfBuffer = await getInvoicePdf(zohoInvoiceId);
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${id}.pdf"`,
        'Content-Length': String(pdfBuffer.byteLength),
      },
    });
  } catch (err) {
    console.warn(`Zoho PDF fetch failed for ${zohoInvoiceId}, serving generated fallback invoice:`, err);
    if (order) {
      const htmlInvoice = generateHtmlInvoice(order);
      return new NextResponse(htmlInvoice, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `inline; filename="invoice-${id}.html"`,
        },
      });
    }
    return fail(`Failed to download invoice for ID: ${id}`, 404);
  }
});
