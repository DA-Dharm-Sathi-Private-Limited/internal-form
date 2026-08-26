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

    const awb = pkg.wbn || pkg.waybill || waybill;
    const companyName = pkg.cl || 'D A DHARM SATHI PRIVATE LIMITED';
    const consigneeName = pkg.name || pkg.consignee_name || pkg.customer_name || 'Customer';
    const consigneeAddress = pkg.add || pkg.consignee_address || pkg.address || 'N/A';
    const consigneePin = pkg.pin || pkg.consignee_pin || '201318';
    const destinationHub = pkg.destination || `${pkg.city || 'Noida'} (${pkg.state || 'Uttar Pradesh'})`;
    const sortCode = pkg.sort_code || 'NOI/STO';
    const orderId = pkg.si || pkg.refnum || pkg.order || `${waybill}-PKG1`;
    const paymentMode = pkg.pt ? `${pkg.pt} - ${pkg.mot === 'E' ? 'Express' : 'Surface'}` : 'Pre-paid - Surface';
    
    const now = new Date();
    const dateFormatted = `${now.getDate().toString().padStart(2, '0')}-${now.toLocaleString('en-US', { month: 'short' })}-${now.getFullYear()} | ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;

    const mainBarcode = pkg.barcode || '';
    const oidBarcode = pkg.oid_barcode || '';

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Shipping Label - ${awb}</title>
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
  <style>
    @page { size: A4; margin: 10mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; background: #f3f4f6; padding: 20px; display: flex; flex-direction: column; align-items: center; color: #000; }
    .btn-print { margin-bottom: 20px; padding: 12px 28px; background: #4f46e5; color: white; border: none; border-radius: 8px; font-weight: 700; font-size: 15px; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .label-box { width: 440px; background: #ffffff; border: 2px solid #000000; padding: 16px; font-size: 12px; line-height: 1.35; box-shadow: 0 4px 12px rgba(0,0,0,0.12); }
    
    .top-row { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1.5px solid #000; padding-bottom: 10px; margin-bottom: 8px; }
    .company-title { font-size: 13px; font-weight: 700; text-transform: uppercase; max-width: 250px; line-height: 1.3; }
    
    .delhivery-brand { text-align: right; }
    .delhivery-logo-svg { height: 26px; width: auto; object-fit: contain; }

    .awb-header { font-size: 13px; font-weight: 600; margin-bottom: 4px; }
    .barcode-area { text-align: center; margin: 4px 0 6px; }
    .barcode-area img, .barcode-area svg { max-width: 100%; height: 58px; object-fit: contain; }

    .sort-bar { display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: 700; border-bottom: 1.5px solid #000; padding-bottom: 8px; margin-bottom: 10px; }
    
    .main-grid { display: flex; border-bottom: 1.5px solid #000; padding-bottom: 12px; margin-bottom: 10px; }
    .ship-col { flex: 1.6; padding-right: 12px; border-right: 1px solid #d1d5db; }
    .meta-col { flex: 1; padding-left: 12px; display: flex; flex-direction: column; justify-content: space-between; }

    .ship-to-txt { font-size: 12px; }
    .consignee-name { font-size: 14px; font-weight: 800; }
    .address-txt { font-size: 11px; margin-top: 3px; line-height: 1.35; color: #1f2937; }
    .dest-hub-txt { font-size: 13px; font-weight: 800; margin-top: 6px; }
    .pin-txt { font-size: 13px; font-weight: 800; margin-top: 2px; }

    .payment-type { font-size: 12px; font-weight: 800; margin-bottom: 10px; }
    .date-heading { font-size: 11px; color: #4b5563; font-weight: 600; }
    .date-val { font-size: 10.5px; font-weight: 700; }

    .ref-section { padding-top: 4px; }
    .ref-id-txt { font-size: 13px; font-weight: 800; margin-bottom: 4px; }

    .footer-txt { font-size: 10px; color: #6b7280; text-align: right; margin-top: 10px; }

    @media print {
      body { padding: 0; background: #fff; }
      .btn-print { display: none; }
      .label-box { border: 2px solid #000; box-shadow: none; width: 100%; max-width: 440px; }
    }
  </style>
</head>
<body>
  <button class="btn-print" onclick="window.print()">🖨️ Print Shipping Label</button>
  <div class="label-box">

    <!-- Top Header -->
    <div class="top-row">
      <div class="company-title">${companyName}</div>
      <div class="delhivery-brand">
        <svg class="delhivery-logo-svg" viewBox="0 0 200 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <text x="0" y="30" font-family="Arial, sans-serif" font-weight="900" font-size="32" fill="#000000" letter-spacing="-1">DELH</text>
          <text x="92" y="30" font-family="Arial, sans-serif" font-weight="900" font-size="32" fill="#DC2626">I</text>
          <text x="104" y="30" font-family="Arial, sans-serif" font-weight="900" font-size="32" fill="#000000" letter-spacing="-1">VERY</text>
        </svg>
      </div>
    </div>

    <!-- AWB & Barcode -->
    <div class="awb-header">AWB# ${awb}</div>
    <div class="barcode-area">
      ${mainBarcode ? `<img src="${mainBarcode}" alt="AWB Barcode" />` : `<svg id="main-awb-barcode"></svg>`}
    </div>

    <!-- Sort Bar -->
    <div class="sort-bar">
      <span>${consigneePin}</span>
      <span>AWB# ${awb}</span>
      <span>${sortCode}</span>
    </div>

    <!-- Details Grid -->
    <div class="main-grid">
      <div class="ship-col">
        <div class="ship-to-txt">Ship to - <span class="consignee-name">${consigneeName}</span></div>
        <div class="address-txt">${consigneeAddress}</div>
        <div class="dest-hub-txt">${destinationHub}</div>
        <div class="pin-txt">PIN - ${consigneePin}</div>
      </div>
      <div class="meta-col">
        <div class="payment-type">${paymentMode}</div>
        <div>
          <div class="date-heading">Date</div>
          <div class="date-val">${dateFormatted}</div>
        </div>
      </div>
    </div>

    <!-- Order Ref Section -->
    <div class="ref-section">
      <div class="ref-id-txt">${orderId}</div>
      <div class="barcode-area" style="text-align: left; margin: 2px 0;">
        ${oidBarcode ? `<img src="${oidBarcode}" alt="Order Barcode" style="height: 42px;" />` : `<svg id="oid-barcode"></svg>`}
      </div>
    </div>

    <div class="footer-txt">Page 1 of 1</div>
  </div>

  <script>
    window.onload = function() {
      ${!mainBarcode ? `
        try {
          JsBarcode("#main-awb-barcode", "${awb}", { format: "CODE128", width: 2, height: 58, displayValue: false });
        } catch(e) {}
      ` : ''}
      ${!oidBarcode ? `
        try {
          JsBarcode("#oid-barcode", "${orderId}", { format: "CODE128", width: 1.5, height: 42, displayValue: false });
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
