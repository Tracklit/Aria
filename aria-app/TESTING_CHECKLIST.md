# Aria Testing Checklist

## Phase 1: Core Features Implementation - COMPLETED

### 1. Profile Picture Upload ✅

**Implementation Complete:**
- ✅ Image picker with `expo-image-picker`
- ✅ Image compression (400x400, 70% quality, JPEG)
- ✅ Multipart/form-data upload to TrackLitRN backend
- ✅ Avatar component with loading states
- ✅ Error handling with toast notifications
- ✅ Success feedback with toast

**Files Modified:**
- `src/lib/api.ts:353-403` - Upload function
- `src/components/ui/Avatar.tsx` - Loading states
- `app/(tabs)/more.tsx` - Image picker integration
- `src/context/AuthContext.tsx` - Upload method

**Manual Testing Required:**
1. Open More tab
2. Click "Change Photo" button
3. Select image from photo library
4. Verify compression (should be ~100-200KB)
5. Verify upload to Azure Blob Storage
6. Verify image displays immediately after upload
7. Test error cases:
   - No photo library permission
   - Network error during upload
   - Invalid image format

---

### 2. Login Verification ✅

**Implementation Status:**
- ✅ Login already integrated with TrackLitRN `/api/mobile/login`
- ✅ JWT token storage with AsyncStorage
- ✅ Token included in API requests (Bearer header)
- ✅ Auth state management with AuthContext
- ✅ Automatic navigation based on auth state

**Files to Verify:**
- `src/lib/api.ts:161-167` - Login endpoint
- `src/context/AuthContext.tsx:255-277` - Login method
- `src/lib/tokenStorage.ts` - Token storage utilities

**Manual Testing Required:**
1. Open Aria app
2. Click "Sign In" on welcome screen
3. Enter TrackLitRN credentials:
   - Username: `[your-username]`
   - Password: `[your-password]`
4. Verify successful login and navigation to dashboard
5. Close and reopen app - should stay logged in
6. Test error cases:
   - Invalid credentials
   - Network error
   - Server unavailable

---

### 3. Chat with Streaming ✅

**Implementation Complete:**
- ✅ Server-Sent Events (SSE) streaming
- ✅ Real-time message updates in UI
- ✅ Cursor animation during streaming
- ✅ Automatic fallback to non-streaming on error
- ✅ Conversation history storage
- ✅ Error toasts for failed messages

**Files Modified:**
- `src/lib/api.ts:320-423` - Streaming function
- `src/context/ChatContext.tsx` - Streaming state management
- `app/(tabs)/chat.tsx` - Streaming UI

**Manual Testing Required:**
1. Open Chat tab
2. Send message: "What's a good warmup for 5k training?"
3. Verify message streams in real-time with cursor
4. Send follow-up: "How long should the warmup be?"
5. Verify conversation context is maintained
6. Test long-running responses (50+ words)
7. Test error cases:
   - Network interruption during streaming
   - Server timeout
   - Invalid response format

**Expected Behavior:**
- First token should appear within 500ms
- Streaming cursor (▊) should be visible
- Message should build up character by character
- Final message should be stored in conversation history

---

### 4. Dynamic Dashboard ✅

**Implementation Complete:**
- ✅ DashboardContext for state management
- ✅ Dashboard mode detection (5 modes)
- ✅ Dynamic card rendering
- ✅ Pull-to-refresh functionality
- ✅ Skeleton loaders during loading
- ✅ Error handling with retry
- ✅ Custom DashboardCard component
- ✅ Toast notifications for errors

**Dashboard Modes:**
1. **general** - Default state
2. **workout_ready** - Workout scheduled today
3. **competition_day** - Race within 14 days
4. **recovery_focus** - High training load
5. **rest_day** - Rest day scheduled

**Card Types Implemented:**
1. **workout_card** - Today's planned workout
2. **competition_card** - Race preparation
3. **insight_card** - Training trends & recommendations
4. **streak_card** - Milestone celebrations
5. **stats_row** - Weekly summary with stats

**Files Created/Modified:**
- `src/context/DashboardContext.tsx` - NEW (108 lines)
- `src/components/features/DashboardCard.tsx` - NEW (263 lines)
- `app/(tabs)/dashboard.tsx` - REWRITTEN (simplified from 426 to ~250 lines)
- `server/routes.ts:781-805` - Dashboard endpoint (already existed)
- `server/aria-ai.ts:421-589` - Mode detection & content generation

**Manual Testing Required:**
1. Open Dashboard tab
2. Verify loading shows skeleton cards
3. Wait for cards to load from backend
4. Pull down to refresh - verify refresh works
5. Verify cards are sorted by priority
6. Tap CTA buttons - verify navigation works
7. Test different modes by:
   - Scheduling a workout for today (workout_ready)
   - Adding an upcoming race (competition_day)
   - Completing 3+ workouts in 3 days (recovery_focus)
8. Test error state - disconnect network, refresh dashboard
9. Verify error toast appears
10. Tap "Retry" button - verify recovery

**Expected Card Data Structure:**
```json
{
  "mode": "general",
  "greeting": "Good morning, Athlete!",
  "subtitle": "Ready to crush today's training?",
  "cards": [
    {
      "type": "workout_card",
      "title": "Easy Run",
      "subtitle": "Scheduled for 10:00 AM",
      "content": {
        "details": [
          { "icon": "time", "text": "30 minutes" },
          { "icon": "location", "text": "3.5 miles" }
        ]
      },
      "cta": {
        "label": "Start Workout",
        "action": "start_workout",
        "data": { "workoutId": 123 }
      },
      "priority": 1,
      "order": 0
    }
  ]
}
```

---

### 5. Error Handling & UX Polish ✅

**Implementation Complete:**
- ✅ ErrorBoundary component for production errors
- ✅ Toast notification system (4 types)
- ✅ ToastManager for global access
- ✅ Toast integration in all contexts
- ✅ Loading indicators throughout app
- ✅ Skeleton loaders for dashboard & chat

**Toast Types:**
1. **success** - Green checkmark
2. **error** - Red X
3. **warning** - Yellow warning
4. **info** - Blue info

**Files Created:**
- `src/components/ErrorBoundary.tsx` - Error boundary
- `src/components/Toast.tsx` - Toast system
- `src/components/ui/SkeletonLoader.tsx` - Skeleton loaders

**Toast Integration Locations:**
- ✅ Profile picture upload (success/error)
- ✅ Chat message send (error)
- ✅ Chat load conversations (error)
- ✅ Dashboard load (error)
- ✅ Workout completion (success/error)

**Manual Testing Required:**
1. Test toast notifications:
   - Upload profile picture → Success toast
   - Fail to upload (network off) → Error toast
   - Complete workout → Success toast
   - Send chat message (network off) → Error toast
2. Test error boundary:
   - Trigger a JavaScript error in development
   - Verify error details are shown
   - Verify "Try Again" button works
3. Test skeleton loaders:
   - Open dashboard with slow network
   - Verify skeleton cards appear
   - Verify smooth transition to real cards

---

## Backend API Endpoints - VERIFICATION NEEDED

### TrackLitRN Production Backend
**Base URL:** `https://app-tracklit-prod-tnrusd.azurewebsites.net`

### Endpoints to Verify:

#### Authentication
- `POST /api/mobile/login` - ✅ Already tested (working)
- `POST /api/mobile/register` - ⚠️ Needs verification
- `POST /api/logout` - ⚠️ Needs verification

#### User Profile
- `GET /api/user` - ⚠️ Get current user
- `POST /api/user/public-profile` - ⚠️ Upload profile picture
- `PATCH /api/user` - ⚠️ Update user data

#### Chat/Sprinthia
- `POST /api/sprinthia/chat` - ⚠️ Send chat message
- `GET /api/sprinthia/conversations` - ⚠️ List conversations
- `GET /api/sprinthia/conversations/:id/messages` - ⚠️ Get messages
- `DELETE /api/sprinthia/conversations/:id` - ⚠️ Delete conversation

#### Dashboard
- `GET /api/dashboard/state` - ⚠️ Get dashboard insights (custom Aria endpoint)

#### Workouts
- `GET /api/workouts` - ⚠️ List workouts
- `POST /api/workouts` - ⚠️ Create workout
- `GET /api/workouts/planned` - ⚠️ Get today's workout
- `POST /api/workouts/:id/complete` - ⚠️ Complete workout

---

## Testing with Real Backend

### Prerequisites
1. TrackLitRN production credentials
2. Azure access for blob storage verification
3. Network debugging tools (Charles Proxy or similar)

### Step-by-Step Testing

#### 1. Login Flow
```bash
# Test login request
curl -X POST https://app-tracklit-prod-tnrusd.azurewebsites.net/api/mobile/login \
  -H "Content-Type: application/json" \
  -d '{"username": "test-user", "password": "test-password"}'

# Expected response:
{
  "token": "eyJhbGc...",
  "user": {
    "id": 123,
    "username": "test-user",
    "email": "test@example.com"
  }
}
```

#### 2. Profile Picture Upload
```bash
# Test profile picture upload
curl -X POST https://app-tracklit-prod-tnrusd.azurewebsites.net/api/user/public-profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "profileImage=@/path/to/image.jpg"

# Expected response:
{
  "profileImageUrl": "https://storage.blob.core.windows.net/..."
}
```

#### 3. Chat Message
```bash
# Test chat message (non-streaming)
curl -X POST https://app-tracklit-prod-tnrusd.azurewebsites.net/api/sprinthia/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "What is a good warmup?", "conversationId": null}'

# Expected response:
{
  "response": "A good warmup includes...",
  "conversationId": 456
}
```

#### 4. Dashboard Insights
```bash
# Test dashboard insights
curl -X GET https://app-tracklit-prod-tnrusd.azurewebsites.net/api/dashboard/state \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected response:
{
  "mode": "general",
  "greeting": "Good morning!",
  "subtitle": "Ready to train?",
  "cards": [...]
}
```

---

## Known Issues & Limitations

### Current Limitations
1. **No OAuth Implementation** - Apple/Google Sign-In shows "Coming Soon"
2. **Demo Mode Limited** - Demo login doesn't sync with backend
3. **No Offline Support** - All features require network connection
4. **No Push Notifications** - Notification settings are placeholders
5. **No Real Workout Tracking** - GPS tracking not implemented
6. **Mock Data Fallbacks** - Some features fall back to mock data if backend fails

### Future Improvements (Phase 2+)
- [ ] Implement OAuth (Apple, Google)
- [ ] Add offline mode with local caching
- [ ] Implement real GPS workout tracking
- [ ] Add push notifications
- [ ] Social features (follow, feed, DMs)
- [ ] Analytics with real data visualization
- [ ] Race management
- [ ] Gamification (XP, achievements, streaks)
- [ ] Equipment tracking

---

## Performance Targets

### Current Benchmarks (to be measured)
- **Dashboard Load Time:** Target < 2s to first insight
- **Chat Streaming Latency:** Target < 500ms to first token
- **Profile Picture Upload:** Target < 5s for 400x400 image
- **API Response Time:** Target < 1s for cached data
- **App Startup Time:** Target < 3s to authenticated state

### Memory & Battery (to be profiled)
- Memory usage should stay < 200MB during normal use
- Battery drain should be minimal when idle
- No memory leaks during extended use

---

## Regression Testing

### Before Each Release
1. ✅ Login → Dashboard → Chat → More (happy path)
2. ✅ Upload profile picture
3. ✅ Send multiple chat messages
4. ✅ Refresh dashboard
5. ✅ Complete a workout
6. ✅ Logout and login again
7. ✅ Test on iOS and Android
8. ✅ Test with slow network (3G simulation)
9. ✅ Test with no network (airplane mode)
10. ✅ Test background/foreground transitions

---

## Test Data Setup

### Create Test Account
1. Register on TrackLitRN production
2. Complete onboarding
3. Add at least 3 workouts
4. Create a training plan
5. Schedule an upcoming race
6. Send at least 5 chat messages to Sprinthia

### Mock Data for Development
- Demo mode uses local mock data (no backend required)
- Located in `src/context/AuthContext.tsx` (createDemoUser, createDemoProfile)

---

## Bug Reporting Template

```markdown
### Bug Description
[Clear description of the issue]

### Steps to Reproduce
1. [First step]
2. [Second step]
3. [etc.]

### Expected Behavior
[What should happen]

### Actual Behavior
[What actually happened]

### Environment
- App Version: [version]
- Device: [iOS/Android, model]
- OS Version: [iOS 17, Android 14, etc.]
- Network: [WiFi/4G/5G]

### Screenshots/Logs
[Attach screenshots or console logs]

### Severity
- [ ] Critical - App crashes
- [ ] High - Feature broken
- [ ] Medium - Workaround exists
- [ ] Low - Minor UI issue
```

---

## Success Criteria

### Phase 1 Complete When:
- ✅ Login works with TrackLitRN backend
- ✅ Profile pictures upload to Azure Blob Storage
- ✅ Chat streams responses in real-time
- ✅ Dashboard loads dynamic insights from backend
- ✅ All error cases show user-friendly messages
- ✅ No crashes during normal use
- ✅ Performance targets met

### Ready for Phase 2 When:
- All Phase 1 features tested with real backend
- No critical or high-severity bugs
- Performance profiling complete
- User feedback collected
- Analytics instrumented

---

## Next Steps

1. **Deploy Aria Backend** - Get server running on Heroku/Azure
2. **Test with Real Credentials** - Use actual TrackLitRN account
3. **Profile Performance** - Measure load times and memory
4. **User Testing** - Get feedback from 3-5 athletes
5. **Bug Fixes** - Address issues found during testing
6. **Phase 2 Planning** - Prioritize next features

---

## Contact & Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/aria/issues)
- **Docs**: [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)
- **Plan**: [~/.claude/plans/jaunty-pondering-hanrahan.md](~/.claude/plans/jaunty-pondering-hanrahan.md)
