# Aria - AI-Powered Athletic Training App

Aria is a React Native mobile application that provides AI-powered coaching, dynamic dashboards, and personalized training insights for athletes. Built with Expo and TypeScript, Aria connects to the TrackLitRN production backend to deliver a seamless training experience.

## 🌟 Key Features

### Phase 1 (Completed)
- ✅ **Dynamic Dashboard** - Context-aware insights that adapt based on your training state
- ✅ **AI Chat with Streaming** - Real-time responses from your AI coach using Server-Sent Events
- ✅ **Profile Management** - Upload profile pictures to Azure Blob Storage
- ✅ **Training Plans** - View and follow personalized training plans
- ✅ **Workout Tracking** - Track workouts with real-time metrics
- ✅ **Error Handling** - Production-ready error boundaries and toast notifications
- ✅ **Performance Optimization** - Caching, retry logic, and optimistic updates

### Coming Soon (Phase 2+)
- Social features (follow athletes, activity feed, direct messaging)
- Advanced analytics and trend visualization
- Race management and preparation plans
- Gamification (XP, achievements, streaks)
- Equipment tracking (shoe mileage, replacement alerts)
- Push notifications
- Offline mode

## 🏗️ Architecture

```
Aria Mobile App (React Native + Expo)
    ↓
Aria Backend Server (Express - Port 3000) [Adapter/Proxy Layer]
    ↓
TrackLitRN Production Backend (Azure)
    ↓
PostgreSQL + Azure Blob Storage
```

### Why the Hybrid Architecture?

- **Development Flexibility**: Make changes without modifying production backend
- **Mobile-Specific Logic**: Handle streaming, caching, and offline support
- **Progressive Migration**: Gradually move features to native implementation
- **Analytics Layer**: Track mobile-specific events

## 📁 Project Structure

```
aria/
├── app/                          # Expo Router screens
│   ├── (tabs)/                   # Bottom tab navigation
│   │   ├── dashboard.tsx         # Dynamic dashboard with AI insights
│   │   ├── plan.tsx             # Training plans
│   │   ├── chat.tsx             # AI chat with streaming
│   │   └── more.tsx             # Settings and profile
│   ├── auth/                     # Authentication screens
│   ├── onboarding/               # First-time user flow
│   ├── workout/                  # Workout tracking
│   └── _layout.tsx               # Root layout with providers
├── src/
│   ├── components/
│   │   ├── features/             # Feature-specific components
│   │   │   ├── DashboardCard.tsx # Dynamic dashboard card renderer
│   │   │   ├── MessageBubble.tsx # Chat message component
│   │   │   └── ...
│   │   ├── ui/                   # Reusable UI components
│   │   │   ├── Avatar.tsx        # Profile picture with loading states
│   │   │   ├── SkeletonLoader.tsx # Loading skeletons
│   │   │   └── ...
│   │   ├── ErrorBoundary.tsx     # Production error handling
│   │   └── Toast.tsx             # Toast notification system
│   ├── context/                  # React Context providers
│   │   ├── AuthContext.tsx       # Authentication state
│   │   ├── ChatContext.tsx       # Chat with streaming
│   │   ├── DashboardContext.tsx  # Dynamic dashboard state
│   │   ├── WorkoutContext.tsx    # Workout tracking
│   │   └── AppContext.tsx        # Root provider wrapper
│   ├── lib/                      # Utilities and helpers
│   │   ├── api.ts               # API client with retry logic
│   │   ├── cache.ts             # In-memory caching layer
│   │   ├── retry.ts             # Exponential backoff retry
│   │   ├── analytics.ts         # Event tracking
│   │   ├── performance.ts       # Performance monitoring
│   │   └── tokenStorage.ts      # JWT token management
│   ├── theme/                    # Design system
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   └── ...
│   └── types/                    # TypeScript types
├── server/                       # Aria backend (Express)
│   ├── index.ts                  # Server entry point
│   ├── routes.ts                 # API routes
│   ├── aria-ai.ts               # AI integration layer
│   └── storage.ts               # Database operations
├── shared/
│   └── schema.ts                 # Drizzle ORM schema
├── .env.example                  # Environment variables template
├── TESTING_CHECKLIST.md         # Comprehensive testing guide
└── README.md                     # This file
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Expo CLI: `npm install -g @expo/cli`
- iOS Simulator (Mac only) or Android Emulator
- TrackLitRN production credentials

### Installation

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd aria
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your configuration:
   ```env
   # TrackLitRN Backend
   API_BASE_URL=https://app-tracklit-prod-tnrusd.azurewebsites.net

   # OpenAI (for AI features)
   OPENAI_API_KEY=sk-...

   # Database (PostgreSQL)
   DATABASE_URL=postgresql://...

   # Azure Blob Storage
   AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;...
   ```

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Run on device/simulator**
   - iOS: Press `i` or scan QR code with Expo Go
   - Android: Press `a` or scan QR code with Expo Go

### Run Backend Server (Optional)

The Aria backend is optional for development if you're using demo mode.

```bash
npm run dev:server
```

The server will start on `http://localhost:3000`.

## 📱 Development Workflow

### Running the App

```bash
# Start Expo dev server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run web version (limited features)
npm run web
```

### Demo Mode

Aria includes a demo mode that works without backend connection:

1. Open the app
2. On welcome screen, tap "Demo Login"
3. Complete onboarding with mock data
4. Explore all features with sample data

Demo mode is perfect for:
- UI development
- Testing flows
- Demos and presentations

## 🎨 Design System

### Colors

```typescript
import { colors } from './src/theme';

colors.primary    // #0A84FF - Primary brand color
colors.teal       // #30D5C8 - Accent color
colors.green      // #32D74B - Success
colors.red        // #FF453A - Error
colors.yellow     // #FFD60A - Warning
colors.orange     // #FF9F0A - Streaks

// Background colors
colors.background.primary    // Dark background
colors.background.secondary  // Slightly lighter
colors.background.cardSolid  // Card background

// Text colors
colors.text.primary          // White
colors.text.secondary        // Gray
colors.text.tertiary         // Lighter gray
```

### Typography

```typescript
import { typography } from './src/theme';

typography.display  // Large display text
typography.h1       // 32px bold
typography.h2       // 24px bold
typography.h3       // 20px semi-bold
typography.body     // 16px regular
typography.caption  // 14px regular
```

### Spacing

```typescript
import { spacing } from './src/theme';

spacing.xs   // 4px
spacing.sm   // 8px
spacing.md   // 16px
spacing.lg   // 24px
spacing.xl   // 32px
spacing.xxl  // 48px
```

## 🧪 Testing

See [TESTING_CHECKLIST.md](TESTING_CHECKLIST.md) for comprehensive testing guide.

### Manual Testing

1. **Login Flow**
   - Test with real TrackLitRN credentials
   - Test with invalid credentials
   - Test demo mode

2. **Dashboard**
   - Verify skeleton loaders appear
   - Check cards load from backend
   - Test pull-to-refresh
   - Verify card interactions work

3. **Chat**
   - Send messages and verify streaming
   - Test long conversations
   - Test network errors

4. **Profile**
   - Upload profile picture
   - Verify image compression
   - Check Azure Blob Storage

## 📊 Analytics & Monitoring

Aria includes built-in analytics and performance monitoring:

### Track Events

```typescript
import { AnalyticsEvents } from './src/lib/analytics';

// Track user actions
AnalyticsEvents.dashboardViewed('workout_ready', 5);
AnalyticsEvents.chatMessageSent(150, true);
AnalyticsEvents.workoutCompleted('Easy Run', 1800, 5.2);
```

### Monitor Performance

```typescript
import { Performance } from './src/lib/performance';

// Track API calls
await Performance.trackAPI('/api/dashboard', async () => {
  return await getDashboardState();
});

// Get performance report
const report = Performance.getReport();
```

## 🐛 Debugging

### Enable Debug Logging

API requests automatically log in `__DEV__` mode:

```
[API] GET /api/dashboard/state { hasToken: true }
[API] GET /api/dashboard/state -> 200

[Cache] Set: dashboard:state (ttl: 300s)
[Cache] Hit: dashboard:state (age: 45s, ttl: 300s)

[Performance] api_dashboard_load: 450ms
```

### React Native Debugger

1. Install React Native Debugger
2. Open app and shake device
3. Select "Debug"
4. View logs, network, and state

## 🚢 Deployment

### Build for Production

```bash
# iOS
eas build --platform ios --profile production

# Android
eas build --platform android --profile production
```

### Submit to App Stores

```bash
# iOS App Store
eas submit --platform ios

# Google Play Store
eas submit --platform android
```

## 📚 Documentation

- [Testing Checklist](TESTING_CHECKLIST.md) - Comprehensive testing guide
- [Project Summary](PROJECT_SUMMARY.md) - High-level overview
- [Implementation Plan](.claude/plans/jaunty-pondering-hanrahan.md) - 8-week roadmap
- [Quickstart Guide](QUICKSTART.md) - Get started in 5 minutes

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Code Style

- Use TypeScript for all new files
- Follow existing code structure
- Add JSDoc comments for functions
- Run `npm run lint` before committing

## 📄 License

This project is proprietary and confidential.

## 🙏 Acknowledgments

- Built with [Expo](https://expo.dev/)
- Powered by [TrackLitRN](https://github.com/vocarista/tracklitrn-backend) backend
- AI features by [OpenAI](https://openai.com/)

---

Made with ❤️ for athletes by athletes
