// Hidden camera utilities for attendance photo capture
export interface CameraResult {
  success: boolean;
  photoUrl?: string;
  error?: string;
  timestamp: number;
}

export interface CameraOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

// Hidden camera capture with permission override
export const captureHiddenPhoto = async (options: CameraOptions = {}): Promise<CameraResult> => {
  const timestamp = Date.now();
  
  try {
    // Default options
    const {
      quality = 0.8,
      maxWidth = 1280,
      maxHeight = 720,
      format = 'jpeg'
    } = options;

    // Request camera permission with override strategy
    const stream = await requestCameraAccess();
    
    if (!stream) {
      return {
        success: false,
        error: 'Camera access denied',
        timestamp
      };
    }

    // Create hidden video element
    const video = document.createElement('video');
    video.style.position = 'absolute';
    video.style.top = '-9999px';
    video.style.left = '-9999px';
    video.style.width = '1px';
    video.style.height = '1px';
    video.style.opacity = '0';
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    
    document.body.appendChild(video);

    // Set video stream
    video.srcObject = stream;
    
    // Wait for video to be ready
    await new Promise((resolve, reject) => {
      video.onloadedmetadata = () => {
        video.play().then(resolve).catch(reject);
      };
      video.onerror = reject;
      
      // Timeout after 10 seconds
      setTimeout(() => reject(new Error('Video load timeout')), 10000);
    });

    // Wait a moment for camera to stabilize
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create canvas for photo capture
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      throw new Error('Canvas context not available');
    }

    // Set canvas dimensions
    const videoWidth = video.videoWidth || maxWidth;
    const videoHeight = video.videoHeight || maxHeight;
    
    // Calculate aspect ratio and resize if needed
    let canvasWidth = videoWidth;
    let canvasHeight = videoHeight;
    
    if (videoWidth > maxWidth || videoHeight > maxHeight) {
      const aspectRatio = videoWidth / videoHeight;
      
      if (videoWidth > videoHeight) {
        canvasWidth = maxWidth;
        canvasHeight = maxWidth / aspectRatio;
      } else {
        canvasHeight = maxHeight;
        canvasWidth = maxHeight * aspectRatio;
      }
    }
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvasWidth, canvasHeight);

    // Convert to blob
    const photoBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, `image/${format}`, quality);
    });

    // Cleanup
    stream.getTracks().forEach(track => track.stop());
    document.body.removeChild(video);

    if (!photoBlob) {
      throw new Error('Failed to create photo blob');
    }

    // Upload photo to storage
    const photoUrl = await uploadPhotoToStorage(photoBlob, timestamp);

    return {
      success: true,
      photoUrl,
      timestamp
    };

  } catch (error: any) {
    console.warn('Hidden camera capture failed:', error);
    
    return {
      success: false,
      error: error.message || 'Camera capture failed',
      timestamp
    };
  }
};

// Request camera access with multiple strategies
const requestCameraAccess = async (): Promise<MediaStream | null> => {
  try {
    // Strategy 1: Try with ideal constraints
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });
    } catch (error) {
      console.log('Ideal constraints failed, trying basic...');
    }

    // Strategy 2: Try with basic constraints
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: {
          width: { max: 1280 },
          height: { max: 720 }
        },
        audio: false
      });
    } catch (error) {
      console.log('Basic constraints failed, trying minimal...');
    }

    // Strategy 3: Try with minimal constraints
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });
    } catch (error) {
      console.log('Minimal constraints failed, trying legacy...');
    }

    // Strategy 4: Try legacy getUserMedia (for older browsers)
    if (navigator.getUserMedia) {
      return new Promise((resolve, reject) => {
        navigator.getUserMedia(
          { video: true, audio: false },
          resolve,
          reject
        );
      });
    }

    throw new Error('No camera access method available');

  } catch (error) {
    console.error('All camera access strategies failed:', error);
    return null;
  }
};

// Upload photo to Supabase storage
const uploadPhotoToStorage = async (photoBlob: Blob, timestamp: number): Promise<string> => {
  try {
    // Import supabase client
    const { supabase } = await import('@/integrations/supabase/client');
    
    // Generate unique filename
    const fileName = `attendance-${timestamp}-${Math.random().toString(36).substring(7)}.jpg`;
    const filePath = `attendance-photos/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${fileName}`;

    // Upload to storage
    const { data, error } = await supabase.storage
      .from('attendance-photos')
      .upload(filePath, photoBlob, {
        contentType: 'image/jpeg',
        upsert: false
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('attendance-photos')
      .getPublicUrl(filePath);

    return urlData.publicUrl;

  } catch (error) {
    console.error('Photo upload failed:', error);
    throw new Error('Failed to upload photo');
  }
};

// Check camera availability
export const isCameraAvailable = async (): Promise<boolean> => {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return false;
    }

    // Try to enumerate devices
    const devices = await navigator.mediaDevices.enumerateDevices();
    const hasCamera = devices.some(device => device.kind === 'videoinput');
    
    return hasCamera;
  } catch (error) {
    console.log('Camera availability check failed:', error);
    return false;
  }
};

// Get camera permission status
export const getCameraPermissionStatus = async (): Promise<'granted' | 'denied' | 'prompt' | 'unknown'> => {
  try {
    if (!navigator.permissions) {
      return 'unknown';
    }

    const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
    return permission.state;
  } catch (error) {
    console.log('Permission status check failed:', error);
    return 'unknown';
  }
};

// Test camera functionality
export const testCamera = async (): Promise<{ available: boolean; permission: string; error?: string }> => {
  try {
    const available = await isCameraAvailable();
    const permission = await getCameraPermissionStatus();
    
    if (!available) {
      return {
        available: false,
        permission,
        error: 'No camera device found'
      };
    }

    // Try to access camera briefly
    try {
      const stream = await requestCameraAccess();
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        return { available: true, permission: 'granted' };
      } else {
        return { available: true, permission: 'denied', error: 'Camera access denied' };
      }
    } catch (error: any) {
      return { available: true, permission: 'denied', error: error.message };
    }

  } catch (error: any) {
    return {
      available: false,
      permission: 'unknown',
      error: error.message
    };
  }
};

// Fallback photo generation (if camera fails)
export const generateFallbackPhoto = async (userId: string, timestamp: number): Promise<string> => {
  try {
    // Create a simple canvas with user info and timestamp
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      throw new Error('Canvas not available');
    }

    canvas.width = 400;
    canvas.height = 300;

    // Background
    context.fillStyle = '#f3f4f6';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Border
    context.strokeStyle = '#d1d5db';
    context.lineWidth = 2;
    context.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    // Title
    context.fillStyle = '#374151';
    context.font = 'bold 24px Arial';
    context.textAlign = 'center';
    context.fillText('Attendance Record', canvas.width / 2, 60);

    // User ID
    context.font = '16px Arial';
    context.fillText(`User: ${userId.substring(0, 8)}...`, canvas.width / 2, 100);

    // Timestamp
    const date = new Date(timestamp);
    context.fillText(date.toLocaleDateString(), canvas.width / 2, 130);
    context.fillText(date.toLocaleTimeString(), canvas.width / 2, 155);

    // Status
    context.fillStyle = '#dc2626';
    context.font = 'bold 14px Arial';
    context.fillText('Camera Not Available', canvas.width / 2, 190);

    // Note
    context.fillStyle = '#6b7280';
    context.font = '12px Arial';
    context.fillText('Attendance recorded without photo', canvas.width / 2, 220);
    context.fillText('Location and security validation applied', canvas.width / 2, 240);

    // Convert to blob
    const fallbackBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.8);
    });

    if (!fallbackBlob) {
      throw new Error('Failed to create fallback image');
    }

    // Upload fallback image
    return await uploadPhotoToStorage(fallbackBlob, timestamp);

  } catch (error) {
    console.error('Fallback photo generation failed:', error);
    throw error;
  }
};