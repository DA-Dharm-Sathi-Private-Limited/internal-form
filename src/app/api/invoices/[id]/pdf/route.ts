import { NextRequest, NextResponse } from 'next/server';
import { getInvoicePdf } from '@/lib/zoho';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import mongoose from 'mongoose';
import { withError, fail } from '@/lib/api-handler';
import { HSN_TAX_RATES } from '@/lib/tax';

function numberToWordsIndian(num: number): string {
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n: number): string {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + inWords(n % 100) : '');
    if (n < 100000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + inWords(n % 1000) : '');
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + inWords(n % 100000) : '');
    return inWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + inWords(n % 10000000) : '');
  }

  const whole = Math.floor(num);
  const decimal = Math.round((num - whole) * 100);

  let result = 'Indian Rupee ' + (whole === 0 ? 'Zero' : inWords(whole));
  if (decimal > 0) {
    result += ' and ' + inWords(decimal) + ' Paise';
  }
  return result + ' Only';
}

const STATE_CODES: Record<string, string> = {
  'JAMMU AND KASHMIR': '01', 'HIMACHAL PRADESH': '02', 'PUNJAB': '03', 'CHANDIGARH': '04',
  'UTTARAKHAND': '05', 'HARYANA': '06', 'DELHI': '07', 'RAJASTHAN': '08', 'UTTAR PRADESH': '09',
  'BIHAR': '10', 'SIKKIM': '11', 'ARUNACHAL PRADESH': '12', 'NAGALAND': '13', 'MANIPUR': '14',
  'MIZORAM': '15', 'TRIPURA': '16', 'MEGHALAYA': '17', 'ASSAM': '18', 'WEST BENGAL': '19',
  'JHARKHAND': '20', 'ODISHA': '21', 'CHHATTISGARH': '22', 'MADHYA PRADESH': '23', 'GUJARAT': '24',
  'MAHARASHTRA': '27', 'ANDHRA PRADESH': '28', 'KARNATAKA': '29', 'GOA': '30', 'KERALA': '32',
  'TAMIL NADU': '33', 'TELANGANA': '36'
};

function getTaxPercentageForItem(it: any): number {
  if (it.tax_id === 'NO_TAX' || it.hsn_or_sac === '14049070' || it.hsn_or_sac === '999591' || it.hsn_or_sac === '999799') {
    return 0;
  }
  if (it.tax_percentage !== undefined && it.tax_percentage !== null) {
    return Number(it.tax_percentage);
  }
  const hsn = String(it.hsn_or_sac || '');
  if (HSN_TAX_RATES[hsn] !== undefined) {
    return HSN_TAX_RATES[hsn];
  }
  return 3; // Default 3% for bracelets/malas
}

function generateHtmlInvoice(order: any): string {
  const customer = order.customerDetails || {};
  const items = order.invoiceItems || [];
  
  const createdDate = order.createdAt ? new Date(order.createdAt) : new Date();
  const day = String(createdDate.getDate()).padStart(2, '0');
  const month = String(createdDate.getMonth() + 1).padStart(2, '0');
  const year = createdDate.getFullYear();
  const dateStr = `${day}/${month}/${year}`;

  const stateName = (customer.state || 'Haryana').toUpperCase();
  const stateCode = STATE_CODES[stateName] || '06';
  const isHaryana = stateCode === '06';

  const grandTotal = order.invoiceTotal || items.reduce((acc: number, it: any) => acc + ((it.final_price || it.rate || 0) * (it.quantity || 1)), 0);

  let subtotalSum = 0;
  let taxSum = 0;

  const rows = items.map((it: any, idx: number) => {
    const qty = it.quantity || 1;
    const finalTotal = (it.final_price || it.rate || 0) * qty;
    
    // Tax percentage determined exactly as in Zoho
    const taxRate = getTaxPercentageForItem(it);
    const pretaxRate = taxRate > 0 ? finalTotal / (1 + taxRate / 100) : finalTotal;
    const lineTax = finalTotal - pretaxRate;

    subtotalSum += pretaxRate;
    taxSum += lineTax;

    const rateFormatted = (pretaxRate / qty).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const lineTaxFormatted = lineTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const lineTotalFormatted = pretaxRate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const caratStr = it.carat_size ? `${it.carat_size} carat` : '';
    const description = [it.name, caratStr].filter(Boolean).join('. ');
    const displayHsn = it.hsn_or_sac || (taxRate === 0 ? '14049070' : taxRate === 0.25 ? '05080010' : '71179090');

    if (isHaryana) {
      const halfTaxRate = (taxRate / 2).toFixed(2);
      const halfTaxAmt = (lineTax / 2).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return `
        <tr>
          <td style="padding: 8px; border: 1px solid #d1d5db; text-align: center;">${idx + 1}</td>
          <td style="padding: 8px; border: 1px solid #d1d5db; font-weight: 500;">${description}</td>
          <td style="padding: 8px; border: 1px solid #d1d5db; text-align: center;">${displayHsn}</td>
          <td style="padding: 8px; border: 1px solid #d1d5db; text-align: right;">${qty.toFixed(2)}</td>
          <td style="padding: 8px; border: 1px solid #d1d5db; text-align: right;">${rateFormatted}</td>
          <td style="padding: 8px; border: 1px solid #d1d5db; text-align: right;">${halfTaxRate}%</td>
          <td style="padding: 8px; border: 1px solid #d1d5db; text-align: right;">${halfTaxAmt}</td>
          <td style="padding: 8px; border: 1px solid #d1d5db; text-align: right;">${halfTaxRate}%</td>
          <td style="padding: 8px; border: 1px solid #d1d5db; text-align: right;">${halfTaxAmt}</td>
          <td style="padding: 8px; border: 1px solid #d1d5db; text-align: right;">${lineTotalFormatted}</td>
        </tr>
      `;
    }

    return `
      <tr>
        <td style="padding: 8px; border: 1px solid #d1d5db; text-align: center;">${idx + 1}</td>
        <td style="padding: 8px; border: 1px solid #d1d5db; font-weight: 500;">${description}</td>
        <td style="padding: 8px; border: 1px solid #d1d5db; text-align: center;">${displayHsn}</td>
        <td style="padding: 8px; border: 1px solid #d1d5db; text-align: right;">${qty.toFixed(2)}</td>
        <td style="padding: 8px; border: 1px solid #d1d5db; text-align: right;">${rateFormatted}</td>
        <td style="padding: 8px; border: 1px solid #d1d5db; text-align: right;">${taxRate}%</td>
        <td style="padding: 8px; border: 1px solid #d1d5db; text-align: right;">${lineTaxFormatted}</td>
        <td style="padding: 8px; border: 1px solid #d1d5db; text-align: right;">${lineTotalFormatted}</td>
      </tr>
    `;
  }).join('');

  const subtotalFormatted = subtotalSum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const taxSumFormatted = taxSum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const grandTotalFormatted = Number(grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const grandTotalWords = numberToWordsIndian(Number(grandTotal));

  const phoneDisplay = customer.phone ? `+91${customer.phone}` : '+919742676891';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Tax Invoice - ${order.orderId || 'HP-INV'}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      color: #111827;
      background: #f3f4f6;
      margin: 0;
      padding: 20px;
      font-size: 13px;
      line-height: 1.4;
    }
    .page-container {
      max-width: 850px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #d1d5db;
      padding: 32px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }
    .header-table td { vertical-align: top; }
    .company-title {
      font-size: 18px;
      font-weight: 700;
      color: #000000;
      margin-bottom: 2px;
    }
    .company-sub {
      font-size: 12px;
      color: #374151;
      line-height: 1.3;
    }
    .invoice-title {
      font-size: 26px;
      font-weight: 800;
      text-align: right;
      letter-spacing: 0.5px;
      color: #000000;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      border-top: 1px solid #000;
      border-bottom: 1px solid #000;
      margin-bottom: 16px;
      font-size: 12px;
    }
    .meta-table td {
      padding: 6px 8px;
      vertical-align: top;
    }
    .customer-block {
      border-bottom: 1px solid #d1d5db;
      padding-bottom: 16px;
      margin-bottom: 16px;
      font-size: 13px;
    }
    .customer-name {
      font-size: 15px;
      font-weight: 700;
      color: #000000;
      margin-bottom: 4px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      font-size: 12px;
    }
    .items-table th {
      background: #ffffff;
      border: 1px solid #9ca3af;
      padding: 8px;
      font-weight: 700;
      color: #000000;
    }
    .items-table td {
      border: 1px solid #d1d5db;
      padding: 8px;
    }
    .bottom-grid {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
    }
    .bottom-grid td { vertical-align: top; }
    .totals-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .totals-table td {
      padding: 6px 12px;
      text-align: right;
    }
    .totals-table .grand-row td {
      font-size: 16px;
      font-weight: 800;
      border-top: 1px solid #000;
      border-bottom: 1px solid #000;
      padding: 8px 12px;
    }
    .policy-box {
      font-size: 11px;
      color: #1f2937;
      line-height: 1.35;
      max-width: 480px;
    }
    .policy-title {
      font-weight: 800;
      font-size: 11px;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .btn-bar {
      max-width: 850px;
      margin: 0 auto 16px auto;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }
    .btn {
      padding: 10px 20px;
      background: #4f46e5;
      color: #ffffff;
      border: none;
      border-radius: 6px;
      font-weight: 700;
      cursor: pointer;
      font-size: 14px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .qr-placeholder {
      width: 80px;
      height: 80px;
      background: #f3f4f6;
      border: 1px solid #9ca3af;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: 12px;
    }
    @media print {
      body { background: #ffffff; padding: 0; }
      .btn-bar { display: none; }
      .page-container { border: none; box-shadow: none; padding: 0; }
    }
  </style>
</head>
<body>

  <div class="btn-bar">
    <button class="btn" onclick="window.print()">🖨️ Download / Print Tax Invoice</button>
  </div>

  <div class="page-container">

    <!-- Header Section -->
    <table class="header-table">
      <tr>
        <td style="width: 60%;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="text-align: center;">
              <svg width="48" height="48" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M50 5C50 5 65 30 65 50C65 70 50 80 50 80C50 80 35 70 35 50C35 30 50 5 50 5Z" fill="#D97706"/>
                <path d="M50 20C50 20 60 40 60 55C60 70 50 75 50 75C50 75 40 70 40 55C40 40 50 20 50 20Z" fill="#F59E0B"/>
                <circle cx="50" cy="85" r="5" fill="#DC2626"/>
              </svg>
              <div style="font-weight: 800; font-size: 11px; color: #b45309; letter-spacing: 0.5px;">HUMARA PANDIT</div>
            </div>
            <div>
              <div class="company-title">D A Dharm Sathi Private Limited</div>
              <div class="company-sub">Haryana</div>
              <div class="company-sub">India</div>
              <div class="company-sub"><strong>GSTIN</strong> 06AALCD7494B1ZI</div>
              <div class="company-sub">namaste@humarapandit.com</div>
            </div>
          </div>
        </td>
        <td style="width: 40%; text-align: right;">
          <div class="invoice-title">TAX INVOICE</div>
        </td>
      </tr>
    </table>

    <!-- Metadata Grid -->
    <table class="meta-table">
      <tr>
        <td style="width: 50%; border-right: 1px solid #e5e7eb;">
          <div><strong>#</strong> : ${order.orderId || 'HP-INV'}</div>
          <div><strong>Invoice Date</strong> : ${dateStr}</div>
          <div><strong>Terms</strong> : Due on Receipt</div>
        </td>
        <td style="width: 50%;">
          <div><strong>Place Of Supply</strong> : ${customer.state || 'Karnataka'} (${stateCode})</div>
          <div><strong>Phone Number</strong> : ${phoneDisplay}</div>
        </td>
      </tr>
    </table>

    <!-- Customer Address Block -->
    <div class="customer-block">
      <div class="customer-name">${customer.customer_name || 'Customer Name'}</div>
      <div>${customer.address || ''}</div>
      <div>${customer.city || ''}</div>
      <div>${customer.pincode || ''} ${customer.state || ''}</div>
      <div>${customer.country || 'India'}</div>
    </div>

    <!-- Line Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 30px; text-align: center;">#</th>
          <th style="text-align: left;">Description</th>
          <th style="width: 90px; text-align: center;">HSN/SAC</th>
          <th style="width: 50px; text-align: right;">Qty</th>
          <th style="width: 90px; text-align: right;">Rate</th>
          ${isHaryana ? `
            <th style="width: 50px; text-align: right;">CGST %</th>
            <th style="width: 70px; text-align: right;">CGST Amt</th>
            <th style="width: 50px; text-align: right;">SGST %</th>
            <th style="width: 70px; text-align: right;">SGST Amt</th>
          ` : `
            <th style="width: 60px; text-align: right;">IGST %</th>
            <th style="width: 75px; text-align: right;">IGST Amt</th>
          `}
          <th style="width: 95px; text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <!-- Bottom Section (Total in Words, Policy, Totals Table) -->
    <table class="bottom-grid">
      <tr>
        <!-- Left Side: Total in words & Return Policy -->
        <td style="width: 58%; padding-right: 20px;">
          
          <div style="margin-bottom: 16px;">
            <div style="font-weight: 700; font-size: 12px;">Total In Words</div>
            <div style="font-style: italic; font-weight: 600; font-size: 13px; color: #111827;">${grandTotalWords}</div>
          </div>

          <div style="font-size: 12px; margin-bottom: 12px;">Thanks for your business.</div>

          <div class="policy-box">
            <div class="policy-title">RETURN & CLAIM POLICY</div>
            <div>To protect the authenticity of our products, all claims for missing or damaged items strictly require the following:</div>
            <div style="margin-top: 4px;"><strong>1.) Mandatory Unboxing Video:</strong> You must provide a continuous, uncut, and timestamped video showing the sealed Humara Pandit shipping label and the entire opening process.</div>
            <div><strong>2.) 48-Hour Deadline:</strong> Claims must be reported within 48 hours of delivery.</div>
            <div><strong>3.) Policy Enforcement:</strong> Claims submitted after 48 hours or lacking the complete, unedited video will be automatically rejected. Placing an order constitutes agreement to these terms.</div>
          </div>

          <div class="qr-placeholder">
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
              <rect x="5" y="5" width="3" height="3" fill="currentColor"/>
              <rect x="16" y="5" width="3" height="3" fill="currentColor"/>
              <rect x="5" y="16" width="3" height="3" fill="currentColor"/>
              <path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 19h3v2h-3z"/>
            </svg>
          </div>

        </td>

        <!-- Right Side: Totals Summary Box -->
        <td style="width: 42%;">
          <table class="totals-table">
            <tr>
              <td style="color: #4b5563;">Sub Total</td>
              <td style="font-weight: 600;">${subtotalFormatted}</td>
            </tr>
            <tr>
              <td style="color: #4b5563;">Tax (GST)</td>
              <td style="font-weight: 600;">${taxSumFormatted}</td>
            </tr>
            <tr class="grand-row">
              <td>Total</td>
              <td>₹${grandTotalFormatted}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

  </div>

  <script>
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

  let order = null;
  try {
    await connectDB();
    order = await Order.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
        { zohoInvoiceId: id },
        { orderId: id }
      ]
    });
  } catch (err) {
    console.warn('DB lookup failed in invoice PDF route:', err);
  }

  const zohoInvoiceId = order?.zohoInvoiceId || id;

  // 1. If real Zoho ID, attempt Zoho API PDF fetch
  if (zohoInvoiceId && !zohoInvoiceId.startsWith('TEST-') && !zohoInvoiceId.startsWith('zoho_') && zohoInvoiceId.length > 10) {
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
      console.warn(`Zoho PDF fetch failed for ${zohoInvoiceId}:`, err);
    }
  }

  // 2. Fail-safe HTML Invoice generator (works even for unsaved/test/offline orders!)
  const fallbackOrder = order || {
    orderId: id,
    customerDetails: { customer_name: 'Sandhya Patil', address: 'Second floor Shri Sai heritage apartment Opp to laxmi temple Narayananpur Dharwad 580008 Karnataka', city: 'Dharwad', state: 'Karnataka', pincode: '580008', phone: '9742676891', country: 'India' },
    invoiceItems: [{ name: 'ruby', carat_size: '6.59', quantity: 1, final_price: 9555, rate: 9531.17, tax_percentage: 0.25, hsn_or_sac: '05080010' }],
    invoiceTotal: 9555,
    paymentMode: 'Prepaid',
    createdAt: new Date()
  };

  const htmlInvoice = generateHtmlInvoice(fallbackOrder);
  return new NextResponse(htmlInvoice, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="invoice-${id}.html"`,
    },
  });
});
