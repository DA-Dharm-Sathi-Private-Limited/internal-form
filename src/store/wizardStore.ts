import { create } from 'zustand';
import { CombinedFormData, INITIAL_WIZARD_STATE } from '@/types/wizard';
import { ZohoItem, ZohoTax } from '@/types/invoice';
import { zohoService } from '@/services/zoho';

interface WizardStore {
  formData: CombinedFormData;
  currentStep: number;
  zohoItems: ZohoItem[];
  zohoTaxes: ZohoTax[];
  isZohoLoading: boolean;

  updateForm: (updates: Partial<CombinedFormData>) => void;
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  reset: (initialStep?: number) => void;
  loadZohoData: () => Promise<void>;
}

export const useWizardStore = create<WizardStore>((set) => ({
  formData: { ...INITIAL_WIZARD_STATE },
  currentStep: 1,
  zohoItems: [],
  zohoTaxes: [],
  isZohoLoading: false,

  updateForm: (updates) =>
    set((state) => ({ formData: { ...state.formData, ...updates } })),

  setStep: (step) => set({ currentStep: step }),

  nextStep: () => set((state) => ({ currentStep: state.currentStep + 1 })),

  prevStep: () => set((state) => ({ currentStep: Math.max(1, state.currentStep - 1) })),

  reset: (initialStep = 1) =>
    set({
      formData: { ...INITIAL_WIZARD_STATE },
      currentStep: initialStep,
    }),

  loadZohoData: async () => {
    set({ isZohoLoading: true });
    try {
      const [itemsRes, taxesRes] = await Promise.all([
        zohoService.getItems(),
        zohoService.getTaxes(),
      ]);
      const itemsData = itemsRes as { items?: ZohoItem[] };
      const taxesData = taxesRes as { taxes?: ZohoTax[] };
      const items = itemsData.items ?? [];
      const taxes = taxesData.taxes ?? [];
      console.log('[wizardStore] Zoho items loaded:', items.length, '| taxes:', taxes.length);
      if (items.length > 0) console.log('[wizardStore] First item:', items[0].name);
      set({ zohoItems: items, zohoTaxes: taxes });
    } catch (err) {
      console.error('[wizardStore] Failed to load Zoho data:', err);
    } finally {
      set({ isZohoLoading: false });
    }
  },
}));
