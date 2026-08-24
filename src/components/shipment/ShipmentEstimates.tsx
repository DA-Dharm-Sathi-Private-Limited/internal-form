interface Props {
  costs: Record<string, number>;
  tats: Record<string, string>;
  shipmentId: string;
  partner?: string;
}

export function ShipmentEstimates({ costs, tats, shipmentId, partner = 'Delhivery' }: Props) {
  const cost = costs[shipmentId] ?? (partner === 'Shadowfax' ? 40 : partner === 'DTDC' ? 50 : 45);
  const tatRaw = tats[shipmentId];

  const formattedTat = tatRaw
    ? new Date(tatRaw).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
    : '3 - 4 Days';

  return (
    <div className="mt-4 p-4 bg-gradient-to-br from-indigo-50/50 to-white dark:from-[#1c1c28] dark:to-[#22222e] rounded-xl border border-indigo-100 dark:border-accent/30 shadow-xs relative overflow-hidden">
      <h5 className="text-xs uppercase text-accent mb-3 font-bold tracking-widest flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        {partner} Shipping & Routing Estimate
      </h5>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10 text-xs">
        <div className="flex justify-between items-center bg-white/60 dark:bg-black/30 p-2.5 rounded-lg border border-gray-100 dark:border-[#2a2a38]">
          <span className="text-gray-600 dark:text-gray-400 font-medium">Est. Shipping Cost</span>
          <span className="font-bold text-gray-900 dark:text-white text-sm">
            ₹{cost}
          </span>
        </div>
        <div className="flex justify-between items-center bg-white/60 dark:bg-black/30 p-2.5 rounded-lg border border-gray-100 dark:border-[#2a2a38]">
          <span className="text-gray-600 dark:text-gray-400 font-medium">Expected Delivery</span>
          <span className="font-bold text-gray-900 dark:text-white text-sm">
            {formattedTat}
          </span>
        </div>
      </div>
    </div>
  );
}
