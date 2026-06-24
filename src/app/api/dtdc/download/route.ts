import { NextRequest, NextResponse } from 'next/server';
import Order from '@/models/Order';
import fs from 'fs';
import path from 'path';
import { withDb, success, fail } from '@/lib/api-handler';

export const GET = withDb(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const startStr = searchParams.get('start');
  const endStr = searchParams.get('end');

  let query: any = { status: 'DTDC_SCHEDULED', 'shipments.deliveryPartner': 'DTDC' };

  if (startStr && endStr) {
    query.updatedAt = {
      $gte: new Date(startStr),
      $lte: new Date(endStr)
    };
  }

  const orders = await Order.find(query).lean();

  const vendorsPath = path.join(process.cwd(), 'vendors.json');
  let vendorsData: any[] = [];
  try {
    const rawVendors = fs.readFileSync(vendorsPath, 'utf-8');
    vendorsData = JSON.parse(rawVendors);
  } catch (err) {
    console.error('Error reading vendors.json', err);
  }

  const getVendorDetails = (vendorName: string) => {
    const vendor = vendorsData.find(v => v.facility_name.toLowerCase() === vendorName.toLowerCase());
    return vendor || { facility_name: vendorName, address_line: '', pincode: '' };
  };

  const groupedRows: Record<string, string[]> = {};

  const headers = [
    'Customer Reference Number',
    'Consignment Number',
    'Service Type',
    'Courier Type',
    'Declared Price (non-document)',
    'Number of Pieces (non-document)',
    'Risk Surcharge (YES/NO) (non-document)',
    'Weight(KG) (non-document)',
    'Destination Pincode',
    'Destination Name',
    'Destination Phone',
    'Destination Address Line 1',
    'Content Type',
    'Cod Amount',
    'In Favor Of',
    'Cod Mode',
    'Origin Name',
    'Origin Address Line 1',
    'Origin Pincode'
  ];

  for (const order of orders) {
    const dtdcShipments = (order.shipments || []).filter((s: any) => s.deliveryPartner === 'DTDC');

    for (const shipment of dtdcShipments) {
      const vendorName = shipment.vendor || shipment.warehouse || 'Unknown Vendor';
      const vDetails = getVendorDetails(vendorName);

      let totalAmount = 0;
      if (order.invoiceItems && order.invoiceItems.length > 0) {
        for (const item of shipment.items) {
          const baseItem = order.invoiceItems[item.lineIndex];
          if (baseItem) {
            const perUnit = baseItem.final_price ?? (((baseItem.item_total || 0) + (baseItem.tax_amount || 0)) / (baseItem.quantity || 1));
            totalAmount += perUnit * item.quantity;
          }
        }
      }
      const paymentMode = shipment.paymentMode || order.paymentMode || 'Prepaid';

      let codAmountStr = '';
      let codModeStr = '';

      let defaultAmt = totalAmount > 0 ? totalAmount : (order.invoiceTotal || 0);
      let declaredPriceStr = `${defaultAmt}`;

      if (paymentMode === 'COD') {
        let amt = shipment.codAmount;
        if (amt === undefined || amt === null) {
          amt = defaultAmt;
        }
        codAmountStr = `${amt}`;
        codModeStr = 'CASH';
        declaredPriceStr = `${amt}`;
      }

      const destAddress = `"${order.customerDetails.address}, ${order.customerDetails.city}, ${order.customerDetails.state}"`;

      const originName = 'DA Dharm Sathi Pvt Ltd';
      const isOffice = vendorName.toLowerCase() === 'office';
      const originAddressLine = isOffice ? 'Greater Noida' : vDetails.address_line;
      const originPincode = isOffice ? '201301' : vDetails.pincode;
      const originAddress = `"${originAddressLine}"`;

      const row = [
        order.orderId || '',
        '',
        'B2C SMART EXPRESS',
        'NON-DOCUMENT',
        declaredPriceStr,
        '1',
        'FALSE',
        '0.5',
        order.customerDetails.pincode || '',
        order.customerDetails.customer_name || '',
        order.customerDetails.phone || '',
        destAddress,
        'ORDER',
        codAmountStr,
        '',
        codModeStr,
        originName,
        originAddress,
        originPincode
      ];

      const rowLine = row.join(',');

      if (!groupedRows[vendorName]) {
        groupedRows[vendorName] = [headers.join(',')];
      }
      groupedRows[vendorName].push(rowLine);
    }
  }

  const filesData = Object.keys(groupedRows).map(vendor => {
    return {
      filename: `DTDC_${vendor.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`,
      content: groupedRows[vendor].join('\n')
    };
  });

  return success({ files: filesData });
});
