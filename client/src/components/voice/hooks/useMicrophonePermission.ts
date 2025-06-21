import { useState, useEffect, useCallback } from 'react';
import { RecordingError } from '../utils/audioUtils';

export type PermissionState = 'prompt' | 'granted' | 'denied' | 'unknown';

export interface UseMicrophonePermissionReturn {
  hasPermission: boolean;
  permissionState: PermissionState;
  requestPermission: () => Promise<void>;
  error: string | null;
}

export const useMicrophonePermission = (): UseMicrophonePermissionReturn => {
  const [hasPermission, setHasPermission] = useState(false);
  const [permissionState, setPermissionState] = useState<PermissionState>('unknown');
  const [error, setError] = useState<string | null>(null);

  // Check initial permission state
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        // Check if getUserMedia is supported
        if (!navigator.mediaDevices?.getUserMedia) {
          setError(RecordingError.UNSUPPORTED_BROWSER);
          setPermissionState('denied');
          return;
        }

        // Try to get current permission state
        if ('permissions' in navigator) {
          try {
            const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
            setPermissionState(result.state as PermissionState);
            setHasPermission(result.state === 'granted');

            // Listen for permission changes
            result.addEventListener('change', () => {
              setPermissionState(result.state as PermissionState);
              setHasPermission(result.state === 'granted');
            });
          } catch (permissionError) {
            // Fallback if permissions API is not supported
            setPermissionState('prompt');
          }
        } else {
          setPermissionState('prompt');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to check permissions');
        setPermissionState('denied');
      }
    };

    checkPermissions();
  }, []);

  const requestPermission = useCallback(async () => {
    try {
      setError(null);
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      // Success - clean up the stream immediately
      stream.getTracks().forEach(track => track.stop());
      
      setHasPermission(true);
      setPermissionState('granted');
      
    } catch (err) {
      let errorMessage = 'Failed to get microphone permission';
      
      if (err instanceof Error) {
        switch (err.name) {
          case 'NotAllowedError':
            errorMessage = RecordingError.PERMISSION_DENIED;
            setPermissionState('denied');
            break;
          case 'NotFoundError':
            errorMessage = RecordingError.DEVICE_NOT_FOUND;
            setPermissionState('denied');
            break;
          case 'NotSupportedError':
            errorMessage = RecordingError.UNSUPPORTED_BROWSER;
            setPermissionState('denied');
            break;
          default:
            errorMessage = err.message;
            setPermissionState('denied');
        }
      }
      
      setError(errorMessage);
      setHasPermission(false);
      throw new Error(errorMessage);
    }
  }, []);

  return {
    hasPermission,
    permissionState,
    requestPermission,
    error
  };
};