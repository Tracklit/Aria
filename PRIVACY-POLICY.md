# Aria Privacy Policy

**Last Updated: March 7, 2026**

Aria ("the App") is an AI-powered running coaching application. This Privacy Policy describes how we collect, use, and protect your personal and health data.

## 1. Information We Collect

### Account Information
- Email address, display name, profile photo
- Authentication credentials (securely hashed)

### Athlete Profile
- Sport, experience level, training goals
- Date of birth, gender, height, weight
- Injury history, dietary restrictions

### Workout & Training Data
- Manually logged workouts (distance, duration, pace, heart rate)
- Training plans, programs, and race entries
- Workout session recordings and GPS routes

### Health & Wearable Data (with your permission)
When you connect Apple Health, Strava, or Garmin, we may collect:
- **Sleep**: Duration, efficiency, deep sleep, REM sleep, bedtime, wake time
- **Heart Rate**: Resting heart rate, average/max heart rate, heart rate variability (HRV)
- **Recovery**: Readiness scores, recovery scores, stress scores, body battery
- **Body Metrics**: Weight, body fat percentage
- **Activity**: Steps, active minutes, calories burned
- **Workouts**: Activities synced from connected services (type, distance, duration, splits, GPS)

You control which data types are shared via the Data Permissions toggles in Settings > Health Integrations.

### AI Coaching Data
- Chat conversations with Aria AI coach
- AI-generated training plans, nutrition plans, and programs

## 2. How We Use Your Data

### AI Coaching Personalization
Your health and training data is used to provide personalized coaching recommendations. For example:
- Sleep and HRV data help Aria adjust training intensity based on your recovery
- Heart rate trends help monitor cardiovascular fitness
- Readiness scores inform whether to recommend high intensity training or recovery

### Training Analytics
- Calculate weekly stats, progress trends, and performance insights
- Generate personalized training plans and nutrition recommendations

### App Functionality
- Account authentication and session management
- Syncing data across your devices
- Push notifications for workout reminders and coaching tips

## 3. Third-Party Services

### Apple Health (iOS)
- Data is read from Apple HealthKit on your device
- We request only the specific data types listed above
- Data is transmitted securely to our servers for AI coaching
- We do not write data back to Apple Health except for completed workouts

### Strava
- We use Strava's OAuth2 API to access your activities
- We import workout data (type, distance, duration, heart rate, splits)
- You can disconnect Strava at any time in Settings
- Disconnecting stops future syncs; existing imported data is preserved

### Garmin
- Garmin data syncs through Apple Health
- We do not connect directly to Garmin's API
- Enable Garmin > Apple Health sync in the Garmin Connect app

### AI Processing
- Your data is processed by Azure OpenAI (GPT-4o) to generate coaching responses
- Conversation history is stored to provide contextual coaching
- AI does not have access to other users' data

## 4. Data Storage & Security

- All data is stored on Microsoft Azure cloud infrastructure (West US region)
- Data is encrypted in transit (TLS 1.2+) and at rest
- Authentication tokens use JWT with short-lived access tokens (20 min) and rotating refresh tokens
- Passwords are hashed using bcrypt
- Health data access tokens (Strava) are encrypted in the database

## 5. Data Retention & Deletion

- Your data is retained as long as your account is active
- You can disconnect any health integration at any time, which stops future data collection
- To request complete deletion of your account and all associated data, contact us at the email below
- Upon account deletion, all personal data, health metrics, workouts, and AI conversations are permanently removed

## 6. Your Rights

You have the right to:
- **Access**: View all data we hold about you through the app
- **Control**: Choose which health data types to share via permission toggles
- **Disconnect**: Remove any connected service at any time
- **Delete**: Request complete account and data deletion
- **Portability**: Export your workout data

## 7. Children's Privacy

Aria is not intended for use by children under 13. We do not knowingly collect data from children under 13.

## 8. Changes to This Policy

We may update this Privacy Policy from time to time. We will notify you of significant changes through the app or via email.

## 9. Contact Us

For privacy questions or data deletion requests, contact:
**Email**: privacy@ariacoach.app
