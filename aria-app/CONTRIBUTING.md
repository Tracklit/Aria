# Contributing to Aria

Thank you for your interest in contributing to Aria! This document provides guidelines and best practices for contributing to the project.

---

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Code Style](#code-style)
5. [Best Practices](#best-practices)
6. [Component Guidelines](#component-guidelines)
7. [State Management](#state-management)
8. [Testing](#testing)
9. [Documentation](#documentation)
10. [Pull Request Process](#pull-request-process)

---

## Code of Conduct

### Our Pledge

We are committed to providing a friendly, safe, and welcoming environment for all contributors, regardless of experience level, gender identity, sexual orientation, disability, ethnicity, religion, or similar personal characteristics.

### Our Standards

**Examples of behavior that contributes to a positive environment:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

**Examples of unacceptable behavior:**
- Trolling, insulting/derogatory comments, and personal or political attacks
- Public or private harassment
- Publishing others' private information without explicit permission
- Other conduct which could reasonably be considered inappropriate

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Git
- iOS Simulator (Mac) or Android Emulator
- Code editor (VS Code recommended)

### Setup

1. **Fork the repository**
   ```bash
   # On GitHub, click "Fork" button
   ```

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/aria.git
   cd aria
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/original/aria.git
   ```

4. **Install dependencies**
   ```bash
   npm install
   ```

5. **Create environment file**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

6. **Start development server**
   ```bash
   npm start
   ```

---

## Development Workflow

### Branching Strategy

We use Git Flow:

```
main (production)
  ↓
develop (integration)
  ↓
feature/* (new features)
bugfix/* (bug fixes)
hotfix/* (urgent fixes)
```

### Creating a Feature Branch

```bash
# Update develop branch
git checkout develop
git pull upstream develop

# Create feature branch
git checkout -b feature/awesome-feature

# Make changes and commit
git add .
git commit -m "Add awesome feature"

# Push to your fork
git push origin feature/awesome-feature

# Create pull request on GitHub
```

### Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding/updating tests
- `chore`: Maintenance tasks

**Examples:**
```bash
feat(dashboard): add dynamic card rendering

Implement DashboardCard component that renders different card types
based on dashboard state. Supports workout, insight, competition,
streak, and stats card types.

Closes #123

---

fix(chat): prevent message duplication on retry

When streaming fails and fallback is triggered, messages were being
duplicated. Added check to prevent duplicate messages.

Fixes #456

---

docs(readme): update installation instructions

Add section on environment variable setup and clarify prerequisites.
```

---

## Code Style

### TypeScript

**✅ DO:**
```typescript
// Use explicit types
interface UserProfile {
  displayName: string;
  photoUrl: string | null;
  sport: 'running' | 'cycling' | 'swimming';
}

// Use const for constants
const MAX_RETRY_ATTEMPTS = 3;

// Use descriptive variable names
const isUserAuthenticated = checkAuthStatus();

// Use optional chaining
const userName = user?.profile?.displayName ?? 'Athlete';

// Use type guards
function isWorkout(obj: any): obj is Workout {
  return obj && typeof obj.id === 'number' && typeof obj.type === 'string';
}
```

**❌ DON'T:**
```typescript
// Don't use 'any' unless absolutely necessary
function processData(data: any) { } // BAD

// Don't use var
var count = 0; // BAD - use const/let

// Don't use abbreviations
const usrNm = getUserName(); // BAD

// Don't ignore TypeScript errors
// @ts-ignore
someFunction(); // AVOID
```

---

### React/React Native

**✅ DO:**
```typescript
// Use functional components
export const MyComponent: React.FC<Props> = ({ prop1, prop2 }) => {
  return <View>{/* ... */}</View>;
};

// Use hooks appropriately
const [state, setState] = useState(initialValue);
const memoizedValue = useMemo(() => computeValue(), [dependency]);
const callback = useCallback(() => { }, [dependency]);

// Destructure props
export const Avatar: React.FC<AvatarProps> = ({ uri, size, style }) => {
  // ...
};

// Use early returns
if (!data) {
  return <LoadingSpinner />;
}

return <DataView data={data} />;
```

**❌ DON'T:**
```typescript
// Don't use class components (unless necessary)
class MyComponent extends React.Component { } // AVOID

// Don't create components inside components
function Parent() {
  function Child() { } // BAD
  return <Child />;
}

// Don't use inline functions in JSX (performance)
<Button onPress={() => handlePress()} /> // OK for small components
// Better:
const handleButtonPress = useCallback(() => handlePress(), []);
<Button onPress={handleButtonPress} />
```

---

### File Organization

```
src/
├── components/
│   ├── ui/              # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   └── index.ts     # Export all UI components
│   └── features/        # Feature-specific components
│       ├── DashboardCard.tsx
│       └── index.ts
├── context/            # React Context providers
│   ├── AuthContext.tsx
│   └── index.ts
├── lib/                # Utilities and helpers
│   ├── api.ts
│   ├── cache.ts
│   └── retry.ts
├── theme/              # Design system
│   ├── colors.ts
│   ├── typography.ts
│   └── index.ts
└── types/              # TypeScript types
    ├── api.ts
    └── index.ts
```

**File Naming:**
- Components: `PascalCase.tsx` (e.g., `DashboardCard.tsx`)
- Utilities: `camelCase.ts` (e.g., `retry.ts`)
- Types: `camelCase.ts` (e.g., `api.ts`)
- Contexts: `PascalCase.tsx` (e.g., `AuthContext.tsx`)

---

## Best Practices

### Performance

**✅ DO:**
```typescript
// Memoize expensive computations
const sortedData = useMemo(
  () => data.sort((a, b) => a.timestamp - b.timestamp),
  [data]
);

// Memoize callbacks
const handlePress = useCallback(() => {
  doSomething(id);
}, [id]);

// Use React.memo for expensive components
export const ExpensiveComponent = React.memo<Props>(({ data }) => {
  return <View>{/* ... */}</View>;
});

// Lazy load images
import FastImage from 'react-native-fast-image';

<FastImage
  source={{ uri: imageUrl, priority: FastImage.priority.normal }}
  resizeMode={FastImage.resizeMode.cover}
/>

// Virtualize long lists
import { FlatList } from 'react-native';

<FlatList
  data={items}
  renderItem={({ item }) => <Item data={item} />}
  keyExtractor={(item) => item.id.toString()}
  initialNumToRender={10}
  maxToRenderPerBatch={10}
  windowSize={5}
/>
```

---

### Error Handling

**✅ DO:**
```typescript
// Use try-catch for async operations
async function loadData() {
  try {
    const data = await apiRequest('/api/data');
    return data;
  } catch (error) {
    console.error('Failed to load data:', error);
    // Show user-friendly error
    ToastManager.error('Failed to load data. Please try again.');
    throw error;
  }
}

// Use error boundaries for component errors
<ErrorBoundary>
  <MyComponent />
</ErrorBoundary>

// Provide fallback UI
if (error) {
  return (
    <View style={styles.errorContainer}>
      <Text>Something went wrong</Text>
      <Button onPress={retry}>Try Again</Button>
    </View>
  );
}
```

---

### Accessibility

**✅ DO:**
```typescript
// Add accessibility labels
<TouchableOpacity
  accessible={true}
  accessibilityLabel="Close dialog"
  accessibilityRole="button"
  onPress={onClose}
>
  <Text>Close</Text>
</TouchableOpacity>

// Provide text alternatives for images
<Image
  source={{ uri: imageUrl }}
  accessible={true}
  accessibilityLabel="User profile picture"
/>

// Use semantic HTML elements (web)
<Button>Click me</Button> // Not <div onClick={}>

// Test with screen reader
// iOS: Settings → Accessibility → VoiceOver
// Android: Settings → Accessibility → TalkBack
```

---

## Component Guidelines

### Component Structure

```typescript
// 1. Imports
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../../context';
import { colors, typography, spacing } from '../../theme';

// 2. Types
interface MyComponentProps {
  title: string;
  onPress?: () => void;
  style?: ViewStyle;
}

// 3. Component
export const MyComponent: React.FC<MyComponentProps> = ({ title, onPress, style }) => {
  // 4. Hooks
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // 5. Effects
  useEffect(() => {
    // Side effects
  }, []);

  // 6. Handlers
  const handlePress = () => {
    setIsLoading(true);
    onPress?.();
  };

  // 7. Early returns
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // 8. Render
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
};

// 9. Styles
const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    backgroundColor: colors.background.cardSolid,
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
  },
});
```

---

### Component Naming

**✅ DO:**
```typescript
// Use descriptive names
<DashboardCard />
<ProfileAvatar />
<WorkoutList />

// Use consistent prefixes
<LoginButton />
<LoginForm />
<LoginScreen />
```

**❌ DON'T:**
```typescript
// Don't use generic names
<Component1 />
<MyThing />
<Stuff />

// Don't use abbreviations
<DashCrd />
<ProfAv />
```

---

## State Management

### Context API

**✅ DO:**
```typescript
// Create context with proper types
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (credentials: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provide context at appropriate level
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>(initialState);

  // Memoize context value
  const value = useMemo(
    () => ({
      ...state,
      login,
      logout,
    }),
    [state, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Create custom hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

---

### Local State

**✅ DO:**
```typescript
// Use local state for UI state
const [isOpen, setIsOpen] = useState(false);
const [searchTerm, setSearchTerm] = useState('');

// Use useReducer for complex state
const [state, dispatch] = useReducer(reducer, initialState);

// Lift state up when needed
// If multiple components need the same state, lift to common parent
```

---

## Testing

### Unit Tests

```typescript
// MyComponent.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    const { getByText } = render(<MyComponent title="Test" />);
    expect(getByText('Test')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(<MyComponent title="Test" onPress={onPress} />);

    fireEvent.press(getByText('Test'));
    expect(onPress).toHaveBeenCalled();
  });

  it('shows loading state', () => {
    const { getByTestId } = render(<MyComponent title="Test" isLoading={true} />);
    expect(getByTestId('loading-spinner')).toBeTruthy();
  });
});
```

---

### Integration Tests

```typescript
// AuthContext.test.tsx
import { renderHook, act } from '@testing-library/react-hooks';
import { AuthProvider, useAuth } from './AuthContext';

describe('AuthContext', () => {
  it('logs in successfully', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await act(async () => {
      await result.current.login({ username: 'test', password: 'test' });
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toBeDefined();
  });
});
```

---

## Documentation

### Code Comments

**✅ DO:**
```typescript
/**
 * Uploads a profile picture to Azure Blob Storage
 * @param imageUri - Local file URI from image picker
 * @returns Promise resolving to Azure Blob URL
 * @throws Error if upload fails or image is invalid
 */
export async function uploadProfilePicture(imageUri: string): Promise<string> {
  // Compress image to 400x400, 70% quality
  const compressed = await compressImage(imageUri);

  // Upload to Azure Blob Storage
  const url = await uploadToBlob(compressed);

  return url;
}

// Complex logic needs explanation
// Calculate training load using TRIMP method
// (Heart Rate Reserve × Session Duration × Intensity Factor)
const trainingLoad = (hrr * duration * intensityFactor) / 60;
```

**❌ DON'T:**
```typescript
// Don't state the obvious
const x = 5; // Set x to 5

// Don't leave commented-out code
// function oldFunction() {
//   // ...
// }

// Don't use comments instead of refactoring
function doStuff() {
  // First do this
  // Then do that
  // Finally do this other thing
}
```

---

### README Updates

When adding features, update:
- `README.md` - General information
- `API_DOCUMENTATION.md` - API changes
- `TESTING_CHECKLIST.md` - New test cases
- `DEPLOYMENT.md` - Deployment changes (if applicable)

---

## Pull Request Process

### Before Submitting

1. **Test your changes**
   ```bash
   npm test
   npm run type-check
   npm run lint
   ```

2. **Update documentation**
   - Add/update JSDoc comments
   - Update README if needed
   - Add/update tests

3. **Check formatting**
   ```bash
   npm run format
   ```

4. **Rebase on latest develop**
   ```bash
   git fetch upstream
   git rebase upstream/develop
   ```

---

### PR Template

```markdown
## Description
Brief description of what this PR does.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Changes Made
- Added DashboardCard component
- Implemented dynamic card rendering
- Added unit tests for card types

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Tested on iOS
- [ ] Tested on Android
- [ ] Tested manually

## Screenshots (if applicable)
[Add screenshots here]

## Related Issues
Closes #123
Relates to #456

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings
- [ ] Tests added/updated
- [ ] All tests passing
```

---

### Review Process

1. **Automated Checks**
   - CI/CD pipeline runs
   - Type checking passes
   - Linting passes
   - Tests pass

2. **Code Review**
   - At least 1 approval required
   - Address all comments
   - Update PR based on feedback

3. **Merge**
   - Squash and merge (for feature branches)
   - Merge commit (for release branches)

---

## Questions?

- **General Questions**: Open a [Discussion](https://github.com/aria/discussions)
- **Bug Reports**: Open an [Issue](https://github.com/aria/issues)
- **Feature Requests**: Open an [Issue](https://github.com/aria/issues)
- **Security Issues**: Email security@aria.app

---

## Recognition

Contributors will be recognized in:
- `CONTRIBUTORS.md` file
- Release notes
- Project website (if applicable)

---

Thank you for contributing to Aria! 🎉

Together, we're building the best AI-powered training app for athletes!
