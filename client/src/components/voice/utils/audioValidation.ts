import { AUDIO_CONSTRAINTS, RecordingError } from './audioUtils';

/**
 * Validate audio blob size and format
 */
export const validateAudioBlob = async (blob: Blob): Promise<void> => {
  // Check if blob exists and has data
  if (!blob || blob.size === 0) {
    throw new Error(RecordingError.INVALID_AUDIO_DATA);
  }

  // Check file size limit (10MB)
  if (blob.size > AUDIO_CONSTRAINTS.maxFileSize) {
    throw new Error(RecordingError.FILE_TOO_LARGE);
  }

  // Check MIME type
  const validMimeTypes = [
    'audio/webm',
    'audio/mp4',
    'audio/mpeg',
    'audio/wav'
  ];

  const isValidMimeType = validMimeTypes.some(type => 
    blob.type.startsWith(type)
  );

  if (!isValidMimeType) {
    throw new Error(`Invalid audio format: ${blob.type}`);
  }
};

/**
 * Validate recording duration
 */
export const validateRecordingDuration = (duration: number): void => {
  if (duration > AUDIO_CONSTRAINTS.maxDuration) {
    throw new Error(RecordingError.MAX_DURATION_EXCEEDED);
  }
  
  if (duration <= 0) {
    throw new Error('Recording duration must be greater than 0');
  }
};

/**
 * Get audio blob metadata for validation
 */
export const getAudioBlobInfo = (blob: Blob) => {
  return {
    size: blob.size,
    type: blob.type,
    sizeInMB: Number((blob.size / (1024 * 1024)).toFixed(2)),
    isValid: blob.size > 0 && blob.size <= AUDIO_CONSTRAINTS.maxFileSize
  };
};

/**
 * Create a temporary audio element to validate playback
 */
export const validateAudioPlayback = async (blob: Blob): Promise<boolean> => {
  return new Promise((resolve) => {
    const audio = new Audio();
    const url = URL.createObjectURL(blob);
    
    const cleanup = () => {
      URL.revokeObjectURL(url);
      audio.remove();
    };

    audio.oncanplaythrough = () => {
      cleanup();
      resolve(true);
    };

    audio.onerror = () => {
      cleanup();
      resolve(false);
    };

    // Timeout after 5 seconds
    setTimeout(() => {
      cleanup();
      resolve(false);
    }, 5000);

    audio.src = url;
  });
};