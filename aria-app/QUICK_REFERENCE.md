# Quick Reference Card

Essential commands and information for Aria development.

---

## 🚀 Quick Start

```bash
# Clone & setup
git clone <repo-url> && cd aria
npm install
cp .env.example .env  # Edit with your config

# Start development
npm start              # Start Expo dev server
npm run ios           # Run on iOS simulator
npm run android       # Run on Android emulator

# Backend
npm run dev:server    # Start Aria backend (port 3000)
```

---

## 📝 Essential Commands

### Development
```bash
npm start             # Start Expo dev server
npm start -- --clear  # Clear cache and start
npm run ios          # Run on iOS
npm run android      # Run on Android
npm run web          # Run web version
```

### Code Quality
```bash
npm run type-check   # TypeScript type checking
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
npm test             # Run tests (when implemented)
```

### Build & Deploy
```bash
eas build --platform ios --profile production    # Build iOS
eas build --platform android --profile production # Build Android
eas submit --platform all --profile production    # Submit to stores
```

### Debugging
```bash
npx expo start -c                    # Clear cache
npx react-native log-ios            # iOS logs
npx react-native log-android        # Android logs
watchman watch-del-all              # Reset watchman
```

---

## 🔑 Environment Variables

```env
# .env file
API_BASE_URL=https://app-tracklit-prod-tnrusd.azurewebsites.net
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql://...
AZURE_STORAGE_CONNECTION_STRING=...
```

---

## 📁 Project Structure

```
aria/
├── app/                # Expo Router screens
│   ├── (tabs)/        # Bottom tabs (dashboard, plan, chat, more)
│   ├── auth/          # Login, register
│   ├── onboarding/    # First-time setup
│   └── workout/       # Workout tracking
├── src/
│   ├── components/    # Reusable components
│   ├── context/       # React Context (Auth, Chat, Dashboard, Workout)
│   ├── lib/           # Utilities (api, cache, retry, analytics)
│   ├── theme/         # Design system (colors, typography, spacing)
│   └── types/         # TypeScript types
└── server/            # Aria backend (Express)
```

---

## 🎯 Key Files

### Most Important
- `src/lib/api.ts` - API client (150+ lines of utilities)
- `src/context/AuthContext.tsx` - Authentication state
- `src/context/DashboardContext.tsx` - Dashboard state
- `app/(tabs)/dashboard.tsx` - Main dashboard UI

### Configuration
- `.env` - Environment variables
- `app.json` - Expo configuration
- `eas.json` - EAS Build configuration
- `package.json` - Dependencies

---

## 🔐 Authentication

### Login
```typescript
import { useAuth } from './src/context';

const { login, isAuthenticated, user } = useAuth();

await login({ username: 'athlete', password: 'password' });
```

### Token Management
```typescript
import { getToken, setToken, clearAuthStorage } from './src/lib/tokenStorage';

const token = await getToken();
await setToken(newToken);
await clearAuthStorage(); // On logout
```

---

## 💬 Chat

### Send Message
```typescript
import { useChat } from './src/context';

const { sendMessage, messages, isStreaming } = useChat();

await sendMessage('What\'s a good warmup?', true); // streaming=true
```

### Stream Format
```typescript
// SSE Response
data: {"chunk": "A good "}
data: {"chunk": "warmup "}
data: [DONE]
```

---

## 📊 Dashboard

### Load Dashboard
```typescript
import { useDashboard } from './src/context';

const { mode, cards, isLoading, loadDashboard } = useDashboard();

useEffect(() => {
  loadDashboard();
}, []);
```

### Dashboard Modes
- `general` - Default
- `workout_ready` - Workout today
- `competition_day` - Race soon
- `recovery_focus` - High load
- `rest_day` - Rest day

### Card Types
- `workout_card` - Today's workout
- `competition_card` - Race countdown
- `insight_card` - AI insights
- `streak_card` - Milestones
- `stats_row` - Weekly stats

---

## 🎨 Styling

### Colors
```typescript
import { colors } from './src/theme';

colors.primary       // #0A84FF
colors.teal         // #30D5C8
colors.green        // #32D74B
colors.red          // #FF453A
colors.yellow       // #FFD60A
colors.orange       // #FF9F0A

colors.background.primary    // Dark
colors.text.primary          // White
```

### Typography
```typescript
import { typography } from './src/theme';

typography.display   // 48px
typography.h1       // 32px
typography.h2       // 24px
typography.h3       // 20px
typography.body     // 16px
typography.caption  // 14px
```

### Spacing
```typescript
import { spacing } from './src/theme';

spacing.xs   // 4px
spacing.sm   // 8px
spacing.md   // 16px
spacing.lg   // 24px
spacing.xl   // 32px
```

---

## 🛠️ Utilities

### Cache
```typescript
import { cache, CacheTTL } from './src/lib/cache';

cache.set('key', data, CacheTTL.MEDIUM); // 5 min
const data = cache.get('key');
cache.delete('key');
```

### Retry
```typescript
import { retryWithBackoff } from './src/lib/retry';

const result = await retryWithBackoff(
  () => apiRequest('/api/endpoint'),
  { maxRetries: 3, baseDelay: 1000 }
);
```

### Analytics
```typescript
import { AnalyticsEvents } from './src/lib/analytics';

AnalyticsEvents.dashboardViewed('workout_ready', 5);
AnalyticsEvents.chatMessageSent(150, true);
AnalyticsEvents.workoutCompleted('Easy Run', 1800, 5.2);
```

### Performance
```typescript
import { Performance } from './src/lib/performance';

await Performance.trackAPI('/api/dashboard', async () => {
  return await getDashboardState();
});

Performance.logSummary(); // View stats
```

---

## 📱 UI Components

### Toast Notifications
```typescript
import { ToastManager } from './src/components/Toast';

ToastManager.success('Profile updated!');
ToastManager.error('Upload failed');
ToastManager.warning('Low battery');
ToastManager.info('New message');
```

### Error Boundary
```typescript
import { ErrorBoundary } from './src/components/ErrorBoundary';

<ErrorBoundary>
  <MyComponent />
</ErrorBoundary>
```

### Skeleton Loader
```typescript
import { SkeletonCard } from './src/components/ui/SkeletonLoader';

{isLoading ? <SkeletonCard /> : <ActualCard data={data} />}
```

---

## 🔌 API Endpoints

### Base URL
```
https://app-tracklit-prod-tnrusd.azurewebsites.net
```

### Key Endpoints
```
POST   /api/mobile/login             # Login
POST   /api/mobile/register          # Register
GET    /api/user                     # Get current user
POST   /api/user/public-profile      # Upload profile pic
GET    /api/dashboard/state          # Get dashboard
POST   /api/sprinthia/chat           # Send message
GET    /api/sprinthia/conversations  # List conversations
GET    /api/workouts                 # List workouts
POST   /api/workouts                 # Create workout
```

---

## 🐛 Common Issues

### "Network request failed"
```bash
# Check API URL in .env
# Verify backend is running
# Check firewall/VPN settings
```

### "Module not found"
```bash
npm install            # Reinstall dependencies
npm start -- --clear   # Clear cache
```

### "Unable to resolve module"
```bash
watchman watch-del-all  # Reset watchman
npm start -- --clear    # Clear metro cache
```

### Images not loading
```bash
# Check image URL format
# Clear image cache
# Verify Azure Blob Storage URL
```

---

## 📚 Documentation

| Guide | Purpose |
|-------|---------|
| [README.md](README.md) | Project overview |
| [TESTING_CHECKLIST.md](TESTING_CHECKLIST.md) | Testing guide |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | Debug issues |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Deploy to production |
| [API_DOCUMENTATION.md](API_DOCUMENTATION.md) | API reference |
| [SECURITY.md](SECURITY.md) | Security guidelines |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contribution guide |
| [PROGRESS_SUMMARY.md](PROGRESS_SUMMARY.md) | Session summary |

---

## 🎯 Testing Checklist

### Manual Tests
- [ ] Login with real credentials
- [ ] Upload profile picture
- [ ] Send chat message (streaming)
- [ ] Load dashboard from backend
- [ ] Pull-to-refresh dashboard
- [ ] Toast notifications work
- [ ] Complete a workout

### Performance
- [ ] Dashboard loads < 2s
- [ ] Chat streaming < 500ms first token
- [ ] Profile upload < 5s
- [ ] Cache reduces load time

---

## 🚨 Emergency Reset

```bash
# Nuclear option - reset everything
rm -rf node_modules package-lock.json
rm -rf ios/Pods ios/build
rm -rf android/build
rm -rf .expo

npm install
cd ios && pod install && cd ..
npm start -- --clear
```

---

## 📞 Support

- **Docs**: See README and guides
- **Issues**: Check TROUBLESHOOTING.md first
- **Security**: security@aria.app
- **Help**: support@aria.app

---

## 💡 Pro Tips

1. **Use Demo Mode** for UI development (no backend needed)
2. **Check console logs** - most errors show there
3. **Clear cache** if things seem broken (`npm start -- --clear`)
4. **Read error messages** - they're usually helpful
5. **Test on real device** - simulators can lie
6. **Use TypeScript** - catch errors early
7. **Profile performance** - don't guess, measure
8. **Write tests** - future you will thank you

---

**Quick Reference v1.0** | Last Updated: Feb 3, 2026

For detailed information, see the full documentation guides.
