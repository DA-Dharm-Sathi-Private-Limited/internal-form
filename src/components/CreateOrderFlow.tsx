'use client';

import { useEffect } from 'react';
import { useWizardStore } from '@/store/wizardStore';
import CustomerStep from './steps/CustomerStep';
import InvoiceItemsStep from './steps/InvoiceItemsStep';
import OrderPreviewStep from './steps/OrderPreviewStep';
import OrderConfirmationStep from './steps/OrderConfirmationStep';

const STEPS = [
  { step: 1, label: 'Customer' },
  { step: 2, label: 'Items' },
  { step: 3, label: 'Review' },
  { step: 4, label: 'Complete' },
];

export default function CreateOrderFlow() {
  const currentStep = useWizardStore((s) => s.currentStep);
  const reset = useWizardStore((s) => s.reset);
  const loadZohoData = useWizardStore((s) => s.loadZohoData);

  useEffect(() => {
    loadZohoData();
  }, [loadZohoData]);

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <CustomerStep />;
      case 2:
        return <InvoiceItemsStep />;
      case 3:
        return <OrderPreviewStep />;
      case 4:
        return <OrderConfirmationStep onReset={() => reset(1)} />;
      default:
        return null;
    }
  };

  return (
    <div className="wizard-container">
      <div className="wizard-stepper">
        {STEPS.map((step, idx) => {
          const isCompleted = currentStep > step.step;
          const isActive = currentStep === step.step;

          return (
            <div key={step.step} className="stepper-item-wrapper">
              <div
                className={`stepper-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
              >
                <div className="stepper-circle">
                  {isCompleted ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  ) : (
                    idx + 1
                  )}
                </div>
                <span className="stepper-label">{step.label}</span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`stepper-line ${isCompleted ? 'completed' : ''}`} />
              )}
            </div>
          );
        })}
      </div>

      <div className="wizard-content">
        {renderStep()}
      </div>
    </div>
  );
}
