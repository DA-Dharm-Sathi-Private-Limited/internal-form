import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema(
  {
    recipientType: {
      type: String,
      enum: ['staff', 'vendor'],
      required: true,
      index: true,
    },
    recipientId: {
      type: String, // 'all' or staff user email or vendor facilityName
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['order_assigned', 'order_shipped_by_vendor', 'order_pending_over_48h', 'vendor_deactivated'],
      required: true,
    },
    orderId: {
      type: String,
      default: null,
    },
    message: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    emailedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
