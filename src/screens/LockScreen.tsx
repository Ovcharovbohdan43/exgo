/**
 * LockScreen Component
 * 
 * Displays lock screen for authentication (biometric or PIN).
 * Shown when app is locked and user needs to authenticate.
 * 
 * @module screens/LockScreen
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useThemeStyles } from '../theme/ThemeProvider';
import { authenticateBiometric, checkBiometricAvailability, verifyPIN, validatePIN } from '../services/authentication';
import { BUTTON_HIT_SLOP } from '../utils/accessibility';

export type LockScreenProps = {
  /**
   * Whether biometric authentication is enabled
   */
  enableBiometric: boolean;
  
  /**
   * Whether PIN authentication is enabled
   */
  enablePIN: boolean;
  
  /**
   * Stored PIN (hashed)
   */
  storedPIN?: string;
  
  /**
   * Callback when authentication succeeds
   */
  onUnlock: () => void;
  
  /**
   * Optional reason message
   */
  reason?: string;
};

/**
 * LockScreen - Authentication screen for unlocking the app
 */
export const LockScreen: React.FC<LockScreenProps> = ({
  enableBiometric,
  enablePIN,
  storedPIN,
  onUnlock,
  reason = 'Unlock your budget app',
}) => {
  const theme = useThemeStyles();
  const [pin, setPin] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricName, setBiometricName] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const hasAttemptedBiometric = React.useRef(false);

  const handleBiometricAuth = React.useCallback(async () => {
    // Prevent multiple simultaneous calls
    if (isAuthenticating || hasAttemptedBiometric.current) {
      console.log('[LockScreen] Biometric auth already in progress or attempted, skipping');
      return;
    }
    
    console.log('[LockScreen] handleBiometricAuth called', {
      enableBiometric,
      enablePIN,
      hasStoredPIN: !!storedPIN,
    });
    
    hasAttemptedBiometric.current = true;
    setIsAuthenticating(true);
    setError(null);
    
    try {
      const success = await authenticateBiometric(reason);
      console.log('[LockScreen] Biometric authentication result:', success);
      
      if (success) {
        console.log('[LockScreen] Biometric authentication successful - unlocking app');
        onUnlock();
      } else {
        console.log('[LockScreen] Biometric authentication failed or cancelled');
        // NEVER unlock automatically - always require authentication
        // If PIN is available, show PIN input
        if (enablePIN && storedPIN) {
          setError('Authentication failed. Please try PIN.');
        } else {
          // If no PIN, show error but don't unlock - user must retry biometric
          setError('Authentication failed. Please try again.');
        }
      }
    } catch (err) {
      console.error('[LockScreen] Biometric authentication error:', err);
      // NEVER unlock automatically - always require authentication
      // If PIN is available, show PIN input
      if (enablePIN && storedPIN) {
        setError('Biometric authentication error. Please try PIN.');
      } else {
        // If no PIN, show error but don't unlock - user must retry biometric
        setError('Biometric authentication error. Please try again.');
      }
    } finally {
      setIsAuthenticating(false);
      // Reset attempt flag after a delay to allow retry
      setTimeout(() => {
        hasAttemptedBiometric.current = false;
      }, 1000);
    }
  }, [enableBiometric, enablePIN, storedPIN, reason, onUnlock, isAuthenticating]);

  // Check biometric availability on mount and auto-trigger if enabled
  useEffect(() => {
    let mounted = true;
    hasAttemptedBiometric.current = false; // Reset on mount
    
    const checkAndTriggerBiometric = async () => {
      console.log('[LockScreen] Checking biometric availability...', {
        enableBiometric,
        enablePIN,
        hasStoredPIN: !!storedPIN,
      });
      
      const biometric = await checkBiometricAvailability();
      console.log('[LockScreen] Biometric check result:', {
        available: biometric.available,
        name: biometric.name,
        type: biometric.type,
      });
      
      if (!mounted) return;
      
      setBiometricAvailable(biometric.available);
      setBiometricName(biometric.name);
      
      // Auto-trigger biometric if available and enabled (only once)
      // Always try biometric first if it's enabled, regardless of PIN status
      if (biometric.available && enableBiometric && !hasAttemptedBiometric.current) {
        console.log('[LockScreen] Auto-triggering biometric authentication...');
        // Small delay to ensure UI is ready and user sees the lock screen
        setTimeout(() => {
          if (mounted && !isAuthenticating) {
            handleBiometricAuth();
          }
        }, 500);
      } else {
        console.log('[LockScreen] Not auto-triggering biometric:', {
          available: biometric.available,
          enabled: enableBiometric,
          alreadyAttempted: hasAttemptedBiometric.current,
        });
      }
    };
    
    checkAndTriggerBiometric();
    
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const handlePINSubmit = () => {
    if (!storedPIN) {
      setError('PIN not set. Please configure PIN in settings.');
      return;
    }

    if (!validatePIN(pin)) {
      setError('PIN must be 4-6 digits');
      shakeInput();
      return;
    }

    const isValid = verifyPIN(pin, storedPIN);
    console.log('[LockScreen] PIN verification:', { 
      isValid, 
      inputLength: pin.length, 
      storedLength: storedPIN.length,
      inputPin: pin.replace(/./g, '*'), // Mask PIN in logs
      storedPin: storedPIN.replace(/./g, '*'), // Mask PIN in logs
    });
    
    if (isValid) {
      setPin('');
      setError(null);
      console.log('[LockScreen] PIN verified successfully, calling onUnlock');
      onUnlock();
    } else {
      console.log('[LockScreen] PIN verification failed');
      setError('Incorrect PIN. Please try again.');
      setPin('');
      shakeInput();
    }
  };

  const shakeInput = () => {
    Animated.sequence([
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const renderPINInput = () => {
    if (!enablePIN || !storedPIN) {
      return null;
    }

    return (
      <View style={styles.pinSection}>
        <Text
          style={[
            styles.pinLabel,
            {
              color: theme.colors.textSecondary,
              fontSize: theme.typography.fontSize.md,
              marginBottom: theme.spacing.md,
            },
          ]}
        >
          Enter PIN
        </Text>
        <Animated.View
          style={[
            styles.pinInputContainer,
            {
              transform: [{ translateX: shakeAnimation }],
            },
          ]}
        >
          <TextInput
            value={pin}
            onChangeText={(text) => {
              setPin(text.replace(/[^0-9]/g, ''));
              setError(null);
            }}
            onSubmitEditing={handlePINSubmit}
            keyboardType="numeric"
            secureTextEntry
            maxLength={6}
            style={[
              styles.pinInput,
              {
                backgroundColor: theme.colors.surface,
                borderColor: error ? theme.colors.danger : theme.colors.border,
                color: theme.colors.textPrimary,
                fontSize: theme.typography.fontSize.xl,
              },
            ]}
            placeholder="••••"
            placeholderTextColor={theme.colors.textMuted}
            autoFocus={!enableBiometric || !biometricAvailable}
            accessible={true}
            accessibilityLabel="PIN input"
            accessibilityHint="Enter your 4 to 6 digit PIN code"
          />
        </Animated.View>
        {error && (
          <Text
            style={[
              styles.errorText,
              {
                color: theme.colors.danger,
                fontSize: theme.typography.fontSize.sm,
                marginTop: theme.spacing.sm,
              },
            ]}
          >
            {error}
          </Text>
        )}
        <TouchableOpacity
          onPress={handlePINSubmit}
          style={[
            styles.unlockButton,
            {
              backgroundColor: theme.colors.accent,
              marginTop: theme.spacing.lg,
            },
          ]}
          disabled={pin.length < 4}
          accessible={true}
          accessibilityLabel="Unlock with PIN"
          accessibilityRole="button"
          accessibilityHint="Double tap to unlock with PIN"
          accessibilityState={{ disabled: pin.length < 4 }}
          hitSlop={BUTTON_HIT_SLOP}
        >
          <Text
            style={[
              styles.unlockButtonText,
              {
                color: theme.colors.background,
                fontSize: theme.typography.fontSize.md,
                fontWeight: theme.typography.fontWeight.semibold,
              },
            ]}
          >
            Unlock
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text
            style={[
              styles.icon,
              {
                fontSize: 64,
                marginBottom: theme.spacing.lg,
              },
            ]}
          >
            🔒
          </Text>
          <Text
            style={[
              styles.title,
              {
                color: theme.colors.textPrimary,
                fontSize: theme.typography.fontSize.xl,
                fontWeight: theme.typography.fontWeight.bold,
                marginBottom: theme.spacing.sm,
              },
            ]}
          >
            App Locked
          </Text>
          <Text
            style={[
              styles.subtitle,
              {
                color: theme.colors.textSecondary,
                fontSize: theme.typography.fontSize.md,
              },
            ]}
          >
            {reason}
          </Text>
        </View>

        {enableBiometric && biometricAvailable && (
          <View style={styles.biometricSection}>
            <TouchableOpacity
              onPress={handleBiometricAuth}
              disabled={isAuthenticating}
              style={[
                styles.biometricButton,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
              accessible={true}
              accessibilityLabel={`Unlock with ${biometricName}`}
              accessibilityRole="button"
              accessibilityHint={`Double tap to unlock using ${biometricName}`}
              accessibilityState={{ disabled: isAuthenticating }}
              hitSlop={BUTTON_HIT_SLOP}
            >
              <Text
                style={[
                  styles.biometricIcon,
                  {
                    fontSize: 32,
                    marginBottom: theme.spacing.sm,
                  },
                ]}
              >
                {biometricName.includes('Face') ? '👤' : '👆'}
              </Text>
              <Text
                style={[
                  styles.biometricText,
                  {
                    color: theme.colors.textPrimary,
                    fontSize: theme.typography.fontSize.md,
                    fontWeight: theme.typography.fontWeight.medium,
                  },
                ]}
              >
                {isAuthenticating ? 'Authenticating...' : `Use ${biometricName}`}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {enablePIN && storedPIN && (
          <>
            {enableBiometric && biometricAvailable && (
              <View style={styles.divider}>
                <View
                  style={[
                    styles.dividerLine,
                    { backgroundColor: theme.colors.border },
                  ]}
                />
                <Text
                  style={[
                    styles.dividerText,
                    {
                      color: theme.colors.textSecondary,
                      fontSize: theme.typography.fontSize.sm,
                    },
                  ]}
                >
                  or
                </Text>
                <View
                  style={[
                    styles.dividerLine,
                    { backgroundColor: theme.colors.border },
                  ]}
                />
              </View>
            )}
            {renderPINInput()}
          </>
        )}

        {!enableBiometric && !enablePIN && (
          <View style={styles.noAuthSection}>
            <Text
              style={[
                styles.noAuthText,
                {
                  color: theme.colors.textSecondary,
                  fontSize: theme.typography.fontSize.md,
                },
              ]}
            >
              No authentication method configured.
            </Text>
            <Text
              style={[
                styles.noAuthText,
                {
                  color: theme.colors.textSecondary,
                  fontSize: theme.typography.fontSize.sm,
                  marginTop: theme.spacing.sm,
                },
              ]}
            >
              Please enable biometric or PIN in settings.
            </Text>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  icon: {
    textAlign: 'center',
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
  biometricSection: {
    width: '100%',
    marginBottom: 24,
  },
  biometricButton: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  biometricIcon: {
    textAlign: 'center',
  },
  biometricText: {
    textAlign: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    textTransform: 'uppercase',
  },
  pinSection: {
    width: '100%',
  },
  pinLabel: {
    textAlign: 'center',
  },
  pinInputContainer: {
    width: '100%',
  },
  pinInput: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    textAlign: 'center',
    letterSpacing: 8,
  },
  errorText: {
    textAlign: 'center',
  },
  unlockButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlockButtonText: {
    textAlign: 'center',
  },
  noAuthSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  noAuthText: {
    textAlign: 'center',
  },
});

export default LockScreen;

