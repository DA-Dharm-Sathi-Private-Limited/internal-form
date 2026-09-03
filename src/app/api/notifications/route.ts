import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Notification from '@/models/Notification';
import { getVendorFromSession } from '@/lib/vendor-auth';
import { withError, success } from '@/lib/api-handler';

export const GET = withError(async (request: NextRequest) => {
  await dbConnect();
  const vendor = await getVendorFromSession();

  const query: any = {};
  if (vendor) {
    query.recipientType = 'vendor';
    query.recipientId = { $in: ['all', vendor.facilityName] };
  } else {
    query.recipientType = 'staff';
  }

  const notifications = await Notification.find(query).sort({ createdAt: -1 }).limit(50).lean();
  const unreadCount = await Notification.countDocuments({ ...query, read: false });

  return success({
    notifications,
    unreadCount,
  });
});
