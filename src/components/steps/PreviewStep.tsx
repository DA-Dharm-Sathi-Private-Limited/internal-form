'use client';

import { useState, useEffect } from 'react';
import { CombinedFormData } from '@/types/wizard';
import { WAREHOUSE_DETAILS, DelhiveryWarehouse } from '@/config/warehouses';
import stateCodesData from '@/data/state-codes.json';
import { isInterstateOrder, get18PctTaxId } from '@/lib/tax';
import { delhiveryService } from '@/services/delhivery';
import { zohoService } from '@/services/zoho';
import { ordersService } from '@/services/orders';
import { Spinner } from '@/components/ui/Spinner';
import { ErrorBox } from '@/components/ui/ErrorBox';

interface Props {
  formData: CombinedFormData;
  updateForm: (data: Partial<CombinedFormData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

function buildChargeItem(name: string, finalPrice: number, description: string, isInterstate: boolean) {
  const taxId = get18PctTaxId(isInterstate);
  let preTaxRate = finalPrice;
  let taxAmount = 0;
  if (taxId !== 'NO_TAX') {
    preTaxRate = Math.round((finalPrice / 1.18) * 100) / 100;
    taxAmount = Math.round(preTaxRate * 0.18 * 100) / 100;
  }
  return {
    name, description, quantity: 1, price: preTaxRate, final_price: finalPrice,
    tax_id: taxId, tax_amount: taxAmount, item_total: preTaxRate,
    zoho_item_id: '__system__', cost_price: 0,
  };
}

function saveWaybillToHistory(waybill: string, orderId: string, consignee: string) {
  try {
    const history = JSON.parse(localStorage.getItem('delhivery_recent_orders') || '[]');
    localStorage.setItem('delhivery_recent_orders', JSON.stringify(
      [{ waybill, orderId, consignee, date: new Date().toISOString() }, ...history].slice(0, 5)
    ));
  } catch { /* ignore */ }
}

export default function PreviewStep({ formData, updateForm, onNext, onPrev }: Props) {
  const [shippingCost, setShippingCost] = useState<number | null>(null);
  const [expectedTat, setExpectedTat] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isInterstate = isInterstateOrder(formData.state);
  const deliveryItem = formData.include_shipping ? buildChargeItem('Delivery Charges', 100, 'Shipping and handling', isInterstate) : null;
  const codItem = formData.include_cod ? buildChargeItem('COD Charges', 50, 'Cash on Delivery fee', isInterstate) : null;

  let itemsSubtotal = 0;
  let itemsTax = 0;
  formData.invoice_items.forEach(item => {
    itemsSubtotal += Number((item.price || 0).toFixed(2)) * (Number(item.quantity) || 0);
    itemsTax += Number((item.tax_amount || 0).toFixed(2)) * (Number(item.quantity) || 0);
  });

  const finalItemsPrice = itemsSubtotal + itemsTax;
  let totalTax = itemsTax;
  if (deliveryItem) totalTax += deliveryItem.tax_amount;
  if (codItem) totalTax += codItem.tax_amount;

  const discountInput = Number(formData.discount) || 0;
  const discountFormat = formData.discount_format_type || 'fixed';
  const appliedDiscountAmount = discountFormat === 'percentage'
    ? (finalItemsPrice * discountInput) / 100
    : discountInput;

  const shippingCharge = deliveryItem ? deliveryItem.price : 0;
  const codCharge = codItem ? codItem.price : 0;
  const grandTotal = finalItemsPrice - appliedDiscountAmount + (deliveryItem?.final_price || 0) + (codItem?.final_price || 0);

  useEffect(() => {
    let cancelled = false;
    async function fetchPreviewData() {
      setLoadingPreview(true);
      setErrorMsg('');
      try {
        const originPin = WAREHOUSE_DETAILS[formData.warehouse as DelhiveryWarehouse]?.pincode || '302001';
        const md = formData.shipping_mode === 'Express' ? 'E' : 'S';
        const pt = formData.payment_mode === 'Prepaid' ? 'Pre-paid' : 'COD';

        const [costResult, tatResult] = await Promise.all([
          delhiveryService.getShippingCost({ md, cgm: formData.weight, o_pin: originPin, d_pin: formData.pincode, ss: 'Delivered', pt }),
          delhiveryService.getTat({ origin_pin: originPin, destination_pin: formData.pincode, mot: md }),
        ]);

        if (cancelled) return;

        if (Array.isArray(costResult) && costResult.length > 0 && (costResult[0] as Record<string, unknown>).total_amount) {
          setShippingCost((costResult[0] as Record<string, number>).total_amount);
        }

        if (tatResult.data && typeof tatResult.data.tat === 'number') {
          const d = new Date();
          d.setDate(d.getDate() + tatResult.data.tat);
          setExpectedTat(d.toISOString());
        } else if (tatResult.expected_delivery_date) {
          setExpectedTat(tatResult.expected_delivery_date);
        }
      } catch (err) {
        console.error('Failed to fetch preview data', err);
      } finally {
        if (!cancelled) setLoadingPreview(false);
      }
    }
    fetchPreviewData();
    return () => { cancelled = true; };
  }, [formData.shipping_mode, formData.weight, formData.pincode, formData.payment_mode, formData.warehouse]);

  const handleConfirm = async () => {
    setSubmitting(true);
    setErrorMsg('');

    try {
      const finalInvoiceItems = [...formData.invoice_items];
      if (deliveryItem) finalInvoiceItems.push(deliveryItem);
      if (codItem) finalInvoiceItems.push(codItem);

      const placeOfSupply = stateCodesData.find(s => s.name === formData.state)?.code || formData.state;

      const invoicePayload: Record<string, unknown> = {
        customer_id: formData.customer_id,
        date: formData.date,
        invoice_items: finalInvoiceItems,
        gst_treatment: formData.gst_treatment,
        salesperson_name: formData.salesperson_name || undefined,
        place_of_supply: placeOfSupply,
        discount: appliedDiscountAmount > 0 ? appliedDiscountAmount : undefined,
        discount_type: 'entity_level',
        is_discount_before_tax: false,
        notes: formData.notes,
        terms: formData.terms,
        payment_mode: formData.payment_mode,
      };
      if (formData.due_date) invoicePayload.due_date = formData.due_date;
      if (formData.reference_number) invoicePayload.reference_number = formData.reference_number;

      const invoiceData = await zohoService.createInvoice(invoicePayload) as Record<string, unknown>;
      const invoice = invoiceData?.invoice as Record<string, unknown> | undefined;
      if (!invoice) throw new Error((invoiceData as Record<string, string>).error || 'Failed to create invoice in Zoho');

      const createdInvoiceId = invoice.invoice_id as string;
      const createdInvoiceNumber = invoice.invoice_number as string;

      // Record payment for prepaid invoices
      if (formData.payment_mode === 'Prepaid') {
        try {
          await zohoService.recordPayment({
            customer_id: invoice.customer_id,
            amount: invoice.total,
            date: invoice.date,
            invoice_id: createdInvoiceId,
            payment_mode: 'others',
            description: `Payment recorded for Prepaid Invoice ${createdInvoiceNumber}`,
            reference_number: createdInvoiceNumber,
          });
        } catch (e) {
          console.error('Payment recording failed:', e);
        }
      }

      // Build shipment data
      const zohoTotal = (invoice.total as number) || grandTotal;
      const phone = `${formData.country_code}${formData.phone}`.replace(/\D/g, '');

      const shipmentPayload: Record<string, unknown> = {
        name: formData.customer_name,
        add: formData.phone ? `${formData.address}, Ph: ${formData.country_code} ${formData.phone}` : formData.address,
        pin: parseInt(formData.pincode, 10),
        city: formData.city,
        state: formData.state,
        country: formData.country,
        phone,
        order: createdInvoiceNumber,
        payment_mode: formData.payment_mode,
        total_amount: zohoTotal,
        cod_amount: formData.payment_mode === 'COD' ? zohoTotal : 0,
        weight: formData.weight,
        shipping_mode: formData.shipping_mode,
        products_desc: formData.products_desc || 'Spiritual Items',
        quantity: '1',
        pickup_location: formData.warehouse as string,
        seller_name: ' ',
        seller_add: ' ',
        seller_inv: ' ',
        return_name: ' ',
        return_add: ' ',
        return_phone: ' ',
        return_city: ' ',
        return_state: ' ',
        return_country: ' ',
      };
      if (formData.fragile) shipmentPayload.fragile_shipment = 'true';
      if (formData.length) shipmentPayload.shipment_length = formData.length;
      if (formData.width) shipmentPayload.shipment_width = formData.width;
      if (formData.height) shipmentPayload.shipment_height = formData.height;

      const shipmentResult = await delhiveryService.createShipment(shipmentPayload);
      const data = shipmentResult.results?.[0];
      const pkg = data?.data as Record<string, unknown> | undefined;

      if (!data || data.status !== 200 || !pkg?.success) {
        const err = (pkg?.rmk as string) || (pkg?.error as string) || JSON.stringify(pkg?.error) || 'Failed to create Delhivery shipment';
        throw new Error(`Zoho Invoice Created (#${createdInvoiceNumber}), but Delhivery Shipment Failed: ${err}`);
      }

      const packages = pkg?.packages as Record<string, unknown>[] | undefined;
      const generatedWaybill = packages?.[0]?.waybill as string;
      const labelUrl = packages?.[0]?.label as string | null || null;

      saveWaybillToHistory(generatedWaybill, createdInvoiceNumber, formData.customer_name);

      // Save order to database
      await ordersService.create({
        zohoInvoiceId: createdInvoiceId,
        orderId: createdInvoiceNumber,
        customerDetails: {
          customer_name: formData.customer_name, email: formData.email, phone: formData.phone,
          country_code: formData.country_code, address: formData.address, city: formData.city,
          state: formData.state, country: formData.country, pincode: formData.pincode,
        },
        invoiceItems: finalInvoiceItems,
        invoiceTotal: Number(zohoTotal) || grandTotal,
        invoiceDate: formData.date,
        salespersonName: formData.salesperson_name || '',
        paymentMode: formData.payment_mode || 'Prepaid',
        status: 'SHIPPED',
        selfShipped: false,
        waybill: generatedWaybill,
        labelUrl,
      });

      updateForm({ invoiceId: createdInvoiceId, orderId: createdInvoiceNumber, waybill: generatedWaybill });
      onNext();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="form-section animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h3 className="section-title">
        <span className="section-icon">🔍</span> Final Review & Confirmation
      </h3>

      <ErrorBox message={errorMsg} onDismiss={() => setErrorMsg('')} />

      {loadingPreview ? (
        <Spinner text="Calculating shipping estimates & routing..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Invoice Summary */}
          <div className="bg-white dark:bg-[#16161f] border border-gray-200 dark:border-[#2a2a38] rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <h4 className="text-gray-900 dark:text-accent font-bold mb-5 border-b border-gray-100 dark:border-[#2a2a38] pb-3 flex items-center gap-2 text-lg">
              📄 Invoice Summary
            </h4>
            <div className="text-sm space-y-3 text-gray-600 dark:text-gray-300">
              <div className="bg-gray-50 dark:bg-[#1c1c28] p-3.5 rounded-xl border border-gray-100 dark:border-transparent flex justify-between items-center">
                <span className="text-gray-500 dark:text-gray-400 font-medium">Customer</span>
                <strong className="text-gray-900 dark:text-white font-semibold flex items-center gap-1.5">👤 {formData.customer_name}</strong>
              </div>
              <div className="space-y-2 px-1 py-1">
                <p className="flex items-start justify-between"><span className="text-gray-500 dark:text-gray-400 font-medium">Address</span> <span className="text-right max-w-[200px] leading-tight">{formData.address}</span></p>
                <p className="flex justify-between"><span className="text-gray-500 dark:text-gray-400 font-medium">Location</span> <span className="text-right font-medium">{formData.city}, {formData.state} {formData.pincode}</span></p>
                <p className="flex justify-between"><span className="text-gray-500 dark:text-gray-400 font-medium">Phone</span> <span className="text-right">{formData.country_code} {formData.phone}</span></p>
              </div>
            </div>
            <div className="mt-6 pt-5 border-t border-gray-100 dark:border-[#2a2a38]">
              <h5 className="text-xs uppercase text-gray-400 mb-3 font-bold tracking-wider">Line Items ({formData.invoice_items.length})</h5>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left mb-4">
                  <thead className="text-xs text-gray-500 bg-gray-50 dark:bg-[#1c1c28] uppercase border-b border-gray-100 dark:border-[#2a2a38]">
                    <tr><th className="px-2 py-2 rounded-l-lg font-semibold">Item</th><th className="px-2 py-2 font-semibold text-center">Qty</th><th className="px-2 py-2 font-semibold text-right">Tax</th><th className="px-2 py-2 rounded-r-lg font-semibold text-right">Total</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#2a2a38]">
                    {formData.invoice_items.map((it, idx) => {
                      const displayName = it.carat_size != null ? `${it.name} ${it.carat_size.toFixed(2)} carat` : it.name;
                      return (
                        <tr key={idx} className="text-gray-700 dark:text-gray-300">
                          <td className="px-2 py-2.5 font-medium">{displayName}</td>
                          <td className="px-2 py-2.5 text-center">{it.quantity}</td>
                          <td className="px-2 py-2.5 text-right text-xs text-gray-500">{it.tax_amount ? `₹${it.tax_amount.toFixed(2)}` : '-'}</td>
                          <td className="px-2 py-2.5 text-right font-medium text-gray-900 dark:text-white">₹{((it.item_total || 0) + (it.tax_amount || 0)).toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {totalTax > 0 && (
                <div className="flex justify-between text-gray-500 dark:text-gray-400 text-sm pb-3 px-2">
                  <span className="font-medium">Total Tax</span><span>₹{totalTax.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-700 dark:text-gray-300 text-sm pb-1 px-2 font-medium">
                <span>Final Price (incl. tax)</span><span>₹{finalItemsPrice.toFixed(2)}</span>
              </div>
              {shippingCharge > 0 && (
                <div className="flex justify-between text-gray-500 dark:text-gray-400 text-sm pb-1 px-2">
                  <span className="font-medium">Delivery Charges (incl. GST)</span><span>₹{(deliveryItem?.final_price || 0).toFixed(2)}</span>
                </div>
              )}
              {codCharge > 0 && (
                <div className="flex justify-between text-gray-500 dark:text-gray-400 text-sm pb-3 px-2">
                  <span className="font-medium">COD Charges (incl. GST)</span><span>₹{(codItem?.final_price || 0).toFixed(2)}</span>
                </div>
              )}
              {appliedDiscountAmount > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-500 text-sm pb-3 px-2 font-medium">
                  <span>Discount {formData.discount_format_type === 'percentage' ? `(${formData.discount}%)` : ''}</span>
                  <span>-₹{appliedDiscountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 dark:text-white pt-3 border-t border-gray-200 dark:border-[#2a2a38] border-dashed text-lg px-2 bg-gray-50 dark:bg-transparent rounded-b-lg">
                <span>Grand Total</span><span className="text-accent">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Shipping Details */}
          <div className="bg-white dark:bg-[#16161f] border border-gray-200 dark:border-[#2a2a38] rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <h4 className="text-gray-900 dark:text-accent font-bold mb-5 border-b border-gray-100 dark:border-[#2a2a38] pb-3 flex items-center gap-2 text-lg">
              🚚 Shipping Routing
            </h4>
            <div className="text-sm space-y-4 text-gray-600 dark:text-gray-300">
              <div className="flex justify-between items-center bg-gray-50 dark:bg-[#1c1c28] p-3.5 rounded-xl border border-gray-100 dark:border-transparent">
                <span className="text-gray-500 dark:text-gray-400 font-medium">Serviceability Status</span>
                {formData.isPincodeServiceable ?
                  <span className="badge badge-emerald !px-3 !py-1 flex items-center gap-1.5 shadow-sm"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Serviceable</span> :
                  <span className="badge badge-rose !px-3 !py-1 flex items-center gap-1.5 shadow-sm">✗ Verify Pincode</span>
                }
              </div>
              <div className="space-y-3 px-1 py-1">
                <p className="flex justify-between items-center pb-2 border-b border-gray-50 dark:border-[#2a2a38]/50"><span className="text-gray-500 dark:text-gray-400 font-medium">Origin Warehouse</span> <span className="text-gray-900 dark:text-white font-medium bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-xs">{formData.warehouse}</span></p>
                <p className="flex justify-between items-center pb-2 border-b border-gray-50 dark:border-[#2a2a38]/50"><span className="text-gray-500 dark:text-gray-400 font-medium">Fulfillment Mode</span> <span className="font-semibold text-gray-900 dark:text-white uppercase tracking-wide text-xs">{formData.shipping_mode}</span></p>
                <p className="flex justify-between items-center pb-2 border-b border-gray-50 dark:border-[#2a2a38]/50"><span className="text-gray-500 dark:text-gray-400 font-medium">Payment terms</span> <span className={`font-bold px-2 py-0.5 rounded-md text-xs ${formData.payment_mode === 'Prepaid' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'}`}>{formData.payment_mode}</span></p>
                <p className="flex justify-between items-center"><span className="text-gray-500 dark:text-gray-400 font-medium">Gross Weight</span> <span className="font-medium text-gray-900 dark:text-white">{formData.weight} <span className="text-gray-400 text-xs">g</span></span></p>
              </div>
              <div className="mt-6 p-5 bg-linear-to-br from-indigo-50 to-white dark:from-[#1c1c28] dark:to-[#22222e] rounded-xl border border-indigo-100 dark:border-accent/30 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
                <h5 className="text-xs uppercase text-accent mb-4 font-bold tracking-widest flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  Delhivery Estimates
                </h5>
                <div className="space-y-3 relative z-10">
                  <div className="flex justify-between items-center bg-white/50 dark:bg-black/20 p-2.5 rounded-lg">
                    <span className="text-gray-600 dark:text-gray-400 font-medium text-xs">Est. Shipping Cost</span>
                    <span className="font-bold text-gray-900 dark:text-white text-base">{shippingCost ? `₹${shippingCost}` : <span className="text-gray-400 font-normal italic text-sm">Calculating...</span>}</span>
                  </div>
                  <div className="flex justify-between items-center bg-white/50 dark:bg-black/20 p-2.5 rounded-lg">
                    <span className="text-gray-600 dark:text-gray-400 font-medium text-xs">Expected Delivery</span>
                    <span className="font-bold text-gray-900 dark:text-white text-base">{expectedTat ? new Date(expectedTat).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : <span className="text-gray-400 font-normal italic text-sm">Calculating...</span>}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 flex justify-between">
        <button className="btn btn-secondary" onClick={onPrev} disabled={submitting}>🡨 Back</button>
        <button className="btn btn-submit w-auto px-8" onClick={handleConfirm} disabled={loadingPreview || submitting}>
          {submitting ? (
            <><span className="btn-spinner border-2 border-white border-t-transparent rounded-full w-4 h-4 mr-2 inline-block"></span> Processing...</>
          ) : (
            'Confirm & Create Order ➔'
          )}
        </button>
      </div>
    </div>
  );
}
