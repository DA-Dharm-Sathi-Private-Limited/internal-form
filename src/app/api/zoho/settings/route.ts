import { fetchInvoiceSettings } from '@/lib/zoho';
import { success } from '@/lib/api-handler';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data } = await fetchInvoiceSettings();
    return success({ settings: data });
  } catch (err) {
    console.warn('Zoho settings fetch failed, returning default settings:', err);
    return success({ settings: { prefix: 'INV-', next_number: '001130' } });
  }
}
