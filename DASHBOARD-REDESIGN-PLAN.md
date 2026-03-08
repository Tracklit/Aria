# Dynamic Dashboard & Analytics Redesign Plan

## Context

The Aria mobile app's Home Dashboard and Progress/Analytics screens need a major redesign to become dynamic and context-aware. Currently the dashboard shows a static greeting, workout carousel, optional health cards, and AI insights. The progress screen shows basic SVG charts and workout history. The goal is to make both screens feel alive — referencing the athlete's active program, next meal, sleep quality, health metrics, and providing AI-powered coaching advice based on burnout detection, training load, and recovery state.

**User decisions:**
- Large hero avatar (centered, ~120px, cyan gradient ring)
- Next meal card only shown when active nutrition plan exists
- AI coaching banner on Progress: expandable card (2-line summary, tap to expand)
- VO2 Max: yes, add with new HealthKit permission + DB migration

---

## Phase 1: Reusable Chart Components

**Goal:** Build smooth bezier chart components replacing the current linear SVG paths.

**Files to create:**
- `mobile-app/src/components/charts/SmoothAreaChart.tsx` — Bezier-interpolated area chart with gradient fill. Props: `data: number[]`, `labels?: string[]`, `height`, `gradientColors`, `strokeColor`. Uses Catmull-Rom to cubic bezier conversion.
- `mobile-app/src/components/charts/SparklineChart.tsx` — Compact sparkline variant for analytics cards.
- `mobile-app/src/components/charts/CircularGauge.tsx` — Small circular gauge (distance, pace, sleep) using react-native-svg arcs.
- `mobile-app/src/components/charts/index.ts` — Barrel export.

**Key algorithm** (bezier interpolation):
```
For points P0, P1, P2, P3:
  CP1 = P1 + (P2 - P0) / 6
  CP2 = P2 - (P3 - P1) / 6
  Path: C CP1.x,CP1.y CP2.x,CP2.y P2.x,P2.y
```

**Reuse:** `react-native-svg` (already installed). Do NOT use `react-native-chart-kit` (inflexible styling).

---

## Phase 2: Next Meal Utility + Streak Display

**Goal:** Client-side logic to determine next meal from nutrition plan and display streak badges.

**Files to create:**
- `mobile-app/src/utils/mealSchedule.ts`
  - `getNextMeal(mealSuggestions)` — Maps meal names to time windows (Breakfast: 5-9am, Morning Snack: 9-11am, Lunch: 11-13:30, Afternoon Snack: 13:30-16, Dinner: 16-20, Evening Snack: 20-22). Returns next upcoming meal or null.
- `mobile-app/src/utils/streakDisplay.ts`
  - `getStreakBadge(streak)` — Maps streak counts to achievement badges (3d: "Getting Started", 7d: "Consistency King", 14d: "Two Week Warrior", 30d: "Monthly Master").

**Files to modify:**
- `mobile-app/src/lib/contextAggregator.ts` — Extract `calculateStreak()` into shared util.

---

## Phase 3: Dashboard Context Enhancement

**Goal:** Add dynamic subtitle, streak, and nutrition data to DashboardContext.

**Files to modify:**
- `mobile-app/src/context/DashboardContext.tsx`
  - Add to state: `dynamicSubtitle: string | null`, `currentStreak: number`
  - New method: `loadDynamicSubtitle()` — context-aware subtitle from time + workout + meal + health
- `mobile-app/src/lib/contextAggregator.ts`
  - Add `activeNutritionPlan` and `nextMeal` to `AggregatedContext`
  - Fetch active nutrition plan in parallel `Promise.all`

**Dependencies:** Phase 2

---

## Phase 4: Dashboard UI Redesign

**Goal:** Restructure dashboard.tsx into component-based architecture matching the mock.

**Files to create:**
- `mobile-app/src/components/dashboard/HeroHeader.tsx` — Large greeting + centered 120px avatar with cyan gradient ring
- `mobile-app/src/components/dashboard/WorkoutHeroCard.tsx` — Primary workout hero card (teal-cyan gradient, "Start Session")
- `mobile-app/src/components/dashboard/NextMealCard.tsx` — Next meal/snack from active nutrition plan
- `mobile-app/src/components/dashboard/LatestStatsRow.tsx` — 3 CircularGauges: distance, pace, sleep
- `mobile-app/src/components/dashboard/StreakBadge.tsx` — Achievement card (gold accent)
- `mobile-app/src/components/dashboard/AskAriaSection.tsx` — Compact chat section

**Files to modify:**
- `mobile-app/app/(tabs)/dashboard.tsx` — Rewrite layout:
  1. HeroHeader (greeting + avatar)
  2. WorkoutHeroCard
  3. NextMealCard (if active plan)
  4. LatestStatsRow
  5. StreakBadge (if streak > 0)
  6. Health & Recovery (existing)
  7. AI Insights (existing)
  8. AskAriaSection (compact)

**Preserve testIDs:** `dashboard.settings`, `dashboard.chat_input`, `dashboard.mic`, `dashboard.chip.*`, `dashboard.start_workout.*`, `dashboard.insight.*`

**Dependencies:** Phases 1, 2, 3

---

## Phase 5: AI-Powered Dynamic Subtitle & Coaching

**Goal:** Enhance backend AI with health + nutrition context for dynamic subtitles and coaching.

**Files to modify:**
- `mobile-backend/server/aria-ai.ts` — Enhanced subtitle generation with health/nutrition/training context
- `mobile-backend/server/routes.ts` — Enhanced insights endpoint accepts health metrics

**Dependencies:** None (parallel with Phase 4)

---

## Phase 6: Progress Screen Redesign

**Goal:** Replace hand-drawn SVG with smooth bezier components.

**Files to create:**
- `mobile-app/src/components/progress/WeeklySummaryCard.tsx`
- `mobile-app/src/components/progress/AdvancedAnalyticsCard.tsx`
- `mobile-app/src/components/progress/RecentWorkoutRow.tsx`

**Files to modify:**
- `mobile-app/app/(tabs)/progress.tsx` — Restructure with new components

**Preserve testIDs:** `progress.title`, `progress.subtitle`, `progress.weekly_summary`

**Dependencies:** Phase 1

---

## Phase 7: AI Coaching Insights Banner (Progress)

**Goal:** Expandable AI coaching card at top of Progress screen.

**Files to create:**
- `mobile-app/src/components/progress/CoachingInsightsBanner.tsx` — 2-line summary, tap to expand

**Files to modify:**
- `mobile-app/src/context/DashboardContext.tsx` — Add `loadProgressInsights()`, 30-min cache
- `mobile-app/src/lib/api.ts` — Add `getProgressCoachingInsight()`

**Dependencies:** Phases 5, 6

---

## Phase 8: VO2 Max & Enhanced Health Data

**Goal:** Add VO2 Max from Apple Health + DB migration.

**Files to modify:**
- `mobile-app/src/services/appleHealth.ts` — Add VO2Max to permissions + reading
- `mobile-backend/shared/schema.ts` — Add `vo2Max` column
- `mobile-backend/server/routes.ts` — Accept/return vo2Max
- `mobile-app/src/context/HealthContext.tsx` — Expose vo2Max

**Dependencies:** Phase 6

---

## Phase 9: Health & Sleep Trend Charts (Progress)

**Goal:** 7-day trend sparklines for sleep, HRV, resting HR.

**Files to create:**
- `mobile-app/src/components/progress/HealthTrendsSection.tsx`

**Files to modify:**
- `mobile-app/src/lib/api.ts` — Add `getHealthMetricsHistory(days)`
- `mobile-app/app/(tabs)/progress.tsx` — Include HealthTrendsSection

**Dependencies:** Phases 6, 8

---

## Phase 10: Polish, Animations & Final Testing

**Deliverables:**
- Staggered FadeInUp animations, avatar gradient pulse
- Skeleton loaders for charts
- Dashboard stats tappable to Progress tab
- Remove unused `react-native-chart-kit`
- Dark/light theme verification

**Testing:**
1. Unit tests for mealSchedule.ts and streakDisplay.ts
2. Existing Maestro E2E tests pass
3. New Maestro flows for nutrition/workout/insights/streak
4. Integration tests against Azure prod
5. Performance profiling (dashboard < 200ms)

---

## Manual Steps Required (Post-Implementation)

1. **DB Migration**: `cd mobile-backend && npm run db:generate && npm run db:migrate`
2. **Deploy mobile-backend**: Docker build + ACR push + container app update
3. **Test VO2 Max**: Physical iOS device with Apple Health data
4. **App Store**: Update HealthKit entitlements description if needed
5. **Expo build**: New binary if native HealthKit permissions changed

---

## Status Tracker

- [ ] Phase 1: Chart Components
- [ ] Phase 2: Meal + Streak Utils
- [ ] Phase 3: Context Enhancement
- [ ] Phase 4: Dashboard UI Redesign
- [ ] Phase 5: AI Backend Enhancement
- [ ] Phase 6: Progress Screen Redesign
- [ ] Phase 7: AI Coaching Banner
- [ ] Phase 8: VO2 Max Integration
- [ ] Phase 9: Health Trends
- [ ] Phase 10: Polish & Testing
