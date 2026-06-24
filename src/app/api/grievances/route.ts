import { NextRequest } from 'next/server';
import Grievance from '@/models/Grievance';
import { withDb, success } from '@/lib/api-handler';

export const dynamic = 'force-dynamic';

export const GET = withDb(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '5', 10);

  const skip = (page - 1) * limit;

  const [grievances, total] = await Promise.all([
    Grievance.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Grievance.countDocuments()
  ]);

  return success({
    grievances,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
});
