import mongoose from 'mongoose';

const VendorSchema = new mongoose.Schema(
  {
    facilityName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    addressLine: {
      type: String,
      default: '',
    },
    pincode: {
      type: String,
      default: '',
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'deactivated'],
      default: 'active',
      index: true,
    },
    createdBy: {
      type: String,
      default: 'System',
    },
  },
  { timestamps: true }
);

export default mongoose.models.Vendor || mongoose.model('Vendor', VendorSchema);
