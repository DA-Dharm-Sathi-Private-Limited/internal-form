import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Vendor from '@/models/Vendor';
import { verifyPassword, signVendorToken, VENDOR_COOKIE_NAME } from '@/lib/vendor-auth';
import { withError, fail, success } from '@/lib/api-handler';

export const POST = withError(async (request: NextRequest) => {
  const body = await request.json();
  const { phone, password } = body;

  if (!phone || !password) {
    return fail('Phone number and password are required', 400);
  }

  await dbConnect();
  const cleanPhone = phone.trim();
  const vendor = await Vendor.findOne({ phone: cleanPhone });

  if (!vendor) {
    return fail('Invalid phone number or password', 401);
  }

  if (vendor.status === 'deactivated') {
    return fail('Account is deactivated. Please contact support.', 403);
  }

  const isValid = await verifyPassword(password, vendor.passwordHash);
  if (!isValid) {
    return fail('Invalid phone number or password', 401);
  }

  const token = signVendorToken({
    vendorId: vendor._id.toString(),
    facilityName: vendor.facilityName,
    phone: vendor.phone,
    role: 'vendor',
  });

  const response = NextResponse.json({
    success: true,
    vendor: {
      id: vendor._id,
      facilityName: vendor.facilityName,
      phone: vendor.phone,
      addressLine: vendor.addressLine,
      pincode: vendor.pincode,
    },
  });

  response.cookies.set(VENDOR_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });

  return response;
});
