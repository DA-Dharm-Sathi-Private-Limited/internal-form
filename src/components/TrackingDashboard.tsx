'use client';

import { useState, useEffect } from 'react';
import { TrackingShipmentData } from '@/types/delhivery';
import Link from 'next/link';
import { ordersService } from '@/services/orders';
import { delhiveryService } from '@/services/delhivery';
import { shadowfaxService } from '@/services/shadowfax';
import { zohoService } from '@/services/zoho';
import TrackingSearchBar from './TrackingSearchBar';
import TrackingFilterPanel from './TrackingFilterPanel';
import TrackingResultCard from './TrackingResultCard';
import SelfShippedOrderCard from './SelfShippedOrderCard';
import WaybillCard from './WaybillCard';
import RecentOrderCard from './RecentOrderCard';

interface StoredOrder {
  waybill: string;
  orderId: string;
  consignee: string;
  date: string;
}

interface DBWaybill {
  _id: string;
  waybill: string;
  status: string;
  orderId?: string | null;
  createdAt: string;
  isSelfShipped?: boolean;
  selfShipmentStatus?: string;
  selfShipmentNotes?: string;
  selfShipmentProvider?: string;
  selfShipmentAWB?: string;
  invoiceItems?: any[];
}

export default function TrackingDashboard() {
  const [recentOrders, setRecentOrders] = useState<StoredOrder[]>([]);
  const [dbOrders, setDbOrders] = useState<DBWaybill[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [trackingData, setTrackingData] = useState<TrackingShipmentData | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedSelfShippedOrder, setSelectedSelfShippedOrder] = useState<DBWaybill | null>(null);
  const [updateSelfShipLoading, setUpdateSelfShipLoading] = useState(false);
  const [selfShipStatusInput, setSelfShipStatusInput] = useState('');
  const [selfShipNotesInput, setSelfShipNotesInput] = useState('');
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);

  useEffect(() => {
    try {
      const storedStr = localStorage.getItem('delhivery_recent_orders');
      if (storedStr) {
        setRecentOrders(JSON.parse(storedStr));
      }
    } catch (e) {
      console.error('Failed to load recent local orders', e);
    }

    fetchDbOrders();
  }, []);

  const fetchDbOrders = async (queryParam = '?limit=all') => {
    try {
      const searchParams = new URLSearchParams(queryParam.replace(/^\?/, ''));
      searchParams.set('warehouse', warehouseFilter);
      const params: Record<string, string> = {};
      searchParams.forEach((v, k) => { params[k] = v; });
      const data = await ordersService.getTracked(params);
      if (data.success) {
        setDbOrders((data.waybills || []) as any[]);
      }
    } catch (err) {
      console.error('Failed to fetch tracked orders', err);
    }
  };

  const [dateFrom, setDateFrom] = useState('');

  const applyDateFilter = async () => {
    try {
      setLoading(true);
      const queryParams = dateFrom ? `?fromDate=${dateFrom}&limit=all` : `?limit=all`;
      await fetchDbOrders(queryParams);
    } catch (err) {
      console.error('Failed to filter by start date', err);
      setErrorMsg('Failed to fetch orders by dates.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTracking = async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    setErrorMsg('');
    setTrackingData(null);

    const localMatch = dbOrders.find(o => o.waybill === query.trim() || o.orderId === query.trim());
    if (localMatch && localMatch.isSelfShipped) {
      setLoading(false);
      setSelectedSelfShippedOrder(localMatch);
      setSelfShipStatusInput(localMatch.selfShipmentStatus || 'Order Created');
      setSelfShipNotesInput(localMatch.selfShipmentNotes || '');
      return;
    }
    setSelectedSelfShippedOrder(null);

    const isShadowfaxAWB = /^SF/i.test(query.trim());
    const isWaybill = /^\d{12,15}$/.test(query.trim());

    try {
      if (isShadowfaxAWB) {
        const orderIdMatch = query.trim();
        const sfData = await shadowfaxService.track(orderIdMatch);
        if (!sfData.success || !sfData.data) {
          throw new Error(sfData.error || 'Shadowfax tracking failed');
        }
        const sfTracking = sfData.data as Record<string, unknown>;
        setTrackingData({
          Shipment: {
            AWB: (sfTracking.awb_number as string) || query.trim(),
            ReferenceNo: (sfTracking.client_order_id as string) || '',
            ExpectedDeliveryDate: '',
            PickUpDate: '',
            Destination: (sfTracking.current_location as string) || '',
            DestRecieveDate: '',
            POD: '',
            OrderType: 'Shadowfax',
            OutDestinationDate: '',
            ReturnedDate: '',
            DispatchCount: 1,
            InvoiceAmount: (sfTracking.cod_amount as number) || 0,
            Origin: '',
            OriginRecieveDate: '',
            Carrier: 'Shadowfax',
            Consignee: { City: '', Name: '', Country: '', Address1: '', Address2: '', Address3: '', PinCode: 0, State: '', Telephone1: '', Telephone2: '' },
            CurrentStatus: { Status: (sfTracking.status as string) || 'New', StatusDateTime: '', StatusLocation: (sfTracking.current_location as string) || '', StatusType: (sfTracking.status as string) || '' },
            Status: { Status: (sfTracking.status as string) || 'New', StatusDateTime: '', StatusLocation: (sfTracking.current_location as string) || '', StatusType: (sfTracking.status as string) || '' },
            Scans: [],
          },
        } as TrackingShipmentData);
      } else {
        const trackParams: { waybill?: string; ref_ids?: string } = {};
        if (isWaybill) {
          trackParams.waybill = query.trim();
        } else {
          trackParams.ref_ids = query.trim();
        }

        const data = await delhiveryService.track(trackParams);

        if (data.Error) {
          if (
            typeof data.Error === 'string' &&
            (data.Error.includes('No such waybill') ||
              data.Error.includes('Not Found') ||
              data.Error.includes('Order Id found'))
          ) {
            throw new Error('Shipment created, but not yet scanned by Delhivery.');
          }
          throw new Error(`Delhivery returned: ${data.Error}`);
        }

        if (data.ShipmentData && data.ShipmentData.length > 0) {
          setTrackingData(data.ShipmentData[0] as TrackingShipmentData);
        } else {
          throw new Error('No tracking information found for this ID');
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchClick = () => fetchTracking(searchQuery);

  const handleDownloadInvoice = async () => {
    if (!searchQuery.trim()) return;
    setDownloadingInvoice(true);
    setErrorMsg('');
    try {
      const res = await zohoService.getInvoicePdf(searchQuery.trim());
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to download invoice');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${searchQuery.trim()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setDownloadingInvoice(false);
    }
  };

  const saveSelfShipment = async () => {
    if (!selectedSelfShippedOrder) return;
    setUpdateSelfShipLoading(true);
    setErrorMsg('');
    try {
      await ordersService.update(selectedSelfShippedOrder.orderId!, {
        selfShipmentStatus: selfShipStatusInput,
        selfShipmentNotes: selfShipNotesInput,
      });

      setSelectedSelfShippedOrder({
        ...selectedSelfShippedOrder,
        selfShipmentStatus: selfShipStatusInput,
        selfShipmentNotes: selfShipNotesInput,
      });
      setDbOrders(prev => prev.map(o => o.orderId === selectedSelfShippedOrder.orderId ? {
        ...o, selfShipmentStatus: selfShipStatusInput, selfShipmentNotes: selfShipNotesInput
      } : o));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setUpdateSelfShipLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-500 dark:from-white dark:to-gray-400 bg-clip-text text-transparent mb-2">
          Track Shipments
        </h1>
        <p className="text-gray-500 dark:text-gray-400">Search by Waybill Number or Order ID, or view recent orders</p>
      </div>

      <TrackingSearchBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearch={handleSearchClick}
        onDownloadInvoice={handleDownloadInvoice}
        loading={loading}
        downloadingInvoice={downloadingInvoice}
      />

      {!trackingData && !selectedSelfShippedOrder && (
        <TrackingFilterPanel
          dateFrom={dateFrom}
          setDateFrom={setDateFrom}
          warehouseFilter={warehouseFilter}
          setWarehouseFilter={setWarehouseFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          onFetch={applyDateFilter}
          loading={loading}
        />
      )}

      {errorMsg && (
        <div className="form-error max-w-2xl mx-auto mb-8">
          {errorMsg}
        </div>
      )}

      {trackingData && (
        <TrackingResultCard
          trackingData={trackingData}
          dbOrders={dbOrders}
          onBack={() => {
            setTrackingData(null);
            setSearchQuery('');
          }}
        />
      )}

      {selectedSelfShippedOrder && (
        <SelfShippedOrderCard
          orderId={selectedSelfShippedOrder.orderId}
          selfShipStatus={selfShipStatusInput}
          selfShipNotes={selfShipNotesInput}
          onStatusChange={setSelfShipStatusInput}
          onNotesChange={setSelfShipNotesInput}
          onSave={saveSelfShipment}
          onClose={() => {
            setSelectedSelfShippedOrder(null);
            setSearchQuery('');
          }}
          saving={updateSelfShipLoading}
          invoiceItems={selectedSelfShippedOrder.invoiceItems || []}
        />
      )}

      {!trackingData && !selectedSelfShippedOrder && dbOrders.length > 0 && (
        <div className="animate-in fade-in duration-500 mb-12">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Active Waybills</h3>
            <span className="text-xs bg-accent/10 dark:bg-accent/20 text-accent px-3 py-1.5 rounded-full border border-accent/20 dark:border-accent/30 flex items-center gap-1.5 font-medium shadow-sm">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse shadow-[0_0_8px_rgba(108,99,255,0.8)]"></span> Active Shipments
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
            {dbOrders.filter(order => {
              if (statusFilter === 'all') return true;
              let currentStatus = order.status;
              if (order.isSelfShipped) {
                currentStatus = order.selfShipmentStatus || 'Order Created';
              }
              return currentStatus?.toUpperCase() === statusFilter;
            }).map((order, idx) => (
              <WaybillCard
                key={idx}
                waybill={order.waybill}
                orderId={order.orderId}
                status={order.status}
                createdAt={order.createdAt}
                isSelfShipped={order.isSelfShipped}
                selfShipmentStatus={order.selfShipmentStatus}
                onClick={() => {
                  if (order.isSelfShipped) {
                    setSearchQuery(order.waybill || order.orderId || '');
                    setTrackingData(null);
                    setSelectedSelfShippedOrder(order);
                    setSelfShipStatusInput(order.selfShipmentStatus || 'Order Created');
                    setSelfShipNotesInput(order.selfShipmentNotes || '');
                  } else {
                    setSelectedSelfShippedOrder(null);
                    setSearchQuery(order.waybill);
                    fetchTracking(order.waybill);
                  }
                }}
              />
            ))}
          </div>
        </div>
      )}

      {!trackingData && !selectedSelfShippedOrder && recentOrders.length > 0 && (
        <div className="animate-in fade-in duration-500 mb-12">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Your Recent Shipments</h3>
            <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 font-medium flex items-center gap-1.5 shadow-sm">
              💻 Local Device
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {recentOrders.map((order, idx) => (
              <RecentOrderCard
                key={idx}
                waybill={order.waybill}
                orderId={order.orderId}
                consignee={order.consignee}
                date={order.date}
                onClick={() => {
                  setSearchQuery(order.waybill);
                  fetchTracking(order.waybill);
                }}
              />
            ))}
          </div>
        </div>
      )}

      {!trackingData && !selectedSelfShippedOrder && recentOrders.length === 0 && dbOrders.length === 0 && (
        <div className="text-center py-12 text-gray-500 border border-dashed border-[#2a2a38] rounded-xl">
          No recent orders found on this device or database. Create one from the <Link href="/" className="text-accent hover:underline">Create Order page</Link>.
        </div>
      )}
    </div>
  );
}
