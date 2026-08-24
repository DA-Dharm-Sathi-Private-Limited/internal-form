'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import LineItemRow from '@/components/LineItemRow';
import DiscountEditor from '@/components/DiscountEditor';
import OrderMetadata from '@/components/OrderMetadata';
import { InvoiceItem, ZohoItem, ZohoTax } from '@/types/invoice';
import { isInterstateOrder, normalizeItemTaxForContext, validateTaxesForOrder } from '@/lib/tax';
import { zohoService } from '@/services/zoho';
import { ordersService, OrderResponse } from '@/services/orders';

const emptyItem = (): InvoiceItem => ({
  name: '', description: '', quantity: 1, price: 0,
  final_price: undefined, tax_id: 'NO_TAX', tax_amount: 0, item_total: 0, cost_price: 0,
});

function mapDbItemToInvoiceItem(dbItem: any): InvoiceItem {
  const rate = dbItem.rate ?? 0;
  const taxPct = dbItem.tax_percentage ?? 0;
  const qty = dbItem.quantity ?? 1;
  return {
    ...dbItem,
    price: dbItem.price ?? rate,
    zoho_item_id: dbItem.zoho_item_id || dbItem.item_id || '',
    final_price: dbItem.final_price ?? Math.round(rate * (1 + taxPct / 100) * 100) / 100,
    cost_price: dbItem.cost_price ?? 0,
    tax_amount: dbItem.tax_amount ?? 0,
    item_total: dbItem.item_total ?? (rate * qty),
    tax_percentage: taxPct,
  };
}

function recalcFromFinalPrice(item: InvoiceItem, overrides: Partial<InvoiceItem>, taxes: ZohoTax[]): Partial<InvoiceItem> {
  const merged = { ...item, ...overrides };
  const qty = Number(merged.quantity) || 0;
  const finalPricePerUnit = Number(merged.final_price) || 0;
  const taxId = merged.tax_id ?? '';
  let preTaxRate = finalPricePerUnit;
  let totalTaxAmount = 0;
  if (taxId && taxId !== 'NO_TAX') {
    const foundTax = taxes.find(t => t.tax_id === taxId);
    if (foundTax && foundTax.tax_percentage > 0) {
      preTaxRate = Math.round((finalPricePerUnit / (1 + foundTax.tax_percentage / 100)) * 100) / 100;
      totalTaxAmount = Math.round(preTaxRate * qty * (foundTax.tax_percentage / 100) * 100) / 100;
    }
  }
  return { ...overrides, price: preTaxRate, tax_amount: totalTaxAmount, item_total: preTaxRate * qty };
}

export default function EditInvoicePage() {
  const [orderIdSearch, setOrderIdSearch] = useState('');
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [zohoItems, setZohoItems] = useState<ZohoItem[]>([]);
  const [zohoTaxes, setZohoTaxes] = useState<ZohoTax[]>([]);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [discount, setDiscount] = useState('');
  const [discountFormatType, setDiscountFormatType] = useState<'percentage' | 'fixed'>('fixed');
  const [saving, setSaving] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [savedSuccessfully, setSavedSuccessfully] = useState(false);

  const isInterstate = order ? isInterstateOrder(order.customerDetails?.state) : true;

  useEffect(() => {
    async function loadZohoData() {
      try {
        const [items, taxes] = await Promise.all([
          zohoService.getItems(),
          zohoService.getTaxes(),
        ]);
        setZohoItems(items as ZohoItem[]);
        setZohoTaxes(taxes as ZohoTax[]);
      } catch (err) {
        console.error('Failed to load zoho data:', err);
        toast.error('Failed to load products/taxes catalog from Zoho');
      }
    }
    loadZohoData();
  }, []);

  const fetchOrder = async () => {
    const q = orderIdSearch.trim();
    if (!q) { toast.error('Please enter an Order ID'); return; }
    setLoadingOrder(true);
    setOrder(null);
    setItems([]);
    setSavedSuccessfully(false);
    setDiscount('');
    setDiscountFormatType('fixed');
    try {
      const data = await ordersService.get(q) as OrderResponse;
      if (!data.success) throw new Error(data.error || 'Failed to fetch order');
      const ord = data.order as Record<string, unknown> | undefined;
      if (!ord) throw new Error('Order not found');
      setOrder(ord);
      setItems(((ord.invoiceItems as unknown[]) || []).map(mapDbItemToInvoiceItem));

      // Hydrate discount from DB / Zoho (handles legacy orders)
      try {
        const discountData = await zohoService.getInvoiceDiscount(ord.orderId as string) as any;
        const discountVal = Number(discountData?.discount) || 0;
        if (discountVal > 0) {
          setDiscount(String(discountVal));
          setDiscountFormatType('fixed'); // Zoho stores resolved ₹ amount
        }
      } catch { /* non-fatal — discount stays at 0 */ }

      toast.success(`Order ${ord.orderId} loaded successfully`);
    } catch (err: any) {
      toast.error(err.message || 'Error fetching order details');
    } finally {
      setLoadingOrder(false);
    }
  };

  const handleItemChange = (index: number, updates: Partial<InvoiceItem>) => {
    const newItems = [...items];
    const currentItem = newItems[index];
    const normalized = normalizeItemTaxForContext({ item: currentItem, updates, taxes: zohoTaxes, isInterstate });
    const mergedUpdates: Partial<InvoiceItem> = { ...updates, ...normalized };
    const needsRecalc = 'final_price' in mergedUpdates || 'tax_id' in mergedUpdates || 'quantity' in mergedUpdates;
    let finalUpdates = needsRecalc ? recalcFromFinalPrice(currentItem, mergedUpdates, zohoTaxes) : mergedUpdates;
    if (updates.tax_id) {
      const taxObj = zohoTaxes.find(t => t.tax_id === (finalUpdates.tax_id || updates.tax_id));
      if (taxObj) finalUpdates.tax_percentage = taxObj.tax_percentage;
    }
    newItems[index] = { ...currentItem, ...finalUpdates };
    setItems(newItems);
    setSavedSuccessfully(false);
  };

  const addItem = () => { setItems([...items, emptyItem()]); setSavedSuccessfully(false); };
  const removeItem = (index: number) => { setItems(items.filter((_, i) => i !== index)); setSavedSuccessfully(false); };

  const subtotal = items.reduce((acc, item) => acc + (item.item_total || 0), 0);
  const totalTax = items.reduce((acc, item) => acc + (item.tax_amount || 0), 0);
  const finalItemsPrice = subtotal + totalTax;
  const discountInput = Number(discount) || 0;
  const appliedDiscountAmount = discountFormatType === 'percentage'
    ? (finalItemsPrice * discountInput) / 100
    : discountInput;
  const grandTotal = finalItemsPrice - appliedDiscountAmount;

  const handleSave = async () => {
    if (!order) return;
    if (items.length === 0) { toast.error('At least one item is required'); return; }

    const taxIssues = validateTaxesForOrder(items, zohoTaxes, isInterstate);
    if (taxIssues.length) {
      taxIssues.forEach(i => toast.error(`Item ${i.index + 1}: ${i.message}`));
      return;
    }
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.name.trim()) { toast.error(`Item ${i + 1}: Name is required`); return; }
      if (it.cost_price === undefined || it.cost_price < 0) { toast.error(`Item ${i + 1}: Valid Cost Price is required`); return; }
    }

    setSaving(true);
    try {
      const data = await zohoService.updateInvoice(order.orderId, {
        invoice_items: items,
        discount: appliedDiscountAmount > 0 ? appliedDiscountAmount : 0,
        discount_type: 'entity_level',
        is_discount_before_tax: false,
      }) as Record<string, unknown>;
      if (!data.success) throw new Error((data as any).error || 'Failed to update invoice');
      toast.success('Invoice updated successfully!');
      setOrder(data.order);
      setItems(((data.order as any)?.invoiceItems || []).map(mapDbItemToInvoiceItem));
      setSavedSuccessfully(true);
    } catch (err: any) {
      toast.error(err.message || 'Error saving invoice changes');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadInvoice = () => {
    if (!order?.orderId) return;
    window.open(`/api/invoices/${order.orderId}/pdf`, '_blank');
  };

  return (
    <div className="app-container">
      <div className="invoice-form">
        <div className="form-header">
          <h1>Edit Invoice Details</h1>
          <p>Search and modify items, prices, and taxes for any existing order</p>
        </div>

        <div className="form-section flex gap-3 items-end">
          <div className="form-group flex-1">
            <label>Order ID (INV-xxxxxx)</label>
            <input type="text" className="form-input" placeholder="Enter Order ID (e.g. INV-000101)"
              value={orderIdSearch}
              onChange={(e) => setOrderIdSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchOrder()} />
          </div>
          <button className="btn btn-primary h-[42px] px-6" onClick={fetchOrder} disabled={loadingOrder}>
            {loadingOrder ? 'Searching...' : '🔍 Search'}
          </button>
        </div>

        {order && (
          <div className="animate-in fade-in duration-300">
            <OrderMetadata
              customerName={order.customerDetails?.customer_name}
              email={order.customerDetails?.email}
              phone={order.customerDetails?.phone}
              address={order.customerDetails?.address}
              city={order.customerDetails?.city}
              state={order.customerDetails?.state}
              pincode={order.customerDetails?.pincode}
              isInterstate={isInterstate}
              orderId={order.orderId}
              zohoInvoiceId={order.zohoInvoiceId}
              paymentMode={order.paymentMode}
            />

            <div className="form-section">
              <h3 className="section-title"><span className="section-icon">📦</span> Edit Invoice Items</h3>
              <div className="line-items-container">
                {items.map((item, index) => (
                  <LineItemRow key={index} index={index} item={item} zohoItems={zohoItems}
                    zohoTaxes={zohoTaxes} isInterstate={isInterstate}
                    onChange={handleItemChange} onRemove={() => removeItem(index)}
                    canRemove={items.length > 1} />
                ))}
                <button type="button" className="btn-add-item" onClick={addItem}>+ Add another item</button>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-[#2a2a38]">
                <div className="totals-right ml-auto max-w-sm">
                  <div className="total-row"><span>Subtotal (pre-tax)</span><span>₹{subtotal.toFixed(2)}</span></div>
                  {totalTax > 0 && (
                    <div className="total-row"><span>Total Tax</span><span>₹{totalTax.toFixed(2)}</span></div>
                  )}
                  <div className="total-row font-medium text-gray-700 dark:text-gray-300">
                    <span>Final Price (incl. tax)</span><span>₹{finalItemsPrice.toFixed(2)}</span>
                  </div>
                  <DiscountEditor
                    discount={discount}
                    discountFormatType={discountFormatType}
                    appliedDiscountAmount={appliedDiscountAmount}
                    onDiscountChange={(v) => { setDiscount(v); setSavedSuccessfully(false); }}
                    onFormatTypeChange={(t) => { setDiscountFormatType(t); setSavedSuccessfully(false); }}
                  />
                  <div className="total-row total-grand"><span>Invoice Total</span><span>₹{grandTotal.toFixed(2)}</span></div>

                  <div className="form-submit-section mt-6 flex flex-col gap-3">
                    <button className="btn btn-submit" onClick={handleSave} disabled={saving}>
                      {saving ? (
                        <><span className="btn-spinner border-2 border-white border-t-transparent rounded-full w-4 h-4 mr-2 inline-block"></span> Saving Changes...</>
                      ) : '💾 Save Invoice Changes'}
                    </button>
                    <button className="btn bg-white dark:bg-[#1c1c28] hover:bg-gray-50 dark:hover:bg-[#2a2a38] text-gray-800 dark:text-white py-3 px-5 rounded-xl flex items-center justify-center gap-2 transition-all border border-gray-200 dark:border-[#3a3a4a] shadow-sm hover:shadow font-medium w-full"
                      onClick={handleDownloadInvoice} disabled={downloadingInvoice}>
                      📄 View / Print Invoice PDF
                    </button>
                    {savedSuccessfully && (
                      <p className="text-center text-sm text-green-500 font-medium animate-in fade-in duration-300">
                        ✅ Invoice updated successfully. Click above to view the updated PDF.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
