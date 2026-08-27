import { google } from 'googleapis';

function getGoogleSheetsClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  const sheetId = process.env.GOOGLE_SHEET_ID;

  if (!email || !privateKey || !sheetId) {
    console.warn('[Google Sheets] Missing Google Service Account credentials or GOOGLE_SHEET_ID');
    return null;
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: email,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    return { sheets, sheetId };
  } catch (err) {
    console.error('[Google Sheets] Auth Error:', err);
    return null;
  }
}

export interface SyncOrderRow {
  dateStr?: string; // DD/MM/YYYY or DDMMYYYY
  shippingPartner: string; // Delhivery / DTDC / Shadowfax
  invoiceNumber: string; // e.g. INV-001146
  awb: string; // e.g. 44324210014615
  fromLocation?: string; // Warehouse name
  toCustomer?: string; // Customer name
  pincode?: string;
  city?: string;
  state?: string;
  poc?: string; // Salesperson
  status?: string; // Manifested / In Transit / Delivered
  location?: string;
}

export async function appendOrderToGoogleSheet(order: SyncOrderRow) {
  const client = getGoogleSheetsClient();
  if (!client) return { success: false, error: 'Google Sheets credentials not configured' };

  const { sheets, sheetId } = client;
  const now = new Date();

  // Date format for daily_orders: DDMMYYYY (e.g. 27082026)
  const dayStr = String(now.getDate()).padStart(2, '0');
  const monthStr = String(now.getMonth() + 1).padStart(2, '0');
  const yearStr = String(now.getFullYear());
  const dailyDateFormatted = `${dayStr}${monthStr}${yearStr}`;

  // Date format for Live Tracker: DD/MM/YYYY (e.g. 27/08/2026)
  const trackerDateFormatted = `${dayStr}/${monthStr}/${yearStr}`;

  try {
    // 1. Append to 'daily_orders' tab
    const dailyRow = [
      order.dateStr || dailyDateFormatted,
      order.shippingPartner.includes('Delhivery') ? 'Delhivery Courier' : order.shippingPartner,
      order.invoiceNumber,
      order.awb,
      '', // Self
      order.fromLocation || 'ganpati jaipur',
      order.toCustomer || 'Customer',
      order.pincode || '',
      order.city || '',
      order.state || '',
      order.poc || 'Salesperson',
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'daily_orders!A:K',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [dailyRow],
      },
    });

    // 2. Append to 'Live Tracker' tab
    const trackerRow = [
      trackerDateFormatted,
      order.shippingPartner.replace(' Courier', ''),
      order.invoiceNumber,
      order.awb,
      '', // Self
      '', // From
      order.toCustomer || 'Customer',
      now.toISOString(),
      order.status || 'Manifested',
      order.location || `${order.city || ''} (${order.state || ''})`,
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'Live Tracker!A:J',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [trackerRow],
      },
    });

    return { success: true };
  } catch (err) {
    console.error('[Google Sheets] Append Error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Google Sheets API error' };
  }
}
