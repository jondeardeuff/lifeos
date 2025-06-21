# P0 Task 2: Speech-to-Text Integration

## Agent Assignment
**Agent Focus**: AI/ML Integration  
**Priority**: P0 (Critical - Phase 1 MVP)  
**Dependencies**: Task 1 (Voice Recording Infrastructure)  
**Estimated Duration**: 4-6 days  

## Objective
Integrate OpenAI Whisper API for speech-to-text conversion with fallback to Web Speech API, providing real-time transcription display with confidence scoring and multi-language support.

## Technical Context
- **Primary Service**: OpenAI Whisper API
- **Fallback Service**: Web Speech API (browser native)
- **Languages**: English (US), Spanish (ES)
- **File Formats**: WebM, MP3, WAV (up to 25MB)
- **Response Format**: JSON with transcription, confidence, timestamps

## Detailed Subtasks

### 1. Set Up OpenAI Whisper API Integration
```typescript
// Location: server.js or services/speech/whisperService.js
interface WhisperConfig {
  apiKey: string;
  model: 'whisper-1';
  language?: 'en' | 'es';
  response_format: 'json' | 'verbose_json';
}

class WhisperService {
  async transcribeAudio(audioFile: File): Promise<TranscriptionResult> {
    // Implementation
  }
}
```

**Setup Requirements**:
- Configure OpenAI API key in environment variables
- Set up Whisper API client
- Implement proper error handling for API failures
- Add request timeout (30 seconds)
- Implement exponential backoff for retries

### 2. Create Audio File Upload to Whisper Service
```typescript
interface AudioUploadService {
  uploadToWhisper(audioBlob: Blob): Promise<TranscriptionResult>;
  validateAudioFile(file: Blob): boolean;
  convertFormat(blob: Blob, targetFormat: string): Promise<Blob>;
}
```

**Implementation Details**:
- Accept audio blobs from VoiceRecorder component
- Convert audio format if needed (WebM → MP3 for compatibility)
- Validate file size (25MB limit for Whisper)
- Add multipart form upload handling
- Implement upload progress tracking

### 3. Implement Real-time Transcription Display
```typescript
// Location: client/src/components/TranscriptionDisplay.tsx
interface TranscriptionDisplayProps {
  isTranscribing: boolean;
  transcription: string;
  confidence: number;
  alternatives?: string[];
  onRetry?: () => void;
}
```

**UI Components**:
- Real-time typing animation for transcription
- Confidence score indicator (color-coded)
- Loading state during transcription
- Error state with retry option
- Alternative transcription suggestions

### 4. Add Confidence Scoring and Alternative Suggestions
```typescript
interface TranscriptionResult {
  text: string;
  confidence: number; // 0.0 to 1.0
  language: string;
  alternatives?: {
    text: string;
    confidence: number;
  }[];
  timestamps?: {
    start: number;
    end: number;
    text: string;
  }[];
}
```

**Features**:
- Display confidence as percentage and color indicator
- Show alternative transcriptions when confidence < 0.8
- Allow user to select alternative transcription
- Store confidence scores for analytics

### 5. Handle Multi-language Detection (English/Spanish)
```typescript
interface LanguageDetection {
  detectLanguage(audioBlob: Blob): Promise<'en' | 'es'>;
  setPreferredLanguage(language: 'en' | 'es'): void;
  getLanguageConfidence(): number;
}
```

**Implementation**:
- Auto-detect language using Whisper's detection
- Allow manual language selection
- Store user language preference
- Fallback to English if detection fails
- Display detected language in UI

### 6. Implement Background Noise Filtering
```typescript
class AudioPreprocessor {
  applyNoiseReduction(audioBlob: Blob): Promise<Blob>;
  normalizeAudio(audioBlob: Blob): Promise<Blob>;
  enhanceVoice(audioBlob: Blob): Promise<Blob>;
}
```

**Audio Processing**:
- Apply noise reduction before sending to Whisper
- Normalize audio levels
- Enhance voice frequencies
- Remove silence from beginning/end
- Handle low-quality audio gracefully

### 7. Create Fallback to Web Speech API
```typescript
class WebSpeechService {
  isSupported(): boolean;
  transcribe(audioBlob: Blob): Promise<TranscriptionResult>;
  setLanguage(language: string): void;
}
```

**Fallback Logic**:
- Use Web Speech API when Whisper fails/unavailable
- Detect browser support for Web Speech API
- Provide seamless fallback experience
- Maintain same interface as Whisper service
- Add fallback indicator in UI

### 8. Add Transcription Error Handling and Retry Logic
```typescript
enum TranscriptionError {
  API_UNAVAILABLE = 'API_UNAVAILABLE',
  INVALID_AUDIO = 'INVALID_AUDIO',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNSUPPORTED_FORMAT = 'UNSUPPORTED_FORMAT'
}

class TranscriptionErrorHandler {
  handleError(error: TranscriptionError): RetryStrategy;
  getRetryDelay(attempt: number): number;
  shouldRetry(error: TranscriptionError): boolean;
}
```

**Error Handling**:
- Implement exponential backoff (1s, 2s, 4s, 8s)
- Maximum 3 retry attempts
- Different strategies for different error types
- User-friendly error messages
- Automatic fallback to Web Speech API

## Technical Requirements

### API Integration
```typescript
// Environment variables
OPENAI_API_KEY=your_api_key_here
WHISPER_MODEL=whisper-1
WHISPER_TIMEOUT=30000

// API Client setup
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
```

### File Processing
```bash
# Supported formats for Whisper API
- Audio formats: mp3, mp4, mpeg, mpga, m4a, wav, webm
- File size limit: 25 MB
- Duration limit: No explicit limit
```

### Response Handling
```typescript
interface WhisperResponse {
  text: string;
  language?: string;
  duration?: number;
  segments?: Array<{
    id: number;
    start: number;
    end: number;
    text: string;
    confidence: number;
  }>;
}
```

## File Structure
```
server/
├── services/
│   ├── speech/
│   │   ├── whisperService.js      # OpenAI Whisper integration
│   │   ├── webSpeechService.js    # Browser Web Speech API
│   │   ├── audioProcessor.js      # Audio preprocessing
│   │   └── transcriptionManager.js # Service orchestration
│   └── utils/
│       ├── audioValidation.js     # File validation
│       └── errorHandler.js        # Error handling utilities

client/src/
├── components/
│   ├── TranscriptionDisplay.tsx   # Main transcription UI
│   ├── ConfidenceIndicator.tsx    # Confidence visualization
│   └── LanguageSelector.tsx       # Language selection
├── hooks/
│   ├── useTranscription.ts        # Transcription hook
│   └── useLanguageDetection.ts    # Language detection hook
└── services/
    ├── transcriptionAPI.ts        # API client
    └── audioUtils.ts              # Audio utilities
```

## API Endpoints

### Backend Endpoints
```typescript
// POST /api/transcribe
interface TranscribeRequest {
  audio: File;
  language?: 'en' | 'es';
  format?: 'json' | 'verbose_json';
}

interface TranscribeResponse {
  success: boolean;
  data?: TranscriptionResult;
  error?: string;
  fallbackUsed?: boolean;
}
```

### GraphQL Integration
```graphql
type Mutation {
  transcribeAudio(
    audio: Upload!
    language: Language
  ): TranscriptionResult!
}

type TranscriptionResult {
  text: String!
  confidence: Float!
  language: Language!
  alternatives: [TranscriptionAlternative!]
  error: String
}
```

## Testing Requirements

### Unit Tests
```typescript
describe('WhisperService', () => {
  test('transcribes English audio correctly', async () => {
    // Test implementation
  });
  
  test('handles API errors gracefully', async () => {
    // Test implementation
  });
  
  test('falls back to Web Speech API', async () => {
    // Test implementation
  });
});
```

### Integration Tests
- End-to-end transcription flow
- Error handling scenarios
- Fallback mechanism testing
- Multi-language support
- File format compatibility

### Performance Tests
- Transcription speed benchmarks
- File size limit testing
- Concurrent transcription handling
- Memory usage monitoring

## Acceptance Criteria

### Functional Requirements
✅ Audio files transcribe accurately (>85% accuracy for clear speech)  
✅ Real-time transcription display works smoothly  
✅ Confidence scores are displayed correctly  
✅ Multi-language detection works for English/Spanish  
✅ Fallback to Web Speech API functions properly  
✅ Error handling provides clear feedback  
✅ Alternative transcriptions are shown when confidence is low  

### Performance Requirements
✅ Transcription completes within 10 seconds for 2-minute audio  
✅ File uploads handle 25MB files without timeout  
✅ API retries use exponential backoff  
✅ Memory usage remains stable during processing  

### Quality Requirements
✅ >85% transcription accuracy for clear speech  
✅ >70% transcription accuracy for noisy audio  
✅ Language detection accuracy >90%  
✅ Confidence scores correlate with actual accuracy  

## Implementation Notes

### Security Considerations
```typescript
// Validate audio files before processing
const validateAudioFile = (file: File): boolean => {
  const allowedTypes = ['audio/webm', 'audio/mp3', 'audio/wav'];
  const maxSize = 25 * 1024 * 1024; // 25MB
  
  return allowedTypes.includes(file.type) && file.size <= maxSize;
};
```

### Performance Optimizations
- Implement audio preprocessing to improve accuracy
- Use streaming for large file uploads
- Cache transcription results to avoid re-processing
- Implement client-side audio compression

### Error Recovery
```typescript
const transcriptionPipeline = async (audioBlob: Blob) => {
  try {
    return await whisperService.transcribe(audioBlob);
  } catch (whisperError) {
    console.warn('Whisper failed, trying Web Speech API', whisperError);
    try {
      return await webSpeechService.transcribe(audioBlob);
    } catch (fallbackError) {
      throw new Error('All transcription services failed');
    }
  }
};
```

## Integration with Task 1
```typescript
// In VoiceRecorder component
const handleRecordingComplete = async (audioBlob: Blob) => {
  setTranscribing(true);
  try {
    const result = await transcriptionService.transcribe(audioBlob);
    setTranscription(result);
  } catch (error) {
    setError(error.message);
  } finally {
    setTranscribing(false);
  }
};
```

## Deployment Instructions

1. Set up OpenAI API key in environment variables
2. Install required dependencies (OpenAI SDK, audio processing libraries)
3. Implement Whisper service first, then Web Speech fallback
4. Test with various audio qualities and languages
5. Integration test with Task 1 VoiceRecorder component
6. Deploy to staging for comprehensive testing

## Success Validation

Agent should provide:
- [ ] Working Whisper API integration
- [ ] Web Speech API fallback implementation
- [ ] Real-time transcription UI component
- [ ] Multi-language support validation
- [ ] Error handling test results
- [ ] Performance benchmark report
- [ ] Integration documentation

**This task enables the core voice-to-text functionality required for voice command parsing in later phases.**