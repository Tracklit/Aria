import React, { createContext, useContext, useState, ReactNode } from 'react';
import { mockUser, MockUser } from '../data';

// Legacy UserContext for backward compatibility with components using mock data
// For real authentication, use AuthContext instead
interface UserContextType {
  user: MockUser;
  updateUser: (data: Partial<MockUser>) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<MockUser>(mockUser);

  const updateUser = (data: Partial<MockUser>) => {
    setUser((prev) => ({ ...prev, ...data }));
  };

  return (
    <UserContext.Provider value={{ user, updateUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
