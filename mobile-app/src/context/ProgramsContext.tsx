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

export const ProgramsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ProgramsState>({
    programs: [],
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
        programs: fetched,
        isLoading: false,
      }));
    } catch (error: any) {
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
