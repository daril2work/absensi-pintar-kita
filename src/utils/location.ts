// Enhanced location utilities with anti-fraud measures
import { 
  validateLocationComprehensive, 
  storeLocationHistory, 
  getLocationHistory,
  generateDeviceFingerprint,
  type LocationValidationResult 
} from './antifraud';

// Haversine formula to calculate distance between two points
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  const distance = R * c; // in metres
  return distance;
};

export interface SecureLocationResult {
  position: GeolocationPosition;
  validation: LocationValidationResult;
  deviceFingerprint: string;
  isSecure: boolean;
}

// Enhanced location retrieval with fraud detection
export const getSecureLocation = (): Promise<SecureLocationResult> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          // Get previous location for velocity check
          const history = getLocationHistory();
          const previousLocation = history.length > 0 ? history[history.length - 1] : undefined;

          // Validate location with anti-fraud checks
          const validation = await validateLocationComprehensive(position, previousLocation);
          
          // Generate device fingerprint
          const deviceInfo = generateDeviceFingerprint();
          const deviceFingerprint = btoa(JSON.stringify(deviceInfo));

          // Store current location in history
          storeLocationHistory({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            timestamp: position.timestamp
          });

          const result: SecureLocationResult = {
            position,
            validation,
            deviceFingerprint,
            isSecure: validation.isValid && validation.riskLevel !== 'high'
          };

          resolve(result);
        } catch (error) {
          reject(error);
        }
      },
      (error) => reject(error),
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  });
};

// Legacy function for backward compatibility
export const getCurrentLocation = (): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    getSecureLocation()
      .then(result => {
        if (!result.isSecure) {
          reject(new Error('Location validation failed - possible fraud detected'));
        } else {
          resolve(result.position);
        }
      })
      .catch(reject);
  });
};

// Check if location is within allowed area with fraud prevention
export const isLocationValid = async (
  userLat: number,
  userLng: number,
  validLocations: Array<{ latitude: number; longitude: number; radius_meter: number; aktif: boolean }>
): Promise<{ isValid: boolean; nearestLocation?: any; distance?: number }> => {
  const activeLocations = validLocations.filter(loc => loc.aktif);
  
  for (const location of activeLocations) {
    const distance = calculateDistance(
      userLat,
      userLng,
      location.latitude,
      location.longitude
    );
    
    if (distance <= location.radius_meter) {
      return {
        isValid: true,
        nearestLocation: location,
        distance
      };
    }
  }
  
  return { isValid: false };
};

// Get location with comprehensive security checks
export const getLocationWithSecurity = async (): Promise<{
  location: { lat: number; lng: number };
  security: {
    isSecure: boolean;
    riskLevel: 'low' | 'medium' | 'high';
    confidence: number;
    warnings: string[];
    deviceFingerprint: string;
  };
}> => {
  const result = await getSecureLocation();
  
  return {
    location: {
      lat: result.position.coords.latitude,
      lng: result.position.coords.longitude
    },
    security: {
      isSecure: result.isSecure,
      riskLevel: result.validation.riskLevel,
      confidence: result.validation.confidence,
      warnings: result.validation.warnings,
      deviceFingerprint: result.deviceFingerprint
    }
  };
};