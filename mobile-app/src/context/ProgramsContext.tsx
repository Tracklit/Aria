import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  getPrograms as apiGetPrograms,
  createProgram as apiCreateProgram,
  updateProgram as apiUpdateProgram,
  deleteProgram as apiDeleteProgram,
  uploadProgramFile as apiUploadFile,
  importGoogleSheet as apiImportSheet,
  generateProgram as apiGenerateProgram,
} from '../lib/api';

export interface ProgramSession {
  id: number;
  programId: number;
  dayNumber: number;
  title?: string | null;
  description?: string | null;
  exercises?: Array<{
    name: string;
    sets?: number;
    reps?: string;
    duration?: number;
    rest?: number;
    notes?: string;
  }> | null;
  isRestDay?: boolean;
  isCompleted?: boolean;
}

export interface Program {
  id: number;
  userId: number;
  title: string;
  description?: string | null;
  category?: string | null;
  level?: string | null;
  duration?: number | null;
  totalSessions?: number | null;
  visibility?: string | null;
  isUploadedProgram?: boolean;
  programFileUrl?: string | null;
  programFileType?: string | null;
  importedFromSheet?: boolean;
  googleSheetUrl?: string | null;
  isTextBased?: boolean;
  textContent?: string | null;
  generatedBy?: string | null;
  status?: string | null;
  sessions?: ProgramSession[];
  createdAt?: string;
  updatedAt?: string;
}

interface ProgramsState {
  programs: Program[];
  isLoading: boolean;
  error: string | null;
}

interface ProgramsContextType extends ProgramsState {
  fetchPrograms: () => Promise<void>;
  createProgram: (data: Partial<Program>) => Promise<Program>;
  updateProgram: (id: number, data: Partial<Program>) => Promise<void>;
  deleteProgram: (id: number) => Promise<void>;
  uploadProgram: (formData: FormData) => Promise<Program>;
  importSheet: (data: { title: string; googleSheetUrl: string; description?: string }) => Promise<Program>;
  generateProgram: (input: any) => Promise<Program>;
}

const ProgramsContext = createContext<ProgramsContextType | undefined>(undefined);

const MOCK_PROGRAMS: Program[] = [
  {
    id: 9001,
    userId: 1,
    title: '100m Sprint Prep',
    description: 'Elite-level 8-week program targeting 100m race preparation. Covers block starts, acceleration, max velocity, and speed endurance phases.',
    category: 'sprint',
    level: 'elite',
    duration: 8,
    totalSessions: 32,
    visibility: 'private',
    generatedBy: 'ai',
    status: 'active',
    createdAt: '2026-02-01T10:00:00Z',
    updatedAt: '2026-02-28T09:00:00Z',
    sessions: [
      {
        id: 9101,
        programId: 9001,
        dayNumber: 1,
        title: 'Block Starts & Drive Phase',
        description: 'Focus on explosive starts and first 30m acceleration.',
        isRestDay: false,
        isCompleted: true,
        exercises: [
          { name: 'Block Start Drills', sets: 6, reps: '1 x 30m', rest: 180, notes: 'Full recovery between reps. Focus on shin angles.' },
          { name: 'A-Skip to Sprint', sets: 4, reps: '1 x 40m', rest: 120, notes: 'Transition from drill to full sprint at 20m mark.' },
          { name: 'Sled Pulls (Light)', sets: 4, reps: '1 x 25m', rest: 150, notes: '10% bodyweight on sled. Maintain forward lean.' },
        ],
      },
      {
        id: 9102,
        programId: 9001,
        dayNumber: 2,
        title: 'Speed Endurance',
        description: 'Build lactate tolerance and maintain form under fatigue.',
        isRestDay: false,
        isCompleted: true,
        exercises: [
          { name: 'Flying 60m Sprints', sets: 5, reps: '1 x 60m', rest: 300, notes: '20m build-up zone, 60m at 95% effort.' },
          { name: 'Tempo Runs', sets: 6, reps: '1 x 200m', rest: 120, notes: '70% effort. Focus on relaxation and form.' },
        ],
      },
      {
        id: 9103,
        programId: 9001,
        dayNumber: 3,
        title: 'Recovery Day',
        description: 'Light movement, foam rolling, and stretching.',
        isRestDay: true,
        isCompleted: true,
        exercises: null,
      },
      {
        id: 9104,
        programId: 9001,
        dayNumber: 4,
        title: 'Acceleration Drills',
        description: 'Improve first-step quickness and drive phase mechanics.',
        isRestDay: false,
        isCompleted: false,
        exercises: [
          { name: 'Wall Drives', sets: 4, reps: '8 each leg', rest: 60, notes: 'Maintain 45-degree body angle.' },
          { name: 'Falling Starts', sets: 6, reps: '1 x 20m', rest: 120, notes: 'Lean forward and explode on first step.' },
          { name: 'Wicket Runs', sets: 4, reps: '1 x 40m', rest: 150, notes: 'Mini-hurdles at stride length. Focus on hip height.' },
        ],
      },
      {
        id: 9105,
        programId: 9001,
        dayNumber: 5,
        title: 'Tempo Runs & Core',
        description: 'Aerobic conditioning with core stability work.',
        isRestDay: false,
        isCompleted: false,
        exercises: [
          { name: 'Tempo 100m Repeats', sets: 8, reps: '1 x 100m', rest: 90, notes: '65-70% effort. Walk back recovery.' },
          { name: 'Core Circuit', sets: 3, reps: '10 each', duration: 600, rest: 60, notes: 'Planks, dead bugs, bird dogs, pallof press.' },
        ],
      },
    ],
  },
  {
    id: 9002,
    userId: 1,
    title: 'Pre-Season Strength',
    description: 'Build a strength foundation for the upcoming sprint season. Progressive overload focused on posterior chain and explosive power.',
    category: 'strength',
    level: 'intermediate',
    duration: 6,
    totalSessions: 24,
    visibility: 'private',
    generatedBy: 'user',
    status: 'active',
    createdAt: '2026-01-15T08:00:00Z',
    updatedAt: '2026-02-10T12:00:00Z',
  },
  {
    id: 9003,
    userId: 1,
    title: 'Flexibility & Recovery',
    description: 'Comprehensive mobility and recovery program. Includes dynamic stretching, yoga flows, and foam rolling protocols for sprint athletes.',
    category: 'flexibility',
    level: 'beginner',
    duration: 4,
    totalSessions: 20,
    visibility: 'public',
    isUploadedProgram: true,
    programFileType: 'pdf',
    generatedBy: 'user',
    status: 'active',
    createdAt: '2025-12-20T07:30:00Z',
    updatedAt: '2026-01-05T09:00:00Z',
  },
  {
    id: 9004,
    userId: 1,
    title: '200m Race Sharpener',
    description: 'Short peaking block for 200m specialists. Focus on speed endurance, curve running technique, and race-specific conditioning.',
    category: 'sprint',
    level: 'advanced',
    duration: 3,
    totalSessions: 15,
    visibility: 'private',
    importedFromSheet: true,
    generatedBy: 'ai',
    status: 'active',
    createdAt: '2026-02-18T11:00:00Z',
    updatedAt: '2026-02-25T15:30:00Z',
  },
];

export const ProgramsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ProgramsState>({
    programs: MOCK_PROGRAMS,
    isLoading: false,
    error: null,
  });

  const fetchPrograms = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const programs = await apiGetPrograms();
      const fetched = programs as Program[];
      setState(prev => ({
        ...prev,
        programs: fetched.length > 0 ? fetched : prev.programs,
        isLoading: false,
      }));
    } catch (error: any) {
      // Keep mock data on failure — don't clear programs
      setState(prev => ({ ...prev, isLoading: false, error: error.message }));
    }
  }, []);

  const createProgram = useCallback(async (data: Partial<Program>): Promise<Program> => {
    const program = await apiCreateProgram(data) as Program;
    setState(prev => ({ ...prev, programs: [program, ...prev.programs] }));
    return program;
  }, []);

  const updateProgram = useCallback(async (id: number, data: Partial<Program>) => {
    const updated = await apiUpdateProgram(id, data) as Program;
    setState(prev => ({
      ...prev,
      programs: prev.programs.map(p => p.id === id ? updated : p),
    }));
  }, []);

  const deleteProgram = useCallback(async (id: number) => {
    await apiDeleteProgram(id);
    setState(prev => ({
      ...prev,
      programs: prev.programs.filter(p => p.id !== id),
    }));
  }, []);

  const uploadProgram = useCallback(async (formData: FormData): Promise<Program> => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const program = await apiUploadFile(formData) as Program;
      setState(prev => ({ ...prev, programs: [program, ...prev.programs], isLoading: false }));
      return program;
    } catch (error: any) {
      setState(prev => ({ ...prev, isLoading: false, error: error.message }));
      throw error;
    }
  }, []);

  const importSheet = useCallback(async (data: { title: string; googleSheetUrl: string; description?: string }): Promise<Program> => {
    const program = await apiImportSheet(data) as Program;
    setState(prev => ({ ...prev, programs: [program, ...prev.programs] }));
    return program;
  }, []);

  const generateProgram = useCallback(async (input: any): Promise<Program> => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const program = await apiGenerateProgram(input) as Program;
      setState(prev => ({ ...prev, programs: [program, ...prev.programs], isLoading: false }));
      return program;
    } catch (error: any) {
      setState(prev => ({ ...prev, isLoading: false, error: error.message }));
      throw error;
    }
  }, []);

  return (
    <ProgramsContext.Provider value={{ ...state, fetchPrograms, createProgram, updateProgram, deleteProgram, uploadProgram, importSheet, generateProgram }}>
      {children}
    </ProgramsContext.Provider>
  );
};

export const usePrograms = () => {
  const context = useContext(ProgramsContext);
  if (!context) {
    throw new Error('usePrograms must be used within a ProgramsProvider');
  }
  return context;
};
