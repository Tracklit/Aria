# Aria Companion Features API Documentation

Complete API reference for Aria's AI companion features including conversation memory, training logs, progress tracking, scheduling, injury management, and more.

## Base URL
All companion endpoints are prefixed with: `/api/v1`

---

## 🗣️ Conversation History

### Save Conversation Message
Store a message in the conversation history with contextual information.

**Endpoint:** `POST /api/v1/conversations`

**Request Body:**
```json
{
  "user_id": "user_123",
  "session_id": "optional_session_uuid", 
  "message": "I want to work on my acceleration today",
  "context": {
    "mood": "motivated",
    "location": "track",
    "weather": "sunny"
  }
}
```

**Response:**
```json
{
  "success": true,
  "conversation_id": 456,
  "session_id": "abc-def-123"
}
```

---

### Get Conversation History
Retrieve past conversation messages for continuity.

**Endpoint:** `GET /api/v1/conversations/{user_id}`

**Query Parameters:**
- `session_id` (optional): Filter by specific conversation session
- `limit` (optional, default: 50): Maximum messages to return

**Response:**
```json
{
  "success": true,
  "conversations": [
    {
      "conversation_id": 456,
      "session_id": "abc-def-123",
      "role": "user",
      "message": "I want to work on my acceleration today",
      "context": {"mood": "motivated"},
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "count": 1
}
```

---

### Get Recent Context
Get recent conversation context for maintaining continuity.

**Endpoint:** `GET /api/v1/conversations/{user_id}/context`

**Query Parameters:**
- `hours` (optional, default: 24): How far back to look for context

**Response:**
```json
{
  "success": true,
  "context": [
    {
      "session_id": "abc-def-123",
      "message": "I want to work on my acceleration",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "hours": 24
}
```

---

## 🏃 Training Sessions

### Log Training Session
Record a detailed training session with splits, heart rate, RPE, mood, and more.

**Endpoint:** `POST /api/v1/sessions`

**Request Body:**
```json
{
  "user_id": "user_123",
  "session_date": "2024-01-15",
  "session_type": "speed_work",
  "duration_minutes": 60,
  "distance_meters": 5000,
  "workout_description": "6x200m with 2min rest",
  "splits": [24.5, 24.8, 24.3, 24.9, 24.6, 24.4],
  "heart_rate": {
    "avg": 165,
    "max": 185,
    "zones": {"zone3": 15, "zone4": 30, "zone5": 15}
  },
  "rpe": 8,
  "notes": "Felt strong on last 3 reps",
  "mood_before": "nervous",
  "mood_after": "accomplished",
  "injuries_reported": null,
  "weather_conditions": "clear, 72F",
  "location": "track"
}
```

**Response:**
```json
{
  "success": true,
  "session_id": 789,
  "message": "Training session logged successfully"
}
```

---

### Get Training Sessions
Retrieve training session history.

**Endpoint:** `GET /api/v1/sessions/{user_id}`

**Query Parameters:**
- `start_date` (optional): Filter from date (YYYY-MM-DD)
- `end_date` (optional): Filter to date (YYYY-MM-DD)
- `limit` (optional, default: 30): Maximum sessions to return

**Response:**
```json
{
  "success": true,
  "sessions": [
    {
      "session_id": 789,
      "session_date": "2024-01-15",
      "session_type": "speed_work",
      "distance_meters": 5000,
      "rpe": 8,
      "mood_after": "accomplished"
    }
  ],
  "count": 1
}
```

---

## 📊 Progress & Analytics

### Track Progress Metric
Record a performance metric (time, distance, strength, etc.).

**Endpoint:** `POST /api/v1/progress/track`

**Request Body:**
```json
{
  "user_id": "user_123",
  "metric_type": "100m_time",
  "metric_value": 10.85,
  "metric_unit": "seconds",
  "metric_date": "2024-01-15",
  "notes": "Personal best! Perfect conditions"
}
```

**Response:**
```json
{
  "success": true,
  "metric_id": 234,
  "message": "Progress metric tracked successfully"
}
```

---

### Get Progress Analytics
Retrieve progress analytics with trends and statistics.

**Endpoint:** `GET /api/v1/progress/{user_id}`

**Query Parameters:**
- `metric_type` (optional): Filter by specific metric type
- `days` (optional, default: 90): Number of days to analyze

**Response:**
```json
{
  "success": true,
  "analytics": {
    "metrics": [
      {
        "metric_date": "2024-01-15",
        "metric_type": "100m_time",
        "metric_value": 10.85,
        "metric_unit": "seconds"
      }
    ],
    "trend": "improving",
    "best_value": 10.85,
    "avg_value": 11.02
  },
  "days": 90
}
```

---

## 📅 Calendar & Scheduling

### Create Calendar Event
Schedule training sessions, races, or recovery days.

**Endpoint:** `POST /api/v1/calendar/events`

**Request Body:**
```json
{
  "user_id": "user_123",
  "event_type": "race",
  "event_title": "State Championships - 100m",
  "event_date": "2024-06-15",
  "event_time": "14:30:00",
  "duration_minutes": 120,
  "description": "Preliminary heat at 2:30pm, finals at 5pm if qualified",
  "location": "State Stadium",
  "priority": "high"
}
```

**Response:**
```json
{
  "success": true,
  "event_id": 567,
  "message": "Calendar event created successfully"
}
```

---

### Get Calendar Events
Retrieve scheduled events in a date range.

**Endpoint:** `GET /api/v1/calendar/{user_id}`

**Query Parameters:**
- `start_date` (required): Start date (YYYY-MM-DD)
- `end_date` (required): End date (YYYY-MM-DD)

**Response:**
```json
{
  "success": true,
  "events": [
    {
      "event_id": 567,
      "event_type": "race",
      "event_title": "State Championships - 100m",
      "event_date": "2024-06-15",
      "event_time": "14:30:00",
      "location": "State Stadium",
      "priority": "high",
      "completed": false
    }
  ],
  "count": 1
}
```

---

## 🩹 Injury Tracking

### Report Injury
Report a new injury with details.

**Endpoint:** `POST /api/v1/injuries/report`

**Request Body:**
```json
{
  "user_id": "user_123",
  "injury_type": "strain",
  "body_part": "hamstring",
  "severity": "moderate",
  "onset_date": "2024-01-10",
  "description": "Felt tightness during acceleration drill, sharp pain on 4th rep",
  "treatment_plan": "RICE protocol, PT exercises, avoid sprinting for 7 days"
}
```

**Response:**
```json
{
  "success": true,
  "injury_id": 345,
  "message": "Injury reported successfully"
}
```

---

### Track Pain Level
Log pain levels over time for injury monitoring.

**Endpoint:** `POST /api/v1/pain/track`

**Request Body:**
```json
{
  "user_id": "user_123",
  "log_date": "2024-01-15",
  "pain_level": 3,
  "body_part": "hamstring",
  "injury_id": 345,
  "activity_at_time": "walking",
  "notes": "Pain reduced significantly, only slight discomfort"
}
```

**Response:**
```json
{
  "success": true,
  "pain_log_id": 678,
  "message": "Pain level logged successfully"
}
```

---

### Get Injury History
Retrieve injury history with optional recovery status filter.

**Endpoint:** `GET /api/v1/injuries/{user_id}/history`

**Query Parameters:**
- `include_recovered` (optional, default: false): Include recovered injuries

**Response:**
```json
{
  "success": true,
  "injuries": [
    {
      "injury_id": 345,
      "injury_type": "strain",
      "body_part": "hamstring",
      "severity": "moderate",
      "onset_date": "2024-01-10",
      "status": "recovering",
      "description": "Felt tightness during acceleration drill"
    }
  ],
  "count": 1
}
```

---

### Get Pain History
Retrieve pain log history.

**Endpoint:** `GET /api/v1/pain/{user_id}/history`

**Query Parameters:**
- `days` (optional, default: 30): Number of days to retrieve

**Response:**
```json
{
  "success": true,
  "pain_logs": [
    {
      "pain_log_id": 678,
      "log_date": "2024-01-15",
      "pain_level": 3,
      "body_part": "hamstring",
      "injury_id": 345,
      "notes": "Pain reduced significantly"
    }
  ],
  "days": 30
}
```

---

## 🎯 Drill Library

### Get Recommended Drills
Get personalized drill recommendations based on user profile and needs.

**Endpoint:** `GET /api/v1/drills/recommended/{user_id}`

**Query Parameters:**
- `limit` (optional, default: 10): Maximum drills to return

**Response:**
```json
{
  "success": true,
  "drills": [
    {
      "drill_id": 123,
      "drill_name": "A-Skip Progressions",
      "category": "technique",
      "difficulty": "beginner",
      "description": "Progressive A-skips focusing on knee drive",
      "video_url": "https://example.com/drills/a-skip.mp4",
      "recommended_reason": "Improves acceleration mechanics"
    }
  ],
  "count": 1
}
```

---

### Search Drills
Search the drill library by category, difficulty, or tags.

**Endpoint:** `GET /api/v1/drills/search`

**Query Parameters:**
- `category` (optional): Filter by category (technique, strength, speed, etc.)
- `difficulty` (optional): Filter by difficulty (beginner, intermediate, advanced)
- `tags` (optional): Filter by tags (comma-separated)

**Response:**
```json
{
  "success": true,
  "drills": [
    {
      "drill_id": 124,
      "drill_name": "Block Starts",
      "category": "speed",
      "difficulty": "intermediate",
      "description": "Explosive starts from starting blocks",
      "video_url": "https://example.com/drills/blocks.mp4"
    }
  ],
  "count": 1
}
```

---

## 🎯 Goals Tracking

### Create Goal
Set a new performance or training goal.

**Endpoint:** `POST /api/v1/goals`

**Request Body:**
```json
{
  "user_id": "user_123",
  "goal_type": "performance",
  "goal_title": "Break 11 seconds in 100m",
  "goal_description": "Run 100m in under 11.00 seconds by end of season",
  "target_value": 10.99,
  "target_unit": "seconds",
  "target_date": "2024-06-30",
  "current_value": 11.15,
  "priority": "high"
}
```

**Response:**
```json
{
  "success": true,
  "goal_id": 890,
  "message": "Goal created successfully"
}
```

---

### Get Active Goals
Retrieve all active goals.

**Endpoint:** `GET /api/v1/goals/{user_id}`

**Response:**
```json
{
  "success": true,
  "goals": [
    {
      "goal_id": 890,
      "goal_type": "performance",
      "goal_title": "Break 11 seconds in 100m",
      "target_value": 10.99,
      "current_value": 11.15,
      "progress_percentage": 13.3,
      "target_date": "2024-06-30",
      "status": "active"
    }
  ],
  "count": 1
}
```

---

### Update Goal Progress
Update current progress towards a goal.

**Endpoint:** `PUT /api/v1/goals/{goal_id}/progress`

**Request Body:**
```json
{
  "current_value": 11.08
}
```

**Response:**
```json
{
  "success": true,
  "message": "Goal progress updated successfully"
}
```

---

## 🍎 Nutrition Tracking

### Log Nutrition
Log a meal with nutritional details.

**Endpoint:** `POST /api/v1/nutrition/log`

**Request Body:**
```json
{
  "user_id": "user_123",
  "log_date": "2024-01-15",
  "meal_type": "breakfast",
  "meal_description": "Oatmeal with banana, eggs, orange juice",
  "calories": 520,
  "protein_grams": 22,
  "carbs_grams": 68,
  "fats_grams": 14,
  "hydration_ml": 250,
  "timing": "07:30:00",
  "notes": "Pre-morning training meal"
}
```

**Response:**
```json
{
  "success": true,
  "nutrition_id": 234,
  "message": "Nutrition logged successfully"
}
```

---

### Track Hydration
Log water or fluid intake.

**Endpoint:** `POST /api/v1/hydration/track`

**Request Body:**
```json
{
  "user_id": "user_123",
  "log_date": "2024-01-15",
  "log_time": "10:30:00",
  "amount_ml": 500,
  "beverage_type": "water"
}
```

**Response:**
```json
{
  "success": true,
  "hydration_id": 567,
  "message": "Hydration logged successfully"
}
```

---

### Get Daily Nutrition Summary
Get nutrition summary for a specific day.

**Endpoint:** `GET /api/v1/nutrition/{user_id}/daily`

**Query Parameters:**
- `log_date` (required): Date to retrieve (YYYY-MM-DD)

**Response:**
```json
{
  "success": true,
  "summary": {
    "total_calories": 2340,
    "total_protein": 145,
    "total_carbs": 298,
    "total_fats": 67,
    "total_hydration": 2800,
    "meals": [
      {
        "meal_type": "breakfast",
        "calories": 520,
        "timing": "07:30:00"
      }
    ]
  },
  "date": "2024-01-15"
}
```

---

## 🧠 Mental Performance

### Log Mental Performance
Track mental state, stress, confidence, and focus.

**Endpoint:** `POST /api/v1/mental/log`

**Request Body:**
```json
{
  "user_id": "user_123",
  "log_date": "2024-01-15",
  "log_type": "pre_workout",
  "mood": "focused",
  "stress_level": 3,
  "confidence_level": 8,
  "focus_quality": 9,
  "sleep_quality": 7,
  "anxiety_level": 2,
  "notes": "Feeling ready for today's speed work",
  "techniques_used": ["visualization", "breathing"],
  "duration_minutes": 10
}
```

**Response:**
```json
{
  "success": true,
  "mental_log_id": 456,
  "message": "Mental performance logged successfully"
}
```

---

### Get Mental Exercises
Retrieve mental training exercises.

**Endpoint:** `GET /api/v1/mental/exercises`

**Query Parameters:**
- `exercise_type` (optional): Filter by type (visualization, meditation, breathing, etc.)

**Response:**
```json
{
  "success": true,
  "exercises": [
    {
      "exercise_id": 12,
      "exercise_name": "Pre-Race Visualization",
      "exercise_type": "visualization",
      "description": "Visualize your perfect race from start to finish",
      "duration_minutes": 5,
      "instructions": "Close your eyes. Imagine yourself in the blocks..."
    }
  ],
  "count": 1
}
```

---

## 🔔 Proactive Engagement

### Get Proactive Suggestions
Retrieve AI-generated proactive suggestions.

**Endpoint:** `GET /api/v1/suggestions/{user_id}`

**Query Parameters:**
- `limit` (optional, default: 5): Maximum suggestions to return

**Response:**
```json
{
  "success": true,
  "suggestions": [
    {
      "suggestion_id": 789,
      "suggestion_type": "training_reminder",
      "message": "You haven't logged a speed workout this week. Want to schedule one?",
      "priority": "medium",
      "created_at": "2024-01-15T08:00:00Z",
      "expires_at": "2024-01-16T08:00:00Z"
    }
  ],
  "count": 1
}
```

---

### Get Pending Check-Ins
Retrieve scheduled check-ins from Aria.

**Endpoint:** `GET /api/v1/check-ins/{user_id}`

**Response:**
```json
{
  "success": true,
  "check_ins": [
    {
      "check_in_id": 234,
      "check_in_type": "morning",
      "scheduled_time": "07:00:00",
      "message": "Good morning! How are you feeling today?",
      "completed": false
    }
  ],
  "count": 1
}
```

---

## 🏆 Achievements

### Get Recent Achievements
Retrieve recent achievements and badges earned.

**Endpoint:** `GET /api/v1/achievements/{user_id}`

**Query Parameters:**
- `days` (optional, default: 30): Number of days to retrieve

**Response:**
```json
{
  "success": true,
  "achievements": [
    {
      "achievement_id": 567,
      "achievement_type": "milestone",
      "title": "First Sub-11!",
      "description": "You ran your first sub-11 second 100m!",
      "badge_icon": "🏆",
      "earned_date": "2024-01-15"
    }
  ],
  "count": 1,
  "days": 30
}
```

---

## Authentication & Rate Limiting

All endpoints require authentication via JWT token or API key:

```
Authorization: Bearer <your_jwt_token>
```

or

```
X-API-Key: <your_api_key>
```

### Rate Limits by Subscription Tier

- **Free Tier**: 50 requests/day
- **Pro Tier**: 500 requests/day
- **Elite Tier**: Unlimited

Rate limit headers are returned with each response:
```
X-RateLimit-Limit: 500
X-RateLimit-Remaining: 487
X-RateLimit-Reset: 1642334400
```

---

## Error Responses

All endpoints return standardized error responses:

```json
{
  "detail": "Error message describing what went wrong"
}
```

### Common HTTP Status Codes

- `200 OK`: Success
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

---

## Complete API Flow Example

Here's a typical workflow using multiple companion features:

### 1. Morning Check-In
```bash
# Get pending check-ins
GET /api/v1/check-ins/user_123

# Log mental state
POST /api/v1/mental/log
{
  "user_id": "user_123",
  "log_date": "2024-01-15",
  "mood": "energized",
  "stress_level": 2,
  "confidence_level": 8
}
```

### 2. Pre-Workout
```bash
# Check calendar for today's plan
GET /api/v1/calendar/user_123?start_date=2024-01-15&end_date=2024-01-15

# Get recommended drills
GET /api/v1/drills/recommended/user_123

# Check injury status
GET /api/v1/injuries/user_123/history
```

### 3. During Training
```bash
# Save conversation with Aria
POST /api/v1/conversations
{
  "user_id": "user_123",
  "message": "Just finished my 6x200m, felt great!"
}
```

### 4. Post-Workout
```bash
# Log training session
POST /api/v1/sessions
{
  "user_id": "user_123",
  "session_date": "2024-01-15",
  "workout_description": "6x200m speed work",
  "splits": [24.5, 24.3, 24.1, 24.4, 24.2, 23.9],
  "rpe": 8
}

# Track progress metric if PR
POST /api/v1/progress/track
{
  "user_id": "user_123",
  "metric_type": "200m_time",
  "metric_value": 23.9,
  "metric_unit": "seconds"
}

# Log nutrition
POST /api/v1/nutrition/log
{
  "user_id": "user_123",
  "meal_type": "post_workout",
  "meal_description": "Protein shake with banana"
}
```

### 5. Review Progress
```bash
# Get progress analytics
GET /api/v1/progress/user_123?days=30

# Check achievements
GET /api/v1/achievements/user_123

# Get proactive suggestions
GET /api/v1/suggestions/user_123
```

---

## Next Steps

- **Implementation Priority**: Endpoints are organized by importance
- **Caching**: Frequently accessed data will be cached in Redis
- **AI Integration**: Proactive suggestions use training patterns and AI analysis
- **Voice Support**: Coming soon with Azure Speech Services integration

For questions or support, contact the development team.
