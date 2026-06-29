import { useState, useEffect } from 'react';
import { delhiveryService } from '@/services/delhivery';

interface UseShipmentEstimatesParams {
  plannedShipments: { id: string; shipping_mode: string; weight: number; payment_mode: string; warehouse: string }[];
  destPincode: string;
}

export function useShipmentEstimates({ plannedShipments, destPincode }: UseShipmentEstimatesParams) {
  const [costs, setCosts] = useState<Record<string, number>>({});
  const [tats, setTats] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!destPincode || plannedShipments.length === 0) {
      return;
    }

    let cancelled = false;

    async function fetchAll() {
      setLoading(true);
      const newCosts: Record<string, number> = {};
      const newTats: Record<string, string> = {};

      await Promise.all(
        plannedShipments.map(async (sh) => {
          try {
            const costData = await delhiveryService.getShippingCost({
              md: sh.shipping_mode === 'Express' ? 'E' : 'S',
              cgm: sh.weight,
              o_pin: '302001',
              d_pin: destPincode,
              ss: 'Delivered',
              pt: sh.payment_mode === 'Prepaid' ? 'Pre-paid' : 'COD',
            });
            if (Array.isArray(costData) && (costData[0] as Record<string, unknown>)?.total_amount) {
              newCosts[sh.id] = (costData[0] as Record<string, number>).total_amount;
            }

            const tatData = await delhiveryService.getTat({
              origin_pin: '302001',
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
          } catch (err) {
            console.error(`[useShipmentEstimates] Shipment ${sh.id} failed:`, err);
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
