'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export type OnboardingGoal = 'explore' | 'report' | 'monitor' | 'collaborate';
export type OnboardingSource = 'sample' | 'upload';
export type OnboardingStyle = 'simple' | 'ml' | 'powerbi';

interface OnboardingStepsProps {
  onComplete: (source: OnboardingSource, style: OnboardingStyle) => void;
  isLoading: boolean;
  error: string | null;
}

export function OnboardingSteps({ onComplete, isLoading, error }: OnboardingStepsProps) {
  const [step, setStep] = useState<'goal' | 'source' | 'style'>('goal');
  const [goal, setGoal] = useState<OnboardingGoal>('explore');
  const [source, setSource] = useState<OnboardingSource>('sample');
  const [style, setStyle] = useState<OnboardingStyle>('simple');

  const next = () => {
    if (step === 'goal') setStep('source');
    else if (step === 'source') setStep('style');
    else if (step === 'style') onComplete(source, style);
  };

  return (
    <div className="space-y-6">
      {error && <div className="text-sm text-destructive">{error}</div>}

      {step === 'goal' && (
        <div className="space-y-3">
          <p className="text-sm font-medium">1. Choose your goal</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { value: 'explore', label: 'Explore', desc: 'Find quick insights' },
              { value: 'report', label: 'Report', desc: 'Build shareable reports' },
              { value: 'monitor', label: 'Monitor', desc: 'Track KPIs' },
              { value: 'collaborate', label: 'Collaborate', desc: 'Share with the team' },
            ].map((o) => (
              <button
                key={o.value}
                onClick={() => setGoal(o.value as OnboardingGoal)}
                className={`flex flex-col rounded-xl border p-4 transition ${
                  goal === o.value
                    ? 'border-brand-purple bg-brand-purple/5 ring-2 ring-brand-purple/20'
                    : 'border-input hover:border-accent'
                }`}
              >
                <div className={`flex items-center gap-2 ${goal === o.value ? 'text-brand-purple' : 'text-muted-foreground'}`}>
                  <span className="font-medium">{o.label}</span>
                </div>
                <span className="text-xs text-muted-foreground">{o.desc}</span>
              </button>
            ))}
          </div>
          <Button onClick={next}>Next</Button>
        </div>
      )}

      {step === 'source' && (
        <div className="space-y-3">
          <p className="text-sm font-medium">2. Choose your source</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { value: 'sample', label: 'Sample dataset', desc: 'Explore the demo workspace' },
              { value: 'upload', label: 'Upload CSV/Excel', desc: 'Bring your own file' },
            ].map((o) => (
              <button
                key={o.value}
                onClick={() => setSource(o.value as OnboardingSource)}
                className={`flex flex-col rounded-xl border p-4 transition ${
                  source === o.value
                    ? 'border-brand-purple bg-brand-purple/5 ring-2 ring-brand-purple/20'
                    : 'border-input hover:border-accent'
                }`}
              >
                <div className={`flex items-center gap-2 ${source === o.value ? 'text-brand-purple' : 'text-muted-foreground'}`}>
                  <span className="font-medium">{o.label}</span>
                </div>
                <span className="text-xs text-muted-foreground">{o.desc}</span>
              </button>
            ))}
          </div>
          {source === 'upload' && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground">Your file will be processed shortly.</p>
            </div>
          )}
          <Button onClick={next}>Next</Button>
        </div>
      )}

      {step === 'style' && (
        <div className="space-y-3">
          <p className="text-sm font-medium">3. Choose a dashboard style</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { value: 'simple', label: 'Simple charts' },
              { value: 'ml', label: 'ML-powered insights' },
              { value: 'powerbi', label: 'Power BI style' },
            ].map((o) => (
              <button
                key={o.value}
                onClick={() => setStyle(o.value as OnboardingStyle)}
                className={`flex flex-col rounded-xl border p-4 transition ${
                  style === o.value
                    ? 'border-brand-purple bg-brand-purple/5 ring-2 ring-brand-purple/20'
                    : 'border-input hover:border-accent'
                }`}
              >
                <div className={`flex items-center gap-2 ${style === o.value ? 'text-brand-purple' : 'text-muted-foreground'}`}>
                  <span className="font-medium">{o.label}</span>
                </div>
              </button>
            ))}
          </div>
          <Button onClick={() => onComplete(source, style)} disabled={isLoading}>
            {isLoading ? <Progress value={90} className="h-3 mr-2" /> : null}
            Create demo workspace
          </Button>
        </div>
      )}
    </div>
  );
}
