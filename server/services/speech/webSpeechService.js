/**
 * Web Speech API fallback service
 * Note: This is primarily a client-side service, but we include server-side
 * utilities for consistency and potential server-side speech recognition
 */
class WebSpeechService {
  constructor() {
    this.config = {
      language: 'en-US',
      continuous: false,
      interimResults: false,
      maxAlternatives: 3
    };
    
    this.supportedLanguages = {
      'en': 'en-US',
      'es': 'es-ES',
      'en-US': 'en-US',
      'es-ES': 'es-ES'
    };
  }

  /**
   * Check if Web Speech API is supported (client-side check)
   * This is mainly for documentation and client-side reference
   * @returns {boolean}
   */
  static isSupported() {
    // This check would be done on the client side
    return typeof window !== 'undefined' && 
           ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
  }

  /**
   * Get client-side implementation code for Web Speech API
   * @returns {string} JavaScript code for client-side implementation
   */
  getClientImplementation() {
    return `
class ClientWebSpeechService {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.config = {
      language: 'en-US',
      continuous: false,
      interimResults: false,
      maxAlternatives: 3
    };
  }

  isSupported() {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  }

  async transcribeAudio(audioBlob, options = {}) {
    if (!this.isSupported()) {
      throw new Error('Web Speech API not supported in this browser');
    }

    return new Promise((resolve, reject) => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      
      // Configure recognition
      this.recognition.continuous = options.continuous || this.config.continuous;
      this.recognition.interimResults = options.interimResults || this.config.interimResults;
      this.recognition.maxAlternatives = options.maxAlternatives || this.config.maxAlternatives;
      this.recognition.lang = options.language || this.config.language;

      let finalResult = null;
      let confidence = 0;

      this.recognition.onresult = (event) => {
        const results = event.results;
        const lastResult = results[results.length - 1];
        
        if (lastResult.isFinal) {
          const transcript = lastResult[0].transcript;
          confidence = lastResult[0].confidence || 0.8;
          
          // Get alternatives
          const alternatives = [];
          for (let i = 1; i < lastResult.length && i < this.config.maxAlternatives; i++) {
            alternatives.push({
              text: lastResult[i].transcript,
              confidence: lastResult[i].confidence || 0.6
            });
          }

          finalResult = {
            text: transcript.trim(),
            confidence: confidence,
            language: this.recognition.lang,
            alternatives: alternatives,
            segments: [{
              start: 0,
              end: 0,
              text: transcript.trim(),
              confidence: confidence
            }],
            duration: 0,
            service: 'web-speech'
          };
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        if (finalResult) {
          resolve(finalResult);
        } else {
          reject(new Error('No speech detected'));
        }
      };

      this.recognition.onerror = (event) => {
        this.isListening = false;
        reject(new Error(\`Speech recognition error: \${event.error}\`));
      };

      // For audio blob input, we need to play it and capture speech
      if (audioBlob instanceof Blob) {
        this.transcribeFromBlob(audioBlob).then(resolve).catch(reject);
      } else {
        // Start listening directly
        this.recognition.start();
        this.isListening = true;
      }
    });
  }

  async transcribeFromBlob(audioBlob) {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      const url = URL.createObjectURL(audioBlob);
      
      audio.src = url;
      audio.onloadeddata = () => {
        // Start recognition when audio starts playing
        this.recognition.start();
        this.isListening = true;
        audio.play();
      };
      
      audio.onended = () => {
        URL.revokeObjectURL(url);
      };
      
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to play audio for transcription'));
      };

      // Set up result handling
      let finalResult = null;
      
      this.recognition.onresult = (event) => {
        const results = event.results;
        const lastResult = results[results.length - 1];
        
        if (lastResult.isFinal) {
          const transcript = lastResult[0].transcript;
          const confidence = lastResult[0].confidence || 0.8;
          
          const alternatives = [];
          for (let i = 1; i < lastResult.length && i < 3; i++) {
            alternatives.push({
              text: lastResult[i].transcript,
              confidence: lastResult[i].confidence || 0.6
            });
          }

          finalResult = {
            text: transcript.trim(),
            confidence: confidence,
            language: this.recognition.lang,
            alternatives: alternatives,
            segments: [{
              start: 0,
              end: audio.duration || 0,
              text: transcript.trim(),
              confidence: confidence
            }],
            duration: audio.duration || 0,
            service: 'web-speech'
          };
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        if (finalResult) {
          resolve(finalResult);
        } else {
          reject(new Error('No speech detected in audio'));
        }
      };

      this.recognition.onerror = (event) => {
        this.isListening = false;
        URL.revokeObjectURL(url);
        reject(new Error(\`Speech recognition error: \${event.error}\`));
      };
    });
  }

  setLanguage(language) {
    this.config.language = this.mapLanguageCode(language);
  }

  mapLanguageCode(language) {
    const langMap = {
      'en': 'en-US',
      'es': 'es-ES',
      'en-US': 'en-US',
      'es-ES': 'es-ES'
    };
    return langMap[language] || 'en-US';
  }

  stop() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  abort() {
    if (this.recognition && this.isListening) {
      this.recognition.abort();
      this.isListening = false;
    }
  }
}

// Export for use in client
window.ClientWebSpeechService = ClientWebSpeechService;
`;
  }

  /**
   * Format error response compatible with Whisper service
   * @param {string} errorMessage - Error message
   * @returns {Error} Formatted error
   */
  createCompatibleError(errorMessage) {
    const error = new Error(`Web Speech API: ${errorMessage}`);
    error.service = 'web-speech';
    return error;
  }

  /**
   * Get supported languages for Web Speech API
   * @returns {Object} Language mapping
   */
  getSupportedLanguages() {
    return this.supportedLanguages;
  }

  /**
   * Health check for Web Speech API availability
   * @returns {Object} Health status
   */
  healthCheck() {
    return {
      service: 'web-speech',
      available: true, // Always available as fallback
      clientSideOnly: true,
      supportedLanguages: Object.keys(this.supportedLanguages),
      timestamp: new Date().toISOString(),
      status: 'healthy',
      note: 'Web Speech API requires client-side browser support'
    };
  }

  /**
   * Server-side transcription placeholder
   * Since Web Speech API is client-side only, this throws an appropriate error
   * @param {Buffer} audioBuffer - Audio buffer (not used)
   * @param {Object} options - Options (not used)
   * @throws {Error} Always throws since Web Speech API is client-side only
   */
  async transcribeAudio(audioBuffer, options = {}) {
    throw this.createCompatibleError(
      'Web Speech API is client-side only. Use the client implementation instead.'
    );
  }

  /**
   * Get configuration for client-side usage
   * @returns {Object} Client configuration
   */
  getClientConfig() {
    return {
      implementation: this.getClientImplementation(),
      supportedLanguages: this.supportedLanguages,
      defaultLanguage: this.config.language,
      usage: {
        basic: `
          const webSpeech = new ClientWebSpeechService();
          if (webSpeech.isSupported()) {
            const result = await webSpeech.transcribeAudio(audioBlob);
            console.log('Transcription:', result.text);
          }
        `,
        withOptions: `
          const result = await webSpeech.transcribeAudio(audioBlob, {
            language: 'es-ES',
            maxAlternatives: 3
          });
        `
      }
    };
  }
}

module.exports = WebSpeechService;