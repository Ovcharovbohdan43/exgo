/**
 * Authentication Service
 * 
 * Provides biometric and PIN authentication functionality.
 * Supports Face ID, Touch ID, Fingerprint, and PIN code authentication.
 * 
 * @module services/authentication
 */

import * as LocalAuthentication from 'expo-local-authentication';

export type AuthenticationType = 'biometric' | 'pin' | 'none';

export interface BiometricType {
  available: boolean;
  type: LocalAuthentication.AuthenticationType | null;
  name: string; // Human-readable name (Face ID, Touch ID, Fingerprint, etc.)
}

/**
 * Check if biometric authentication is available on the device
 */
export const checkBiometricAvailability = async (): Promise<BiometricType> => {
  try {
    console.log('[Authentication] Checking biometric availability...');
    
    const compatible = await LocalAuthentication.hasHardwareAsync();
    console.log('[Authentication] Hardware compatible:', compatible);
    
    if (!compatible) {
      console.log('[Authentication] Biometric hardware not compatible');
      return {
        available: false,
        type: null,
        name: 'Not Available',
      };
    }

    const enrolled = await LocalAuthentication.isEnrolledAsync();
    console.log('[Authentication] Biometric enrolled:', enrolled);
    
    if (!enrolled) {
      console.log('[Authentication] Biometric not enrolled');
      return {
        available: false,
        type: null,
        name: 'Not Enrolled',
      };
    }

    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    console.log('[Authentication] Supported types:', types);
    const type = types[0] || null;

    let name = 'Biometric';
    if (type === LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION) {
      name = 'Face ID';
    } else if (type === LocalAuthentication.AuthenticationType.FINGERPRINT) {
      name = 'Touch ID / Fingerprint';
    } else if (type === LocalAuthentication.AuthenticationType.IRIS) {
      name = 'Iris';
    }

    console.log('[Authentication] Biometric available:', { available: true, type, name });

    return {
      available: true,
      type,
      name,
    };
  } catch (error) {
    console.error('[Authentication] Error checking biometric availability:', error);
    return {
      available: false,
      type: null,
      name: 'Error',
    };
  }
};

/**
 * Authenticate using biometric (Face ID, Touch ID, Fingerprint)
 * 
 * @param reason - Optional reason message shown to user
 * @returns true if authentication successful, false otherwise
 */
export const authenticateBiometric = async (
  reason: string = 'Authenticate to access your budget data'
): Promise<boolean> => {
  try {
    console.log('[Authentication] Starting biometric authentication...', { reason });
    
    const biometric = await checkBiometricAvailability();
    console.log('[Authentication] Biometric availability check:', {
      available: biometric.available,
      name: biometric.name,
      type: biometric.type,
    });
    
    if (!biometric.available) {
      console.warn('[Authentication] Biometric not available');
      return false;
    }

    console.log('[Authentication] Calling LocalAuthentication.authenticateAsync...');
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      cancelLabel: 'Cancel',
      disableDeviceFallback: true, // Don't allow device passcode as fallback (we handle PIN ourselves)
      fallbackLabel: 'Use PIN',
    });

    console.log('[Authentication] Biometric result:', {
      success: result.success,
      error: result.error,
      warning: result.warning,
      result: result,
    });

    if (!result.success) {
      console.log('[Authentication] Biometric authentication failed or cancelled');
    } else {
      console.log('[Authentication] Biometric authentication successful');
    }

    return result.success;
  } catch (error) {
    console.error('[Authentication] Biometric authentication error:', error);
    return false;
  }
};

/**
 * Hash PIN for storage (simple implementation - should use proper hashing in production)
 * 
 * @param pin - Plain text PIN
 * @returns Hashed PIN (for MVP, just returns as-is, should use bcrypt or similar)
 */
export const hashPIN = (pin: string): string => {
  // TODO: Implement proper hashing (bcrypt, scrypt, or similar)
  // For MVP, storing as-is is acceptable but not secure
  // In production, use: return bcrypt.hashSync(pin, 10);
  // For now, we store PIN as-is since hashPIN just returns the PIN
  return pin;
};

/**
 * Verify PIN code
 * 
 * @param inputPin - PIN entered by user (plain text)
 * @param storedPin - Stored PIN (currently stored as plain text, should be hashed in production)
 * @returns true if PIN matches
 */
export const verifyPIN = (inputPin: string, storedPin: string): boolean => {
  // Since hashPIN currently just returns the PIN as-is (no actual hashing),
  // we can compare directly. In production with proper hashing, we would:
  // return bcrypt.compareSync(inputPin, storedPin);
  
  // Normalize both PINs (trim whitespace, ensure they're strings)
  const normalizedInput = String(inputPin).trim();
  const normalizedStored = String(storedPin).trim();
  
  // Use secure comparison (constant-time comparison would be better in production)
  return normalizedInput === normalizedStored;
};

/**
 * Validate PIN format
 * 
 * @param pin - PIN to validate
 * @returns true if PIN is valid (4-6 digits)
 */
export const validatePIN = (pin: string): boolean => {
  // PIN should be 4-6 digits
  return /^\d{4,6}$/.test(pin);
};

/**
 * Check if authentication is required based on settings
 */
export const isAuthenticationRequired = (
  enableBiometric: boolean,
  enablePIN: boolean,
  hasPIN: boolean
): boolean => {
  return enableBiometric || (enablePIN && hasPIN);
};

/**
 * Authenticate user based on settings
 * 
 * @param settings - User settings with authentication preferences
 * @returns true if authentication successful or not required
 */
export const authenticate = async (settings: {
  enableBiometric?: boolean;
  enablePIN?: boolean;
  pin?: string;
}): Promise<boolean> => {
  const { enableBiometric = false, enablePIN = false, pin } = settings;

  // If no authentication is enabled, allow access
  if (!enableBiometric && !enablePIN) {
    return true;
  }

  // Try biometric first if enabled
  if (enableBiometric) {
    const biometric = await checkBiometricAvailability();
    if (biometric.available) {
      const success = await authenticateBiometric('Unlock your budget app');
      if (success) {
        return true;
      }
      // If biometric fails and PIN is not enabled, deny access
      if (!enablePIN) {
        return false;
      }
    }
  }

  // If PIN is enabled, return false to trigger PIN entry screen
  // PIN verification should be done in the UI component
  if (enablePIN && pin) {
    return false; // Signal that PIN entry is needed
  }

  // If no valid authentication method, allow access (graceful degradation)
  return true;
};

