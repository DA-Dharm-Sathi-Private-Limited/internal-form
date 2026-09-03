import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Notification from '@/models/Notification';
import { withError, fail, success } from '@/lib/api-handler';

export const PATCH = withError(async (request: NextRequest, context?: any) => {
  const { id } = await context.params;
  await dbConnect();

  if (id === 'all') {
    await Notification.updateMany({ read: false }, { $set: { read: true } });
    return success({ message: 'All notifications marked as read' });
  }

  const notification = await Notification.findByIdAndUpdate(id, { $set: { read: true } }, { new: true });
  if (!notification) {
    return fail('Notification not found', 404);
  }

  return success({ notification });
});
