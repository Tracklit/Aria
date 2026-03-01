import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getTrainingPlans,
  getTrainingPlan,
  createTrainingPlan,
  getPlannedWorkouts,
  getWorkouts,
  getTodaysWorkout,
  startSession,
  updateSession,
  finishSession,
  addCheckpoint,
  completeWorkout,
  skipWorkout,
} from '../lib/api';

const LOCAL_PLANS_KEY = '@aria_local_plans';
const LOCAL_WORKOUTS_KEY = '@aria_local_workouts';

export interface TrainingPlan {
  id: number;
  userId: number;
  planName: string;
  description: string | null;
  targetEventName: string | null;
  targetEventDate: string | null;
  targetDistance: number | null;
  targetTime: number | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  weekCount: number | null;
  generatedBy: string;
}

export interface PlannedWorkout {
  id: number;
  planId: number;
  date: string;
  weekNumber: number | null;
  dayOfWeek: number | null;
  type: string;
  title: string | null;
  description: string | null;
  structure: any | null;
  targetDuration: number | null;
  targetDistance: number | null;
  targetPace: string | null;
  notes: string | null;
  priority: string;
}

export interface Workout {
  id: number;
  userId: number;
  providerSource: string;
  type: string;
  title: string | null;
  startTime: string;
  endTime: string | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
  avgPace: string | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  avgCadence: number | null;
  calories: number | null;
  splits: any[] | null;
}

export interface WorkoutSession {
  id: number;
  userId: number;
  plannedWorkoutId: number | null;
  status: string;
  currentPhase: string | null;
  currentIntervalIndex: number;
  startedAt: string | null;
  pausedAt: string | null;
  completedAt: string | null;
  totalPausedDuration: number;
  liveMetrics: any | null;
  checkpoints: any[];
}

interface WorkoutState {
  trainingPlans: TrainingPlan[];
  activePlan: TrainingPlan | null;
  plannedWorkouts: PlannedWorkout[];
  todaysWorkout: PlannedWorkout | null;
  workoutHistory: Workout[];
  activeSession: WorkoutSession | null;
  isLoading: boolean;
  error: string | null;
}

interface WorkoutContextType extends WorkoutState {
  loadTrainingPlans: () => Promise<void>;
  selectPlan: (id: number) => Promise<void>;
  createPlan: (data: any) => Promise<TrainingPlan>;
  createLocalPlan: (data: Partial<TrainingPlan>) => Promise<TrainingPlan>;
  loadTodaysWorkout: () => Promise<void>;
  loadWorkoutHistory: (limit?: number) => Promise<void>;
  startWorkoutSession: (plannedWorkoutId?: number) => Promise<WorkoutSession>;
  updateWorkoutSession: (data: any) => Promise<void>;
  sendCheckpoint: (data: any) => Promise<void>;
  finishWorkoutSession: (workoutData?: any) => Promise<void>;
  markWorkoutComplete: (plannedWorkoutId: number, data: any) => Promise<void>;
  markWorkoutSkipped: (plannedWorkoutId: number, reason: string) => Promise<void>;
  clearError: () => void;
}

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

// Generate sample workouts for a new plan
function generateSampleWorkouts(plan: TrainingPlan): PlannedWorkout[] {
  const workouts: PlannedWorkout[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const workoutTypes = [
    { type: 'rest', title: 'Rest Day', description: null },
    { type: 'intervals', title: 'Intervals', description: '5 × 400m, 90% effort' },
    { type: 'cross_training', title: 'Cross Training', description: 'Swimming, cycling, or yoga' },
    { type: 'intervals', title: 'Intervals', description: '4 × 800m, 85% effort' },
    { type: 'easy_run', title: 'Easy Run', description: '5K at conversational pace' },
    { type: 'rest', title: 'Rest Day', description: null },
    { type: 'long_run', title: 'Long Run', description: '10K at steady pace' },
  ];

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const workout = workoutTypes[i % workoutTypes.length];

    workouts.push({
      id: -(Date.now() + i),
      planId: plan.id,
      date: date.toISOString(),
      weekNumber: 1,
      dayOfWeek: date.getDay(),
      type: workout.type,
      title: workout.title,
      description: workout.description,
      structure: null,
      targetDuration: null,
      targetDistance: null,
      targetPace: null,
      notes: null,
      priority: 'normal',
    });
  }

  return workouts;
}

export const WorkoutProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<WorkoutState>({
    trainingPlans: [],
    activePlan: null,
    plannedWorkouts: [],
    todaysWorkout: null,
    workoutHistory: [],
    activeSession: null,
    isLoading: false,
    error: null,
  });

  const loadTrainingPlans = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      // Try to load from API first
      let plans: TrainingPlan[] = [];
      try {
        plans = await getTrainingPlans() as TrainingPlan[];
      } catch {
        // API failed, continue with local plans only
      }

      // Load local plans from storage
      const localPlansJson = await AsyncStorage.getItem(LOCAL_PLANS_KEY);
      const localPlans: TrainingPlan[] = localPlansJson ? JSON.parse(localPlansJson) : [];

      // Merge plans (local plans have negative IDs to distinguish them)
      const allPlans = [...plans, ...localPlans];
      const activePlan = allPlans.find((p) => p.status === 'active') || null;

      // Load planned workouts for active plan
      let plannedWorkouts: PlannedWorkout[] = [];
      if (activePlan) {
        if (activePlan.id < 0) {
          // Local plan - load local workouts
          const localWorkoutsJson = await AsyncStorage.getItem(LOCAL_WORKOUTS_KEY);
          const allLocalWorkouts: PlannedWorkout[] = localWorkoutsJson ? JSON.parse(localWorkoutsJson) : [];
          plannedWorkouts = allLocalWorkouts.filter((w) => w.planId === activePlan.id);
        } else {
          // API plan
          try {
            plannedWorkouts = await getPlannedWorkouts(activePlan.id) as PlannedWorkout[];
          } catch {
            // Failed to load workouts
          }
        }
      }

      setState((prev) => ({
        ...prev,
        trainingPlans: allPlans,
        activePlan,
        plannedWorkouts,
        isLoading: false,
      }));
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to load training plans',
      }));
    }
  }, []);

  const selectPlan = useCallback(async (id: number) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const plan = await getTrainingPlan(id) as TrainingPlan;
      const plannedWorkouts = await getPlannedWorkouts(id) as PlannedWorkout[];

      setState((prev) => ({
        ...prev,
        activePlan: plan,
        plannedWorkouts,
        isLoading: false,
      }));
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to load plan',
      }));
    }
  }, []);

  const createPlan = useCallback(async (data: any): Promise<TrainingPlan> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const plan = await createTrainingPlan(data) as TrainingPlan;
      setState((prev) => ({
        ...prev,
        trainingPlans: [...prev.trainingPlans, plan],
        isLoading: false,
      }));
      return plan;
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to create plan',
      }));
      throw error;
    }
  }, []);

  const createLocalPlan = useCallback(async (data: Partial<TrainingPlan>): Promise<TrainingPlan> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      // Generate a negative ID for local plans
      const localId = -Date.now();

      const newPlan: TrainingPlan = {
        id: localId,
        userId: 0,
        planName: data.planName || 'My Plan',
        description: data.description || null,
        targetEventName: data.targetEventName || null,
        targetEventDate: data.targetEventDate || null,
        targetDistance: data.targetDistance || null,
        targetTime: data.targetTime || null,
        status: 'active',
        startDate: new Date().toISOString(),
        endDate: data.endDate || null,
        weekCount: data.weekCount || null,
        generatedBy: 'user',
      };

      // Load existing local plans
      const existingJson = await AsyncStorage.getItem(LOCAL_PLANS_KEY);
      const existingPlans: TrainingPlan[] = existingJson ? JSON.parse(existingJson) : [];

      // Deactivate any existing active local plans
      const updatedPlans = existingPlans.map((p) => ({
        ...p,
        status: p.status === 'active' ? 'completed' : p.status,
      }));

      // Add new plan
      updatedPlans.push(newPlan);
      await AsyncStorage.setItem(LOCAL_PLANS_KEY, JSON.stringify(updatedPlans));

      // Generate sample workouts for the plan
      const sampleWorkouts = generateSampleWorkouts(newPlan);
      const existingWorkoutsJson = await AsyncStorage.getItem(LOCAL_WORKOUTS_KEY);
      const existingWorkouts: PlannedWorkout[] = existingWorkoutsJson ? JSON.parse(existingWorkoutsJson) : [];
      await AsyncStorage.setItem(LOCAL_WORKOUTS_KEY, JSON.stringify([...existingWorkouts, ...sampleWorkouts]));

      setState((prev) => ({
        ...prev,
        trainingPlans: [...prev.trainingPlans.map((p) => ({ ...p, status: p.id < 0 && p.status === 'active' ? 'completed' : p.status })), newPlan],
        activePlan: newPlan,
        plannedWorkouts: sampleWorkouts,
        isLoading: false,
      }));

      return newPlan;
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to create plan',
      }));
      throw error;
    }
  }, []);

  const loadTodaysWorkout = useCallback(async () => {
    try {
      const workout = await getTodaysWorkout() as PlannedWorkout;
      setState((prev) => ({ ...prev, todaysWorkout: workout }));
    } catch (error: any) {
      // No workout today is not an error
      setState((prev) => ({ ...prev, todaysWorkout: null }));
    }
  }, []);

  const loadWorkoutHistory = useCallback(async (limit?: number) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const workouts = await getWorkouts(limit) as Workout[];
      setState((prev) => ({
        ...prev,
        workoutHistory: workouts,
        isLoading: false,
      }));
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to load workout history',
      }));
    }
  }, []);

  const startWorkoutSession = useCallback(async (plannedWorkoutId?: number): Promise<WorkoutSession> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const session = await startSession(plannedWorkoutId) as WorkoutSession;
      setState((prev) => ({
        ...prev,
        activeSession: session,
        isLoading: false,
      }));
      return session;
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to start session',
      }));
      throw error;
    }
  }, []);

  const updateWorkoutSession = useCallback(async (data: any) => {
    if (!state.activeSession) return;

    try {
      const session = await updateSession(state.activeSession.id, data) as WorkoutSession;
      setState((prev) => ({ ...prev, activeSession: session }));
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        error: error.message || 'Failed to update session',
      }));
    }
  }, [state.activeSession]);

  const sendCheckpoint = useCallback(async (data: any) => {
    if (!state.activeSession) return;

    try {
      const session = await addCheckpoint(state.activeSession.id, data) as WorkoutSession;
      setState((prev) => ({ ...prev, activeSession: session }));
    } catch (error: any) {
      console.error('Failed to send checkpoint:', error);
    }
  }, [state.activeSession]);

  const finishWorkoutSession = useCallback(async (workoutData?: any) => {
    if (!state.activeSession) return;

    try {
      await finishSession(state.activeSession.id, workoutData);
      setState((prev) => ({ ...prev, activeSession: null }));

      // Reload workout history
      loadWorkoutHistory();
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        error: error.message || 'Failed to finish session',
      }));
    }
  }, [state.activeSession, loadWorkoutHistory]);

  const markWorkoutComplete = useCallback(async (plannedWorkoutId: number, data: any) => {
    try {
      await completeWorkout(plannedWorkoutId, data);
      // Reload planned workouts to reflect completion
      if (state.activePlan) {
        const plannedWorkouts = await getPlannedWorkouts(state.activePlan.id) as PlannedWorkout[];
        setState((prev) => ({ ...prev, plannedWorkouts }));
      }
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        error: error.message || 'Failed to complete workout',
      }));
    }
  }, [state.activePlan]);

  const markWorkoutSkipped = useCallback(async (plannedWorkoutId: number, reason: string) => {
    try {
      await skipWorkout(plannedWorkoutId, reason);
      // Reload planned workouts to reflect skip
      if (state.activePlan) {
        const plannedWorkouts = await getPlannedWorkouts(state.activePlan.id) as PlannedWorkout[];
        setState((prev) => ({ ...prev, plannedWorkouts }));
      }
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        error: error.message || 'Failed to skip workout',
      }));
    }
  }, [state.activePlan]);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return (
    <WorkoutContext.Provider
      value={{
        ...state,
        loadTrainingPlans,
        selectPlan,
        createPlan,
        createLocalPlan,
        loadTodaysWorkout,
        loadWorkoutHistory,
        startWorkoutSession,
        updateWorkoutSession,
        sendCheckpoint,
        finishWorkoutSession,
        markWorkoutComplete,
        markWorkoutSkipped,
        clearError,
      }}
    >
      {children}
    </WorkoutContext.Provider>
  );
};

export const useWorkout = () => {
  const context = useContext(WorkoutContext);
  if (!context) {
    throw new Error('useWorkout must be used within a WorkoutProvider');
  }
  return context;
};
