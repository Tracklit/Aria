/**
 * Analytics and logging utility
 * Tracks user interactions and app events for debugging and product insights
 */

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp: number;
}

interface UserProperties {
  userId?: string | number;
  username?: string;
  sport?: string;
  experienceLevel?: string;
  [key: string]: any;
}

class Analytics {
  private events: AnalyticsEvent[] = [];
  private userProperties: UserProperties = {};
  private sessionId: string;
  private sessionStart: number;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.sessionStart = Date.now();
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Set user properties for all future events
   */
  setUser(properties: UserProperties) {
    this.userProperties = { ...this.userProperties, ...properties };
    if (__DEV__) {
      console.log('[Analytics] User properties set:', properties);
    }
  }

  /**
   * Clear user properties (on logout)
   */
  clearUser() {
    this.userProperties = {};
    if (__DEV__) {
      console.log('[Analytics] User properties cleared');
    }
  }

  /**
   * Track an event
   */
  track(eventName: string, properties?: Record<string, any>) {
    const event: AnalyticsEvent = {
      name: eventName,
      properties: {
        ...properties,
        sessionId: this.sessionId,
        sessionDuration: Date.now() - this.sessionStart,
        ...this.userProperties,
      },
      timestamp: Date.now(),
    };

    this.events.push(event);

    if (__DEV__) {
      console.log(`[Analytics] ${eventName}`, properties);
    }

    // In production, send to analytics service (e.g., Amplitude, Mixpanel)
    // this.sendToAnalyticsService(event);
  }

  /**
   * Track a screen view
   */
  screen(screenName: string, properties?: Record<string, any>) {
    this.track('Screen View', {
      screen: screenName,
      ...properties,
    });
  }

  /**
   * Track a timing event (e.g., API response time)
   */
  timing(category: string, variable: string, duration: number, label?: string) {
    this.track('Timing', {
      category,
      variable,
      duration,
      label,
    });
  }

  /**
   * Track an error
   */
  error(error: Error, context?: Record<string, any>) {
    this.track('Error', {
      error: error.message,
      stack: error.stack,
      ...context,
    });
  }

  /**
   * Get all events
   */
  getEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  /**
   * Get events by name
   */
  getEventsByName(name: string): AnalyticsEvent[] {
    return this.events.filter((event) => event.name === name);
  }

  /**
   * Get session summary
   */
  getSessionSummary() {
    const sessionDuration = Date.now() - this.sessionStart;
    const screenViews = this.getEventsByName('Screen View');
    const errors = this.getEventsByName('Error');

    return {
      sessionId: this.sessionId,
      duration: sessionDuration,
      eventCount: this.events.length,
      screenViewCount: screenViews.length,
      errorCount: errors.length,
      userProperties: this.userProperties,
    };
  }

  /**
   * Clear all events (useful for testing)
   */
  clearEvents() {
    this.events = [];
  }
}

// Global analytics instance
const analytics = new Analytics();

// Export analytics instance
export { analytics };

// Convenience functions for common events
export const AnalyticsEvents = {
  // Authentication
  login: (method: 'email' | 'demo' | 'apple' | 'google') =>
    analytics.track('Login', { method }),

  logout: () =>
    analytics.track('Logout'),

  signup: (method: 'email' | 'apple' | 'google') =>
    analytics.track('Sign Up', { method }),

  // Dashboard
  dashboardViewed: (mode: string, cardCount: number) =>
    analytics.track('Dashboard Viewed', { mode, cardCount }),

  dashboardCardClicked: (cardType: string, action: string) =>
    analytics.track('Dashboard Card Clicked', { cardType, action }),

  dashboardRefreshed: () =>
    analytics.track('Dashboard Refreshed'),

  // Chat
  chatMessageSent: (messageLength: number, streaming: boolean) =>
    analytics.track('Chat Message Sent', { messageLength, streaming }),

  chatConversationStarted: () =>
    analytics.track('Chat Conversation Started'),

  chatConversationDeleted: () =>
    analytics.track('Chat Conversation Deleted'),

  chatStreamingFailed: (error: string) =>
    analytics.track('Chat Streaming Failed', { error }),

  // Workouts
  workoutStarted: (type: string, isPlanned: boolean) =>
    analytics.track('Workout Started', { type, isPlanned }),

  workoutCompleted: (type: string, duration: number, distance: number) =>
    analytics.track('Workout Completed', { type, duration, distance }),

  workoutPaused: () =>
    analytics.track('Workout Paused'),

  // Profile
  profilePictureUploaded: (fileSize: number) =>
    analytics.track('Profile Picture Uploaded', { fileSize }),

  profileUpdated: (fields: string[]) =>
    analytics.track('Profile Updated', { fields }),

  // Errors
  apiError: (endpoint: string, status: number, message: string) =>
    analytics.track('API Error', { endpoint, status, message }),

  appError: (error: Error, screen?: string) =>
    analytics.error(error, { screen }),

  // Performance
  apiTiming: (endpoint: string, duration: number) =>
    analytics.timing('API', endpoint, duration),

  screenLoadTime: (screen: string, duration: number) =>
    analytics.timing('Screen Load', screen, duration),
};

// Track screen views automatically with React Navigation
export const useAnalyticsScreen = (screenName: string) => {
  const startTime = Date.now();

  // Track screen view on mount
  React.useEffect(() => {
    analytics.screen(screenName);

    // Track screen load time on unmount
    return () => {
      const loadTime = Date.now() - startTime;
      AnalyticsEvents.screenLoadTime(screenName, loadTime);
    };
  }, [screenName, startTime]);
};

// React import for useEffect hook
import React from 'react';
