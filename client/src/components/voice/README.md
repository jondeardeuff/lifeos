# Voice Recording Infrastructure

This directory contains the complete voice recording infrastructure for the LifeOS application, implementing P0-TASK-1 requirements.

## Overview

The voice recording system provides a complete audio capture solution with real-time visualization, permission handling, and robust error management. It's designed to be the foundation for the voice-first interface of LifeOS.

## Components

### Core Components

#### `VoiceRecorder.tsx`
The main component that orchestrates all voice recording functionality.

**Props:**
- `onRecordingComplete: (audioBlob: Blob) => void` - Callback when recording is complete
- `onRecordingStart?: () => void` - Optional callback when recording starts
- `onRecordingStop?: () => void` - Optional callback when recording stops
- `disabled?: boolean` - Disable the recorder
- `maxDuration?: number` - Maximum recording duration in seconds (default: 120)
- `className?: string` - Additional CSS classes

**Features:**
- Push-to-talk and hold-to-record functionality
- Spacebar keyboard shortcuts
- Real-time audio visualization
- Automatic time limits and warnings
- Comprehensive error handling
- Full accessibility support

#### `AudioVisualizer.tsx`
Provides real-time visual feedback of audio levels during recording.

**Features:**
- 20-bar audio level visualization
- Smooth 60fps animations
- State-based color coding
- Responsive design
- Accessibility compliant

#### `RecordingControls.tsx`
Handles the recording button UI and time display.

**Features:**
- Multi-state button design
- Progress bar with time display
- Warning indicators for time limits
- Keyboard and mouse interaction
- ARIA labels and accessibility

#### `PermissionHandler.tsx`
Manages microphone permission requests and error states.

**Features:**
- Cross-browser permission handling
- User-friendly error messages
- Browser-specific instructions
- Graceful fallbacks

### Hooks

#### `useAudioRecorder.ts`
Core recording logic hook that manages the MediaRecorder API.

**Returns:**
- `isRecording: boolean` - Current recording state
- `recordingTime: number` - Current recording time in seconds
- `audioLevels: number[]` - Real-time audio level data
- `startRecording: () => Promise<void>` - Start recording function
- `stopRecording: () => void` - Stop recording function
- `error: string | null` - Current error state

#### `useMicrophonePermission.ts`
Handles microphone permission states and requests.

**Returns:**
- `hasPermission: boolean` - Whether microphone access is granted
- `permissionState: PermissionState` - Current permission state
- `requestPermission: () => Promise<void>` - Request permission function
- `error: string | null` - Permission-related errors

### Utilities

#### `audioUtils.ts`
Common audio processing utilities and constants.

**Key Functions:**
- `formatRecordingTime(seconds: number): string` - Format time for display
- `getTimeRemaining(current: number, max: number)` - Calculate remaining time
- `processAudioLevels(levels: number[], barCount: number)` - Process audio for visualization
- `isAudioRecordingSupported(): boolean` - Check browser support
- `getBestSupportedMimeType(): string` - Get optimal audio format

#### `audioValidation.ts`
Audio file validation and metadata functions.

**Key Functions:**
- `validateAudioBlob(blob: Blob): Promise<void>` - Validate recorded audio
- `validateRecordingDuration(duration: number): void` - Validate duration limits
- `getAudioBlobInfo(blob: Blob)` - Get audio metadata
- `validateAudioPlayback(blob: Blob): Promise<boolean>` - Test audio playback

## Browser Support

### Supported Browsers
- Chrome 60+
- Firefox 55+
- Safari 14+
- Edge 79+

### Audio Formats
- Primary: WebM with Opus codec
- Fallback: MP4, MP3, WAV
- Automatic format selection based on browser support

## Technical Specifications

### Audio Configuration
- **Sample Rate:** 44.1kHz
- **Encoding:** Opus codec (preferred)
- **Echo Cancellation:** Enabled
- **Noise Suppression:** Enabled
- **Max Duration:** 2 minutes (120 seconds)
- **Max File Size:** 10MB

### Performance Targets
- **Recording Start Time:** < 200ms
- **Visualization Update Rate:** 60fps
- **Memory Usage:** < 50MB during recording
- **Component Render Time:** < 100ms

## Usage Examples

### Basic Usage
```tsx
import { VoiceRecorder } from './components/voice/VoiceRecorder';

function MyComponent() {
  const handleRecordingComplete = (audioBlob: Blob) => {
    console.log('Recording complete:', audioBlob);
    // Process the audio blob (send to speech-to-text, etc.)
  };

  return (
    <VoiceRecorder
      onRecordingComplete={handleRecordingComplete}
      onRecordingStart={() => console.log('Started recording')}
      onRecordingStop={() => console.log('Stopped recording')}
    />
  );
}
```

### Custom Configuration
```tsx
<VoiceRecorder
  onRecordingComplete={handleRecordingComplete}
  maxDuration={60} // 1 minute limit
  disabled={isProcessing}
  className="my-custom-styles"
/>
```

### Integration with Forms
```tsx
function TaskCreator() {
  const [showVoiceInput, setShowVoiceInput] = useState(false);
  
  const handleVoiceRecording = async (audioBlob: Blob) => {
    // Process audio with speech-to-text service
    const transcript = await speechToText(audioBlob);
    setTaskDescription(transcript);
  };

  return (
    <form>
      {showVoiceInput && (
        <VoiceRecorder onRecordingComplete={handleVoiceRecording} />
      )}
      {/* Other form fields */}
    </form>
  );
}
```

## Accessibility Features

### Screen Reader Support
- All components have proper ARIA labels
- Live regions for state announcements
- Descriptive button text and help text

### Keyboard Navigation
- Full keyboard accessibility
- Spacebar hold-to-record functionality
- Focus indicators on all interactive elements
- Tab navigation support

### Visual Accessibility
- High contrast mode compatibility
- Color-blind friendly state indicators
- Minimum 4.5:1 color contrast ratio
- Scalable text and icons

## Error Handling

### Error Types
- `PERMISSION_DENIED` - Microphone access denied
- `DEVICE_NOT_FOUND` - No microphone device found
- `RECORDING_FAILED` - General recording failure
- `FILE_TOO_LARGE` - Recording exceeds size limit
- `UNSUPPORTED_BROWSER` - Browser doesn't support recording
- `INVALID_AUDIO_DATA` - Invalid audio data received
- `MAX_DURATION_EXCEEDED` - Recording too long

### Error Recovery
- Automatic cleanup on errors
- User-friendly error messages
- Retry mechanisms where appropriate
- Graceful degradation for unsupported browsers

## Testing

### Unit Tests
Run the test suite:
```bash
npm test src/components/voice
```

### Coverage Requirements
- **Business Logic:** > 80% coverage
- **Error Handling:** 100% coverage
- **Accessibility:** Manual testing required

### Manual Testing Checklist
- [ ] Recording starts/stops correctly
- [ ] Audio visualization shows during recording
- [ ] Time limits are enforced (2 minutes)
- [ ] Permissions are requested properly
- [ ] Keyboard shortcuts function (spacebar)
- [ ] File size limits work (10MB)
- [ ] Error states display correctly
- [ ] Accessibility features work with screen readers
- [ ] Works across supported browsers
- [ ] Mobile device compatibility

## Security Considerations

### Data Privacy
- Audio data is processed locally
- No automatic audio transmission
- User controls all recording sessions
- Temporary audio storage only

### HTTPS Requirement
- Microphone access requires secure context (HTTPS)
- Automatic fallback messaging for HTTP
- Development localhost exception

### Input Validation
- File size limits enforced
- MIME type validation
- Duration limits respected
- Malformed audio detection

## Performance Optimization

### Memory Management
- Automatic cleanup of audio resources
- Stream disposal after recording
- Audio context cleanup
- Blob URL revocation

### Rendering Optimization
- React.memo for expensive components
- useMemo for audio level processing
- Efficient animation frame handling
- Minimal re-renders during recording

## Integration with P0-TASK-2

This voice recording infrastructure is designed to integrate seamlessly with P0-TASK-2 (Speech-to-Text). The `onRecordingComplete` callback provides the audio Blob that will be sent to the speech-to-text service.

### Integration Points
1. **Audio Format:** WebM/MP3 output ready for transcription services
2. **File Size:** Optimized for API transmission (< 10MB)
3. **Error Handling:** Consistent error patterns for upstream services
4. **State Management:** Recording states compatible with transcription UI

## Deployment Notes

### Environment Variables
No environment variables required for basic functionality.

### Build Configuration
Standard React build process. No additional build steps required.

### Production Considerations
- Ensure HTTPS deployment for microphone access
- Test across target browser versions
- Monitor performance metrics
- Set up error tracking for audio failures

## Future Enhancements

### Planned Features (Post-MVP)
- Audio compression options
- Multiple audio format exports
- Recording quality settings
- Batch recording capabilities
- Audio playback preview

### Performance Improvements
- Web Worker audio processing
- Streaming audio analysis
- Memory optimization
- Battery usage optimization

## Support

For issues related to the voice recording infrastructure, check:

1. **Browser Compatibility:** Ensure supported browser version
2. **HTTPS Requirement:** Verify secure context
3. **Microphone Permissions:** Check browser settings
4. **Console Errors:** Look for detailed error messages
5. **Network Issues:** Verify no interference with media APIs

## Changelog

### v1.0.0 (P0-TASK-1 Completion)
- Initial voice recording infrastructure
- Complete component suite
- Full accessibility support
- Cross-browser compatibility
- Comprehensive testing
- Documentation complete