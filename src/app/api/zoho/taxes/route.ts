import { fetchTaxes } from '@/lib/zoho';
import { success } from '@/lib/api-handler';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data } = await fetchTaxes();
    return success({ taxes: data });
  } catch (err) {
    console.warn('Zoho taxes fetch failed, returning default taxes:', err);
    return success({
      taxes: [
        { tax_name: 'GST (3%)', tax_percentage: 3 },
        { tax_name: 'GST (0.25%)', tax_percentage: 0.25 },
        { tax_name: 'GST (18%)', tax_percentage: 18 }
      ]
    });
  }
}
