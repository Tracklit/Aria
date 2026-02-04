# Deployment Guide

Complete guide for deploying Aria to production (iOS App Store, Google Play, and backend services).

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Backend Deployment](#backend-deployment)
4. [Mobile App Deployment](#mobile-app-deployment)
5. [App Store Submission (iOS)](#app-store-submission-ios)
6. [Google Play Submission (Android)](#google-play-submission-android)
7. [Post-Deployment](#post-deployment)
8. [Continuous Deployment](#continuous-deployment)

---

## Prerequisites

### Required Accounts
- [ ] Apple Developer Account ($99/year)
- [ ] Google Play Console Account ($25 one-time)
- [ ] Expo EAS Account (free tier available)
- [ ] Azure Account (for backend hosting)
- [ ] Azure Storage Account (for blob storage)
- [ ] OpenAI API Account (for AI features)

### Required Tools
- [ ] Node.js 18+
- [ ] Expo CLI (`npm install -g @expo/cli`)
- [ ] EAS CLI (`npm install -g eas-cli`)
- [ ] Xcode (Mac only, for iOS)
- [ ] Android Studio (for Android)

### Required Credentials
- [ ] TrackLitRN API credentials
- [ ] Azure Storage connection string
- [ ] OpenAI API key
- [ ] PostgreSQL database connection string
- [ ] Push notification certificates (APNs, FCM)

---

## Environment Configuration

### 1. Production Environment Variables

Create `.env.production` file:

```env
# API Configuration
API_BASE_URL=https://your-backend.azurewebsites.net
API_TIMEOUT=30000

# TrackLitRN Backend
TRACKLIT_API_URL=https://app-tracklit-prod-tnrusd.azurewebsites.net

# OpenAI Configuration
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o
OPENAI_MAX_TOKENS=1000

# Database
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require

# Azure Blob Storage
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...
AZURE_STORAGE_CONTAINER_NAME=profile-images

# Analytics (Optional)
AMPLITUDE_API_KEY=...
SENTRY_DSN=...

# Feature Flags
ENABLE_DEMO_MODE=true
ENABLE_ANALYTICS=true
ENABLE_PERFORMANCE_MONITORING=false
```

### 2. App Configuration

Update `app.json`:

```json
{
  "expo": {
    "name": "Aria",
    "slug": "aria-fitness",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "dark",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#0A0A0A"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.aria.fitness",
      "buildNumber": "1",
      "infoPlist": {
        "NSPhotoLibraryUsageDescription": "Aria needs access to your photo library to upload profile pictures.",
        "NSCameraUsageDescription": "Aria needs camera access to take profile pictures.",
        "NSLocationWhenInUseUsageDescription": "Aria needs your location to track workouts."
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#0A0A0A"
      },
      "package": "com.aria.fitness",
      "versionCode": 1,
      "permissions": [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "ACCESS_FINE_LOCATION"
      ]
    },
    "plugins": [
      "expo-router",
      [
        "expo-image-picker",
        {
          "photosPermission": "Aria needs access to your photos to upload profile pictures."
        }
      ]
    ],
    "extra": {
      "eas": {
        "projectId": "your-project-id"
      }
    }
  }
}
```

### 3. EAS Build Configuration

Create `eas.json`:

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      },
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "ios": {
        "bundler": "metro",
        "autoIncrement": true
      },
      "android": {
        "bundler": "metro",
        "autoIncrement": "versionCode"
      },
      "env": {
        "API_BASE_URL": "https://your-backend.azurewebsites.net"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your@email.com",
        "ascAppId": "1234567890",
        "appleTeamId": "TEAM_ID"
      },
      "android": {
        "serviceAccountKeyPath": "./service-account-key.json",
        "track": "internal"
      }
    }
  }
}
```

---

## Backend Deployment

### Option 1: Azure App Service (Recommended)

#### 1. Create Azure Resources

```bash
# Login to Azure
az login

# Create resource group
az group create --name aria-prod --location eastus

# Create App Service plan
az appservice plan create \
  --name aria-backend-plan \
  --resource-group aria-prod \
  --sku B1 \
  --is-linux

# Create Web App
az webapp create \
  --resource-group aria-prod \
  --plan aria-backend-plan \
  --name aria-backend-prod \
  --runtime "NODE|18-lts"
```

#### 2. Configure Environment Variables

```bash
# Set environment variables
az webapp config appsettings set \
  --resource-group aria-prod \
  --name aria-backend-prod \
  --settings \
    NODE_ENV=production \
    PORT=8080 \
    DATABASE_URL="postgresql://..." \
    OPENAI_API_KEY="sk-..." \
    AZURE_STORAGE_CONNECTION_STRING="..."
```

#### 3. Deploy Backend

```bash
# Build server
npm run build:server

# Deploy with Git
git remote add azure https://aria-backend-prod.scm.azurewebsites.net/aria-backend-prod.git
git push azure main

# Or deploy with Azure CLI
az webapp deployment source config-zip \
  --resource-group aria-prod \
  --name aria-backend-prod \
  --src backend.zip
```

#### 4. Enable SSL

```bash
# Azure automatically provides SSL certificate
# Verify at: https://aria-backend-prod.azurewebsites.net
```

### Option 2: Heroku

#### 1. Create Heroku App

```bash
# Login to Heroku
heroku login

# Create app
heroku create aria-backend-prod

# Add PostgreSQL addon
heroku addons:create heroku-postgresql:mini

# Add environment variables
heroku config:set NODE_ENV=production
heroku config:set OPENAI_API_KEY=sk-...
heroku config:set AZURE_STORAGE_CONNECTION_STRING=...
```

#### 2. Deploy

```bash
# Deploy to Heroku
git push heroku main

# Or deploy specific branch
git push heroku develop:main
```

#### 3. Scale

```bash
# Scale to 2 dynos
heroku ps:scale web=2

# Check status
heroku ps
```

### Option 3: Railway

#### 1. Setup Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Link to existing project
railway link
```

#### 2. Deploy

```bash
# Deploy
railway up

# Set environment variables
railway variables set DATABASE_URL=postgresql://...
```

### Backend Health Check

After deployment, verify backend is working:

```bash
# Health check
curl https://your-backend.azurewebsites.net/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2026-02-03T..."
}

# Test API endpoint
curl https://your-backend.azurewebsites.net/api/dashboard/state \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Mobile App Deployment

### 1. Prepare for Build

#### Update Version

```json
// app.json
{
  "expo": {
    "version": "1.0.0",
    "ios": {
      "buildNumber": "1"
    },
    "android": {
      "versionCode": 1
    }
  }
}
```

#### Generate Icons and Splash Screens

```bash
# Install icon generator
npm install -g @expo/image-utils

# Generate all required sizes
npx expo-optimize

# Or manually create:
# - icon.png (1024x1024)
# - adaptive-icon.png (1024x1024)
# - splash.png (2048x2048)
```

#### Clean Build

```bash
# Clear caches
npm start -- --clear

# Clean node modules
rm -rf node_modules
npm install

# Clean iOS build (if applicable)
cd ios
rm -rf Pods
pod install
cd ..
```

### 2. Build with EAS

#### Configure EAS

```bash
# Login to Expo
eas login

# Configure project
eas build:configure
```

#### Build for iOS

```bash
# Build for App Store
eas build --platform ios --profile production

# Or build for TestFlight
eas build --platform ios --profile preview

# Monitor build progress
eas build:list
```

#### Build for Android

```bash
# Build for Google Play
eas build --platform android --profile production

# Or build APK for testing
eas build --platform android --profile preview
```

### 3. Download Builds

```bash
# List recent builds
eas build:list

# Download specific build
eas build:download --platform ios --id BUILD_ID
```

---

## App Store Submission (iOS)

### 1. Prerequisites

#### App Store Connect Setup

1. **Create App**:
   - Go to [App Store Connect](https://appstoreconnect.apple.com)
   - Click "My Apps" → "+" → "New App"
   - Fill in app information:
     - Name: "Aria"
     - Primary Language: English
     - Bundle ID: com.aria.fitness
     - SKU: aria-fitness-001

2. **App Information**:
   - Category: Health & Fitness
   - Subcategory: Running
   - Content Rights: Yes (if applicable)

3. **Pricing**:
   - Price: Free
   - Availability: All countries

#### Required Assets

Create the following:

- **App Icon**: 1024x1024px (PNG, no transparency)
- **Screenshots** (5 required):
  - iPhone 6.7" Display (1290x2796)
  - iPhone 6.5" Display (1242x2688)
  - iPhone 5.5" Display (1242x2208)
- **App Preview Video** (optional but recommended)
- **Marketing Assets**:
  - Promotional text (170 characters)
  - Description (4000 characters)
  - Keywords (100 characters)
  - Support URL
  - Privacy Policy URL

### 2. Submit to App Store

#### Automated Submission (EAS)

```bash
# Submit to App Store
eas submit --platform ios --profile production

# Or manually specify build
eas submit --platform ios --id BUILD_ID
```

#### Manual Submission

1. **Upload Build**:
   ```bash
   # Use Xcode or Transporter app
   # Upload .ipa file to App Store Connect
   ```

2. **Configure App**:
   - Go to App Store Connect
   - Select your app
   - Go to "App Store" tab
   - Fill in required information:
     - Name
     - Subtitle (30 characters)
     - Privacy Policy URL
     - Category
     - Description
     - Keywords
     - Screenshots

3. **Submit for Review**:
   - Go to "Submit for Review"
   - Answer questions:
     - Does your app use encryption? (Usually yes)
     - Does your app access HealthKit? (If applicable)
     - Does your app use location? (If applicable)
   - Submit

### 3. App Review Notes

Provide the following to Apple reviewers:

```
Test Account:
Username: test-reviewer@aria.app
Password: TestPass123!

Notes:
- Demo mode is available for testing without backend connection
- Click "Demo Login" on welcome screen
- Profile picture upload requires photo library permission
- Chat features require network connection
- Workout tracking uses device location (when implemented)

Special Instructions:
- The app connects to TrackLitRN production backend
- Some features may require specific test data
- Contact support@aria.app for any issues
```

### 4. Review Timeline

- **Average Review Time**: 24-48 hours
- **Rejection Reasons** (common):
  - Missing privacy policy
  - Incomplete app information
  - Crashes during testing
  - Permissions not explained

---

## Google Play Submission (Android)

### 1. Prerequisites

#### Google Play Console Setup

1. **Create App**:
   - Go to [Google Play Console](https://play.google.com/console)
   - Click "Create app"
   - Fill in details:
     - App name: "Aria"
     - Default language: English
     - App or game: App
     - Free or paid: Free

2. **App Content**:
   - Privacy Policy URL (required)
   - App category: Health & Fitness
   - Target audience: Ages 13+

3. **Data Safety**:
   - Fill in data collection questionnaire
   - Specify what data you collect:
     - Personal info (email, name, photos)
     - Health & fitness data
     - Location data

#### Required Assets

- **App Icon**: 512x512px (PNG, 32-bit)
- **Feature Graphic**: 1024x500px (PNG or JPEG)
- **Screenshots** (2-8 required):
  - Phone: 1080x1920 minimum
  - 7-inch tablet (optional)
  - 10-inch tablet (optional)
- **Promotional Video** (optional): YouTube URL

### 2. Submit to Google Play

#### Automated Submission (EAS)

```bash
# Setup service account
# 1. Go to Google Play Console
# 2. Setup → API access
# 3. Create service account
# 4. Download JSON key

# Submit to Google Play
eas submit --platform android --profile production

# Or with service account key
eas submit \
  --platform android \
  --service-account-key-path ./service-account-key.json
```

#### Manual Submission

1. **Upload APK/AAB**:
   - Go to "Release" → "Production"
   - Click "Create new release"
   - Upload signed AAB file
   - Add release notes

2. **Fill Required Sections**:
   - Main store listing
   - Content rating (IARC questionnaire)
   - Target audience
   - News apps (if applicable)
   - COVID-19 contact tracing (if applicable)
   - Data safety

3. **Submit for Review**:
   - Review all sections
   - Click "Send for review"

### 3. Review Timeline

- **Average Review Time**: 1-7 days (varies significantly)
- **Staged Rollout**: Consider starting with 20% of users

---

## Post-Deployment

### 1. Monitoring

#### Error Tracking (Sentry)

```bash
# Install Sentry
npm install @sentry/react-native

# Configure in app
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://...@sentry.io/...',
  environment: 'production',
  enableAutoSessionTracking: true,
  sessionTrackingIntervalMillis: 30000,
});
```

#### Analytics (Amplitude)

```bash
# Install Amplitude
npm install @amplitude/analytics-react-native

# Configure
import { init, track } from '@amplitude/analytics-react-native';

init('YOUR_API_KEY');
track('App Opened');
```

#### Performance (Firebase)

```bash
# Install Firebase Performance
npm install @react-native-firebase/perf

# Auto-configured with Firebase
```

### 2. Push Notifications

#### Setup APNs (iOS)

1. Create APNs certificate in Apple Developer Portal
2. Upload to Firebase or your push service
3. Configure in app

#### Setup FCM (Android)

1. Create Firebase project
2. Add Android app
3. Download `google-services.json`
4. Configure in app

### 3. Crash Reporting

Monitor crashes:
- Sentry: Real-time error tracking
- Firebase Crashlytics: Crash reports
- Expo EAS: Build logs

### 4. App Updates

#### Over-The-Air (OTA) Updates

```bash
# Publish OTA update (for minor changes)
eas update --branch production --message "Fix dashboard loading"

# Channel-based updates
eas update --channel production
```

#### Full App Updates

```bash
# Bump version
# Update version in app.json

# Build new version
eas build --platform all --profile production

# Submit to stores
eas submit --platform all --profile production
```

---

## Continuous Deployment

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Build iOS
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
        run: |
          npm install -g eas-cli
          eas build --platform ios --profile production --non-interactive

      - name: Build Android
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
        run: eas build --platform android --profile production --non-interactive

      - name: Submit to stores
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
        run: |
          eas submit --platform ios --profile production --non-interactive
          eas submit --platform android --profile production --non-interactive
```

### Environment Secrets

Add to GitHub secrets:
- `EXPO_TOKEN`: Expo auth token
- `APPLE_ID`: Apple ID
- `APPLE_PASSWORD`: App-specific password
- `GOOGLE_SERVICE_ACCOUNT_KEY`: Google Play service account JSON

---

## Rollback Plan

If something goes wrong:

### Backend Rollback

```bash
# Azure
az webapp deployment slot swap \
  --resource-group aria-prod \
  --name aria-backend-prod \
  --slot staging

# Heroku
heroku releases:rollback

# Railway
railway rollback
```

### App Rollback

```bash
# Revert OTA update
eas update:republish --channel production --branch previous-version

# Remove from stores (last resort)
# - Remove from sale in App Store Connect
# - Unpublish from Google Play Console
```

---

## Production Checklist

Before going live:

### Backend
- [ ] Environment variables set
- [ ] SSL certificate configured
- [ ] Database backups enabled
- [ ] Monitoring enabled (uptime, errors)
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Health check endpoint working

### Mobile App
- [ ] Production API URL configured
- [ ] Error tracking integrated
- [ ] Analytics integrated
- [ ] Push notifications configured
- [ ] Icons and splash screens finalized
- [ ] Screenshots created
- [ ] App Store/Play Store listings complete
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Support email set up

### Testing
- [ ] Tested on real devices (iOS & Android)
- [ ] Tested all critical flows
- [ ] Load testing completed
- [ ] Security audit completed
- [ ] Accessibility testing completed

### Legal
- [ ] Privacy policy reviewed
- [ ] Terms of service reviewed
- [ ] GDPR compliance verified (if applicable)
- [ ] HIPAA compliance verified (if applicable)
- [ ] App Store guidelines reviewed
- [ ] Google Play policies reviewed

---

## Support

After deployment:

1. **Monitor user feedback**:
   - App Store reviews
   - Google Play reviews
   - Support emails

2. **Track metrics**:
   - Daily active users (DAU)
   - Monthly active users (MAU)
   - Retention rates
   - Crash rates

3. **Iterate**:
   - Fix critical bugs immediately
   - Plan feature updates
   - Respond to user feedback

---

**Deployment Complete!** 🎉

Your app is now live and ready for athletes around the world!
