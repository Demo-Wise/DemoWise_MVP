export interface User {
  userID: string;
  name: string;
  email: string;
  avatar: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  attendees?: string[];
}

export enum ComputeStatus {
  OFFLINE = 'OFFLINE',
  IDLE = 'IDLE',
  PROVISIONING = 'PROVISIONING',
  ACTIVE = 'ACTIVE',
}

export interface OptimizationLog {
  id: string;
  timestamp: Date;
  action: 'START' | 'STOP' | 'MONITOR';
  reason: string;
  relatedEventId?: string;
}

export interface ComputeConfig {
  provider: 'AWS' | 'GCP' | 'Azure';
  instanceType: string;
  region: string;
}

export type SourceType = 'GOOGLE_CALENDAR' | 'SLACK' | 'JIRA';
export type ComputeProviderType = 'AWS' | 'GCP' | 'AZURE';

export interface SignalSource {
  id: string;
  type: SourceType;
  name: string;
  connected: boolean;
  lastSync?: Date;
  icon: string;
}

export interface ComputeResource {
  id: string;
  provider: ComputeProviderType;
  name: string;
  region: string;
  instanceType: string;
  connected: boolean;
  status: ComputeStatus;
}

export interface OrchestrationRule {
  id: string;
  sourceId: string;
  triggerKeyword: string; // e.g., "Demo"
  triggerName : string;
  targetResourceId: string;
  durationBuffer: number; // Minutes
}

export interface UserSession {
    user: User;
    sessionid: string;
}