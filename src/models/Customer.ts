import mongoose from 'mongoose';

const CustomerSchema = new mongoose.Schema(
  {
    customer_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    display_name: {
      type: String,
      required: true,
      index: true,
    },
    phone: {
      type: String,
      index: true,
    },
    email: String,
    company_name: String,
    billing_address: {
      attention: String,
      address: String,
      street2: String,
      city: String,
      state: String,
      zip: String,
      country: { type: String, default: 'India' },
    },
    gst_treatment: {
      type: String,
      default: 'consumer',
    },
    gst_no: String,
  },
  { timestamps: true }
);

export default mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);
