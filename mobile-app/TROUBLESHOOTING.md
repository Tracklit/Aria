# Troubleshooting Guide

Common issues and solutions for Aria development and testing.

---

## Table of Contents

1. [Installation Issues](#installation-issues)
2. [Build Errors](#build-errors)
3. [Runtime Errors](#runtime-errors)
4. [API Connection Issues](#api-connection-issues)
5. [Authentication Problems](#authentication-problems)
6. [Chat Issues](#chat-issues)
7. [Dashboard Problems](#dashboard-problems)
8. [Performance Issues](#performance-issues)
9. [iOS Specific Issues](#ios-specific-issues)
10. [Android Specific Issues](#android-specific-issues)

---

## Installation Issues

### Problem: `npm install` fails with permission errors

**Solution**:
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and lockfile
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

### Problem: Expo CLI not found

**Solution**:
```bash
# Install Expo CLI globally
npm install -g @expo/cli

# Or use npx (recommended)
npx expo start
```

### Problem: iOS Pods installation fails

**Solution**:
```bash
cd ios
pod install --repo-update
cd ..
```

---

## Build Errors

### Problem: TypeScript errors after pulling latest code

**Solution**:
```bash
# Clear TypeScript cache
rm -rf node_modules/.cache

# Reinstall dependencies
npm install

# Clear metro bundler cache
npm start -- --clear
```

### Problem: "Unable to resolve module" errors

**Solution**:
```bash
# Clear all caches
npm start -- --clear

# Or reset metro bundler
npx expo start -c

# If still failing, reinstall dependencies
rm -rf node_modules
npm install
```

### Problem: Build fails with "Duplicate symbols" error

**Solution**:
```bash
# Clean build folders
cd ios
rm -rf Pods
rm Podfile.lock
pod install
cd ..

# Clean Android build (if applicable)
cd android
./gradlew clean
cd ..
```

---

## Runtime Errors

### Problem: App crashes on startup

**Symptoms**: White screen, immediate crash, or "Something went wrong" error boundary

**Solutions**:

1. **Check Error Boundary**:
   ```typescript
   // App should show error details in dev mode
   // Check console for error message
   ```

2. **Clear AsyncStorage**:
   ```typescript
   import AsyncStorage from '@react-native-async-storage/async-storage';

   // Add to development menu or run in console
   AsyncStorage.clear();
   ```

3. **Reset Metro Bundler**:
   ```bash
   npm start -- --reset-cache
   ```

### Problem: "Network request failed" errors

**Solutions**:

1. **Check API Base URL**:
   ```bash
   # .env file
   API_BASE_URL=https://app-tracklit-prod-tnrusd.azurewebsites.net
   ```

2. **Verify network connection**:
   ```bash
   # Test backend connectivity
   curl https://app-tracklit-prod-tnrusd.azurewebsites.net/health
   ```

3. **Check firewall/VPN**:
   - Disable VPN if causing issues
   - Check firewall isn't blocking requests

### Problem: Images not loading

**Solutions**:

1. **Check image URLs**:
   ```typescript
   // Verify Azure Blob Storage URL format
   https://storage.blob.core.windows.net/profile-images/...
   ```

2. **Test image loading**:
   ```typescript
   import { Image } from 'react-native';

   <Image
     source={{ uri: 'https://...' }}
     onError={(e) => console.log('Image error:', e)}
   />
   ```

3. **Clear image cache**:
   ```bash
   # Reset metro bundler
   npm start -- --clear
   ```

---

## API Connection Issues

### Problem: API requests timeout

**Symptoms**: Requests take > 30 seconds, eventually fail

**Solutions**:

1. **Check network**:
   ```bash
   # Test connectivity
   ping app-tracklit-prod-tnrusd.azurewebsites.net
   ```

2. **Increase timeout**:
   ```typescript
   // In api.ts
   const TIMEOUT = 60000; // 60 seconds
   ```

3. **Check backend status**:
   ```bash
   # Visit backend health endpoint
   curl https://app-tracklit-prod-tnrusd.azurewebsites.net/health
   ```

### Problem: 401 Unauthorized errors

**Symptoms**: All API requests fail with 401

**Solutions**:

1. **Check token**:
   ```typescript
   import { getToken } from './src/lib/tokenStorage';

   const token = await getToken();
   console.log('Token:', token ? 'Present' : 'Missing');
   ```

2. **Clear stored token**:
   ```typescript
   import { clearAuthStorage } from './src/lib/tokenStorage';

   await clearAuthStorage();
   // Then log in again
   ```

3. **Verify token format**:
   ```typescript
   // Token should be JWT format: xxx.yyy.zzz
   // Check if Bearer prefix is included (it should NOT be in storage)
   ```

### Problem: 500 Internal Server Error

**Symptoms**: Backend returns 500 errors

**Solutions**:

1. **Check backend logs** (if you have access)
2. **Verify request format**:
   ```typescript
   // Log request body before sending
   console.log('Request:', JSON.stringify(data, null, 2));
   ```

3. **Test with curl**:
   ```bash
   curl -X POST https://app-tracklit-prod-tnrusd.azurewebsites.net/api/endpoint \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{"key": "value"}'
   ```

---

## Authentication Problems

### Problem: Login fails with valid credentials

**Solutions**:

1. **Check username format**:
   ```typescript
   // Username should be trimmed, lowercase (verify with backend)
   const username = formUsername.trim().toLowerCase();
   ```

2. **Verify API endpoint**:
   ```typescript
   // In api.ts, check login endpoint
   POST /api/mobile/login
   // Not /api/login or /api/auth/login
   ```

3. **Check response format**:
   ```typescript
   // Expected response:
   {
     "token": "eyJhbGc...",
     "user": { "id": 123, ... }
   }
   ```

### Problem: Token expires immediately

**Solutions**:

1. **Check token expiration**:
   ```typescript
   import jwt_decode from 'jwt-decode';

   const token = await getToken();
   const decoded = jwt_decode(token);
   console.log('Token expires:', new Date(decoded.exp * 1000));
   ```

2. **Verify AsyncStorage**:
   ```typescript
   import AsyncStorage from '@react-native-async-storage/async-storage';

   const stored = await AsyncStorage.getItem('aria_auth_token');
   console.log('Stored token:', stored);
   ```

### Problem: "Sign in required" error after login

**Solutions**:

1. **Check AuthContext state**:
   ```typescript
   // In AuthContext, add logging
   console.log('Auth state:', { isAuthenticated, hasValidToken, user });
   ```

2. **Verify token storage**:
   ```typescript
   // After login, immediately check storage
   const token = await getToken();
   console.log('Token stored:', !!token);
   ```

3. **Check navigation logic**:
   ```typescript
   // In _layout.tsx, verify redirect logic
   // Make sure onboardingCompleted is true
   ```

---

## Chat Issues

### Problem: Messages don't stream

**Symptoms**: No streaming, messages appear all at once

**Solutions**:

1. **Check streaming endpoint**:
   ```typescript
   // Verify Accept header
   headers: { 'Accept': 'text/event-stream' }
   ```

2. **Test non-streaming first**:
   ```typescript
   // Disable streaming temporarily
   await sendMessage(text, false);
   ```

3. **Check browser console** (if testing on web):
   - SSE might not work in web simulator
   - Test on actual device

### Problem: Chat responses are empty

**Solutions**:

1. **Check OpenAI API key**:
   ```bash
   # In .env
   OPENAI_API_KEY=sk-...
   ```

2. **Verify conversation context**:
   ```typescript
   // Check conversationId is passed correctly
   console.log('Conversation ID:', conversationId);
   ```

3. **Test with simple message**:
   ```typescript
   // Send "Hello" and check response
   ```

### Problem: "Sprinthia AI is unavailable" error

**Solutions**:

1. **Check backend AI service**:
   ```bash
   # Test backend chat endpoint
   curl -X POST https://app-tracklit-prod-tnrusd.azurewebsites.net/api/sprinthia/chat \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"message": "Hello"}'
   ```

2. **Verify retry logic**:
   ```typescript
   // Check if retries are exhausted
   // Look for retry attempts in console
   ```

---

## Dashboard Problems

### Problem: Dashboard shows "No Insights Yet"

**Symptoms**: Empty state even with workouts/data

**Solutions**:

1. **Check dashboard endpoint**:
   ```bash
   curl https://app-tracklit-prod-tnrusd.azurewebsites.net/api/dashboard/state \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

2. **Verify user has data**:
   - Check if user has completed workouts
   - Verify training plan exists
   - Check if races are scheduled

3. **Clear cache**:
   ```typescript
   import { cache } from './src/lib/cache';

   cache.delete('dashboard:state');
   // Then refresh
   ```

### Problem: Dashboard cards don't load

**Solutions**:

1. **Check response format**:
   ```typescript
   // Expected format:
   {
     "mode": "general",
     "greeting": "...",
     "subtitle": "...",
     "cards": [...]
   }
   ```

2. **Verify card types**:
   ```typescript
   // Cards must have valid types
   // workout_card, insight_card, competition_card, streak_card, stats_row
   ```

3. **Check console for errors**:
   ```typescript
   // Look for parsing errors
   // Check if card content is valid
   ```

### Problem: Pull-to-refresh doesn't work

**Solutions**:

1. **Check RefreshControl**:
   ```typescript
   <RefreshControl
     refreshing={isLoading}
     onRefresh={refreshDashboard}
     tintColor={colors.primary}
   />
   ```

2. **Verify refreshDashboard function**:
   ```typescript
   // Should clear cache and reload
   cache.delete('dashboard:state');
   await loadDashboard(true);
   ```

---

## Performance Issues

### Problem: App is slow/laggy

**Solutions**:

1. **Enable performance monitor**:
   ```typescript
   import { Performance } from './src/lib/performance';

   Performance.logSummary();
   ```

2. **Check for memory leaks**:
   ```typescript
   import { MemoryMonitor } from './src/lib/performance';

   MemoryMonitor.logUsage();
   ```

3. **Profile app**:
   ```bash
   # Use React DevTools Profiler
   # Or React Native Performance Monitor
   ```

### Problem: Images load slowly

**Solutions**:

1. **Check image sizes**:
   ```typescript
   // Profile pictures should be ~400x400
   // Compressed to < 200KB
   ```

2. **Implement lazy loading**:
   ```typescript
   import FastImage from 'react-native-fast-image';

   <FastImage
     source={{ uri: imageUrl }}
     resizeMode={FastImage.resizeMode.cover}
   />
   ```

3. **Cache images**:
   ```typescript
   // FastImage caches automatically
   // Or use react-native-cached-image
   ```

### Problem: High battery drain

**Solutions**:

1. **Check for polling**:
   - Disable unnecessary setInterval
   - Use push notifications instead

2. **Reduce background work**:
   - Pause location tracking when app is backgrounded
   - Stop animations when not visible

3. **Profile energy usage**:
   - Use Xcode Energy Impact tool (iOS)
   - Use Android Battery Historian (Android)

---

## iOS Specific Issues

### Problem: Cannot install on simulator

**Solutions**:

1. **Check Xcode version**:
   ```bash
   xcode-select --print-path
   ```

2. **Clean build**:
   ```bash
   cd ios
   rm -rf build
   pod deintegrate
   pod install
   cd ..
   ```

3. **Reinstall CocoaPods**:
   ```bash
   sudo gem install cocoapods
   ```

### Problem: Push notifications not working (iOS)

**Solutions**:

1. **Check entitlements**:
   - Verify push notification capability is enabled
   - Check provisioning profile

2. **Test with development cert**:
   ```bash
   # Use development push certificate
   # Test with sandbox environment
   ```

---

## Android Specific Issues

### Problem: Cannot build APK

**Solutions**:

1. **Check Java version**:
   ```bash
   java -version
   # Should be Java 11 or newer
   ```

2. **Clean Gradle cache**:
   ```bash
   cd android
   ./gradlew clean
   ./gradlew --stop
   cd ..
   ```

3. **Fix Gradle properties**:
   ```bash
   # In android/gradle.properties
   org.gradle.jvmargs=-Xmx2048m
   ```

### Problem: App crashes on real device (Android)

**Solutions**:

1. **Enable USB debugging**
2. **Check logcat**:
   ```bash
   adb logcat | grep "ReactNative"
   ```

3. **Build release APK**:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

---

## Debug Tools

### Enable Debug Mode

```typescript
// In .env
DEBUG=true
```

### Check Cache Stats

```typescript
import { CacheUtils } from './src/lib/cache';

const stats = CacheUtils.getStats();
console.log('Cache stats:', stats);
```

### View Analytics Events

```typescript
import { analytics } from './src/lib/analytics';

const events = analytics.getEvents();
console.log('Events:', events);
```

### Get Performance Report

```typescript
import { Performance } from './src/lib/performance';

const report = Performance.getReport();
console.log('Performance:', report);
```

---

## Getting Help

If you can't solve your issue:

1. **Check logs**:
   ```bash
   # Metro bundler logs
   npm start

   # iOS logs
   npx react-native log-ios

   # Android logs
   npx react-native log-android
   ```

2. **Search existing issues**:
   - [Expo Issues](https://github.com/expo/expo/issues)
   - [React Native Issues](https://github.com/facebook/react-native/issues)

3. **Ask for help**:
   - [Expo Discord](https://discord.gg/expo)
   - [React Native Community](https://www.reactnative.dev/community/overview)
   - GitHub Issues (for this project)

---

## Common Error Messages

### "Invariant Violation: Text strings must be rendered within a <Text> component"

**Cause**: Rendering a string outside of Text component

**Solution**:
```typescript
// Wrong
<View>{someText}</View>

// Correct
<View><Text>{someText}</Text></View>
```

### "Maximum update depth exceeded"

**Cause**: Infinite loop in state updates

**Solution**:
```typescript
// Wrong
useEffect(() => {
  setState(value); // No dependency array
});

// Correct
useEffect(() => {
  setState(value);
}, [dependency]);
```

### "Cannot read property 'X' of undefined"

**Cause**: Accessing property of undefined object

**Solution**:
```typescript
// Use optional chaining
const value = object?.property?.nested;

// Or check first
if (object && object.property) {
  // Safe to access
}
```

---

## Emergency Reset

If all else fails, completely reset the app:

```bash
# Stop all processes
# Kill metro bundler, simulators, etc.

# Delete everything
rm -rf node_modules
rm -rf ios/Pods
rm -rf ios/build
rm -rf android/build
rm -rf .expo
rm package-lock.json
rm ios/Podfile.lock

# Reinstall
npm install
cd ios && pod install && cd ..

# Clear all caches
npm start -- --clear

# Clear AsyncStorage
# Run this in your app:
# AsyncStorage.clear()
```

This should reset everything to a clean state.

---

## Useful Commands

```bash
# Clear all caches
npm start -- --clear
watchman watch-del-all
rm -rf $TMPDIR/react-*
rm -rf $TMPDIR/metro-*

# Reset iOS simulator
xcrun simctl erase all

# Reset Android emulator
adb shell pm clear com.yourcompany.yourapp

# View app storage (iOS)
xcrun simctl get_app_container booted com.yourcompany.yourapp data

# View app storage (Android)
adb shell run-as com.yourcompany.yourapp ls /data/data/com.yourcompany.yourapp/

# Check bundle size
npx react-native bundle --platform ios --dev false --entry-file index.js --bundle-output ios-bundle.js
ls -lh ios-bundle.js
```

---

**Remember**: Always check the console logs first - they usually contain the most helpful information for debugging!
