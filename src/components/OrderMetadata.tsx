interface Props {
  customerName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  isInterstate: boolean;
  orderId?: string;
  zohoInvoiceId?: string;
  paymentMode?: string;
}

export default function OrderMetadata({
  customerName, email, phone, address, city, state, pincode,
  isInterstate, orderId, zohoInvoiceId, paymentMode,
}: Props) {
  return (
    <div className="form-section grid grid-cols-1 md:grid-cols-3 gap-6 bg-linear-to-br from-indigo-50/20 to-transparent dark:from-accent/5 dark:to-transparent">
      <div>
        <h4 className="text-xs font-bold text-accent uppercase tracking-wider mb-2">Customer Details</h4>
        <p className="text-sm font-bold text-gray-900 dark:text-white">{customerName}</p>
        <p className="text-xs text-gray-500">{email || 'No email'}</p>
        <p className="text-xs text-gray-500">{phone || 'No phone'}</p>
      </div>
      <div>
        <h4 className="text-xs font-bold text-accent uppercase tracking-wider mb-2">Location & Tax</h4>
        <p className="text-xs text-gray-700 dark:text-gray-300">
          {address}, {city}, {state} - {pincode}
        </p>
        <p className="text-xs font-semibold mt-1">
          Tax Type: {isInterstate
            ? <span className="text-amber-500">Interstate (IGST)</span>
            : <span className="text-green-500">Intrastate (CGST/SGST)</span>}
        </p>
      </div>
      <div>
        <h4 className="text-xs font-bold text-accent uppercase tracking-wider mb-2">Order Info</h4>
        <p className="text-xs text-gray-700 dark:text-gray-300">
          Order ID: <strong className="text-gray-900 dark:text-white">{orderId}</strong>
        </p>
        <p className="text-xs text-gray-700 dark:text-gray-300">
          Zoho Invoice ID: <span className="font-mono text-gray-500">{zohoInvoiceId}</span>
        </p>
        <p className="text-xs text-gray-700 dark:text-gray-300">
          Payment Mode: <strong className="text-gray-900 dark:text-white">{paymentMode}</strong>
        </p>
      </div>
    </div>
  );
}
