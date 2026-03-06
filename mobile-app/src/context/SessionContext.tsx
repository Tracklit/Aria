import React, { createContext, useContext, useState, useRef, useCallback, useEffect, ReactNode } from 'react';
import { router } from 'expo-router';
import { startSession as apiStartSession, finishSession as apiFinishSession } from '../lib/api';
import { notificationSuccess, impactMedium } from '../utils/haptics';
import {
  announceSetComplete,
  announceRestTimer,
  announceExerciseStart,
  announceWorkoutComplete,
  stopSpeaking,
} from '../services/voiceFeedback';

interface Exercise {
  name: string;
  sets?: number;
  reps?: number | string;
  rest?: number;
}

interface SessionExercise extends Exercise {
  completedSets: boolean[];
  actualSets?: number;
  actualReps?: number | string;
  actualRest?: number;
}

interface LiveSession {
  programId: number;
  programTitle: string;
  sessionTitle: string;
  exercises: SessionExercise[];
  currentExerciseIndex: number;
  startedAt: Date;
  isPaused: boolean;
  isComplete: boolean;
  backendSessionId: number | null;
}

interface SessionContextType {
  activeSession: LiveSession | null;
  elapsedTime: number;
  restTimeRemaining: number | null;
  startSession: (programId: number, programTitle: string, sessionTitle: string, exercises: Exercise[]) => Promise<void>;
  pauseSession: () => void;
  resumeSession: () => void;
  completeSet: (exerciseIndex: number, setIndex: number) => void;
  nextExercise: () => void;
  previousExercise: () => void;
  startRestTimer: (seconds: number) => void;
  skipRest: () => void;
  updateExerciseValues: (exerciseIndex: number, values: { sets?: number; reps?: number | string; rest?: number }) => void;
  finishSession: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeSession, setActiveSession] = useState<LiveSession | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [restTimeRemaining, setRestTimeRemaining] = useState<number | null>(null);

  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pausedRef = useRef(false);

  const clearElapsedTimer = useCallback(() => {
    if (elapsedRef.current) {
      clearInterval(elapsedRef.current);
      elapsedRef.current = null;
    }
  }, []);

  const clearRestTimer = useCallback(() => {
    if (restRef.current) {
      clearInterval(restRef.current);
      restRef.current = null;
    }
    setRestTimeRemaining(null);
  }, []);

  const startSession = useCallback(async (programId: number, programTitle: string, sessionTitle: string, exercises: Exercise[]) => {
    clearElapsedTimer();
    clearRestTimer();

    const sessionExercises: SessionExercise[] = exercises.map(ex => ({
      ...ex,
      completedSets: Array(ex.sets || 1).fill(false),
    }));

    const now = new Date();
    pausedRef.current = false;

    // Start session on backend (fire-and-forget, don't block UI)
    let backendSessionId: number | null = null;
    apiStartSession().then((res: any) => {
      if (res?.id) {
        backendSessionId = res.id;
        setActiveSession(prev => prev ? { ...prev, backendSessionId: res.id } : null);
      }
    }).catch(() => {
      // Backend unavailable — session still works locally
      if (__DEV__) console.log('[Session] Backend session start failed, continuing locally');
    });

    setActiveSession({
      programId,
      programTitle,
      sessionTitle,
      exercises: sessionExercises,
      currentExerciseIndex: 0,
      startedAt: now,
      isPaused: false,
      isComplete: false,
      backendSessionId: null,
    });
    setElapsedTime(0);
    setRestTimeRemaining(null);

    elapsedRef.current = setInterval(() => {
      if (!pausedRef.current) {
        setElapsedTime(prev => prev + 1000);
      }
    }, 1000);

    router.push('/workout/live-session');
  }, [clearElapsedTimer, clearRestTimer]);

  const pauseSession = useCallback(() => {
    pausedRef.current = true;
    setActiveSession(prev => prev ? { ...prev, isPaused: true } : null);
  }, []);

  const resumeSession = useCallback(() => {
    pausedRef.current = false;
    setActiveSession(prev => prev ? { ...prev, isPaused: false } : null);
  }, []);

  const startRestTimer = useCallback((seconds: number) => {
    clearRestTimer();
    setRestTimeRemaining(seconds);

    restRef.current = setInterval(() => {
      setRestTimeRemaining(prev => {
        if (prev === null || prev <= 1) {
          clearRestTimer();
          notificationSuccess();
          return null;
        }
        const next = prev - 1;
        // Voice countdown for last 3 seconds
        if (next >= 1 && next <= 3) {
          announceRestTimer(next);
        }
        return next;
      });
    }, 1000);
  }, [clearRestTimer]);

  const skipRest = useCallback(() => {
    clearRestTimer();
  }, [clearRestTimer]);

  const completeSet = useCallback((exerciseIndex: number, setIndex: number) => {
    impactMedium();

    setActiveSession(prev => {
      if (!prev) return null;
      const exercises = prev.exercises.map((ex, i) => {
        if (i !== exerciseIndex) return ex;
        const completedSets = [...ex.completedSets];
        completedSets[setIndex] = !completedSets[setIndex];
        return { ...ex, completedSets };
      });

      // Announce set completion via voice feedback
      const ex = exercises[exerciseIndex];
      if (ex) {
        const completed = ex.completedSets.filter(Boolean).length;
        announceSetComplete(completed, ex.completedSets.length);
      }

      return { ...prev, exercises };
    });

    // Check if all sets are done and start rest timer (reads fresh state via timeout)
    setTimeout(() => {
      setActiveSession(current => {
        if (!current) return null;
        const ex = current.exercises[exerciseIndex];
        const restTime = ex?.actualRest ?? ex?.rest;
        if (ex && ex.completedSets.every(Boolean) && restTime && restTime > 0) {
          startRestTimer(restTime);
        }
        return current; // no state change
      });
    }, 50);
  }, [startRestTimer]);

  const updateExerciseValues = useCallback((exerciseIndex: number, values: { sets?: number; reps?: number | string; rest?: number }) => {
    setActiveSession(prev => {
      if (!prev) return null;
      const exercises = prev.exercises.map((ex, i) => {
        if (i !== exerciseIndex) return ex;
        const updated = { ...ex };
        if (values.sets !== undefined) {
          updated.actualSets = values.sets;
          // Resize completedSets array if sets count changed
          const currentLen = updated.completedSets.length;
          if (values.sets > currentLen) {
            updated.completedSets = [...updated.completedSets, ...Array(values.sets - currentLen).fill(false)];
          } else if (values.sets < currentLen) {
            updated.completedSets = updated.completedSets.slice(0, values.sets);
          }
        }
        if (values.reps !== undefined) updated.actualReps = values.reps;
        if (values.rest !== undefined) updated.actualRest = values.rest;
        return updated;
      });
      return { ...prev, exercises };
    });
  }, []);

  const nextExercise = useCallback(() => {
    clearRestTimer();
    setActiveSession(prev => {
      if (!prev) return null;
      const next = Math.min(prev.currentExerciseIndex + 1, prev.exercises.length - 1);
      if (next !== prev.currentExerciseIndex) {
        announceExerciseStart(prev.exercises[next].name);
      }
      return { ...prev, currentExerciseIndex: next };
    });
  }, [clearRestTimer]);

  const previousExercise = useCallback(() => {
    clearRestTimer();
    setActiveSession(prev => {
      if (!prev) return null;
      const next = Math.max(prev.currentExerciseIndex - 1, 0);
      return { ...prev, currentExerciseIndex: next };
    });
  }, [clearRestTimer]);

  const finishSession = useCallback(() => {
    clearElapsedTimer();
    clearRestTimer();
    stopSpeaking();

    setActiveSession(prev => {
      if (!prev) return null;

      const durationSec = Math.floor((Date.now() - prev.startedAt.getTime()) / 1000);
      const mins = Math.floor(durationSec / 60);
      const secs = durationSec % 60;
      const durationStr = mins > 0 ? `${mins} minutes and ${secs} seconds` : `${secs} seconds`;
      announceWorkoutComplete(durationStr);

      const totalSets = prev.exercises.reduce((sum, ex) => sum + ex.completedSets.length, 0);
      const completedSetsCount = prev.exercises.reduce((sum, ex) => sum + ex.completedSets.filter(Boolean).length, 0);

      const workoutData = {
        programId: prev.programId,
        programTitle: prev.programTitle,
        sessionTitle: prev.sessionTitle,
        duration: durationSec,
        exercisesCompleted: prev.exercises.length,
        totalSets,
        completedSets: completedSetsCount,
        exercises: prev.exercises.map(ex => ({
          name: ex.name,
          sets: ex.actualSets ?? ex.sets,
          reps: ex.actualReps ?? ex.reps,
          completedSets: ex.completedSets,
        })),
      };

      // Persist session to backend
      if (prev.backendSessionId) {
        apiFinishSession(prev.backendSessionId, workoutData).catch(() => {
          if (__DEV__) console.log('[Session] Backend session finish failed');
        });
      }

      // Navigate to log-workout with session data (deferred to avoid setState-during-render)
      setTimeout(() => {
        router.replace({
          pathname: '/workout/log-workout',
          params: {
            mode: 'post-session',
            sessionData: JSON.stringify(workoutData),
          },
        });
      }, 0);

      return null; // Clear the active session
    });
  }, [clearElapsedTimer, clearRestTimer]);

  return (
    <SessionContext.Provider
      value={{
        activeSession,
        elapsedTime,
        restTimeRemaining,
        startSession,
        pauseSession,
        resumeSession,
        completeSet,
        updateExerciseValues,
        nextExercise,
        previousExercise,
        startRestTimer,
        skipRest,
        finishSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};
