import { fetchAllActiveItems } from '@/lib/zoho';
import { success } from '@/lib/api-handler';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const items = await fetchAllActiveItems();
    return success({ items });
  } catch (err) {
    console.warn('Zoho items fetch failed, returning fallback empty items:', err);
    return success({ items: [] });
  }
}
