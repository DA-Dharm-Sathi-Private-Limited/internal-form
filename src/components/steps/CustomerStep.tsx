'use client';

import { useState } from 'react';
import { useWizardStore } from '@/store/wizardStore';
import { INDIAN_STATES, INDIAN_STATE_NAMES, SALESPERSONS, Customer, Salesperson } from '@/types/invoice';
import CustomerSearch from '../CustomerSearch';
import stateCodesData from '@/data/state-codes.json';
import { toast } from 'sonner';
import { customerStepSchema } from '@/lib/validation';
import { delhiveryService } from '@/services/delhivery';
import { customerService } from '@/services/customers';

export default function CustomerStep() {
  const formData = useWizardStore((s) => s.formData);
  const updateForm = useWizardStore((s) => s.updateForm);
  const nextStep = useWizardStore((s) => s.nextStep);

  const [checkingPincode, setCheckingPincode] = useState(false);
  const [needsAddressUpdate, setNeedsAddressUpdate] = useState(false);
  const [savingToZoho, setSavingToZoho] = useState(false);

  const checkPincodeServiceability = async (pin: string) => {
    if (!pin || pin.length !== 6) return;
    setCheckingPincode(true);
    try {
      const data = await delhiveryService.checkPincode(pin);

      if (data.delivery_codes && (data.delivery_codes as unknown[]).length > 0) {
        const codes = data.delivery_codes as { postal_code?: Record<string, string> }[];
        const deliveryCenter = codes[0].postal_code as Record<string, string>;
        const delhiveryStateCode = deliveryCenter.state_code || '';
        const delhiveryStateName = deliveryCenter.state || '';
        const delhiveryCity = deliveryCenter.district || deliveryCenter.city || deliveryCenter.center || '';

        let mappedStateName = '';
        if (delhiveryStateCode && INDIAN_STATE_NAMES[delhiveryStateCode]) {
          mappedStateName = INDIAN_STATE_NAMES[delhiveryStateCode];
        } else if (delhiveryStateName) {
          const match = stateCodesData.find(
            (s) => s.name.toLowerCase() === delhiveryStateName.toLowerCase()
          );
          if (match) mappedStateName = match.name;
        }

        updateForm({
          isPincodeServiceable: true,
          city: delhiveryCity,
          state: mappedStateName || delhiveryStateName,
        });
      } else {
        updateForm({ isPincodeServiceable: false });
      }
    } catch (error) {
      console.error('Error checking pincode:', error);
      updateForm({ isPincodeServiceable: false });
    } finally {
      setCheckingPincode(false);
    }
  };

  const handlePincodeBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const pin = e.target.value;
    if (pin.length !== 6) return;
    await checkPincodeServiceability(pin);
  };

  const handleNext = async () => {
    const result = customerStepSchema.safeParse(formData);
    if (!result.success) {
      toast.error(result.error.issues[0].message);
      return;
    }

    if (formData.customer_id) {
      setSavingToZoho(true);
      try {
        await customerService.update(formData.customer_id, {
          billing_address: {
            attention: formData.customer_name || '',
            street: formData.address || '',
            city: formData.city || '',
            state: formData.state || '',
            zip: formData.pincode || '',
            country: formData.country || 'India',
          },
          phone: `${formData.country_code}${formData.phone}`,
        });

        toast.success('Customer address saved to Zoho ✓');
        setNeedsAddressUpdate(false);
      } catch (err) {
        console.error('Failed to update customer in Zoho:', err);
        const msg = err instanceof Error ? err.message : 'Unknown error';
        if (msg.includes('Failed to save address')) {
          toast.error(`Failed to save address to Zoho: ${msg}. Please fix and try again.`);
        } else {
          toast.error('Could not reach Zoho to save address. Please check your connection and try again.');
        }
        return;
      } finally {
        setSavingToZoho(false);
      }
    }

    nextStep();
  };

  return (
    <div className="form-section animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h3 className="section-title">
        <span className="section-icon">👤</span> Customer &amp; Invoice Details
      </h3>

      <div className="mb-6">
        <label className="text-sm font-medium text-gray-400 mb-2 block">Search Existing Customer</label>
        <CustomerSearch
          onSelect={async (customer) => {
            const KNOWN_CODES = ['+91', '+1', '+44', '+971', '+61', '+65', '+60', '+49'];

            let rawPhone = ((customer as Customer & { mobile?: string, phone?: string }).mobile)
              || ((customer as Customer & { mobile?: string, phone?: string }).phone)
              || '';

            let parsedCountryCode = '+91';
            let parsedPhone = '';

            setNeedsAddressUpdate(false);

            const prefilled = (customer as Customer & { _prefilled?: { address: string; pincode: string; city: string; state: string; phone: string } })._prefilled;

            if (prefilled) {
              updateForm({
                customer_id: customer.customer_id,
                customer_name: customer.display_name || '',
                email: customer.email || '',
                country_code: '+91',
                phone: prefilled.phone,
                astrologer_name: customer.display_name || '',
                astrologer_number: prefilled.phone,
                address: prefilled.address,
                pincode: prefilled.pincode,
                city: prefilled.city,
                state: prefilled.state,
                gst_treatment: customer.gst_treatment || 'consumer',
                isPincodeServiceable: null,
              });
              if (prefilled.pincode.length === 6) {
                checkPincodeServiceability(prefilled.pincode);
              }
              setNeedsAddressUpdate(false);
              return;
            }

            try {
              const data = await customerService.get(customer.customer_id);
              if (data.customer) {
                const c = data.customer as Record<string, unknown>;
                rawPhone = (c.mobile as string) || (c.phone as string) || rawPhone;

                const billing_address = c.billing_address as Record<string, string> | undefined;
                const addressLine = billing_address?.street2
                  ? `${billing_address.address}\n${billing_address.street2}`
                  : billing_address?.address || '';
                const zip = billing_address?.zip || '';
                const city = billing_address?.city || '';
                const state = billing_address?.state || '';

                const hasAnyAddress = !!(addressLine || zip || city || state);
                const isIncompleteAddress = !addressLine || !zip || !city || !state;

                if (hasAnyAddress) {
                  updateForm({ address: addressLine, pincode: zip, city, state });
                  if (zip && zip.length === 6) {
                    checkPincodeServiceability(zip);
                  }
                  setNeedsAddressUpdate(isIncompleteAddress);
                } else {
                  setNeedsAddressUpdate(true);
                  updateForm({ address: '', pincode: '', city: '', state: 'Delhi', isPincodeServiceable: null });
                }
              }
            } catch (error) {
              console.error('Failed to fetch full customer details:', error);
            }

            if (rawPhone) {
              const cleaned = '+' === rawPhone[0]
                ? '+' + rawPhone.slice(1).replace(/\D/g, '')
                : rawPhone.replace(/\D/g, '');

              if (cleaned.startsWith('+') && cleaned.length > 10) {
                const sortedCodes = [...KNOWN_CODES].sort((a, b) => b.length - a.length);
                let matched = false;
                for (const code of sortedCodes) {
                  if (cleaned.startsWith(code)) {
                    const rest = cleaned.slice(code.length);
                    if (rest.length === 10) {
                      parsedCountryCode = code;
                      parsedPhone = rest;
                      matched = true;
                      break;
                    }
                  }
                }
                if (!matched) parsedPhone = cleaned.slice(-10);
              } else {
                const digitsOnly = cleaned.replace('+', '');
                parsedPhone = digitsOnly.slice(-10);
              }
            }

            updateForm({
              customer_id: customer.customer_id,
              customer_name: customer.display_name || '',
              email: customer.email || '',
              country_code: parsedCountryCode,
              phone: parsedPhone,
              astrologer_name: customer.display_name || '',
              astrologer_number: parsedPhone,
              gst_treatment: customer.gst_treatment || 'consumer',
            });
          }}
          onClear={() => {
            updateForm({ customer_id: '' });
            setNeedsAddressUpdate(false);
          }}
          selectedCustomer={
            formData.customer_id ? {
              customer_id: formData.customer_id,
              display_name: formData.customer_name,
              email: formData.email,
              gst_treatment: formData.gst_treatment,
            } : null
          }
        />
      </div>

      {needsAddressUpdate && formData.customer_id && (
        <div
          style={{
            background: 'rgba(234, 179, 8, 0.12)',
            border: '1px solid rgba(234, 179, 8, 0.4)',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
          }}
        >
          <span style={{ fontSize: '18px', lineHeight: 1.3 }}>⚠️</span>
          <div>
            <p style={{ fontWeight: 600, color: '#ca8a04', fontSize: '14px', margin: 0 }}>
              Missing or incomplete address in Zoho
            </p>
            <p style={{ color: '#a16207', fontSize: '13px', margin: '4px 0 0' }}>
              This customer exists in Zoho but has no billing address or only a partial one. Fill in the details below — they will be saved to Zoho before proceeding to the next step.
            </p>
          </div>
        </div>
      )}

      <div className="form-grid-2">
        <div className="form-group">
          <label>Customer Name *</label>
          <input className="form-input" value={formData.customer_name}
            onChange={(e) => {
              const val = e.target.value;
              updateForm({ customer_name: val, ...(formData.astrologer_name === formData.customer_name && { astrologer_name: val }) });
            }}
            placeholder="John Doe" />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input className="form-input" type="email" value={formData.email}
            onChange={(e) => updateForm({ email: e.target.value })} placeholder="john@example.com" />
        </div>
        <div className="form-group">
          <label>Phone *</label>
          <div className="flex gap-2 items-end">
            <div className="flex flex-col">
              <span className="text-xs text-gray-400 mb-1">Code</span>
              <select className="form-input" style={{ width: '110px' }} value={formData.country_code}
                onChange={(e) => updateForm({ country_code: e.target.value })}>
                <option value="+91">🇮🇳 +91 (India)</option>
                <option value="+1">🇺🇸 +1 (USA)</option>
                <option value="+44">🇬🇧 +44 (UK)</option>
                <option value="+971">🇦🇪 +971 (UAE)</option>
                <option value="+61">🇦🇺 +61 (AUS)</option>
                <option value="+65">🇸🇬 +65 (SG)</option>
                <option value="+60">🇲🇾 +60 (MY)</option>
                <option value="+49">🇩🇪 +49 (DE)</option>
              </select>
            </div>
            <div className="flex flex-col flex-1">
              <span className="text-xs text-gray-400 mb-1">10-digit number</span>
              <input className="form-input" value={formData.phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  updateForm({ phone: val, ...(formData.astrologer_number === formData.phone && { astrologer_number: val }) });
                }}
                placeholder="9876543210" maxLength={10} />
            </div>
          </div>
        </div>
        <div className="form-group">
          <label>Astrologer Name</label>
          <input className="form-input" value={formData.astrologer_name}
            onChange={(e) => updateForm({ astrologer_name: e.target.value })} placeholder="Astrologer Name" />
        </div>
        <div className="form-group">
          <label>Astrologer Number</label>
          <input className="form-input" value={formData.astrologer_number}
            onChange={(e) => updateForm({ astrologer_number: e.target.value.replace(/\D/g, '') })}
            placeholder="9876543210" maxLength={10} />
        </div>
        <div className="form-group">
          <label>Address *</label>
          <input className="form-input" value={formData.address}
            onChange={(e) => updateForm({ address: e.target.value })} placeholder="123 Street Name" />
        </div>
        <div className="form-group relative">
          <label>Pincode *</label>
          <input className="form-input" value={formData.pincode}
            onChange={(e) => updateForm({ pincode: e.target.value, isPincodeServiceable: null })}
            onBlur={handlePincodeBlur} placeholder="110001" maxLength={6} />
          {checkingPincode && <span className="absolute right-3 top-9 text-xs text-accent">Checking...</span>}
          {formData.isPincodeServiceable === true && <span className="absolute right-3 top-9 text-xs text-green-500">✓ Serviceable</span>}
          {formData.isPincodeServiceable === false && <span className="absolute right-3 top-9 text-xs text-red-500">✗ Not Serviceable</span>}
        </div>
        <div className="form-group">
          <label>City &amp; State</label>
          <div className="flex gap-2">
            <input className="form-input flex-1" value={formData.city}
              onChange={(e) => updateForm({ city: e.target.value })} placeholder="City" />
            <select className="form-input flex-1" value={formData.state}
              onChange={(e) => updateForm({ state: e.target.value })}>
              {INDIAN_STATES.map((stateInfo) => (
                <option key={stateInfo} value={INDIAN_STATE_NAMES[stateInfo]}>{INDIAN_STATE_NAMES[stateInfo]}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>Invoice Date *</label>
          <input className="form-input" type="date" value={formData.date}
            onChange={(e) => updateForm({ date: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Salesperson *</label>
          <select className="form-input" value={formData.salesperson_name}
            onChange={(e) => updateForm({ salesperson_name: e.target.value as Salesperson | '' })}>
            <option value="">Select Salesperson</option>
            {SALESPERSONS.map((sp) => (
              <option key={sp} value={sp}>{sp}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button className="btn btn-submit" onClick={handleNext} disabled={savingToZoho}>
          {savingToZoho ? 'Saving to Zoho...' : 'Next: Add Items ➔'}
        </button>
      </div>
    </div>
  );
}
