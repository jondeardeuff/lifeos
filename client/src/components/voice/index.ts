// Voice Recording Infrastructure - Main Exports
// P0-TASK-1: Basic Voice Recording Infrastructure

// Core Components
export { VoiceRecorder, RecordingState } from './VoiceRecorder';
export { AudioVisualizer } from './AudioVisualizer';
export { RecordingControls } from './RecordingControls';
export { PermissionHandler } from './PermissionHandler';

// Hooks
export { useAudioRecorder } from './hooks/useAudioRecorder';
export { useMicrophonePermission } from './hooks/useMicrophonePermission';
export type { UseAudioRecorderOptions, UseAudioRecorderReturn } from './hooks/useAudioRecorder';
export type { PermissionState, UseMicrophonePermissionReturn } from './hooks/useMicrophonePermission';

// Utilities
export {
  AUDIO_CONSTRAINTS,
  SUPPORTED_MIME_TYPES,
  RecordingError,
  formatRecordingTime,
  getTimeRemaining,
  processAudioLevels,
  getBestSupportedMimeType,
  cleanupMediaStream,
  isAudioRecordingSupported,
  getAudioCapabilities
} from './utils/audioUtils';

export {
  validateAudioBlob,
  validateRecordingDuration,
  getAudioBlobInfo,
  validateAudioPlayback
} from './utils/audioValidation';

// Type definitions for external use
export interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  disabled?: boolean;
  maxDuration?: number;
  className?: string;
}