# Aria Mobile App

Aria is an AI-powered running coaching mobile app built with React Native and Expo.

## Features

### Phase 1 - Core Features ✅
- Profile management with Azure Blob Storage integration
- Authentication with TrackLitRN backend
- AI chat with streaming support (Server-Sent Events)
- Dynamic dashboard with real-time insights

### Phase 2 - AI-Powered Dashboard ✅
- Proactive AI insight generation before user prompts
- Training pattern recognition (overtraining, improving, plateau)
- Fatigue score assessment with risk levels
- Performance predictions and metrics
- Context aggregation from workouts, races, stats, and chat history

### Phase 3 - Coming Soon ⏳
- Social features (follow, feed, messaging, leaderboards)
- Advanced analytics with charts and trends
- Gamification (XP, achievements, streaks)
- Race management and prep plans
- Equipment tracking

## Tech Stack

- **Frontend**: React Native 0.81.5 + Expo SDK 54
- **State**: React Context API
- **Styling**: Custom theme system
- **Backend**: TrackLitRN Production API
- **AI**: OpenAI GPT-4o
- **Storage**: Azure Blob Storage

## Getting Started

### Prerequisites

- Node.js 18+
- iOS Simulator (Xcode) or Android Emulator
- Expo CLI
- TrackLitRN backend access

### Installation

```bash
cd aria-app
npm install
```

### Environment Setup

Copy `.env.example` to `.env` and configure:

```env
EXPO_PUBLIC_API_URL=https://app-tracklit-prod-tnrusd.azurewebsites.net
EXPO_PUBLIC_LOCAL_API_URL=http://localhost:3000
```

### Run the App

```bash
# Start Expo dev server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run local backend (optional)
npm run server
```

## Project Structure

```
aria-app/
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Tab navigation screens
│   ├── auth/              # Authentication screens
│   ├── onboarding/        # Onboarding flow
│   └── workout/           # Workout tracking
├── src/
│   ├── components/        # Reusable components
│   ├── context/           # React Context providers
│   ├── lib/               # Utilities and API client
│   ├── theme/             # Design system
│   └── types/             # TypeScript types
├── server/                # Local Express backend (optional)
├── ios/                   # iOS native project
└── __tests__/             # Unit tests
```

## API Documentation

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete backend API specifications.

**Backend Developer**: Use this documentation to implement the required endpoints.

## Key Features

### AI-Powered Insights

The dashboard proactively generates personalized insights using:
- User profile (sport, level, goals)
- Recent workouts and performance data
- Training patterns and fatigue analysis
- Chat conversation history
- Upcoming races

### Context Aggregation

Smart data aggregation with 5-minute caching:
- Fetches data from multiple sources in parallel
- Calculates training load (TRIMP method)
- Tracks workout streaks
- Filters upcoming races (90-day window)

### Performance Optimizations

- React.memo and useMemo for rendering optimization
- Aggressive caching with TTL (Time To Live)
- Retry logic with exponential backoff
- Skeleton loaders for better UX

### Animations

- FadeIn components with slide-up effects
- Staggered entrance animations for dashboard cards
- Smooth transitions throughout the app

## Testing

```bash
# Run unit tests
npx tsx __tests__/contextAggregator.test.ts
```

## Documentation

- [Quick Start Guide](./QUICKSTART.md)
- [API Documentation](./API_DOCUMENTATION.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Contributing Guide](./CONTRIBUTING.md)
- [Security Policy](./SECURITY.md)
- [Troubleshooting](./TROUBLESHOOTING.md)

## Phase Status

| Phase | Status | Progress |
|-------|--------|----------|
| Phase 1 - Core Features | ✅ Complete | 100% |
| Phase 2 - AI Dashboard | ✅ Complete | 100% |
| Phase 3 - Social & More | ⏳ Pending | 0% |

## Backend Requirements

The mobile app requires the following backend endpoints to be implemented:

### Phase 1 & 2 Endpoints
- `POST /api/mobile/login` - User authentication
- `POST /api/mobile/register` - User registration
- `GET /api/user` - Get current user profile
- `POST /api/user/public-profile` - Upload profile picture
- `GET /api/dashboard/state` - Get dashboard cards
- `POST /api/dashboard/generate-insights` - Generate AI insights
- `GET /api/analytics/patterns` - Training pattern recognition
- `GET /api/analytics/fatigue-score` - Fatigue assessment
- `POST /api/sprinthia/chat` - AI chat (streaming)
- `GET /api/workouts` - Get workouts
- `GET /api/races` - Get races

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete specifications.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines.

## License

MIT

## Contact

For questions or support, please open an issue on GitHub.

---

**Built with ❤️ by the Aria Team**
**Powered by TrackLitRN Backend & OpenAI GPT-4o**
