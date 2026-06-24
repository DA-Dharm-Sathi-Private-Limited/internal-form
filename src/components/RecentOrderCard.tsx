"use client";

interface RecentOrderCardProps {
  waybill: string;
  orderId: string;
  consignee: string;
  date: string;
  onClick: () => void;
}

export default function RecentOrderCard({
  waybill,
  orderId,
  consignee,
  date,
  onClick,
}: RecentOrderCardProps) {
  return (
    <div
      className="bg-white dark:bg-[#12121a] border border-gray-200 dark:border-[#2a2a38] hover:border-accent dark:hover:border-accent/50 p-5 rounded-xl cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:hover:shadow-accent/5 hover:bg-gray-50 dark:hover:bg-[#16161f] group"
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-3">
        <span className="bg-accent/10 text-accent border border-accent/20 text-xs px-2.5 py-1 rounded-full font-semibold tracking-wide flex items-center gap-1">
          📦 {orderId}
        </span>
        <span className="text-gray-500 dark:text-gray-400 text-xs font-medium flex items-center gap-1">
          📅 {new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>
      <div className="mb-4">
        <p className="text-xs text-gray-400 mb-1 uppercase tracking-wider font-semibold">Waybill Number</p>
        <p className="text-gray-900 dark:text-white font-bold text-lg group-hover:text-accent transition-colors">{waybill}</p>
      </div>
      <div className="pt-3 border-t border-gray-100 dark:border-[#2a2a38] flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Consignee</p>
          <p className="text-gray-700 dark:text-gray-300 text-sm font-medium truncate max-w-[150px]" title={consignee}>{consignee}</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#1c1c28] flex items-center justify-center text-gray-400 group-hover:text-accent group-hover:bg-accent/10 transition-colors">
          ➔
        </div>
      </div>
    </div>
  );
}
