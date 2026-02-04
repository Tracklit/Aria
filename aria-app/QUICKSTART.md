# Quick Start Guide

## Running the App

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm start
   ```

3. **Run on iOS**:
   ```bash
   npm run ios
   ```

## Navigation

The app has 4 main tabs:
- **Dashboard**: `/dashboard` - Analytics and progress tracking
- **Plan**: `/plan` - Training plans and schedules  
- **Chat**: `/chat` - AI coach messaging
- **More**: `/more` - Settings

## Testing Different Screens

### Onboarding
Navigate to: `app/onboarding/step1.tsx`
- Try different sport and goal selections
- Test form inputs

### Workout Tracking
Navigate to: `app/workout/tracking.tsx`
- View circular progress animation
- See live metrics
- Test control buttons

### Dashboard Views
On the Dashboard tab, tap "Show Competition View" to toggle between:
- Analytics view (charts and metrics)
- Competition day view (diet and tips)

### Chat Features
On the Chat tab, tap "Show Weekly Plan" to see the training table.

## Build Verification

The app has been tested and builds successfully:
```bash
npx expo export --platform ios
```

Output: ✅ Bundled successfully (1209 modules)

## Known TypeScript Notes

The @expo/vector-icons types may show warnings during `tsc --noEmit`, but this is expected and doesn't affect runtime. The types are available through Expo's bundler.

## Customization

### Colors
Edit `src/theme/colors.ts` to change the color scheme.

### Mock Data
Update `src/data/` files to change mock user data, workouts, and messages.

### Components
All reusable components are in `src/components/ui/` and `src/components/features/`.

## Next Steps

1. Connect to a real backend API
2. Implement actual workout tracking with sensors
3. Add more onboarding steps
4. Integrate with fitness devices (Garmin, Apple Watch)
5. Add push notifications
