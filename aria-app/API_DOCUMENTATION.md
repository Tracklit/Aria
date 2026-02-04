# API Documentation

Complete API reference for Aria backend and TrackLitRN integration.

---

## Table of Contents

1. [Base URLs](#base-urls)
2. [Authentication](#authentication)
3. [User & Profile](#user--profile)
4. [Dashboard](#dashboard)
5. [Chat (Sprinthia)](#chat-sprinthia)
6. [Workouts](#workouts)
7. [Training Plans](#training-plans)
8. [Analytics](#analytics)
9. [Social](#social)
10. [Equipment](#equipment)
11. [Races](#races)
12. [Error Handling](#error-handling)
13. [Rate Limiting](#rate-limiting)

---

## Base URLs

### Production
```
TrackLitRN: https://app-tracklit-prod-tnrusd.azurewebsites.net
Aria Backend: https://your-backend.azurewebsites.net
```

### Development
```
TrackLitRN: https://app-tracklit-prod-tnrusd.azurewebsites.net
Aria Backend: http://localhost:3000
```

---

## Authentication

### Login

```http
POST /api/mobile/login
```

**Request Body:**
```json
{
  "username": "athlete123",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 123,
    "username": "athlete123",
    "email": "athlete@example.com",
    "name": "John Athlete",
    "subscriptionTier": "premium",
    "sprinthiaPrompts": 100
  }
}
```

**Status Codes:**
- `200 OK` - Login successful
- `401 Unauthorized` - Invalid credentials
- `429 Too Many Requests` - Rate limit exceeded

---

### Register

```http
POST /api/mobile/register
```

**Request Body:**
```json
{
  "username": "newathlete",
  "email": "newathlete@example.com",
  "password": "securepassword",
  "displayName": "New Athlete"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 124,
    "username": "newathlete",
    "email": "newathlete@example.com"
  }
}
```

**Status Codes:**
- `201 Created` - Registration successful
- `400 Bad Request` - Validation error
- `409 Conflict` - Username or email already exists

---

### Logout

```http
POST /api/logout
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
```

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

---

## User & Profile

### Get Current User

```http
GET /api/user
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
```

**Response:**
```json
{
  "id": 123,
  "username": "athlete123",
  "email": "athlete@example.com",
  "name": "John Athlete",
  "profile": {
    "displayName": "John",
    "photoUrl": "https://storage.blob.core.windows.net/...",
    "sport": "running",
    "experienceLevel": "intermediate",
    "goalTags": ["5k-pr", "marathon-prep"],
    "units": "imperial",
    "weeklyGoalDistance": 50,
    "weeklyGoalDuration": 300,
    "onboardingCompleted": true
  }
}
```

---

### Update Profile

```http
PATCH /api/user
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "displayName": "Johnny",
  "sport": "triathlon",
  "experienceLevel": "advanced",
  "goalTags": ["ironman"],
  "weeklyGoalDistance": 100
}
```

**Response:**
```json
{
  "id": 123,
  "profile": {
    "displayName": "Johnny",
    "sport": "triathlon",
    "experienceLevel": "advanced",
    "goalTags": ["ironman"],
    "weeklyGoalDistance": 100
  }
}
```

---

### Upload Profile Picture

```http
POST /api/user/public-profile
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
Content-Type: multipart/form-data
```

**Request Body:**
```
profileImage: <binary-data>
```

**Response:**
```json
{
  "profileImageUrl": "https://storage.blob.core.windows.net/profile-images/user-123-1234567890.jpg"
}
```

**Notes:**
- Image should be JPEG format
- Max size: 5MB
- Recommended: 400x400px, compressed

---

## Dashboard

### Get Dashboard State

```http
GET /api/dashboard/state
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
```

**Response:**
```json
{
  "mode": "workout_ready",
  "greeting": "Good morning, John!",
  "subtitle": "You have a tempo run scheduled today",
  "cards": [
    {
      "type": "workout_card",
      "title": "Tempo Run",
      "subtitle": "Scheduled for 10:00 AM",
      "content": {
        "details": [
          { "icon": "time", "text": "45 minutes" },
          { "icon": "location", "text": "6.2 miles" },
          { "icon": "speedometer", "text": "7:15/mi pace" }
        ]
      },
      "cta": {
        "label": "Start Workout",
        "action": "start_workout",
        "data": { "workoutId": 456 }
      },
      "priority": 1,
      "order": 0
    },
    {
      "type": "stats_row",
      "title": "This Week",
      "content": {
        "stats": [
          { "value": "24.5", "label": "Miles", "change": 8 },
          { "value": "3:15", "label": "Hours", "change": 5 },
          { "value": "4", "label": "Workouts", "change": 0 }
        ]
      },
      "priority": 2,
      "order": 1
    }
  ]
}
```

**Dashboard Modes:**
- `general` - Default state
- `workout_ready` - Workout scheduled today
- `competition_day` - Race within 14 days
- `recovery_focus` - High training load
- `rest_day` - Rest day scheduled

**Card Types:**
- `workout_card` - Today's planned workout
- `competition_card` - Race countdown
- `insight_card` - AI-generated insights
- `streak_card` - Milestone celebrations
- `stats_row` - Weekly summary

**Cache:**
- Response cached for 5 minutes
- Use `Cache-Control: no-cache` header to force refresh

---

## Chat (Sprinthia)

### Send Message

```http
POST /api/sprinthia/chat
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "message": "What's a good warmup for 5k training?",
  "conversationId": 789
}
```

**Response (Non-Streaming):**
```json
{
  "response": "A good warmup for 5k training should include...",
  "conversationId": 789,
  "messageId": 1234
}
```

---

### Send Message (Streaming)

```http
POST /api/sprinthia/chat
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json
Accept: text/event-stream
```

**Request Body:**
```json
{
  "message": "What's a good warmup for 5k training?",
  "conversationId": 789,
  "stream": true
}
```

**Response (Server-Sent Events):**
```
data: {"chunk": "A good "}

data: {"chunk": "warmup "}

data: {"chunk": "for 5k "}

data: {"chunk": "training should "}

data: [DONE]
```

**Implementation Example:**
```typescript
const response = await fetch(url, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream',
  },
  body: JSON.stringify({ message, stream: true }),
});

const reader = response.body?.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      if (data === '[DONE]') return;

      try {
        const parsed = JSON.parse(data);
        onChunk(parsed.chunk);
      } catch (error) {
        console.error('Failed to parse chunk:', error);
      }
    }
  }
}
```

---

### Get Conversations

```http
GET /api/sprinthia/conversations
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
```

**Response:**
```json
[
  {
    "id": 789,
    "title": "5k Training Tips",
    "createdAt": "2026-01-15T10:30:00Z",
    "updatedAt": "2026-01-20T14:22:00Z"
  },
  {
    "id": 790,
    "title": "Marathon Preparation",
    "createdAt": "2026-01-22T08:00:00Z",
    "updatedAt": "2026-01-25T16:45:00Z"
  }
]
```

---

### Get Conversation Messages

```http
GET /api/sprinthia/conversations/:id/messages
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
```

**Response:**
```json
[
  {
    "id": 1230,
    "conversationId": 789,
    "role": "user",
    "content": "What's a good warmup for 5k training?",
    "createdAt": "2026-01-15T10:30:00Z"
  },
  {
    "id": 1231,
    "conversationId": 789,
    "role": "assistant",
    "content": "A good warmup for 5k training should include...",
    "createdAt": "2026-01-15T10:30:15Z"
  }
]
```

---

### Delete Conversation

```http
DELETE /api/sprinthia/conversations/:id
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
```

**Response:**
```json
{
  "message": "Conversation deleted successfully"
}
```

---

## Workouts

### Get Workouts

```http
GET /api/workouts?status=completed&limit=20&offset=0
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
```

**Query Parameters:**
- `status` - Filter by status (`planned`, `active`, `completed`, `skipped`)
- `sport` - Filter by sport (`running`, `cycling`, etc.)
- `startDate` - ISO 8601 date
- `endDate` - ISO 8601 date
- `limit` - Results per page (default: 50)
- `offset` - Page offset (default: 0)

**Response:**
```json
{
  "data": [
    {
      "id": 456,
      "userId": 123,
      "type": "tempo_run",
      "sport": "running",
      "title": "Tempo Run",
      "description": "45 minutes at tempo pace",
      "completedDate": "2026-02-03T10:30:00Z",
      "duration": 2700,
      "distance": 9978,
      "avgPace": "7:15",
      "avgHeartRate": 165,
      "maxHeartRate": 178,
      "calories": 450,
      "status": "completed"
    }
  ],
  "pagination": {
    "page": 0,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

### Create Workout

```http
POST /api/workouts
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "type": "easy_run",
  "sport": "running",
  "title": "Easy Run",
  "description": "Recovery run",
  "plannedDate": "2026-02-04T10:00:00Z",
  "duration": 1800,
  "distance": 4828
}
```

**Response:**
```json
{
  "id": 457,
  "userId": 123,
  "type": "easy_run",
  "title": "Easy Run",
  "status": "planned",
  "createdAt": "2026-02-03T20:15:00Z"
}
```

---

### Complete Workout

```http
POST /api/workouts/:id/complete
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "completedDate": "2026-02-04T10:35:00Z",
  "duration": 1890,
  "distance": 5150,
  "avgPace": "6:08",
  "avgHeartRate": 145,
  "maxHeartRate": 160,
  "perceivedEffort": 4,
  "notes": "Felt good, legs fresh"
}
```

**Response:**
```json
{
  "id": 457,
  "status": "completed",
  "completedDate": "2026-02-04T10:35:00Z",
  "duration": 1890,
  "distance": 5150
}
```

---

### Get Today's Workout

```http
GET /api/workouts/planned
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
```

**Response:**
```json
{
  "id": 458,
  "type": "interval_training",
  "title": "Speed Intervals",
  "description": "8x400m at 5k pace with 200m recovery",
  "plannedDate": "2026-02-04T17:00:00Z",
  "duration": 3600,
  "status": "planned"
}
```

---

## Training Plans

### Get Training Plans

```http
GET /api/training-plans
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
```

**Response:**
```json
[
  {
    "id": 10,
    "name": "5K PR Plan",
    "sport": "running",
    "weeks": 8,
    "startDate": "2026-01-01",
    "endDate": "2026-02-26",
    "goalEvent": "City 5K",
    "status": "active",
    "completedWorkouts": 18,
    "totalWorkouts": 32
  }
]
```

---

### Get Training Plan Details

```http
GET /api/training-plans/:id
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
```

**Response:**
```json
{
  "id": 10,
  "name": "5K PR Plan",
  "description": "8-week plan to set a new 5K PR",
  "sport": "running",
  "weeks": 8,
  "status": "active",
  "workouts": [
    {
      "id": 101,
      "weekNumber": 1,
      "dayOfWeek": 1,
      "type": "easy_run",
      "title": "Easy Run",
      "duration": 1800,
      "distance": 4828,
      "intensity": "easy",
      "completed": true
    }
  ]
}
```

---

### Generate AI Insights

**NEW IN PHASE 2**

```http
POST /api/dashboard/generate-insights
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "context": {
    "profile": {
      "sport": "running",
      "experienceLevel": "intermediate",
      "goalTags": ["5k-pr"],
      "weeklyGoalDistance": 50000
    },
    "recentWorkouts": [...],
    "upcomingRaces": [...],
    "weeklyStats": {
      "totalDistance": 40233,
      "totalDuration": 14400,
      "workoutCount": 5,
      "avgPace": "7:30"
    },
    "chatHistory": [...],
    "currentStreak": 7,
    "trainingLoad": 450,
    "aggregatedAt": "2026-02-03T20:00:00Z"
  },
  "maxInsights": 5
}
```

**Response:**
```json
{
  "mode": "workout_ready",
  "greeting": "Great momentum, John!",
  "subtitle": "You're on a 7-day streak. Let's keep it going!",
  "cards": [
    {
      "type": "workout_card",
      "title": "Tempo Run",
      "subtitle": "Recommended for today",
      "content": {
        "details": [
          { "icon": "time", "text": "45 minutes" },
          { "icon": "location", "text": "6.2 miles" }
        ]
      },
      "priority": 1,
      "order": 0
    }
  ],
  "insights": [
    {
      "id": "insight-1",
      "type": "tip",
      "title": "Training Load Increasing",
      "message": "Your training load has increased by 15% this week. Consider adding an extra rest day to avoid overtraining.",
      "confidence": 0.85,
      "priority": 2,
      "actionable": true,
      "suggestedAction": "Schedule a rest day this week"
    },
    {
      "id": "insight-2",
      "type": "encouragement",
      "title": "7-Day Streak!",
      "message": "Amazing consistency! You're building great habits.",
      "confidence": 1.0,
      "priority": 3,
      "actionable": false
    },
    {
      "id": "insight-3",
      "type": "prediction",
      "title": "5K PR Opportunity",
      "message": "Based on your recent workouts, you're on track for a new 5K PR within 3 weeks.",
      "confidence": 0.78,
      "priority": 2,
      "actionable": true,
      "suggestedAction": "Register for an upcoming 5K race"
    }
  ]
}
```

**Notes:**
- Powered by OpenAI GPT-4o
- Context should include all relevant user data
- Response is cached for 30 minutes
- Insights are prioritized (1 = highest, 10 = lowest)
- Types: `warning`, `tip`, `prediction`, `encouragement`

---

## Analytics

### Get Weekly Summary

```http
GET /api/analytics/summary?period=week
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
```

**Query Parameters:**
- `period` - Time period (`week`, `month`, `year`)
- `startDate` - ISO 8601 date
- `endDate` - ISO 8601 date

**Response:**
```json
{
  "period": "week",
  "startDate": "2026-01-27",
  "endDate": "2026-02-02",
  "totalDistance": 40233,
  "totalDuration": 14400,
  "totalWorkouts": 5,
  "avgPace": "7:30",
  "avgHeartRate": 152,
  "totalCalories": 2100
}
```

---

### Get Trends

```http
GET /api/analytics/trends?metric=distance&period=month
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
```

**Query Parameters:**
- `metric` - Metric to track (`distance`, `duration`, `pace`, `heartRate`)
- `period` - Time period (`week`, `month`, `3months`, `year`)

**Response:**
```json
{
  "metric": "distance",
  "period": "month",
  "data": [
    { "date": "2026-01-06", "value": 32186, "label": "Week 1" },
    { "date": "2026-01-13", "value": 38624, "label": "Week 2" },
    { "date": "2026-01-20", "value": 41843, "label": "Week 3" },
    { "date": "2026-01-27", "value": 40233, "label": "Week 4" }
  ]
}
```

---

### Get Training Patterns

**NEW IN PHASE 2**

```http
GET /api/analytics/patterns
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
```

**Response:**
```json
{
  "patterns": [
    {
      "type": "overtraining",
      "confidence": 0.72,
      "description": "You've increased your weekly volume by more than 20% in the last 3 weeks, which is above the recommended 10% weekly increase.",
      "recommendation": "Reduce this week's mileage by 15% and add an extra rest day.",
      "detectedAt": "2026-02-03T20:00:00Z",
      "severity": "high"
    },
    {
      "type": "improving",
      "confidence": 0.88,
      "description": "Your average pace has improved by 8% over the last month while maintaining consistent effort levels.",
      "recommendation": "Continue with your current training plan. Consider testing your fitness with a time trial.",
      "detectedAt": "2026-02-03T20:00:00Z",
      "severity": "low"
    }
  ]
}
```

**Pattern Types:**
- `overtraining` - Training load too high
- `undertraining` - Training volume too low for goals
- `peaking` - Performance trending upward
- `plateau` - Performance stagnating
- `consistent` - Maintaining steady progress
- `improving` - Measurable improvement

**Severity Levels:**
- `low` - Informational
- `medium` - Should address soon
- `high` - Needs immediate attention

---

### Get Fatigue Score

**NEW IN PHASE 2**

```http
GET /api/analytics/fatigue-score
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
```

**Response:**
```json
{
  "score": 68,
  "trend": "increasing",
  "recommendation": "Your fatigue is building. Consider taking a rest day or doing an easy recovery workout instead of your planned tempo run.",
  "factors": [
    "3 hard workouts in the last 4 days",
    "Weekly mileage 25% above normal",
    "Heart rate variability down 12%"
  ],
  "riskLevel": "medium"
}
```

**Fatigue Score Scale:**
- `0-30`: Well rested, ready for hard training
- `31-60`: Normal fatigue, proceed with plan
- `61-80`: Elevated fatigue, consider easier workouts
- `81-100`: High fatigue, rest needed

**Trend:**
- `increasing` - Fatigue building
- `stable` - Fatigue consistent
- `decreasing` - Recovery progressing

**Risk Level:**
- `low` - No action needed
- `medium` - Monitor closely
- `high` - Immediate action recommended

---

### Get Performance Metrics

**NEW IN PHASE 2**

```http
GET /api/analytics/performance?period=month
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
```

**Query Parameters:**
- `period` - Time period (`week`, `month`, `year`)

**Response:**
```json
{
  "vo2Max": 52.3,
  "trainingLoad": 450,
  "fitnessLevel": 75,
  "fatigueLevel": 68,
  "formLevel": 7,
  "injuryRisk": "medium"
}
```

**Metrics:**
- `vo2Max` - Estimated VO2 max (ml/kg/min)
- `trainingLoad` - Cumulative training impulse
- `fitnessLevel` - Long-term fitness (0-100)
- `fatigueLevel` - Short-term fatigue (0-100)
- `formLevel` - Fitness - Fatigue (-50 to +50)
- `injuryRisk` - Risk assessment (`low`, `medium`, `high`)

---

### Get Injury Risk

**NEW IN PHASE 2**

```http
GET /api/analytics/injury-risk
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
```

**Response:**
```json
{
  "risk": "medium",
  "score": 0.58,
  "factors": [
    {
      "type": "rapid_volume_increase",
      "severity": "high",
      "description": "Weekly volume increased by 28% (recommended max: 10%)"
    },
    {
      "type": "insufficient_recovery",
      "severity": "medium",
      "description": "Only 1 rest day in the last 10 days"
    }
  ],
  "recommendations": [
    "Reduce next week's mileage by 20%",
    "Add 2 rest days this week",
    "Focus on sleep quality (8+ hours)"
  ]
}
```

---

### Get Performance Predictions

**NEW IN PHASE 2**

```http
GET /api/analytics/predictions
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
```

**Response:**
```json
{
  "predictions": [
    {
      "event": "5K",
      "predictedTime": "19:45",
      "confidence": 0.82,
      "currentPR": "20:30",
      "improvement": "3.7%",
      "timeframe": "3-4 weeks"
    },
    {
      "event": "10K",
      "predictedTime": "42:15",
      "confidence": 0.75,
      "currentPR": "44:00",
      "improvement": "4.0%",
      "timeframe": "6-8 weeks"
    }
  ],
  "readinessScore": 78,
  "nextMilestone": "Sub-20 5K",
  "estimatedDays": 21
}
```

---

## Error Handling

All API errors follow this format:

```json
{
  "error": "ValidationError",
  "message": "Invalid workout data",
  "statusCode": 400,
  "timestamp": "2026-02-03T20:30:00Z",
  "path": "/api/workouts"
}
```

### Error Codes

- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource already exists
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error
- `503 Service Unavailable` - Service temporarily unavailable

### Retry Strategy

For `5xx` errors and network failures:

```typescript
import { retryWithBackoff } from './src/lib/retry';

const result = await retryWithBackoff(
  () => apiRequest('/api/endpoint'),
  {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
  }
);
```

---

## Rate Limiting

### Limits

- **General API**: 100 requests per minute per user
- **Chat API**: 10 requests per minute per user
- **Login**: 5 attempts per 5 minutes per IP
- **Profile Picture Upload**: 5 uploads per hour per user

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1706998800
```

### Rate Limit Exceeded

```json
{
  "error": "RateLimitExceeded",
  "message": "Rate limit exceeded. Try again in 45 seconds.",
  "statusCode": 429,
  "retryAfter": 45
}
```

---

## Pagination

For paginated endpoints:

### Request

```http
GET /api/workouts?limit=20&offset=40
```

### Response

```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": true
  }
}
```

---

## Webhook Events

Aria backend can send webhook events for real-time updates:

### Webhook Payload

```json
{
  "event": "workout.completed",
  "timestamp": "2026-02-03T20:30:00Z",
  "data": {
    "userId": 123,
    "workoutId": 456,
    "distance": 5000,
    "duration": 1890
  }
}
```

### Webhook Events

- `workout.created`
- `workout.completed`
- `workout.updated`
- `message.received`
- `achievement.unlocked`
- `plan.completed`

### Webhook Signature

```
X-Aria-Signature: sha256=abc123...
```

Verify with HMAC:

```typescript
import crypto from 'crypto';

function verifyWebhook(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return `sha256=${expectedSignature}` === signature;
}
```

---

## Testing

### Test Endpoints

```bash
# Health check
curl https://your-backend.azurewebsites.net/health

# Login
curl -X POST https://your-backend.azurewebsites.net/api/mobile/login \
  -H "Content-Type: application/json" \
  -d '{"username": "test", "password": "test123"}'

# Get dashboard (with auth)
curl https://your-backend.azurewebsites.net/api/dashboard/state \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Postman Collection

Import the Postman collection for easy testing:

```json
{
  "info": {
    "name": "Aria API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Login",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/api/mobile/login",
        "body": {
          "mode": "raw",
          "raw": "{\"username\": \"test\", \"password\": \"test123\"}"
        }
      }
    }
  ]
}
```

---

## SDK Usage

### TypeScript SDK

```typescript
import { apiRequest } from './src/lib/api';
import type { DashboardState, Workout } from './src/types/api';

// Get dashboard
const dashboard = await apiRequest<DashboardState>('/api/dashboard/state');

// Get workouts
const workouts = await apiRequest<{ data: Workout[] }>('/api/workouts');

// Create workout
const newWorkout = await apiRequest<Workout>('/api/workouts', {
  method: 'POST',
  data: {
    type: 'easy_run',
    title: 'Easy Run',
    plannedDate: new Date().toISOString(),
  },
});
```

---

## Additional Resources

- [TrackLitRN Backend](https://github.com/vocarista/tracklitrn-backend)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Azure Blob Storage API](https://docs.microsoft.com/en-us/rest/api/storageservices/blob-service-rest-api)

---

**API Version**: 1.0.0
**Last Updated**: February 3, 2026
