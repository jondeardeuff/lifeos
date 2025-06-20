import { BaseEntity } from './common';

export interface VoiceCommand extends BaseEntity {
  userId: string;
  audioDuration?: number;
  transcription: string;
  confidenceScore?: number;
  parsedIntent?: string;
  parsedEntities?: Record<string, unknown>;
  actionTaken?: string;
  actionResult?: Record<string, unknown>;
  errorMessage?: string;
}

export interface UserContext extends BaseEntity {
  userId: string;
  contextType: ContextType;
  key: string;
  value: Record<string, unknown>;
  confidenceScore: number;
  usageCount: number;
  lastUsedAt: Date;
}

export enum ContextType {
  PERSON = 'person',
  PROJECT = 'project',
  LOCATION = 'location',
  PATTERN = 'pattern'
}

export interface AIConversation extends BaseEntity {
  userId: string;
  sessionId: string;
  role: ConversationRole;
  content: string;
  metadata: Record<string, unknown>;
}

export enum ConversationRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system'
}

export interface VoiceRecordingState {
  isRecording: boolean;
  duration: number;
  audioBlob?: Blob;
  error?: Error;
}

export interface VoiceTranscriptionResult {
  text: string;
  confidence: number;
  alternatives?: string[];
  language?: string;
}

export interface ParsedVoiceCommand {
  intent: string;
  entities: {
    title?: string;
    project?: string;
    person?: string;
    dueDate?: Date;
    priority?: number;
    tags?: string[];
    amount?: number;
    category?: string;
  };
  confidence: number;
}