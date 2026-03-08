import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  getNutritionPlans as apiGetPlans,
  createNutritionPlan as apiCreatePlan,
  updateNutritionPlan as apiUpdatePlan,
  deleteNutritionPlan as apiDeletePlan,
  generateNutritionPlan as apiGeneratePlan,
  activateNutritionPlan as apiActivatePlan,
  logNutritionMeal as apiLogMeal,
  getTodaysNutritionLogs as apiGetTodaysLogs,
  NutritionLogEntry,
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
  mealsPerDay?: number | null;
  wakeTime?: string | null;
  sleepTime?: string | null;
  lunchTime?: string | null;
  trainingTime?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type { NutritionLogEntry };

interface NutritionState {
  plans: NutritionPlan[];
  activePlan: NutritionPlan | null;
  todaysLogs: NutritionLogEntry[];
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
  activatePlan: (id: number) => Promise<void>;
  logMeal: (planId: number | undefined, mealName: string, status: 'completed' | 'skipped', calories?: number) => Promise<void>;
  loadTodaysLogs: () => Promise<void>;
}

const NutritionContext = createContext<NutritionContextType | undefined>(undefined);

export const NutritionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<NutritionState>({
    plans: [],
    activePlan: null,
    todaysLogs: [],
    isLoading: false,
    error: null,
  });

  const fetchPlans = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const plans = await apiGetPlans();
      const fetched = plans as NutritionPlan[];
      const active = fetched.find(p => p.status === 'active') || (fetched.length > 0 ? fetched[0] : null);
      setState(prev => ({
        ...prev,
        plans: fetched,
        activePlan: active,
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

  const activatePlan = useCallback(async (id: number) => {
    const activated = await apiActivatePlan(id) as NutritionPlan;
    setState(prev => ({
      ...prev,
      plans: prev.plans.map(p => p.id === id ? activated : { ...p, status: 'archived' }),
      activePlan: activated,
    }));
  }, []);

  const loadTodaysLogs = useCallback(async () => {
    try {
      const logs = await apiGetTodaysLogs();
      setState(prev => ({ ...prev, todaysLogs: logs }));
    } catch (error: any) {
      console.error('Failed to load today\'s nutrition logs:', error.message);
    }
  }, []);

  const logMeal = useCallback(async (
    planId: number | undefined,
    mealName: string,
    status: 'completed' | 'skipped',
    calories?: number,
  ) => {
    const log = await apiLogMeal({
      nutritionPlanId: planId,
      mealName,
      status,
      date: new Date().toISOString(),
      calories,
    });
    setState(prev => ({ ...prev, todaysLogs: [log, ...prev.todaysLogs] }));
  }, []);

  return (
    <NutritionContext.Provider value={{
      ...state,
      fetchPlans,
      createPlan,
      updatePlan,
      deletePlan,
      generatePlan,
      setActivePlan,
      activatePlan,
      logMeal,
      loadTodaysLogs,
    }}>
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
