'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { getCorrectTaxId, HSN_TAX_RATES } from '@/lib/tax';
import { ordersService } from '@/services/orders';
import { useSession } from 'next-auth/react';
import { ProductCPMaster } from '@/lib/product-cp';
import { Sparkles, Send, CheckCircle, FileText, RefreshCw, ShoppingCart, User, MapPin, AlertTriangle, Copy, Tag, Store, Truck, CreditCard, ShieldCheck } from 'lucide-react';
import TaxInvoiceModal from './TaxInvoiceModal';

interface ParsedItem {
  name: string;
  quantity: number;
  final_price: number;
  hsn_or_sac: string;
  category_name: string;
  tax_rate: number;
  tax_id: string;
  pre_tax_price: number;
  tax_amount: number;
  item_total: number;
  cost_price: number;
}

interface ParsedOrder {
  customer_name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  payment_mode: 'Prepaid' | 'COD';
  vendor?: string;
  discountPercent?: number;
  discountAmount?: number;
  astrologer_name?: string;
  astrologer_phone?: string;
  items: ParsedItem[];
  subtotal: number;
  tax_total: number;
  shipping_charge: number;
  cod_charge: number;
  grand_total: number;
}

export default function AIChatboxOrder() {
  const { data: session } = useSession();
  const [inputText, setInputText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedOrder, setParsedOrder] = useState<ParsedOrder | null>(null);

  // Interactive Control States
  const [selectedVendor, setSelectedVendor] = useState<string>('Prayosha');
  const [discountVal, setDiscountVal] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'percent' | 'flat'>('percent');
  const [paymentMode, setPaymentMode] = useState<'Prepaid' | 'COD'>('Prepaid');
  const [includeDeliveryCharge, setIncludeDeliveryCharge] = useState<boolean>(true);

  const [submitting, setSubmitting] = useState(false);
  const [createdResult, setCreatedResult] = useState<{ orderId: string; invoiceId: string } | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [promptPhone, setPromptPhone] = useState('');
  const [promptName, setPromptName] = useState('');
  const [promptAddress, setPromptAddress] = useState('');

  const simpleCopyPasteFormat = `Name: Customer Name
Phone: 9876543210
Address: House No. 402, Green Valley Colony, Sector 56, Gurgaon, Haryana
Pincode: 122011
Items: 1. Raw Pyrite Bracelet 500, 2. 5 Mukhi Rudraksha Mala 800`;

  const copyTemplateToClipboard = () => {
    navigator.clipboard.writeText(simpleCopyPasteFormat);
    toast.success('📋 Simple Copy-Paste Order Format copied!');
  };

  const parseRawText = async (text: string) => {
    if (!text.trim()) return;
    setIsParsing(true);
    setCreatedResult(null);

    try {
      const res = await fetch('/api/ai/parse-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      const json = await res.json();
      if (!json.success || !json.data) {
        throw new Error(json.error || 'Failed to parse raw order text');
      }

      const parsed: ParsedOrder = json.data;

      // Sync interactive controls with parsed output
      if (parsed.vendor) setSelectedVendor(parsed.vendor);
      if (parsed.payment_mode) setPaymentMode(parsed.payment_mode);
      if (parsed.discountPercent) {
        setDiscountVal(parsed.discountPercent);
        setDiscountType('percent');
      } else if (parsed.discountAmount) {
        setDiscountVal(parsed.discountAmount);
        setDiscountType('flat');
      }

      // Check missing prompt fields
      const missing: string[] = [];
      if (!parsed.phone || (parsed.phone === '8527666911' && !text.includes('8527666911'))) {
        missing.push('Phone Number');
      }
      if (!parsed.customer_name || (parsed.customer_name === 'Ajay Arora' && !text.includes('Ajay Arora'))) {
        missing.push('Customer Name');
      }
      if (!parsed.address || (parsed.address.includes('Golden Castle') && !text.includes('Golden Castle'))) {
        missing.push('Shipping Address');
      }
      setMissingFields(missing);

      setParsedOrder(parsed);
      toast.success('✨ Order parsed! Adjust Payment Mode, Shipping & Taxes using toggles below.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to parse text. Please check format.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleVendorChange = (newVendor: string) => {
    setSelectedVendor(newVendor);
    if (!parsedOrder) return;
    const updatedItems = parsedOrder.items.map(it => ({
      ...it,
      cost_price: ProductCPMaster.getCostPrice(it.name, it.final_price, newVendor)
    }));
    setParsedOrder({ ...parsedOrder, vendor: newVendor, items: updatedItems });
    toast.info(`Updated Master CP values for Vendor: ${newVendor}`);
  };

  const handlePaymentModeToggle = (mode: 'Prepaid' | 'COD') => {
    setPaymentMode(mode);
    if (!parsedOrder) return;
    const codCharge = mode === 'COD' ? 50 : 0;
    const grandTotal = itemsGrandTotal(parsedOrder.items, includeDeliveryCharge ? 100 : 0, codCharge);
    setParsedOrder({
      ...parsedOrder,
      payment_mode: mode,
      cod_charge: codCharge,
      grand_total: grandTotal
    });
    toast.info(`Switched Payment Mode to ${mode} (COD Fee: ₹${codCharge})`);
  };

  const handleDeliveryChargeToggle = (enabled: boolean) => {
    setIncludeDeliveryCharge(enabled);
    if (!parsedOrder) return;
    const shippingCharge = enabled ? 100 : 0;
    const grandTotal = itemsGrandTotal(parsedOrder.items, shippingCharge, parsedOrder.cod_charge);
    setParsedOrder({
      ...parsedOrder,
      shipping_charge: shippingCharge,
      grand_total: grandTotal
    });
    toast.info(enabled ? 'Applied ₹100 Delivery Charge' : 'Waived Delivery Charge (Free Delivery)');
  };

  const handleCategoryTaxOverride = (itemIdx: number, catKey: string) => {
    if (!parsedOrder) return;
    const updatedItems = [...parsedOrder.items];
    const item = { ...updatedItems[itemIdx] };

    if (catKey === 'rudraksha') {
      item.hsn_or_sac = '14049070';
      item.category_name = 'Rudrakshas & Sacred Malas (0% GST)';
      item.tax_rate = 0;
    } else if (catKey === 'gemstone') {
      item.hsn_or_sac = '05080010';
      item.category_name = 'Gemstones & Crystals (0.25% GST)';
      item.tax_rate = 0.25;
    } else if (catKey === 'bracelet') {
      item.hsn_or_sac = '71179090';
      item.category_name = 'Bracelets & Decorative (3% GST)';
      item.tax_rate = 3;
    } else if (catKey === 'vastu') {
      item.hsn_or_sac = '74198090';
      item.category_name = 'Vastu & Metal Artifacts (12% GST)';
      item.tax_rate = 12;
    } else if (catKey === 'services') {
      item.hsn_or_sac = '999591';
      item.category_name = 'Astrological Services (18% GST)';
      item.tax_rate = 18;
    }

    item.pre_tax_price = item.tax_rate > 0 ? Math.round((item.final_price / (1 + item.tax_rate / 100)) * 100) / 100 : item.final_price;
    item.tax_amount = item.tax_rate > 0 ? Math.round((item.final_price - item.pre_tax_price) * 100) / 100 : 0;
    item.item_total = item.pre_tax_price * item.quantity;
    item.tax_id = item.tax_rate === 0 ? 'NO_TAX' : getCorrectTaxId(item.hsn_or_sac, true);

    updatedItems[itemIdx] = item;

    const subtotal = updatedItems.reduce((acc, it) => acc + it.item_total, 0);
    const tax_total = updatedItems.reduce((acc, it) => acc + (it.tax_amount * it.quantity), 0);
    const grand_total = itemsGrandTotal(updatedItems, parsedOrder.shipping_charge, parsedOrder.cod_charge);

    setParsedOrder({
      ...parsedOrder,
      items: updatedItems,
      subtotal: Math.round(subtotal * 100) / 100,
      tax_total: Math.round(tax_total * 100) / 100,
      grand_total
    });

    toast.success(`Updated ${item.name} to ${item.category_name}`);
  };

  const itemsGrandTotal = (items: ParsedItem[], shipping: number, cod: number) => {
    const itemSum = items.reduce((acc, it) => acc + (it.final_price * it.quantity), 0);
    return Math.round(itemSum + shipping + cod);
  };

  const applyDiscountChange = (val: number, type: 'percent' | 'flat') => {
    setDiscountVal(val);
    setDiscountType(type);
    if (!parsedOrder) return;

    const updatedItems = parsedOrder.items.map(it => {
      let discountedPrice = it.final_price;
      if (type === 'percent' && val > 0) {
        discountedPrice = Math.round(it.final_price * (1 - val / 100));
      } else if (type === 'flat' && val > 0) {
        discountedPrice = Math.max(10, it.final_price - val);
      }

      const preTax = it.tax_rate > 0 ? Math.round((discountedPrice / (1 + it.tax_rate / 100)) * 100) / 100 : discountedPrice;
      const taxAmt = it.tax_rate > 0 ? Math.round((discountedPrice - preTax) * 100) / 100 : 0;

      return {
        ...it,
        final_price: discountedPrice,
        pre_tax_price: preTax,
        tax_amount: taxAmt,
        item_total: preTax * it.quantity
      };
    });

    const subtotal = updatedItems.reduce((acc, it) => acc + it.item_total, 0);
    const tax_total = updatedItems.reduce((acc, it) => acc + (it.tax_amount * it.quantity), 0);
    const grand_total = itemsGrandTotal(updatedItems, includeDeliveryCharge ? 100 : 0, paymentMode === 'COD' ? 50 : 0);

    setParsedOrder({
      ...parsedOrder,
      items: updatedItems,
      subtotal: Math.round(subtotal * 100) / 100,
      tax_total: Math.round(tax_total * 100) / 100,
      grand_total: Math.round(grand_total)
    });
  };

  const updateItemCp = (idx: number, newCp: number) => {
    if (!parsedOrder) return;
    const updated = { ...parsedOrder };
    updated.items[idx].cost_price = newCp;
    setParsedOrder(updated);
    toast.success(`Updated Cost Price for ${updated.items[idx].name} to ₹${newCp}`);
  };

  const applyMissingPromptFixes = () => {
    if (!parsedOrder) return;
    const updated = { ...parsedOrder };
    if (promptPhone.trim()) updated.phone = promptPhone.trim();
    if (promptName.trim()) updated.customer_name = promptName.trim();
    if (promptAddress.trim()) updated.address = promptAddress.trim();
    setParsedOrder(updated);
    setMissingFields([]);
    toast.success('Updated missing customer details on receipt!');
  };

  const [isTestMode, setIsTestMode] = useState(true);

  const handleCreateOrder = async () => {
    if (!parsedOrder) return;
    setSubmitting(true);

    try {
      const salesperson = session?.user?.name || 'Muskan';

      const uniqueSuffix = Math.floor(1000 + Math.random() * 9000);
      const generatedOrderId = `HP-INV-${Date.now().toString().slice(-6)}-${uniqueSuffix}`;
      const generatedZohoId = `zoho_${Date.now()}`;

      if (isTestMode) {
        setCreatedResult({
          orderId: `TEST-${generatedOrderId}`,
          invoiceId: `TEST-ZOHO-${Date.now()}`
        });
        toast.info('🧪 Test Mode Active: Invoice generated for preview!');
        return;
      }

      const finalLineItems = parsedOrder.items.map(it => ({
        name: it.name,
        description: `${it.category_name} (HSN: ${it.hsn_or_sac})`,
        quantity: it.quantity,
        price: it.pre_tax_price,
        final_price: it.final_price,
        hsn_or_sac: it.hsn_or_sac,
        tax_id: it.tax_id,
        tax_amount: it.tax_amount,
        item_total: it.item_total,
        cost_price: it.cost_price,
        zoho_item_id: '__system__'
      }));

      if (includeDeliveryCharge) {
        finalLineItems.push({
          name: 'Delivery Charges',
          description: 'Shipping & Delivery',
          quantity: 1,
          price: 84.75,
          final_price: 100,
          hsn_or_sac: '996812',
          tax_id: getCorrectTaxId('996812', true),
          tax_amount: 15.25,
          item_total: 84.75,
          cost_price: 0,
          zoho_item_id: '__system__'
        });
      }

      if (paymentMode === 'COD') {
        finalLineItems.push({
          name: 'COD Charges',
          description: 'Cash on delivery fee',
          quantity: 1,
          price: 42.37,
          final_price: 50,
          hsn_or_sac: '996812',
          tax_id: getCorrectTaxId('996812', true),
          tax_amount: 7.63,
          item_total: 42.37,
          cost_price: 0,
          zoho_item_id: '__system__'
        });
      }

      const dbPayload = {
        zohoInvoiceId: generatedZohoId,
        orderId: generatedOrderId,
        customerDetails: {
          customer_name: parsedOrder.customer_name,
          email: parsedOrder.email,
          phone: parsedOrder.phone,
          country_code: '+91',
          address: parsedOrder.address,
          city: parsedOrder.city,
          state: parsedOrder.state,
          country: 'India',
          pincode: parsedOrder.pincode,
        },
        astrologerDetails: {
          astrologerName: parsedOrder.astrologer_name || 'Self / Direct',
          astrologerNumber: parsedOrder.astrologer_phone || '',
        },
        vendorName: selectedVendor,
        invoiceItems: finalLineItems,
        invoiceTotal: parsedOrder.grand_total,
        invoiceDate: new Date().toISOString(),
        salespersonName: salesperson,
        paymentMode: paymentMode,
        status: 'PENDING_SHIPPING',
        selfShipped: false,
      };

      const res = await ordersService.create(dbPayload);

      if (res.success) {
        setCreatedResult({
          orderId: generatedOrderId,
          invoiceId: generatedZohoId
        });
        toast.success(`🎉 Order #${generatedOrderId} successfully created in Database & Zoho!`);
      } else {
        throw new Error(res.error || 'Database save error');
      }
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Error creating order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-purple-900/40 border border-purple-500/30 p-6 rounded-2xl shadow-lg backdrop-blur-md">
        <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-600/20 text-purple-400 rounded-xl border border-purple-500/30">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                AI Fast Order & Receipt Generator
              </h2>
              <p className="text-xs text-purple-200/80">
                Simply copy-paste Name, Phone, Address & Items. Configure Payment Mode, Shipping & Product Taxes using on-screen toggles below!
              </p>
            </div>
          </div>

          <button
            onClick={copyTemplateToClipboard}
            className="px-4 py-2 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-400/40 text-purple-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy Simple Format</span>
          </button>
        </div>
      </div>

      {/* Interactive Control Knobs Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-[var(--bg-card)] border border-[var(--border)] p-4 rounded-2xl shadow-md">
        {/* Payment Mode Selector */}
        <div>
          <label className="text-xs font-bold text-[var(--text-primary)] block mb-1.5 flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 text-purple-400" /> Payment Mode
          </label>
          <div className="grid grid-cols-2 gap-1.5 bg-[var(--bg-input)] p-1 rounded-xl border border-[var(--border)]">
            <button
              type="button"
              onClick={() => handlePaymentModeToggle('Prepaid')}
              className={`py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                paymentMode === 'Prepaid' ? 'bg-emerald-600 text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              Prepaid
            </button>
            <button
              type="button"
              onClick={() => handlePaymentModeToggle('COD')}
              className={`py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                paymentMode === 'COD' ? 'bg-amber-600 text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              COD (+₹50)
            </button>
          </div>
        </div>

        {/* Delivery Charge Toggle */}
        <div>
          <label className="text-xs font-bold text-[var(--text-primary)] block mb-1.5 flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-blue-400" /> Shipping Fee
          </label>
          <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] hover:border-purple-500/50 transition">
            <input
              type="checkbox"
              checked={includeDeliveryCharge}
              onChange={(e) => handleDeliveryChargeToggle(e.target.checked)}
              className="rounded accent-purple-500 w-4 h-4"
            />
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              {includeDeliveryCharge ? '✓ Add ₹100 Delivery' : '🚫 Free Delivery (₹0)'}
            </span>
          </label>
        </div>

        {/* Supplier / Vendor Selector */}
        <div>
          <label className="text-xs font-bold text-[var(--text-primary)] block mb-1.5 flex items-center gap-1.5">
            <Store className="w-4 h-4 text-amber-400" /> Supplier Vendor
          </label>
          <select
            value={selectedVendor}
            onChange={(e) => handleVendorChange(e.target.value)}
            className="w-full p-2 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-xs font-semibold text-[var(--text-primary)] outline-none cursor-pointer"
          >
            <option value="Prayosha">Prayosha</option>
            <option value="Krunal">Krunal</option>
            <option value="SURYA">SURYA</option>
            <option value="Rudra Ratan">Rudra Ratan</option>
          </select>
        </div>

        {/* Discount Control */}
        <div>
          <label className="text-xs font-bold text-[var(--text-primary)] block mb-1.5 flex items-center gap-1.5">
            <Tag className="w-4 h-4 text-emerald-400" /> Discount (SP)
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              placeholder="0"
              value={discountVal || ''}
              onChange={(e) => applyDiscountChange(Number(e.target.value), discountType)}
              className="w-full p-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-xs font-bold text-emerald-400 outline-none"
            />
            <select
              value={discountType}
              onChange={(e) => applyDiscountChange(discountVal, e.target.value as 'percent' | 'flat')}
              className="p-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-[11px] font-bold text-[var(--text-primary)] outline-none cursor-pointer"
            >
              <option value="percent">%</option>
              <option value="flat">₹</option>
            </select>
          </div>
        </div>
      </div>

      {/* Fast Input Textarea */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] p-5 rounded-2xl shadow-md space-y-4">
        <label className="block text-sm font-bold text-[var(--text-primary)] flex items-center justify-between">
          <span>Paste Customer Info & Products</span>
          <span className="text-xs font-normal text-purple-300">Minimum needed: Name, Phone, Address & Items</span>
        </label>
        <textarea
          rows={4}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Name: Ruuchi Sharrma\nPhone: 9983631551\nAddress: Flat 402 Green Valley Sector 56 Gurgaon 122011\nItems: 1. Raw Pyrite Bracelet 500, 2. 5 Mukhi Rudraksha Mala 800`}
          className="w-full p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-sm focus:ring-2 focus:ring-[var(--accent)] outline-none font-mono"
        />

        <div className="flex justify-end gap-3">
          <button
            onClick={() => {
              setInputText('');
              setParsedOrder(null);
              setCreatedResult(null);
            }}
            className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white transition cursor-pointer"
          >
            Clear
          </button>
          <button
            onClick={() => parseRawText(inputText)}
            disabled={!inputText.trim() || isParsing}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--accent)] hover:opacity-90 text-white text-sm font-semibold shadow-md transition cursor-pointer disabled:opacity-50"
          >
            {isParsing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>Parse & Calculate Receipt →</span>
          </button>
        </div>
      </div>

      {/* Success Badge after Order Creation */}
      {createdResult && (
        <div className="bg-emerald-950/40 border border-emerald-500/40 p-5 rounded-2xl flex items-center justify-between text-emerald-200 animate-in fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
            <div>
              <h4 className="font-bold text-base text-white">Order Successfully Saved!</h4>
              <p className="text-xs text-emerald-300">Order ID: <strong className="text-white">{createdResult.orderId}</strong> | Zoho Invoice: {createdResult.invoiceId}</p>
            </div>
          </div>
          <button
            onClick={() => window.location.href = `/search-orders`}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow transition cursor-pointer"
          >
            View Saved Order ➔
          </button>
        </div>
      )}

      {/* Missing Information Prompt Banner */}
      {missingFields.length > 0 && parsedOrder && (
        <div className="bg-amber-950/40 border border-amber-500/40 p-5 rounded-2xl space-y-3 text-amber-200 animate-in fade-in">
          <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <span>⚠️ Information Missing in Order Text</span>
          </div>
          <p className="text-xs text-amber-200/80">
            Some customer details were not explicitly found in your pasted text. Please enter the missing information below:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {missingFields.includes('Phone Number') && (
              <div>
                <label className="text-[11px] font-bold text-amber-300 block mb-1">📱 Customer Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. 9876543210"
                  value={promptPhone}
                  onChange={(e) => setPromptPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-amber-500/30 bg-purple-950/60 text-xs text-white outline-none font-mono"
                />
              </div>
            )}
            {missingFields.includes('Customer Name') && (
              <div>
                <label className="text-[11px] font-bold text-amber-300 block mb-1">👤 Customer Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Muskan"
                  value={promptName}
                  onChange={(e) => setPromptName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-amber-500/30 bg-purple-950/60 text-xs text-white outline-none"
                />
              </div>
            )}
            {missingFields.includes('Shipping Address') && (
              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-amber-300 block mb-1">📍 Shipping Address</label>
                <input
                  type="text"
                  placeholder="e.g. Flat 402, Green Valley Sector 56, Gurgaon, Haryana - 122011"
                  value={promptAddress}
                  onChange={(e) => setPromptAddress(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-amber-500/30 bg-purple-950/60 text-xs text-white outline-none"
                />
              </div>
            )}
          </div>
          <button
            onClick={applyMissingPromptFixes}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold text-xs rounded-xl shadow transition cursor-pointer flex items-center gap-2"
          >
            <span>✨ Update Missing Info on Receipt</span>
          </button>
        </div>
      )}

      {/* Generated Receipt Preview Card */}
      {parsedOrder && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-4">
          <div className="p-5 bg-[var(--bg-section)] border-b border-[var(--border)] flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-[var(--accent)] font-bold text-base">
              <FileText className="w-5 h-5" />
              <span>Parsed Customer Receipt & Tax Preview</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/30">
                Payment: {paymentMode} ({parsedOrder.cod_charge > 0 ? '₹50 COD Fee' : '₹0 Fee'})
              </span>
              <span className="text-xs px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 font-semibold border border-blue-500/30">
                Shipping: ₹{parsedOrder.shipping_charge}
              </span>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Customer Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[var(--bg-input)] p-4 rounded-xl border border-[var(--border)]">
              <div>
                <span className="text-xs text-[var(--text-secondary)] font-medium block flex items-center gap-1">
                  <User className="w-3.5 h-3.5" /> Customer Details (To)
                </span>
                <strong className="text-sm text-[var(--text-primary)]">{parsedOrder.customer_name}</strong>
                <span className="block text-xs text-[var(--text-secondary)] mt-1">📱 Phone: {parsedOrder.phone}</span>
                {parsedOrder.astrologer_name && (
                  <span className="block text-xs text-purple-400 font-semibold mt-1">
                    🔮 Partner Astrologer (From): {parsedOrder.astrologer_name} {parsedOrder.astrologer_phone ? `(${parsedOrder.astrologer_phone})` : ''}
                  </span>
                )}
              </div>
              <div>
                <span className="text-xs text-[var(--text-secondary)] font-medium block flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> Shipping Address
                </span>
                <p className="text-xs text-[var(--text-primary)] leading-tight">{parsedOrder.address}</p>
                <span className="block text-xs text-[var(--text-secondary)] mt-0.5">
                  {parsedOrder.city}, {parsedOrder.state} - {parsedOrder.pincode}
                </span>
              </div>
            </div>

            {/* Line Items Table with Category & Tax Rate Override Selector */}
            <div>
              <h4 className="text-xs uppercase font-bold text-[var(--text-secondary)] mb-3 flex items-center gap-1.5">
                <ShoppingCart className="w-4 h-4 text-[var(--accent)]" /> Line Items & Category Tax Rate Selector
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-[var(--bg-section)] text-[var(--text-secondary)] uppercase border-b border-[var(--border)]">
                      <th className="p-2.5">Item Name</th>
                      <th className="p-2.5">Category & GST Tax Rate</th>
                      <th className="p-2.5 text-center">Qty</th>
                      <th className="p-2.5 text-right">Selling Price</th>
                      <th className="p-2.5 text-right">{selectedVendor} CP</th>
                      <th className="p-2.5 text-right">Final Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {parsedOrder.items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-[var(--bg-hover)]">
                        <td className="p-2.5 font-semibold text-[var(--text-primary)]">{it.name}</td>
                        <td className="p-2.5">
                          <select
                            value={
                              it.hsn_or_sac === '14049070' ? 'rudraksha' :
                              it.hsn_or_sac === '05080010' ? 'gemstone' :
                              it.hsn_or_sac === '74198090' ? 'vastu' :
                              it.hsn_or_sac === '999591' ? 'services' : 'bracelet'
                            }
                            onChange={(e) => handleCategoryTaxOverride(idx, e.target.value)}
                            className="bg-purple-950/80 border border-purple-500/40 text-purple-200 text-[11px] font-bold px-2 py-1 rounded outline-none cursor-pointer"
                          >
                            <option value="rudraksha">📿 Rudraksha & Malas (0% GST)</option>
                            <option value="gemstone">💎 Gemstones & Crystals (0.25% GST)</option>
                            <option value="bracelet">✨ Bracelets & Decorative (3% GST)</option>
                            <option value="vastu">⚡ Vastu & Metal Artifacts (12% GST)</option>
                            <option value="services">🔮 Astrological Services (18% GST)</option>
                          </select>
                        </td>
                        <td className="p-2.5 text-center font-bold">{it.quantity}</td>
                        <td className="p-2.5 text-right font-medium text-emerald-400">₹{it.final_price.toFixed(2)}</td>
                        <td className="p-2.5 text-right">
                          <div className="inline-flex items-center gap-1">
                            <span className="text-[10px] text-gray-400">₹</span>
                            <input
                              type="number"
                              value={it.cost_price}
                              onChange={(e) => updateItemCp(idx, Number(e.target.value))}
                              className="w-16 p-1 rounded border border-purple-500/40 bg-purple-950/60 text-right font-bold text-amber-300 outline-none"
                            />
                          </div>
                        </td>
                        <td className="p-2.5 text-right font-bold text-[var(--text-primary)]">₹{(it.final_price * it.quantity).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals Summary */}
            <div className="pt-4 border-t border-[var(--border)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="text-xs text-[var(--text-secondary)] space-y-1">
                <p>• Subtotal (Pre-tax): ₹{parsedOrder.subtotal.toFixed(2)}</p>
                <p>• Total GST Tax: ₹{parsedOrder.tax_total.toFixed(2)}</p>
                <p>• Delivery Charge: ₹{parsedOrder.shipping_charge.toFixed(2)} {includeDeliveryCharge ? '(incl. 18% GST)' : '(Waived - Free Delivery)'}</p>
                {parsedOrder.cod_charge > 0 && <p>• COD Fee: ₹{parsedOrder.cod_charge.toFixed(2)}</p>}
              </div>

              <div className="bg-[var(--accent-soft)] p-4 rounded-xl border border-[var(--accent)] text-right w-full md:w-auto">
                <span className="text-xs text-[var(--text-secondary)] block font-medium">Calculated Invoice Total</span>
                <span className="text-2xl font-extrabold text-[var(--accent)]">₹{parsedOrder.grand_total.toFixed(2)}</span>
              </div>
            </div>

            {/* Confirm Submission & Test Mode Toggle */}
            <div className="pt-4 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-amber-400 bg-amber-500/10 px-3 py-2 rounded-xl border border-amber-500/30">
                  <input
                    type="checkbox"
                    checked={isTestMode}
                    onChange={(e) => setIsTestMode(e.target.checked)}
                    className="rounded border-amber-500 accent-amber-500"
                  />
                  <span>🧪 Test Mode</span>
                </label>

                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(true)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow transition cursor-pointer flex items-center gap-1.5"
                >
                  <span>📄 View Official Tax Invoice PDF</span>
                </button>
              </div>

              <button
                onClick={handleCreateOrder}
                disabled={submitting}
                className={`w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-white font-bold text-sm shadow-lg transition cursor-pointer disabled:opacity-50 ${
                  isTestMode
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500'
                }`}
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" /> Processing...
                  </span>
                ) : isTestMode ? (
                  <span>🧪 Generate Test Invoice</span>
                ) : (
                  <span>🚀 Confirm & Save Order to Database</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Render Official Tax Invoice Modal */}
      {showInvoiceModal && parsedOrder && (
        <TaxInvoiceModal
          order={parsedOrder}
          onClose={() => setShowInvoiceModal(false)}
        />
      )}
    </div>
  );
}
