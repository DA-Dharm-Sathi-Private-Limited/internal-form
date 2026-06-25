'use client';

import { useState } from 'react';
import { CombinedFormData } from '@/types/wizard';
import { downloadDelhiveryLabel } from '@/lib/printLabel';
import { delhiveryService } from '@/services/delhivery';

interface Props {
  formData: CombinedFormData;
  onReset: () => void;
}

export default function ScheduleConfirmationStep({ formData, onReset }: Props) {
  const [downloadingLabel, setDownloadingLabel] = useState(false);
  const [creatingPickup, setCreatingPickup] = useState(false);
  const [pickupRequested, setPickupRequested] = useState(false);

  const [pickupDate, setPickupDate] = useState(new Date().toISOString().split('T')[0]);
  const [pickupTime, setPickupTime] = useState('11:00:00');
  const [pickupError, setPickupError] = useState('');

  const handleDownloadLabel = async (wb: string) => {
    setDownloadingLabel(true);
    try {
      await downloadDelhiveryLabel(wb);
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : 'Error printing label.');
    } finally {
      setDownloadingLabel(false);
    }
  };

  const handleRequestPickup = async () => {
    setCreatingPickup(true);
    setPickupError('');
    try {
      const packageCount = formData.waybills?.length || 1;

      const result = await delhiveryService.requestPickup({
        pickup_date: pickupDate,
        pickup_time: pickupTime,
        pickup_location: formData.warehouse as string,
        expected_package_count: packageCount,
      }) as Record<string, unknown>;

      const isError = result.error || (result.pr && (Array.isArray(result.pr) || typeof result.pr === 'string'));
      if (isError) {
        let errMsg = 'Failed to request pickup';
        if (typeof result.error === 'string') errMsg = result.error;
        else if (Array.isArray(result.pr)) errMsg = `Delhivery Error: ${(result.pr as string[]).join(', ')}`;
        else if (typeof result.pr === 'string') errMsg = result.pr;
        throw new Error(errMsg);
      }

      setPickupRequested(true);
    } catch (e) {
      console.error('[ScheduleConfirmationStep: Pickup Request Exception]', e);
      setPickupError(e instanceof Error ? e.message : 'Error requesting pickup');
    } finally {
      setCreatingPickup(false);
    }
  };

  const displayWaybills = formData.waybills && formData.waybills.length > 0
    ? formData.waybills
    : formData.waybill
      ? [formData.waybill]
      : [];

  const shipmentLabels = formData.plannedShipments || [];

  return (
    <div className="form-section animate-in fade-in slide-in-from-bottom-4 duration-500 text-center py-8">
      <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 border-2 border-green-500/50">✓</div>

      <h2 className="text-2xl font-bold text-white mb-2">Shipment Scheduled!</h2>
      <p className="text-gray-400 mb-8 max-w-md mx-auto">
        {displayWaybills.length > 1
          ? `${displayWaybills.length} shipments are scheduled for order ${formData.orderId}.`
          : `The shipment is scheduled for order ${formData.orderId}.`
        }
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto mb-10 text-left">
        {displayWaybills.map((wb, idx) => {
          const sh = shipmentLabels[idx];
          const partner = sh?.deliveryPartner || 'Delhivery';
          return (
            <div key={wb} className="bg-[#16161f] p-5 rounded-xl border border-accent/30 flex flex-col justify-between">
              <div>
                <h4 className="text-accent text-xs uppercase tracking-wider mb-1">
                  {displayWaybills.length > 1 ? `Package ${idx + 1}` : `${partner} Waybill`}
                </h4>
                <p className="text-lg font-mono font-bold text-white mb-4">{wb}</p>
              </div>
              {partner === 'Delhivery' && (
                <button className="btn btn-primary w-full text-sm py-2" onClick={() => handleDownloadLabel(wb)} disabled={downloadingLabel}>
                  {downloadingLabel ? 'Fetching...' : '🏷️ Download Label'}
                </button>
              )}
              {partner !== 'Delhivery' && (
                <div className="text-xs text-gray-500 text-center py-2">
                  Tracking: {wb}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="max-w-md mx-auto bg-[#16161f] border border-[#2a2a38] rounded-xl p-5 mb-10 text-left">
        <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
          <span>📦</span> Schedule Pickup ({displayWaybills.length} {displayWaybills.length === 1 ? 'Package' : 'Packages'})
        </h4>
        {pickupRequested ? (
          <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-3 rounded-lg text-sm flex items-center gap-2">
            ✓ Pickup request submitted successfully for {formData.warehouse}
          </div>
        ) : (
          <div className="space-y-4">
            {pickupError && <div className="text-red-400 text-sm">{pickupError}</div>}
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-xs text-gray-400">Date</label>
                <input type="date" className="form-input text-sm" value={pickupDate} onChange={e => setPickupDate(e.target.value)} />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-400">Time</label>
                <input type="time" className="form-input text-sm" value={pickupTime} onChange={e => setPickupTime(e.target.value)} />
              </div>
            </div>
            <button className="btn bg-[#2a2a38] hover:bg-[#3a3a4a] text-white w-full border border-[#3a3a4a]" onClick={handleRequestPickup} disabled={creatingPickup}>
              {creatingPickup ? 'Scheduling...' : 'Schedule Pickup Request'}
            </button>
          </div>
        )}
      </div>

      <button className="btn btn-link text-lg group" onClick={onReset}>
        + Schedule Another Order
        <span className="block h-px bg-accent w-0 group-hover:w-full transition-all duration-300"></span>
      </button>
    </div>
  );
}
