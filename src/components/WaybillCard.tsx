"use client";

interface WaybillCardProps {
  waybill: string | null | undefined;
  orderId: string | null | undefined;
  status: string;
  createdAt: string;
  isSelfShipped?: boolean;
  selfShipmentStatus?: string;
  onClick: () => void;
}

function getStatusColor(statusType: string) {
  switch (statusType?.toUpperCase()) {
    case 'DELIVERED': return 'text-green-400 bg-green-400/10 border-green-500/20';
    case 'IN TRANSIT': return 'text-blue-400 bg-blue-400/10 border-blue-500/20';
    case 'RTO': return 'text-red-400 bg-red-400/10 border-red-500/20';
    case 'DISPATCHED': return 'text-yellow-400 bg-yellow-400/10 border-yellow-500/20';
    case 'PICKED UP': return 'text-cyan-400 bg-cyan-400/10 border-cyan-500/20';
    default: return 'text-gray-400 bg-gray-400/10 border-gray-500/20';
  }
}

export default function WaybillCard({
  waybill,
  orderId,
  status,
  createdAt,
  isSelfShipped,
  selfShipmentStatus,
  onClick,
}: WaybillCardProps) {
  const isUnused = status === 'UNUSED';

  let displayStatus = status;
  let statusClasses = isUnused
    ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 border border-green-200 dark:border-green-500/30'
    : 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400 border border-gray-200 dark:border-gray-500/30';

  if (isSelfShipped) {
    displayStatus = selfShipmentStatus || 'Order Created';
    statusClasses = 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30';
  } else if (status) {
    if (displayStatus === 'SHIPPED') displayStatus = 'SCHEDULED';
    displayStatus = displayStatus.length > 15 ? displayStatus.substring(0, 15) + '...' : displayStatus;
    statusClasses = getStatusColor(status);
  }

  return (
    <div
      className="bg-white dark:bg-[#12121a] border border-gray-200 dark:border-[#2a2a38] hover:border-accent dark:hover:border-accent/50 p-5 rounded-xl cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:hover:shadow-accent/5 hover:bg-gray-50 dark:hover:bg-[#16161f] group flex flex-col h-full"
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-3 gap-2">
        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold tracking-wide flex-shrink-0 ${statusClasses}`} title={status}>
          {displayStatus}
        </span>
        <span className="text-gray-500 dark:text-gray-400 text-xs font-medium flex items-center gap-1 text-right flex-shrink-0">
          📅 {new Date(createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>
      <div className="mb-4 flex-grow">
        <p className="text-xs text-gray-400 mb-1 uppercase tracking-wider font-semibold">
          {isSelfShipped ? 'Order Identifier' : 'Waybill Number'}
        </p>
        <p className="text-gray-900 dark:text-white font-bold text-lg group-hover:text-accent transition-colors break-all">
          {waybill || orderId}
        </p>
      </div>
      <div className="pt-3 border-t border-gray-100 dark:border-[#2a2a38] flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Assigned Order</p>
          <p className="text-gray-700 dark:text-gray-300 text-sm font-medium">{orderId ? orderId : '—'}</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#1c1c28] flex items-center justify-center text-gray-400 group-hover:text-accent group-hover:bg-accent/10 transition-colors flex-shrink-0">
          ➔
        </div>
      </div>
    </div>
  );
}
