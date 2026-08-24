import { useState, useEffect } from 'react';
import { delhiveryService } from '@/services/delhivery';
import { WAREHOUSE_DETAILS } from '@/config/warehouses';

interface UseShipmentEstimatesParams {
  plannedShipments: { id: string; shipping_mode: string; weight: number; payment_mode: string; warehouse: string }[];
  destPincode: string;
}

export function useShipmentEstimates({ plannedShipments, destPincode }: UseShipmentEstimatesParams) {
  const [costs, setCosts] = useState<Record<string, number>>({});
  const [tats, setTats] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!destPincode || plannedShipments.length === 0) return;

    let cancelled = false;
    setLoading(true);

    async function fetchAll() {
      const newCosts: Record<string, number> = {};
      const newTats: Record<string, string> = {};

      await Promise.all(
        plannedShipments.map(async (sh) => {
          const originPin = WAREHOUSE_DETAILS[sh.warehouse]?.pincode || '201318';
          try {
            const costData = await delhiveryService.getShippingCost({
              md: sh.shipping_mode === 'Express' ? 'E' : 'S',
              cgm: sh.weight || 500,
              o_pin: originPin,
              d_pin: destPincode,
              ss: 'Delivered',
              pt: sh.payment_mode === 'Prepaid' ? 'Pre-paid' : 'COD',
            });
            if (Array.isArray(costData) && (costData[0] as Record<string, unknown>)?.total_amount) {
              newCosts[sh.id] = (costData[0] as Record<string, number>).total_amount;
            }
          } catch {
            newCosts[sh.id] = 50; // Fallback estimate
          }

          try {
            const tatData = await delhiveryService.getTat({
              origin_pin: originPin,
              destination_pin: destPincode,
              mot: sh.shipping_mode === 'Express' ? 'E' : 'S',
            });
            if (tatData.data?.tat) {
              const dt = new Date();
              dt.setDate(dt.getDate() + tatData.data.tat);
              newTats[sh.id] = dt.toISOString();
            } else if (tatData.expected_delivery_date) {
              newTats[sh.id] = tatData.expected_delivery_date;
            }
          } catch {
            const dt = new Date();
            dt.setDate(dt.getDate() + 3);
            newTats[sh.id] = dt.toISOString(); // Fallback 3 days delivery
          }
        })
      );

      if (!cancelled) {
        setCosts(newCosts);
        setTats(newTats);
        setLoading(false);
      }
    }

    fetchAll();
    return () => { cancelled = true; };
  }, [destPincode, plannedShipments]);

  return { costs, tats, loading };
}
