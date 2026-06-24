import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import Order from '@/models/Order';
import { withDb, success, fail } from '@/lib/api-handler';

export const POST = withDb(async () => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const orders = await Order.find({
    'shipments.createdAt': { $gte: startOfDay, $lte: endOfDay }
  });

  const rowsToInsert: any[][] = [];

  const dd = String(startOfDay.getDate()).padStart(2, '0');
  const mm = String(startOfDay.getMonth() + 1).padStart(2, '0');
  const yyyy = startOfDay.getFullYear();
  const formattedDate = `${dd}${mm}${yyyy}`;

  for (const order of orders) {
    for (const shipment of order.shipments || []) {
      const createdAt = new Date(shipment.createdAt);
      if (createdAt >= startOfDay && createdAt <= endOfDay) {
        let shippingVal = '';
        let awbVal = '';
        let selfVal = '';

        if (shipment.deliveryPartner === 'Delhivery') {
          shippingVal = 'Delhivery Courier';
          awbVal = shipment.waybill || '';
        } else if (shipment.deliveryPartner === 'DTDC') {
          shippingVal = 'DTDC';
          awbVal = shipment.waybill || '';
        } else {
          shippingVal = shipment.deliveryPartner || '';
          awbVal = shipment.waybill || '';
          selfVal = 'Self';
        }

        const invoiceNumber = order.orderId || order.zohoInvoiceId || '';
        const fromVal = shipment.warehouse || '';
        const toVal = order.customerDetails?.customer_name || '';

        const pincodeVal = order.customerDetails?.pincode || '';
        const cityVal = order.customerDetails?.city || '';
        const stateVal = order.customerDetails?.state || '';
        const pocVal = order.salespersonName || '';

        rowsToInsert.push([
          formattedDate,
          shippingVal,
          invoiceNumber,
          awbVal,
          selfVal,
          fromVal,
          toVal,
          pincodeVal,
          cityVal,
          stateVal,
          pocVal
        ]);
      }
    }
  }

  if (rowsToInsert.length === 0) {
    return success({ message: 'No shipments scheduled today to sync.' });
  }

  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const sheetId = process.env.GOOGLE_SHEET_ID;

  if (!sheetId) {
    throw new Error('GOOGLE_SHEET_ID is missing from environment variables');
  }

  await sheets.spreadsheets.values.clear({
    spreadsheetId: sheetId,
    range: 'daily_orders!A2:K',
  });

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: 'daily_orders!A2:K',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: rowsToInsert,
    },
  });

  return success({ message: `Successfully synced ${rowsToInsert.length} shipments.` });
});
