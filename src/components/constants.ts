import { CalendarEvent, SignalSource, ComputeResource, OrchestrationRule, ComputeStatus } from "./types";

// Generate some mock events relative to "now" to demonstrate the logic
const now = new Date();

export const MOCK_EVENTS: CalendarEvent[] = [
  {
    id: '1',
    title: 'Weekly Team Sync',
    start: new Date(now.getTime() - 1000 * 60 * 60 * 2), // 2 hours ago
    end: new Date(now.getTime() - 1000 * 60 * 60 * 1),
    description: 'General catch up',
  },
  {
    id: '2',
    title: 'Client Demo: Enterprise ML Model',
    start: new Date(now.getTime() + 1000 * 60 * 30), // Starts in 30 mins
    end: new Date(now.getTime() + 1000 * 60 * 90),
    description: 'Demo of the new forecasting engine. Requires GPU instance.',
  },
  {
    id: '3',
    title: 'Lunch',
    start: new Date(now.getTime() + 1000 * 60 * 120), 
    end: new Date(now.getTime() + 1000 * 60 * 180),
  },
  {
    id: '4',
    title: 'Model Training Session',
    start: new Date(now.getTime() + 1000 * 60 * 60 * 5), 
    end: new Date(now.getTime() + 1000 * 60 * 60 * 8),
    description: 'Scheduled retraining on latest dataset.',
  }
];

export const WORKSTREAM_SOURCES: SignalSource[] = [
  {
    id: 'src-1',
    type: 'GOOGLE_CALENDAR',
    name: 'Work Calendar',
    connected: false, // Intentionally false for demo flow
    icon: 'calendar'
  },
  {
    id: 'src-2',
    type: 'SLACK',
    name: 'Engineering Channel',
    connected: false,
    icon: 'message-square'
  }
];

export const MOCK_RESOURCES: ComputeResource[] = [
  {
    id: 'res-1',
    provider: 'AWS',
    name: 'GPU Cluster A1',
    region: 'us-east-1',
    instanceType: 'g5.12xlarge',
    connected: false,
    status: ComputeStatus.OFFLINE
  },
  {
    id: 'res-2',
    provider: 'GCP',
    name: 'TPU Pod V4',
    region: 'us-central1',
    instanceType: 'v4-8',
    connected: false,
    status: ComputeStatus.OFFLINE
  }
];

export const INITIAL_RULES: OrchestrationRule[] = [
  {
    id: 'rule-1',
    triggerName: 'Demo Auto-Scale',
    sourceId: 'src-1',
    triggerKeyword: 'Demo',
    targetResourceId: 'res-1',
    durationBuffer: 15
  }
];

export const BACKGROUND_IMAGE = "https://images.unsplash.com/photo-1470115636492-6d2b56f9146d?q=80&w=2070&auto=format&fit=crop";