import React, { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './AuthContext';
import { WorkoutProvider } from './WorkoutContext';
import { ChatProvider } from './ChatContext';
import { DashboardProvider } from './DashboardContext';
import { NutritionProvider } from './NutritionContext';
import { ProgramsProvider } from './ProgramsContext';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const AppProviders: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WorkoutProvider>
          <ChatProvider>
            <DashboardProvider>
              <NutritionProvider>
                <ProgramsProvider>
                  {children}
                </ProgramsProvider>
              </NutritionProvider>
            </DashboardProvider>
          </ChatProvider>
        </WorkoutProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};
