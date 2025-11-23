/**
 * Sentry Error Tracking & Logging Service
 * 
 * Provides centralized error tracking and structured logging using Sentry.
 * Handles initialization, error reporting, and context management.
 * 
 * @module services/sentry
 */

import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

/**
 * Initialize Sentry SDK with configuration
 * 
 * Should be called as early as possible in the app lifecycle (before any other imports).
 * 
 * Configuration:
 * - DSN: Set via EXPO_PUBLIC_SENTRY_DSN environment variable
 * - Environment: Development/Production based on __DEV__
 * - Release: App version from app.json
 * - Performance monitoring: Enabled with configurable sample rate
 * - Native crash handling: Enabled
 * 
 * @param options - Optional Sentry configuration overrides
 */
export const initSentry = (options?: Partial<Sentry.ReactNativeOptions>) => {
  const dsn = Constants.expoConfig?.extra?.sentryDsn || process.env.EXPO_PUBLIC_SENTRY_DSN;
  
  // Skip initialization if DSN is not provided (development/local builds)
  if (!dsn) {
    if (__DEV__) {
      console.warn('[Sentry] DSN not configured. Error tracking disabled. Set EXPO_PUBLIC_SENTRY_DSN or app.json extra.sentryDsn');
    }
    return;
  }

  const isDevelopment = __DEV__;
  const appVersion = Constants.expoConfig?.version || '1.0.0';
  const buildNumber = Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode || '1';

  Sentry.init({
    dsn,
    
    // Environment
    environment: isDevelopment ? 'development' : 'production',
    release: `exgo@${appVersion}`,
    dist: buildNumber,
    
    // Performance monitoring
    tracesSampleRate: isDevelopment ? 1.0 : 0.1, // 100% in dev, 10% in prod
    enableAutoPerformanceTracing: true,
    enableAppStartTracking: true,
    enableNativeFramesTracking: true,
    enableStallTracking: true,
    
    // Native crash handling
    enableNative: true,
    enableNativeCrashHandling: true,
    enableNdk: true,
    
    // Error attachments
    attachScreenshot: true,
    attachViewHierarchy: false, // Disabled to reduce payload size
    
    // Filtering and processing
    beforeSend(event, hint) {
      // Filter out development-only errors in production
      if (!isDevelopment && event.environment === 'development') {
        return null;
      }
      
      // Remove sensitive data (if any)
      if (event.user) {
        // Don't send email/identifiers unless explicitly needed
        delete event.user.email;
      }
      
      return event;
    },
    
    // Integrations
    integrations: [
      Sentry.reactNativeTracingIntegration({
        enableTimeToInitialDisplay: true,
        routeChangeTimeoutMs: 1000,
        ignoreEmptyBackNavigationTransactions: true,
      }),
    ],
    
    // Merge with custom options
    ...options,
  });

  if (isDevelopment) {
    console.log('[Sentry] Initialized successfully', {
      environment: isDevelopment ? 'development' : 'production',
      release: `exgo@${appVersion}`,
    });
  }
};

/**
 * Log an error to Sentry with optional context
 * 
 * @param error - Error object or error message
 * @param context - Additional context data
 * @param level - Error severity level
 */
export const logError = (
  error: Error | string,
  context?: Record<string, unknown>,
  level: Sentry.SeverityLevel = 'error'
) => {
  const errorObj = typeof error === 'string' ? new Error(error) : error;
  
  Sentry.withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, value);
      });
    }
    
    scope.setLevel(level);
    Sentry.captureException(errorObj);
  });
};

/**
 * Log a warning to Sentry
 * 
 * @param message - Warning message
 * @param context - Additional context data
 */
export const logWarning = (message: string, context?: Record<string, unknown>) => {
  Sentry.withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, value);
      });
    }
    
    scope.setLevel('warning');
    Sentry.captureMessage(message, 'warning');
  });
};

/**
 * Log an info message to Sentry
 * 
 * @param message - Info message
 * @param context - Additional context data
 */
export const logInfo = (message: string, context?: Record<string, unknown>) => {
  Sentry.withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, value);
      });
    }
    
    scope.setLevel('info');
    Sentry.captureMessage(message, 'info');
  });
};

/**
 * Set user context for error tracking
 * 
 * @param user - User identification data (without sensitive info)
 */
export const setUser = (user: { id?: string; username?: string }) => {
  Sentry.setUser(user);
};

/**
 * Clear user context
 */
export const clearUser = () => {
  Sentry.setUser(null);
};

/**
 * Add breadcrumb for debugging
 * 
 * @param message - Breadcrumb message
 * @param category - Breadcrumb category
 * @param level - Breadcrumb level
 * @param data - Additional data
 */
export const addBreadcrumb = (
  message: string,
  category?: string,
  level: Sentry.SeverityLevel = 'info',
  data?: Record<string, unknown>
) => {
  Sentry.addBreadcrumb({
    message,
    category: category || 'default',
    level,
    data,
    timestamp: Date.now() / 1000,
  });
};

/**
 * Set additional context for all subsequent events
 * 
 * @param key - Context key
 * @param context - Context data
 */
export const setContext = (key: string, context: Record<string, unknown>) => {
  Sentry.setContext(key, context);
};

/**
 * Set tag for filtering events in Sentry
 * 
 * @param key - Tag key
 * @param value - Tag value
 */
export const setTag = (key: string, value: string) => {
  Sentry.setTag(key, value);
};

/**
 * Wrap a function with error tracking
 * 
 * @param fn - Function to wrap
 * @param context - Additional context for errors
 * @returns Wrapped function
 */
export const withErrorTracking = <T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  context?: Record<string, unknown>
): T => {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      logError(error as Error, context);
      throw error;
    }
  }) as T;
};

/**
 * React Error Boundary component
 * Automatically captures React component errors
 * 
 * Usage:
 * ```tsx
 * <SentryErrorBoundary fallback={ErrorFallback}>
 *   <YourApp />
 * </SentryErrorBoundary>
 * ```
 */
export const SentryErrorBoundary = Sentry.ErrorBoundary;

