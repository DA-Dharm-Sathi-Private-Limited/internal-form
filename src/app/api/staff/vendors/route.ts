import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Vendor from '@/models/Vendor';
import { hashPassword } from '@/lib/vendor-auth';
import { withError, fail, success } from '@/lib/api-handler';
import fs from 'fs';
import path from 'path';

export const GET = withError(async () => {
  await dbConnect();
  let vendors = await Vendor.find().sort({ facilityName: 1 }).lean();

  // If Vendor collection is empty, seed from vendors.json
  if (vendors.length === 0) {
    try {
      const vendorsPath = path.join(process.cwd(), 'vendors.json');
      if (fs.existsSync(vendorsPath)) {
        const raw = fs.readFileSync(vendorsPath, 'utf-8');
        const jsonVendors = JSON.parse(raw);

        for (const v of jsonVendors) {
          const defaultPasswordHash = await hashPassword('Vendor@123456');
          await Vendor.create({
            facilityName: v.facility_name,
            addressLine: v.address_line || '',
            pincode: v.pincode ? String(v.pincode) : '',
            phone: v.phone ? String(v.phone) : '9999999999',
            passwordHash: defaultPasswordHash,
            status: 'active',
            createdBy: 'System Seed',
          });
        }
        vendors = await Vendor.find().sort({ facilityName: 1 }).lean();
      }
    } catch (seedErr) {
      console.error('[Vendor Seed Error]', seedErr);
    }
  }

  const safeVendors = vendors.map((v: any) => ({
    id: v._id,
    facilityName: v.facilityName,
    addressLine: v.addressLine,
    pincode: v.pincode,
    phone: v.phone,
    status: v.status,
    createdAt: v.createdAt,
  }));

  return success({ vendors: safeVendors });
});

export const POST = withError(async (request: NextRequest) => {
  const body = await request.json();
  const { facilityName, addressLine, pincode, phone, password } = body;

  if (!facilityName || !phone || !password) {
    return fail('Facility name, phone, and password are required', 400);
  }

  await dbConnect();
  const existing = await Vendor.findOne({
    $or: [{ facilityName: facilityName.trim() }, { phone: phone.trim() }],
  });

  if (existing) {
    return fail('A vendor with this facility name or phone number already exists', 400);
  }

  const passwordHash = await hashPassword(password);
  const vendor = await Vendor.create({
    facilityName: facilityName.trim(),
    addressLine: addressLine ? addressLine.trim() : '',
    pincode: pincode ? String(pincode).trim() : '',
    phone: phone.trim(),
    passwordHash,
    status: 'active',
    createdBy: 'Staff',
  });

  return success({
    vendor: {
      id: vendor._id,
      facilityName: vendor.facilityName,
      addressLine: vendor.addressLine,
      pincode: vendor.pincode,
      phone: vendor.phone,
      status: vendor.status,
    },
  });
});
