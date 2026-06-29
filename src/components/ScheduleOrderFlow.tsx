"use client";

import { useEffect } from "react";
import { useWizardStore } from "@/store/wizardStore";
import PendingOrdersStep from "./steps/PendingOrdersStep";
import ScheduleEditItemsStep from "./steps/ScheduleEditItemsStep";
import SchedulePreviewStep from "./steps/SchedulePreviewStep";
import ScheduleConfirmationStep from "./steps/ScheduleConfirmationStep";

const STEPS = [
  { step: 1, label: "Select Order" },
  { step: 2, label: "Edit Items" },
  { step: 3, label: "Review & Ship" },
  { step: 4, label: "Complete" },
];

export default function ScheduleOrderFlow() {
  const currentStep = useWizardStore((s) => s.currentStep);
  const reset = useWizardStore((s) => s.reset);
  const loadZohoData = useWizardStore((s) => s.loadZohoData);

  useEffect(() => {
    loadZohoData();
  }, [loadZohoData]);

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <PendingOrdersStep />;
      case 2:
        return <ScheduleEditItemsStep />;
      case 3:
        return <SchedulePreviewStep />;
      case 4:
        return <ScheduleConfirmationStep onReset={() => reset(1)} />;
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
                className={`stepper-item ${isActive ? "active" : ""} ${isCompleted ? "completed" : ""}`}
              >
                <div className="stepper-circle">
                  {isCompleted ? (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  ) : (
                    idx + 1
                  )}
                </div>
                <span className="stepper-label">{step.label}</span>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={`stepper-line ${isCompleted ? "completed" : ""}`}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="wizard-content">{renderStep()}</div>
    </div>
  );
}
