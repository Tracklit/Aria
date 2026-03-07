# App Store Review Notes — HealthKit

## HealthKit Usage

Aria uses Apple HealthKit to read health and fitness data to provide personalized AI coaching recommendations. Here is how each data type is used:

**Heart Rate & HRV** — Aria reads resting heart rate and heart rate variability to assess cardiovascular fitness trends and detect signs of overtraining. When HRV is declining or resting HR is elevated, Aria recommends lighter training or recovery days.

**Sleep Analysis** — Sleep duration, efficiency, and stages (deep/REM) are used to assess recovery status. If an athlete slept less than 6.5 hours, Aria adjusts training intensity recommendations accordingly.

**Step Count & Active Energy** — Daily step count and calories burned help Aria understand overall activity load beyond structured workouts, preventing overtraining.

**Body Mass & Body Fat Percentage** — Weight trends inform nutrition plan recommendations and help track body composition changes over training cycles.

**Workouts** — Workout data (runs, strength sessions, etc.) is read to give Aria a complete picture of training volume. Aria also writes completed workouts back to HealthKit so all training data stays in one place.

**Oxygen Saturation** — SpO2 data supports recovery monitoring for high-altitude or high-intensity training.

## Where Health Data Appears in the App

1. **Dashboard** — Readiness score card, sleep summary card, and recovery card (HRV, resting HR) are shown when health data is available
2. **AI Chat** — The Aria AI coach references health metrics when giving training recommendations (e.g., "Your HRV of 28ms suggests taking a recovery day")
3. **Settings > Health Integrations** — Users can see connection status, last sync time, and control which data types are shared

## User Control

- Users explicitly opt in by navigating to Settings > Health Integrations > Apple Health and tapping "Connect"
- iOS HealthKit permission dialog is presented before any data is read
- Per-data-type toggles let users disable specific categories (sleep, HR, etc.)
- Users can disconnect Apple Health at any time, which immediately stops all data reading
- No health data is collected without the user's active consent

## Data Handling

- Health data is transmitted over TLS to our backend for AI processing
- Data is stored in Azure cloud infrastructure (encrypted at rest)
- Users can request complete data deletion at any time
- Health data is never shared with third parties or used for advertising
