import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import dbConnect from './mongodb';
import Vendor from '@/models/Vendor';

const JWT_SECRET = process.env.VENDOR_JWT_SECRET || process.env.NEXTAUTH_SECRET || 'vendor-portal-jwt-secret-2026';
const VENDOR_COOKIE_NAME = 'vendor_token';

export interface VendorJwtPayload {
  vendorId: string;
  facilityName: string;
  phone: string;
  role: 'vendor';
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signVendorToken(payload: VendorJwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyVendorToken(token: string): VendorJwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as VendorJwtPayload;
  } catch {
    return null;
  }
}

export async function getVendorFromSession(): Promise<any | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(VENDOR_COOKIE_NAME)?.value;
  if (!token) return null;

  const decoded = verifyVendorToken(token);
  if (!decoded || !decoded.vendorId) return null;

  await dbConnect();
  const vendor = await Vendor.findById(decoded.vendorId).select('-passwordHash').lean();
  if (!vendor || vendor.status === 'deactivated') {
    return null;
  }

  return vendor;
}

export { VENDOR_COOKIE_NAME };
