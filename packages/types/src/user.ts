import { BaseEntity } from './common';

export interface User extends BaseEntity {
  email: string;
  phone?: string;
  fullName: string;
  avatarUrl?: string;
  timezone: string;
  settings: Record<string, unknown>;
  deletedAt?: Date;
}

export interface UserRole {
  id: string;
  userId: string;
  role: string;
  scopeType?: 'global' | 'project' | 'organization';
  scopeId?: string;
  grantedAt: Date;
  grantedBy?: string;
}

export interface UserPreferences {
  userId: string;
  voiceEnabled: boolean;
  voiceLanguage: string;
  notificationSettings: NotificationSettings;
  calendarSettings: CalendarSettings;
  financialSettings: FinancialSettings;
  updatedAt: Date;
}

export interface NotificationSettings {
  email: boolean;
  sms: boolean;
  push: boolean;
  taskReminders: boolean;
  eventReminders: boolean;
  dailySummary: boolean;
}

export interface CalendarSettings {
  defaultView: 'day' | 'week' | 'month';
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  workingHours: {
    start: string;
    end: string;
  };
  timeZone: string;
}

export interface FinancialSettings {
  currency: string;
  fiscalYearStart: number;
  taxRate?: number;
}