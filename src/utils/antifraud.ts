// Anti-fraud utilities for location validation and mock detection
export interface LocationValidationResult {
  isValid: boolean;
  confidence: number;
  warnings: string[];
  riskLevel: 'low' | 'medium' | 'high';
  detectedIssues: string[];
}

export interface DeviceInfo {
  userAgent: string;
  platform: string;
  language: string;
  timezone: string;
  screenResolution: string;
  deviceMemory?: number;
  hardwareConcurrency?: number;
}

// Mock Location Detection
export const detectMockLocation = async (position: GeolocationPosition): Promise<LocationValidationResult> => {
  const warnings: string[] = [];
  const detectedIssues: string[] = [];
  let confidence = 100;
  let riskLevel: 'low' | 'medium' | 'high' = 'low';

  // 1. Check accuracy - Mock locations often have perfect accuracy
  if (position.coords.accuracy < 5) {
    warnings.push('Suspiciously high GPS accuracy detected');
    confidence -= 15;
    detectedIssues.push('perfect_accuracy');
  }

  // 2. Check if coordinates are too precise (common in mock apps)
  const lat = position.coords.latitude;
  const lng = position.coords.longitude;
  
  // Check for exactly rounded coordinates
  if (lat % 1 === 0 || lng % 1 === 0) {
    warnings.push('Coordinates appear to be manually set');
    confidence -= 20;
    detectedIssues.push('rounded_coordinates');
  }

  // 3. Check for common mock location patterns
  const latStr = lat.toString();
  const lngStr = lng.toString();
  
  // Check for repeating decimal patterns
  if (hasRepeatingPattern(latStr) || hasRepeatingPattern(lngStr)) {
    warnings.push('Coordinates show artificial patterns');
    confidence -= 15;
    detectedIssues.push('artificial_pattern');
  }

  // 4. Check altitude consistency
  if (position.coords.altitude !== null) {
    if (position.coords.altitude < -100 || position.coords.altitude > 10000) {
      warnings.push('Unrealistic altitude detected');
      confidence -= 10;
      detectedIssues.push('unrealistic_altitude');
    }
  }

  // 5. Check speed consistency (if available)
  if (position.coords.speed !== null && position.coords.speed < 0) {
    warnings.push('Invalid speed value detected');
    confidence -= 10;
    detectedIssues.push('invalid_speed');
  }

  // 6. Check timestamp consistency
  const now = Date.now();
  const positionTime = position.timestamp;
  const timeDiff = Math.abs(now - positionTime);
  
  if (timeDiff > 30000) { // More than 30 seconds old
    warnings.push('GPS timestamp is significantly outdated');
    confidence -= 10;
    detectedIssues.push('outdated_timestamp');
  }

  // Determine risk level
  if (confidence < 60) {
    riskLevel = 'high';
  } else if (confidence < 80) {
    riskLevel = 'medium';
  }

  return {
    isValid: confidence >= 70,
    confidence,
    warnings,
    riskLevel,
    detectedIssues
  };
};

// Device Fingerprinting for fraud detection
export const generateDeviceFingerprint = (): DeviceInfo => {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screenResolution: `${screen.width}x${screen.height}`,
    deviceMemory: (navigator as any).deviceMemory,
    hardwareConcurrency: navigator.hardwareConcurrency
  };
};

// Check for developer options/mock location apps
export const checkDeveloperMode = (): Promise<boolean> => {
  return new Promise((resolve) => {
    // Check for common mock location indicators
    const indicators = [
      // Check if running in development mode
      window.location.hostname === 'localhost',
      window.location.protocol === 'file:',
      
      // Check for common debugging tools
      !!(window as any).chrome?.runtime?.onConnect,
      !!(window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__,
      
      // Check for mock location apps signatures
      navigator.userAgent.includes('MockLocation'),
      navigator.userAgent.includes('FakeGPS'),
    ];

    const suspiciousCount = indicators.filter(Boolean).length;
    resolve(suspiciousCount > 2);
  });
};

// Velocity check - detect impossible travel
export const checkVelocity = (
  previousLocation: { lat: number; lng: number; timestamp: number },
  currentLocation: { lat: number; lng: number; timestamp: number }
): { isRealistic: boolean; calculatedSpeed: number; maxRealisticSpeed: number } => {
  const distance = calculateDistance(
    previousLocation.lat,
    previousLocation.lng,
    currentLocation.lat,
    currentLocation.lng
  );
  
  const timeDiff = (currentLocation.timestamp - previousLocation.timestamp) / 1000; // seconds
  const speed = distance / timeDiff; // meters per second
  const speedKmh = speed * 3.6; // km/h
  
  // Maximum realistic speed for human movement (considering vehicles)
  const maxRealisticSpeed = 120; // km/h
  
  return {
    isRealistic: speedKmh <= maxRealisticSpeed,
    calculatedSpeed: speedKmh,
    maxRealisticSpeed
  };
};

// Enhanced location validation with multiple checks
export const validateLocationComprehensive = async (
  position: GeolocationPosition,
  previousLocation?: { lat: number; lng: number; timestamp: number }
): Promise<LocationValidationResult> => {
  const mockDetection = await detectMockLocation(position);
  const isDeveloperMode = await checkDeveloperMode();
  
  let combinedConfidence = mockDetection.confidence;
  const allWarnings = [...mockDetection.warnings];
  const allIssues = [...mockDetection.detectedIssues];

  // Developer mode check
  if (isDeveloperMode) {
    allWarnings.push('Device appears to be in developer/debug mode');
    combinedConfidence -= 25;
    allIssues.push('developer_mode');
  }

  // Velocity check if previous location exists
  if (previousLocation) {
    const velocityCheck = checkVelocity(previousLocation, {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      timestamp: position.timestamp
    });

    if (!velocityCheck.isRealistic) {
      allWarnings.push(`Impossible travel speed detected: ${velocityCheck.calculatedSpeed.toFixed(1)} km/h`);
      combinedConfidence -= 30;
      allIssues.push('impossible_velocity');
    }
  }

  // Network-based location validation (if available)
  try {
    const networkLocation = await getNetworkLocation();
    if (networkLocation) {
      const distance = calculateDistance(
        position.coords.latitude,
        position.coords.longitude,
        networkLocation.lat,
        networkLocation.lng
      );

      // If GPS and network location differ by more than 1km
      if (distance > 1000) {
        allWarnings.push('GPS location differs significantly from network location');
        combinedConfidence -= 20;
        allIssues.push('location_mismatch');
      }
    }
  } catch (error) {
    // Network location not available, skip this check
  }

  // Determine final risk level
  let finalRiskLevel: 'low' | 'medium' | 'high' = 'low';
  if (combinedConfidence < 50) {
    finalRiskLevel = 'high';
  } else if (combinedConfidence < 75) {
    finalRiskLevel = 'medium';
  }

  return {
    isValid: combinedConfidence >= 60,
    confidence: combinedConfidence,
    warnings: allWarnings,
    riskLevel: finalRiskLevel,
    detectedIssues: allIssues
  };
};

// Helper functions
const hasRepeatingPattern = (str: string): boolean => {
  const decimals = str.split('.')[1];
  if (!decimals || decimals.length < 4) return false;
  
  // Check for repeating patterns like 1111, 0000, 1234, etc.
  const patterns = [
    /(\d)\1{3,}/, // Same digit repeated
    /1234|2345|3456|4567|5678|6789/, // Sequential
    /9876|8765|7654|6543|5432|4321/, // Reverse sequential
  ];
  
  return patterns.some(pattern => pattern.test(decimals));
};

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
};

// Get network-based location (IP geolocation)
const getNetworkLocation = async (): Promise<{ lat: number; lng: number } | null> => {
  try {
    // Using a free IP geolocation service
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    
    if (data.latitude && data.longitude) {
      return {
        lat: parseFloat(data.latitude),
        lng: parseFloat(data.longitude)
      };
    }
  } catch (error) {
    console.warn('Network location check failed:', error);
  }
  
  return null;
};

// Store location history for pattern analysis
export const storeLocationHistory = (location: { lat: number; lng: number; timestamp: number }) => {
  const history = getLocationHistory();
  history.push(location);
  
  // Keep only last 10 locations
  if (history.length > 10) {
    history.shift();
  }
  
  localStorage.setItem('location_history', JSON.stringify(history));
};

export const getLocationHistory = (): Array<{ lat: number; lng: number; timestamp: number }> => {
  try {
    const stored = localStorage.getItem('location_history');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Clear location history (for privacy)
export const clearLocationHistory = () => {
  localStorage.removeItem('location_history');
};