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

const MOCK_NUTRITION_PLANS: NutritionPlan[] = [
  {
    id: 9001,
    userId: 1,
    title: 'In-Season Sprint Fuel',
    description: 'Optimized nutrition plan for peak sprint performance during competition season. High protein for recovery, moderate carbs for explosive energy.',
    activityLevel: 'very_active',
    season: 'in_season',
    calorieTarget: 2800,
    proteinGrams: 180,
    carbsGrams: 340,
    fatsGrams: 85,
    createdBy: 'ai',
    status: 'active',
    createdAt: '2026-02-15T08:00:00Z',
    updatedAt: '2026-02-20T14:30:00Z',
    mealSuggestions: [
      {
        meal: 'Breakfast',
        foods: ['3 scrambled eggs', 'Oatmeal with honey', 'Banana', 'Orange juice'],
        calories: 720,
        macros: { protein: 38, carbs: 95, fats: 22 },
      },
      {
        meal: 'Mid-Morning Snack',
        foods: ['Whey protein shake', 'Handful of almonds', 'Apple'],
        calories: 420,
        macros: { protein: 35, carbs: 40, fats: 15 },
      },
      {
        meal: 'Lunch',
        foods: ['Grilled chicken breast (200g)', 'Brown rice (1.5 cups)', 'Steamed broccoli', 'Olive oil drizzle'],
        calories: 850,
        macros: { protein: 55, carbs: 105, fats: 20 },
      },
      {
        meal: 'Dinner',
        foods: ['Baked salmon fillet (180g)', 'Sweet potato (large)', 'Mixed green salad', 'Avocado slices'],
        calories: 810,
        macros: { protein: 52, carbs: 100, fats: 28 },
      },
    ],
  },
  {
    id: 9002,
    userId: 1,
    title: 'Off-Season Mass Builder',
    description: 'Higher calorie plan designed for building lean muscle mass during the off-season. Emphasis on caloric surplus with clean food sources.',
    activityLevel: 'extremely_active',
    season: 'off_season',
    calorieTarget: 3200,
    proteinGrams: 200,
    carbsGrams: 400,
    fatsGrams: 95,
    createdBy: 'ai',
    status: 'active',
    createdAt: '2026-01-10T09:00:00Z',
    updatedAt: '2026-01-28T11:00:00Z',
    mealSuggestions: [
      {
        meal: 'Breakfast',
        foods: ['4-egg omelette with spinach and cheese', 'Whole wheat toast (2 slices)', 'Greek yogurt with granola', 'Mixed berries'],
        calories: 880,
        macros: { protein: 52, carbs: 90, fats: 32 },
      },
      {
        meal: 'Mid-Morning Snack',
        foods: ['Mass gainer protein shake', 'Peanut butter banana sandwich', 'Trail mix (1/4 cup)'],
        calories: 620,
        macros: { protein: 38, carbs: 78, fats: 18 },
      },
      {
        meal: 'Lunch',
        foods: ['Lean ground turkey (250g)', 'Pasta (2 cups cooked)', 'Marinara sauce', 'Side of mixed vegetables'],
        calories: 920,
        macros: { protein: 58, carbs: 120, fats: 20 },
      },
      {
        meal: 'Afternoon Snack',
        foods: ['Cottage cheese (1 cup)', 'Rice cakes (3)', 'Honey drizzle', 'Sliced almonds'],
        calories: 380,
        macros: { protein: 22, carbs: 52, fats: 10 },
      },
      {
        meal: 'Dinner',
        foods: ['Grilled steak (200g)', 'Baked potato with butter', 'Roasted asparagus', 'Dinner roll'],
        calories: 900,
        macros: { protein: 50, carbs: 85, fats: 30 },
      },
    ],
  },
  {
    id: 9003,
    userId: 1,
    title: 'Recovery Week Plan',
    description: 'Lower calorie anti-inflammatory plan for recovery weeks. Focus on nutrient-dense, easily digestible foods to support tissue repair.',
    activityLevel: 'moderate',
    season: 'post_season',
    calorieTarget: 2200,
    proteinGrams: 140,
    carbsGrams: 260,
    fatsGrams: 70,
    createdBy: 'user',
    status: 'archived',
    createdAt: '2025-11-20T07:00:00Z',
    updatedAt: '2025-12-05T16:45:00Z',
    mealSuggestions: [
      {
        meal: 'Breakfast',
        foods: ['Smoothie bowl (banana, blueberries, spinach, protein powder)', 'Chia seeds', 'Sliced kiwi'],
        calories: 550,
        macros: { protein: 35, carbs: 72, fats: 14 },
      },
      {
        meal: 'Lunch',
        foods: ['Grilled fish tacos (2)', 'Black bean salad', 'Lime crema', 'Watermelon slices'],
        calories: 780,
        macros: { protein: 48, carbs: 95, fats: 24 },
      },
      {
        meal: 'Dinner',
        foods: ['Chicken stir-fry with vegetables', 'Jasmine rice (1 cup)', 'Miso soup', 'Green tea'],
        calories: 700,
        macros: { protein: 45, carbs: 88, fats: 18 },
      },
    ],
  },
];

export const NutritionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<NutritionState>({
    plans: MOCK_NUTRITION_PLANS,
    activePlan: MOCK_NUTRITION_PLANS[0],
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
        plans: fetched.length > 0 ? fetched : prev.plans,
        isLoading: false,
      }));
    } catch (error: any) {
      // Keep mock data on failure — don't clear plans
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
