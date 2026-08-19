'use client';

import { useState } from 'react';
import { CombinedFormData, INITIAL_WIZARD_STATE, WizardStep } from '@/types/wizard';
import CustomerStep from './steps/CustomerStep';
import InvoiceItemsStep from './steps/InvoiceItemsStep';
import OrderPreviewStep from './steps/OrderPreviewStep';
import OrderConfirmationStep from './steps/OrderConfirmationStep';
import AIChatboxOrder from './AIChatboxOrder';
import { Sparkles, Edit3 } from 'lucide-react';

export default function CreateOrderFlow() {
    const [creationMode, setCreationMode] = useState<'chat' | 'manual'>('chat');
    const [currentStep, setCurrentStep] = useState<WizardStep>(WizardStep.CUSTOMER);
    const [formData, setFormData] = useState<CombinedFormData>(INITIAL_WIZARD_STATE);

    const updateForm = (updates: Partial<CombinedFormData>) => {
        setFormData((prev) => ({ ...prev, ...updates }));
    };

    const getNextStepId = (curr: WizardStep) => {
        if (curr === WizardStep.CUSTOMER) return WizardStep.ITEMS;
        if (curr === WizardStep.ITEMS) return WizardStep.PREVIEW;
        if (curr === WizardStep.PREVIEW) return WizardStep.CONFIRMATION;
        return curr;
    };

    const getPrevStepId = (curr: WizardStep) => {
        if (curr === WizardStep.ITEMS) return WizardStep.CUSTOMER;
        if (curr === WizardStep.PREVIEW) return WizardStep.ITEMS;
        return curr;
    };

    const nextStep = () => setCurrentStep(getNextStepId);
    const prevStep = () => setCurrentStep(getPrevStepId);

    const renderStep = () => {
        switch (currentStep) {
            case WizardStep.CUSTOMER:
                return <CustomerStep formData={formData} updateForm={updateForm} onNext={nextStep} />;
            case WizardStep.ITEMS:
                return <InvoiceItemsStep formData={formData} updateForm={updateForm} onNext={nextStep} onPrev={prevStep} />;
            case WizardStep.PREVIEW:
                return <OrderPreviewStep formData={formData} updateForm={updateForm} onNext={nextStep} onPrev={prevStep} />;
            case WizardStep.CONFIRMATION:
                return <OrderConfirmationStep formData={formData} onReset={() => {
                    setFormData(INITIAL_WIZARD_STATE);
                    setCurrentStep(WizardStep.CUSTOMER);
                }} />;
            default:
                return null;
        }
    };

    const steps = [
        { id: WizardStep.CUSTOMER, label: 'Customer' },
        { id: WizardStep.ITEMS, label: 'Items' },
        { id: WizardStep.PREVIEW, label: 'Review' },
        { id: WizardStep.CONFIRMATION, label: 'Complete' },
    ];

    return (
        <div className="w-full max-w-5xl mx-auto space-y-6">
            {/* Top Order Creation Option Switcher */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] p-2 rounded-2xl shadow-sm flex items-center justify-center gap-2 max-w-md mx-auto">
                <button
                    onClick={() => setCreationMode('chat')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        creationMode === 'chat'
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                >
                    <Sparkles className="w-4 h-4" />
                    <span>Create by AI Chatbox</span>
                </button>
                <button
                    onClick={() => setCreationMode('manual')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        creationMode === 'manual'
                            ? 'bg-[var(--accent)] text-white shadow-md'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                >
                    <Edit3 className="w-4 h-4" />
                    <span>Create Manually</span>
                </button>
            </div>

            {/* Mode Content */}
            {creationMode === 'chat' ? (
                <AIChatboxOrder />
            ) : (
                <div className="wizard-container">
                    {/* Stepper Header */}
                    <div className="wizard-stepper">
                        {steps.map((step, idx) => {
                            const isCompleted = currentStep > step.id || (currentStep === WizardStep.CONFIRMATION && step.id === WizardStep.PREVIEW);
                            const isActive = currentStep === step.id;

                            return (
                                <div key={step.id} className="stepper-item-wrapper">
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
                                    {idx < steps.length - 1 && (
                                        <div className={`stepper-line ${isCompleted ? 'completed' : ''}`} />
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Step Content */}
                    <div className="wizard-content">
                        {renderStep()}
                    </div>
                </div>
            )}
        </div>
    );
}
