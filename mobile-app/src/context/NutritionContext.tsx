import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  getNutritionPlans as apiGetPlans,
  createNutritionPlan as apiCreatePlan,
  updateNutritionPlan as apiUpdatePlan,
  deleteNutritionPlan as apiDeletePlan,
  generateNutritionPlan as apiGeneratePlan,
} from '../lib/api';

export interface NutritionPlan {
  id: number;
  userId: number;
  title: string;
  description?: string | null;
  activityLevel?: string | null;
  season?: string | null;
  calorieTarget?: number | null;
  proteinGrams?: number | null;
  carbsGrams?: number | null;
  fatsGrams?: number | null;
  mealSuggestions?: Array<{
    meal: string;
    foods: string[];
    calories: number;
    macros: { protein: number; carbs: number; fats: number };
  }> | null;
  createdBy?: string | null;
  status?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface NutritionState {
  plans: NutritionPlan[];
  activePlan: NutritionPlan | null;
  isLoading: boolean;
  error: string | null;
}

interface NutritionContextType extends NutritionState {
  fetchPlans: () => Promise<void>;
  createPlan: (data: Partial<NutritionPlan>) => Promise<NutritionPlan>;
  updatePlan: (id: number, data: Partial<NutritionPlan>) => Promise<void>;
  deletePlan: (id: number) => Promise<void>;
  generatePlan: (input: any) => Promise<NutritionPlan>;
  setActivePlan: (plan: NutritionPlan | null) => void;
}

const NutritionContext = createContext<NutritionContextType | undefined>(undefined);

export const NutritionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<NutritionState>({
    plans: [],
    activePlan: null,
    isLoading: false,
    error: null,
  });

  const fetchPlans = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const plans = await apiGetPlans();
      const fetched = plans as NutritionPlan[];
      setState(prev => ({
        ...prev,
        plans: fetched,
        activePlan: fetched.length > 0 ? fetched[0] : null,
        isLoading: false,
      }));
    } catch (error: any) {
      setState(prev => ({ ...prev, isLoading: false, error: error.message }));
    }
  }, []);

  const createPlan = useCallback(async (data: Partial<NutritionPlan>): Promise<NutritionPlan> => {
    const plan = await apiCreatePlan(data) as NutritionPlan;
    setState(prev => ({ ...prev, plans: [plan, ...prev.plans] }));
    return plan;
  }, []);

  const updatePlan = useCallback(async (id: number, data: Partial<NutritionPlan>) => {
    const updated = await apiUpdatePlan(id, data) as NutritionPlan;
    setState(prev => ({
      ...prev,
      plans: prev.plans.map(p => p.id === id ? updated : p),
      activePlan: prev.activePlan?.id === id ? updated : prev.activePlan,
    }));
  }, []);

  const deletePlan = useCallback(async (id: number) => {
    await apiDeletePlan(id);
    setState(prev => ({
      ...prev,
      plans: prev.plans.filter(p => p.id !== id),
      activePlan: prev.activePlan?.id === id ? null : prev.activePlan,
    }));
  }, []);

  const generatePlan = useCallback(async (input: any): Promise<NutritionPlan> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const plan = await apiGeneratePlan(input) as NutritionPlan;
      setState(prev => ({ ...prev, plans: [plan, ...prev.plans], isLoading: false }));
      return plan;
    } catch (error: any) {
      setState(prev => ({ ...prev, isLoading: false, error: error.message }));
      throw error;
    }
  }, []);

  const setActivePlan = useCallback((plan: NutritionPlan | null) => {
    setState(prev => ({ ...prev, activePlan: plan }));
  }, []);

  return (
    <NutritionContext.Provider value={{ ...state, fetchPlans, createPlan, updatePlan, deletePlan, generatePlan, setActivePlan }}>
      {children}
    </NutritionContext.Provider>
  );
};

export const useNutrition = () => {
  const context = useContext(NutritionContext);
  if (!context) {
    throw new Error('useNutrition must be used within a NutritionProvider');
  }
  return context;
};
