import { NextRequest } from 'next/server';
import Order from '@/models/Order';
import { withDb, success } from '@/lib/api-handler';

export const GET = withDb(async (request: NextRequest) => {
  const showAll = request.nextUrl.searchParams.get('all') === 'true';
  const filter = showAll ? {} : { status: { $in: ['PENDING_SHIPPING', 'PARTIALLY_SHIPPED'] } };
  const orders = await Order.find(filter).sort({ createdAt: -1 });
  return success({ orders });
});

export const POST = withDb(async (request: NextRequest) => {
  const data = await request.json();
  const order = await Order.create(data);
  return success({ order }, 201);
});
