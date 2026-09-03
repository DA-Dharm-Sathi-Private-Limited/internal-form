import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Vendor from '@/models/Vendor';
import Notification from '@/models/Notification';
import { hashPassword } from '@/lib/vendor-auth';
import { withError, fail, success } from '@/lib/api-handler';

export const PATCH = withError(async (request: NextRequest, context?: any) => {
  const { id } = await context.params;
  const body = await request.json();
  const { status, password } = body;

  await dbConnect();
  const vendor = await Vendor.findById(id);

  if (!vendor) {
    return fail('Vendor not found', 404);
  }

  const updateFields: any = {};
  if (status && ['active', 'deactivated'].includes(status)) {
    updateFields.status = status;
    if (status === 'deactivated') {
      await Notification.create({
        recipientType: 'vendor',
        recipientId: vendor.facilityName,
        type: 'vendor_deactivated',
        message: `Your vendor account ${vendor.facilityName} has been deactivated by staff.`,
      });
    }
  }

  if (password && password.trim()) {
    updateFields.passwordHash = await hashPassword(password.trim());
  }

  const updated = await Vendor.findByIdAndUpdate(id, { $set: updateFields }, { new: true }).select('-passwordHash');

  return success({ vendor: updated });
});
