
// Camera utilities for attendance system with fallback mechanisms
import { supabase } from '@/integrations/supabase/client';

export interface CaptureOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

export interface CaptureResult {
  success: boolean;
  photoUrl?: string;
  error?: string;
  fallbackUsed?: boolean;
}

// Check if camera is available
export const isCameraAvailable = async (): Promise<boolean> => {
  try {
    // Check if mediaDevices API is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return false;
    }

    // Check if we can enumerate devices
    const devices = await navigator.mediaDevices.enumerateDevices();
    const hasCamera = devices.some(device => device.kind === 'videoinput');
    
    return hasCamera;
  } catch (error) {
    console.warn('Camera availability check failed:', error);
    return false;
  }
};

// Get camera stream
export const getCameraStream = async (constraints?: MediaStreamConstraints): Promise<MediaStream> => {
  const defaultConstraints: MediaStreamConstraints = {
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      facingMode: 'user'
    },
    audio: false
  };

  const finalConstraints = constraints || defaultConstraints;

  try {
    // Use modern getUserMedia API
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      return await navigator.mediaDevices.getUserMedia(finalConstraints);
    }
    
    // Fallback for older browsers - but this is deprecated
    const getUserMedia = (navigator as any).getUserMedia || 
                        (navigator as any).webkitGetUserMedia || 
                        (navigator as any).mozGetUserMedia;
    
    if (getUserMedia) {
      return new Promise((resolve, reject) => {
        getUserMedia.call(navigator, finalConstraints, resolve, reject);
      });
    }

    throw new Error('getUserMedia not supported');
  } catch (error) {
    console.error('Failed to get camera stream:', error);
    throw error;
  }
};

// Capture photo from video stream
export const capturePhotoFromStream = async (
  stream: MediaStream, 
  options: CaptureOptions = {}
): Promise<string> => {
  const { quality = 0.8, maxWidth = 1280, maxHeight = 720, format = 'jpeg' } = options;

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      reject(new Error('Canvas context not available'));
      return;
    }

    video.onloadedmetadata = () => {
      // Set canvas dimensions
      const aspectRatio = video.videoWidth / video.videoHeight;
      let width = maxWidth;
      let height = maxHeight;

      if (width / height > aspectRatio) {
        width = height * aspectRatio;
      } else {
        height = width / aspectRatio;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw video frame to canvas
      context.drawImage(video, 0, 0, width, height);

      // Convert to data URL
      const mimeType = `image/${format}`;
      const dataUrl = canvas.toDataURL(mimeType, quality);

      // Stop video stream
      stream.getTracks().forEach(track => track.stop());
      
      resolve(dataUrl);
    };

    video.onerror = () => {
      stream.getTracks().forEach(track => track.stop());
      reject(new Error('Video loading failed'));
    };

    video.srcObject = stream;
    video.play();
  });
};

// Upload photo to Supabase Storage
export const uploadPhotoToStorage = async (dataUrl: string, userId: string): Promise<string> => {
  try {
    // Convert data URL to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `attendance_${userId}_${timestamp}.jpg`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('attendance-photos')
      .upload(filename, blob, {
        contentType: 'image/jpeg',
        upsert: false
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('attendance-photos')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Failed to upload photo:', error);
    throw error;
  }
};

// Generate fallback photo when camera is not available
export const generateFallbackPhoto = async (userId: string, timestamp: number): Promise<string> => {
  try {
    // Create a simple canvas with user info
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      throw new Error('Canvas context not available');
    }

    canvas.width = 400;
    canvas.height = 300;

    // Fill background
    context.fillStyle = '#f3f4f6';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Add border
    context.strokeStyle = '#d1d5db';
    context.lineWidth = 2;
    context.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    // Add text
    context.fillStyle = '#374151';
    context.font = '16px Arial, sans-serif';
    context.textAlign = 'center';
    
    context.fillText('Camera Not Available', canvas.width / 2, 100);
    context.fillText('Attendance Record', canvas.width / 2, 130);
    context.fillText(`User: ${userId.substring(0, 8)}...`, canvas.width / 2, 170);
    context.fillText(`Time: ${new Date(timestamp).toLocaleString()}`, canvas.width / 2, 200);

    // Add icon placeholder
    context.strokeStyle = '#9ca3af';
    context.lineWidth = 3;
    context.beginPath();
    context.arc(canvas.width / 2, 50, 20, 0, 2 * Math.PI);
    context.stroke();
    
    // Camera icon lines
    context.beginPath();
    context.moveTo(canvas.width / 2 - 10, 45);
    context.lineTo(canvas.width / 2 + 10, 45);
    context.moveTo(canvas.width / 2 - 5, 40);
    context.lineTo(canvas.width / 2 + 5, 40);
    context.stroke();

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    return await uploadPhotoToStorage(dataUrl, userId);
  } catch (error) {
    console.error('Failed to generate fallback photo:', error);
    throw error;
  }
};

// Main function to capture photo with fallback
export const captureHiddenPhoto = async (options: CaptureOptions = {}): Promise<CaptureResult> => {
  try {
    // Check if camera is available
    const cameraAvailable = await isCameraAvailable();
    
    if (!cameraAvailable) {
      return {
        success: false,
        error: 'Camera not available',
        fallbackUsed: false
      };
    }

    // Get camera stream
    const stream = await getCameraStream();
    
    // Capture photo
    const dataUrl = await capturePhotoFromStream(stream, options);
    
    // Upload to storage
    const userId = 'anonymous'; // This will be replaced with actual user ID in usage
    const photoUrl = await uploadPhotoToStorage(dataUrl, userId);

    return {
      success: true,
      photoUrl
    };
  } catch (error: any) {
    console.error('Photo capture failed:', error);
    return {
      success: false,
      error: error.message,
      fallbackUsed: false
    };
  }
};

// Visible photo capture for testing/manual use
export const captureVisiblePhoto = async (
  videoElement: HTMLVideoElement,
  options: CaptureOptions = {}
): Promise<CaptureResult> => {
  try {
    if (!videoElement.srcObject) {
      throw new Error('No video stream available');
    }

    const stream = videoElement.srcObject as MediaStream;
    const dataUrl = await capturePhotoFromStream(stream, options);
    const userId = 'anonymous'; // This will be replaced with actual user ID in usage
    const photoUrl = await uploadPhotoToStorage(dataUrl, userId);

    return {
      success: true,
      photoUrl
    };
  } catch (error: any) {
    console.error('Visible photo capture failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
