import { randomUUID } from 'node:crypto';

export type OnboardingGoal = 'explore' | 'report' | 'monitor' | 'collaborate';
export type OnboardingSource = 'sample' | 'upload';
export type OnboardingStyle = 'simple' | 'ml' | 'powerbi';

export interface OnboardingSession {
  id: string;
  step: 'goal' | 'source' | 'style' | 'ready';
  completedAt: string | null;
  createdById: string;
  organizationId: string;
  goalLabel: string;
  sourceLabel: string;
  styleLabel: string;
}

const GOAL_LABELS: Record<OnboardingGoal, string> = {
  explore: 'Explore your data',
  report: 'Build a report',
  monitor: 'Monitor KPIs',
  collaborate: 'Collaborate with the team',
};

const SOURCE_LABELS: Record<OnboardingSource, string> = {
  sample: 'Sample dataset',
  upload: 'Upload my own CSV/Excel',
};

const STYLE_LABELS: Record<OnboardingStyle, string> = {
  simple: 'Simple charts',
  ml: 'ML-powered insights',
  powerbi: 'Power BI style',
};

export function createOnboardingSession(requestId: string, organizationId: string, userId: string): OnboardingSession {
  return {
    id: randomUUID(),
    step: 'goal',
    completedAt: null,
    createdById: userId,
    organizationId,
    goalLabel: GOAL_LABELS.explore,
    sourceLabel: SOURCE_LABELS.sample,
    styleLabel: STYLE_LABELS.simple,
  };
}

export function getDemoLabels(): { title: string; subtitle: string; action: string } {
  return {
    title: 'Your sample dashboard is ready',
    subtitle: 'Replace demo data with your own files at any time.',
    action: 'Open dashboard',
  };
}
