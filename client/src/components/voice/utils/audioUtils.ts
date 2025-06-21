// Audio recording constants and utilities

export const AUDIO_CONSTRAINTS = {
  echoCancellation: true,
  noiseSuppression: true,
  sampleRate: 44100,
  maxDuration: 120, // 2 minutes in seconds
  maxFileSize: 10 * 1024 * 1024 // 10MB in bytes
} as const;

export const SUPPORTED_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/mpeg'
] as const;

export enum RecordingError {
  PERMISSION_DENIED = 'Microphone access denied. Please allow microphone access and try again.',
  DEVICE_NOT_FOUND = 'No microphone found. Please connect a microphone and try again.',
  RECORDING_FAILED = 'Recording failed. Please try again.',
  FILE_TOO_LARGE = 'Recording file is too large. Maximum size is 10MB.',
  UNSUPPORTED_BROWSER = 'Your browser does not support audio recording. Please use Chrome, Firefox, or Safari.',
  INVALID_AUDIO_DATA = 'Invalid audio data received.',
  MAX_DURATION_EXCEEDED = 'Recording duration exceeded the maximum limit of 2 minutes.'
}

/**
 * Get the best supported MIME type for recording
 */
export const getBestSupportedMimeType = (): string => {
  for (const mimeType of SUPPORTED_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }
  throw new Error(RecordingError.UNSUPPORTED_BROWSER);
};

/**
 * Format recording time for display
 */
export const formatRecordingTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

/**
 * Calculate time remaining with warning threshold
 */
export const getTimeRemaining = (currentTime: number, maxDuration: number): {
  remaining: number;
  isWarning: boolean;
} => {
  const remaining = maxDuration - currentTime;
  const isWarning = remaining <= 30; // Warning at 30 seconds remaining
  return { remaining, isWarning };
};

/**
 * Convert audio levels array to visual representation
 */
export const processAudioLevels = (levels: number[], barCount: number = 20): number[] => {
  if (levels.length === 0) return new Array(barCount).fill(0);
  
  const chunkSize = Math.floor(levels.length / barCount);
  const processedLevels: number[] = [];
  
  for (let i = 0; i < barCount; i++) {
    const start = i * chunkSize;
    const end = start + chunkSize;
    const chunk = levels.slice(start, end);
    
    // Calculate average level for this chunk
    const average = chunk.reduce((sum, level) => sum + level, 0) / chunk.length;
    processedLevels.push(isNaN(average) ? 0 : average);
  }
  
  return processedLevels;
};

/**
 * Create a simple audio context for testing
 */
export const createAudioContext = (): AudioContext => {
  // @ts-ignore - Handle browser prefixes
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  return new AudioContextClass();
};

/**
 * Clean up media stream
 */
export const cleanupMediaStream = (stream: MediaStream | null): void => {
  if (stream) {
    stream.getTracks().forEach(track => {
      track.stop();
    });
  }
};

/**
 * Check if browser supports audio recording
 */
export const isAudioRecordingSupported = (): boolean => {
  return !!(
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia &&
    typeof MediaRecorder !== 'undefined'
  );
};

/**
 * Get audio recording capabilities
 */
export const getAudioCapabilities = () => {
  const supportedMimeTypes = SUPPORTED_MIME_TYPES.filter(type => 
    MediaRecorder.isTypeSupported(type)
  );
  
  return {
    isSupported: isAudioRecordingSupported(),
    supportedMimeTypes,
    hasPermissionsAPI: 'permissions' in navigator,
    preferredMimeType: supportedMimeTypes[0] || null
  };
};