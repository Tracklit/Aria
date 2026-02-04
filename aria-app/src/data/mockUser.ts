// Mock user data for development/demo purposes
// These use a simplified structure for UI display

export interface MockUser {
  name: string;
  email: string;
  sport: 'track' | 'cycling' | 'swimming';
  goal: 'speed' | 'endurance' | 'recovery';
  avatarUri?: string;
}

export const mockUser: MockUser = {
  name: 'Alex Johnson',
  email: 'alex.johnson@email.com',
  sport: 'track',
  goal: 'speed',
  avatarUri: undefined,
};

export const mockYessica: MockUser = {
  name: 'Yessica',
  email: 'yessica@email.com',
  sport: 'track',
  goal: 'speed',
  avatarUri: undefined,
};
