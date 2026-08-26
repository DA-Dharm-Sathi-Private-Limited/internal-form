import { NextRequest, NextResponse } from 'next/server';
import { generateShippingLabel } from '@/lib/delhivery';
import { withError, fail } from '@/lib/api-handler';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const waybill = searchParams.get('waybill');
    const pdfSize = searchParams.get('pdf_size') || 'A4';
    const isJson = searchParams.get('format') === 'json';

    if (!waybill) {
      return fail('waybill query parameter is required', 400);
    }

    const { status, data } = await generateShippingLabel(waybill, pdfSize);

    if (isJson) {
      return NextResponse.json(data, { status });
    }

    // Extract package details for HTML render
    const pkgList = (data as Record<string, any>)?.packages || (Array.isArray(data) ? data : [data]);
    const pkg = pkgList[0] || {};

    const awb = pkg.waybill || waybill;
    const consigneeName = pkg.name || pkg.consignee_name || pkg.customer_name || 'Customer';
    const consigneeAddress = pkg.add || pkg.consignee_address || pkg.address || 'N/A';
    const consigneeCity = pkg.city || pkg.consignee_city || '';
    const consigneeState = pkg.state || pkg.consignee_state || '';
    const consigneePin = pkg.pin || pkg.consignee_pin || '';
    const sortCode = pkg.sort_code || 'DELHIVERY';
    const orderId = pkg.refnum || pkg.order || pkg.si || '';
    const paymentType = pkg.pt || pkg.payment || 'Prepaid';

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Delhivery Shipping Label - ${awb}</title>
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
  <style>
    @page { size: A4; margin: 10mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; padding: 16px; background: #f9fafb; display: flex; flex-direction: column; align-items: center; }
    .label-box { width: 400px; background: #fff; border: 2px solid #000; padding: 12px; font-size: 12px; line-height: 1.4; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; pb: 8px; margin-bottom: 8px; }
    .sort-code { font-size: 16px; font-weight: 800; }
    .brand { font-size: 18px; font-weight: 900; letter-spacing: 1px; }
    .awb-txt { font-size: 14px; font-weight: 800; margin: 6px 0 2px; }
    .barcode-wrap { text-align: center; margin: 4px 0 8px; }
    .barcode-wrap svg { max-width: 100%; height: auto; }
    .meta-bar { display: flex; justify-content: space-between; border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 4px 0; font-weight: 700; margin-bottom: 8px; }
    .consignee-title { font-[#6b7280]; font-size: 11px; text-transform: uppercase; }
    .consignee-name { font-size: 15px; font-weight: 800; margin: 2px 0; }
    .btn-print { margin-bottom: 16px; padding: 10px 24px; background: #4f46e5; color: white; border: none; border-radius: 6px; font-weight: 700; cursor: pointer; }
    @media print { .btn-print { display: none; } body { padding: 0; background: white; } .label-box { box-shadow: none; } }
  </style>
</head>
<body>
  <button class="btn-print" onclick="window.print()">🖨️ Print Label</button>
  <div class="label-box">
    <div class="header">
      <span class="sort-code">${sortCode}</span>
      <span class="brand">DELHIVERY</span>
    </div>
    <div class="awb-txt">AWB# ${awb}</div>
    <div class="barcode-wrap"><svg id="awb-barcode"></svg></div>
    <div class="meta-bar">
      <span>PIN: ${consigneePin}</span>
      <span>${paymentType}</span>
      <span>${sortCode}</span>
    </div>
    <div style="margin-bottom: 8px;">
      <div class="consignee-title">Ship To:</div>
      <div class="consignee-name">${consigneeName}</div>
      <div>${consigneeAddress}</div>
      <div>${consigneeCity}${consigneeState ? ', ' + consigneeState : ''} - <strong>${consigneePin}</strong></div>
    </div>
    ${orderId ? `
      <div style="border-top: 1px solid #000; pt: 6px; margin-top: 6px;">
        <div style="font-weight: 700; font-size: 11px;">Order Ref: ${orderId}</div>
        <div class="barcode-wrap"><svg id="order-barcode"></svg></div>
      </div>
    ` : ''}
  </div>
  <script>
    window.onload = function() {
      try {
        JsBarcode("#awb-barcode", "${awb}", { format: "CODE128", width: 2, height: 50, displayValue: false });
      } catch(e) {}
      ${orderId ? `
        try {
          JsBarcode("#order-barcode", "${orderId}", { format: "CODE128", width: 1.5, height: 35, displayValue: false });
        } catch(e) {}
      ` : ''}
    };
  </script>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="label-${awb}.html"`,
      },
    });
  } catch (err) {
    console.error('Delhivery label route error:', err);
    return fail(err instanceof Error ? err.message : 'Failed to fetch shipping label', 500);
  }
}
