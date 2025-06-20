import { BaseEntity } from './common';

export interface Project extends BaseEntity {
  organizationId?: string;
  name: string;
  description?: string;
  clientName?: string;
  status: ProjectStatus;
  startDate?: Date;
  endDate?: Date;
  budgetAmount?: number;
  color?: string;
  settings: Record<string, unknown>;
  createdBy: string;
  archivedAt?: Date;
}

export enum ProjectStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  ON_HOLD = 'on_hold',
  CANCELLED = 'cancelled'
}

export interface ProjectMember {
  projectId: string;
  userId: string;
  role: string;
  hourlyRate?: number;
  joinedAt: Date;
}

export interface Organization extends BaseEntity {
  name: string;
  ownerId: string;
  settings: Record<string, unknown>;
  subscriptionTier: SubscriptionTier;
}

export enum SubscriptionTier {
  FREE = 'free',
  PERSONAL = 'personal',
  PROFESSIONAL = 'professional',
  BUSINESS = 'business'
}

export interface Team extends BaseEntity {
  organizationId: string;
  name: string;
  description?: string;
}

export interface TeamMember {
  teamId: string;
  userId: string;
  role: string;
}