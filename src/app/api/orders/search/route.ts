import { NextRequest } from 'next/server';
import Order from '@/models/Order';
import { withDb, success, fail } from '@/lib/api-handler';

export const GET = withDb(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const type = searchParams.get('type');

  if (!query || query.trim() === '') {
    return success({ orders: [] });
  }

  const safeQuery = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  let filter = {};

  switch (type) {
    case 'orderId':
      filter = { orderId: { $regex: `^${safeQuery}`, $options: 'i' } };
      break;
    case 'customer':
      filter = { 'customerDetails.customer_name': { $regex: `^${safeQuery}`, $options: 'i' } };
      break;
    case 'astrologer':
      filter = { 'astrologerDetails.astrologerName': { $regex: `^${safeQuery}`, $options: 'i' } };
      break;
    default:
      return fail('Invalid search type', 400);
  }

  const orders = await Order.find(filter)
    .sort({ createdAt: -1 })
    .limit(50);

  return success({ orders });
});
