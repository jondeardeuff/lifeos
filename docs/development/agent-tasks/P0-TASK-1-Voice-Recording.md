# P0 Task 1: Basic Voice Recording Infrastructure

## Agent Assignment
**Agent Focus**: Frontend Voice Components  
**Priority**: P0 (Critical - Phase 1 MVP)  
**Dependencies**: None  
**Estimated Duration**: 3-5 days  

## Objective
Create a complete voice recording infrastructure for the LifeOS web application, enabling users to record audio via push-to-talk with visual feedback and proper audio management.

## Technical Context
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Audio Format**: WebM/MP3
- **File Size Limit**: 10MB per recording
- **Recording Limit**: 2 minutes maximum

## Detailed Subtasks

### 1. Create VoiceRecorder React Component
```typescript
// Location: client/src/components/VoiceRecorder.tsx
interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  disabled?: boolean;
}
```
- Create reusable VoiceRecorder component
- Implement proper TypeScript interfaces
- Add component documentation
- Include accessibility attributes (ARIA labels)

### 2. Implement Audio Level Visualization
- Use Web Audio API `AnalyserNode` for real-time audio analysis
- Create visual waveform or level meter
- Update visualization at 60fps during recording
- Implement smooth animation for audio levels
- Handle cases where no audio input is detected

### 3. Add Visual Feedback States
Create distinct visual states:
- **Idle**: Ready to record (microphone icon)
- **Recording**: Active recording (red dot, pulsing animation)
- **Processing**: Audio processing (spinner/loading)
- **Error**: Error state (warning icon with message)
- **Success**: Recording completed (checkmark)

### 4. Set Up Recording Time Limits
- Implement 2-minute maximum recording duration
- Add countdown timer display
- Automatically stop recording at time limit
- Show warning at 30 seconds remaining
- Provide progress indicator (circular or linear)

### 5. Handle Microphone Permissions
```typescript
const requestMicrophoneAccess = async (): Promise<MediaStream> => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: { 
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44100 
      } 
    });
    return stream;
  } catch (error) {
    // Handle permission denied, device not found, etc.
  }
};
```
- Request microphone permissions properly
- Handle permission denied gracefully
- Show appropriate error messages
- Provide instructions for enabling permissions
- Test across different browsers

### 6. Create Audio Blob Management
- Convert recorded audio to Blob format
- Implement audio compression if needed
- Add file size validation (10MB limit)
- Create audio cleanup/disposal methods
- Handle memory management for large recordings

### 7. Add Keyboard Shortcuts
- Implement spacebar hold-to-record functionality
- Add keyboard event listeners
- Prevent conflicts with other page shortcuts
- Show keyboard shortcut hints in UI
- Make shortcuts configurable

## Technical Requirements

### Web Audio API Implementation
```typescript
class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  
  async startRecording(): Promise<void> {
    // Implementation details
  }
  
  stopRecording(): Promise<Blob> {
    // Implementation details
  }
}
```

### Browser Compatibility
- Support Chrome 60+, Firefox 55+, Safari 14+
- Provide fallback for unsupported browsers
- Test on mobile browsers (iOS Safari, Chrome Mobile)

### File Format Requirements
- Primary: WebM with Opus codec
- Fallback: MP3 format
- Sample rate: 44.1kHz or 48kHz
- Bitrate: 128kbps for speech, 192kbps for music

## File Structure
```
client/src/components/voice/
├── VoiceRecorder.tsx          # Main component
├── AudioVisualizer.tsx        # Waveform visualization
├── RecordingControls.tsx      # Recording buttons/controls
├── PermissionHandler.tsx      # Microphone permission handling
├── hooks/
│   ├── useAudioRecorder.ts    # Recording logic hook
│   ├── useAudioVisualizer.ts  # Visualization hook
│   └── useMicrophonePermission.ts  # Permission hook
└── utils/
    ├── audioUtils.ts          # Audio processing utilities
    └── audioValidation.ts     # File validation utilities
```

## Testing Requirements

### Unit Tests
- Component rendering and props
- Audio recorder functionality
- Permission handling
- File validation
- Keyboard shortcuts

### Integration Tests
- End-to-end recording flow
- Error handling scenarios
- Browser compatibility
- Mobile device testing

### Manual Testing Checklist
- [ ] Recording starts/stops correctly
- [ ] Audio visualization works
- [ ] Time limits are enforced
- [ ] Permissions are requested properly
- [ ] Keyboard shortcuts function
- [ ] File size limits work
- [ ] Error states display correctly

## Acceptance Criteria

### Functional Requirements
✅ User can start recording by clicking/holding button  
✅ Audio level visualization shows during recording  
✅ Recording automatically stops at 2 minutes  
✅ Microphone permissions are handled gracefully  
✅ Spacebar hold-to-record works  
✅ Audio blob is properly formatted and sized  
✅ All error states are handled with clear messages  

### Performance Requirements
✅ Recording starts within 200ms of button press  
✅ Audio visualization updates smoothly (60fps)  
✅ Memory usage remains under 50MB during recording  
✅ Component renders in under 100ms  

### Accessibility Requirements
✅ Screen reader support for all controls  
✅ Keyboard navigation works completely  
✅ High contrast mode compatibility  
✅ Focus indicators are visible  

## Implementation Notes

### Security Considerations
- Validate all audio inputs
- Sanitize file metadata
- Implement CSP headers for audio sources
- Handle HTTPS requirement for microphone access

### Performance Optimizations
- Use Web Workers for audio processing if needed
- Implement audio compression
- Optimize visualization rendering
- Clean up audio resources properly

### Error Handling
```typescript
enum RecordingError {
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  DEVICE_NOT_FOUND = 'DEVICE_NOT_FOUND',
  RECORDING_FAILED = 'RECORDING_FAILED',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  UNSUPPORTED_BROWSER = 'UNSUPPORTED_BROWSER'
}
```

## Deployment Instructions

1. Implement components in order: permissions → recorder → visualizer → controls
2. Test each component individually before integration
3. Run full test suite before marking complete
4. Update documentation with any API changes
5. Coordinate with Task 2 agent for audio handoff integration

## Success Validation

Agent should provide:
- [ ] Complete working VoiceRecorder component
- [ ] Test coverage report (>80%)
- [ ] Browser compatibility matrix
- [ ] Performance benchmarks
- [ ] Code review documentation
- [ ] Integration guide for Task 2

**This task is foundational for the entire voice-first interface and must be completed before Task 2 can proceed with speech-to-text integration.**