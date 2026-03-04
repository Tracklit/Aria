import React, { createContext, useContext, useState, useRef, useCallback, ReactNode } from 'react';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

interface Exercise {
  name: string;
  sets?: number;
  reps?: number | string;
  rest?: number;
}

interface SessionExercise extends Exercise {
  completedSets: boolean[];
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
}

interface SessionContextType {
  activeSession: LiveSession | null;
  elapsedTime: number;
  restTimeRemaining: number | null;
  startSession: (programId: number, programTitle: string, sessionTitle: string, exercises: Exercise[]) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  completeSet: (exerciseIndex: number, setIndex: number) => void;
  nextExercise: () => void;
  previousExercise: () => void;
  startRestTimer: (seconds: number) => void;
  skipRest: () => void;
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

  const startSession = useCallback((programId: number, programTitle: string, sessionTitle: string, exercises: Exercise[]) => {
    clearElapsedTimer();
    clearRestTimer();

    const sessionExercises: SessionExercise[] = exercises.map(ex => ({
      ...ex,
      completedSets: Array(ex.sets || 1).fill(false),
    }));

    const now = new Date();
    pausedRef.current = false;

    setActiveSession({
      programId,
      programTitle,
      sessionTitle,
      exercises: sessionExercises,
      currentExerciseIndex: 0,
      startedAt: now,
      isPaused: false,
      isComplete: false,
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
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearRestTimer]);

  const skipRest = useCallback(() => {
    clearRestTimer();
  }, [clearRestTimer]);

  const completeSet = useCallback((exerciseIndex: number, setIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setActiveSession(prev => {
      if (!prev) return null;
      const exercises = prev.exercises.map((ex, i) => {
        if (i !== exerciseIndex) return ex;
        const completedSets = [...ex.completedSets];
        completedSets[setIndex] = !completedSets[setIndex];
        return { ...ex, completedSets };
      });

      const currentEx = exercises[exerciseIndex];
      const allDone = currentEx.completedSets.every(Boolean);
      if (allDone && currentEx.rest && currentEx.rest > 0) {
        // Auto-start rest timer when all sets complete
        setTimeout(() => startRestTimer(currentEx.rest!), 100);
      }

      return { ...prev, exercises };
    });
  }, [startRestTimer]);

  const nextExercise = useCallback(() => {
    clearRestTimer();
    setActiveSession(prev => {
      if (!prev) return null;
      const next = Math.min(prev.currentExerciseIndex + 1, prev.exercises.length - 1);
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
    setActiveSession(prev => prev ? { ...prev, isComplete: true } : null);
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
