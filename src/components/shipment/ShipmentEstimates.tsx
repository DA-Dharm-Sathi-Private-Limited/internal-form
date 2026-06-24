interface Props {
  costs: Record<string, number>;
  tats: Record<string, string>;
  shipmentId: string;
}

export function ShipmentEstimates({ costs, tats, shipmentId }: Props) {
  const cost = costs[shipmentId];
  const tat = tats[shipmentId];

  if (!cost && !tat) return null;

  return (
    <div className="mt-4 p-4 bg-linear-to-br from-indigo-50 to-white dark:from-[#1c1c28] dark:to-[#22222e] rounded-xl border border-indigo-100 dark:border-accent/30 shadow-sm relative overflow-hidden">
      <h5 className="text-xs uppercase text-accent mb-4 font-bold tracking-widest flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        Delhivery Estimates
      </h5>
      <div className="space-y-3 relative z-10">
        <div className="flex justify-between items-center bg-white/50 dark:bg-black/20 p-2.5 rounded-lg">
          <span className="text-gray-600 dark:text-gray-400 font-medium text-xs">Est. Shipping Cost</span>
          <span className="font-bold text-gray-900 dark:text-white text-base">
            {cost ? `₹${cost}` : <span className="text-gray-400 font-normal italic text-sm">Calculating...</span>}
          </span>
        </div>
        <div className="flex justify-between items-center bg-white/50 dark:bg-black/20 p-2.5 rounded-lg">
          <span className="text-gray-600 dark:text-gray-400 font-medium text-xs">Expected Delivery</span>
          <span className="font-bold text-gray-900 dark:text-white text-base">
            {tat ? new Date(tat).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : <span className="text-gray-400 font-normal italic text-sm">Calculating...</span>}
          </span>
        </div>
      </div>
    </div>
  );
}
