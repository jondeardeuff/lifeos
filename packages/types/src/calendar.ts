import { BaseEntity, RecurringPattern } from './common';

export interface CalendarEvent extends BaseEntity {
  userId: string;
  externalId?: string;
  externalProvider?: 'google' | 'outlook' | 'apple';
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  allDay: boolean;
  timezone?: string;
  status: EventStatus;
  visibility: EventVisibility;
  recurringPattern?: RecurringPattern;
  projectId?: string;
  taskId?: string;
  metadata: Record<string, unknown>;
}

export enum EventStatus {
  CONFIRMED = 'confirmed',
  TENTATIVE = 'tentative',
  CANCELLED = 'cancelled'
}

export enum EventVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private'
}

export interface EventAttendee {
  eventId: string;
  userId?: string;
  email?: string;
  name?: string;
  status: AttendeeStatus;
  isOrganizer: boolean;
}

export enum AttendeeStatus {
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  TENTATIVE = 'tentative',
  PENDING = 'pending'
}

export interface CalendarSyncStatus {
  id: string;
  userId: string;
  provider: string;
  lastSyncAt?: Date;
  syncToken?: string;
  isActive: boolean;
  errorMessage?: string;
}

