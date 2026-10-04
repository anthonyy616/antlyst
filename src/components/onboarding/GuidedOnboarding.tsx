'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Sparkles, ArrowRight, Upload, TrendingUp, Users, ListChecks, BarChart3, Clock, AlertCircle } from 'lucide-react';
import { OnboardingGoal, OnboardingSource, OnboardingStyle } from './steps';
import { getDemoLabels } from '@/lib/demo-utils';
import { Progress } from '@/components/ui/progress';

type OnboardingStep = 'goal' | 'source' | 'style' | 'ready';

export function GuidedOnboarding() {
  const [step, setStep] = useState<OnboardingStep>('goal');
  const [goal, setGoal] = useState<OnboardingGoal>('explore');
  const [source, setSource] = useState<OnboardingSource>('sample');
  const [style, setStyle] = useState<OnboardingStyle>('simple');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoLabels] = useState<{ title: string; subtitle: string; action: string }>(() => getDemoLabels());

  const nextStep = (next: OnboardingStep) => {
    setStep(next);
    setError(null);
  };

  const createDemoWorkspace = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/demo/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal, source, style }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create demo workspace');
      window.location.href = `/${data.organizationId}/projects/${data.projectId}`;
    } catch (err: any) {
      setError(err.message || 'Failed to create demo workspace');
      setLoading(false);
    }
  };

  return (
    <div className="overflow-x-hidden">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-16">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-purple/10">
              <Sparkles className="h-6 w-6 text-brand-purple" />
            </div>
            <CardTitle className="text-xl sm:text-2xl">Guided onboarding</CardTitle>
            <CardDescription>
              Choose a goal, pick sample data, then get your first dashboard in minutes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="flex items-center justify-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <p>{error}</p>
              </div>
            )}

            {step === 'goal' && (
              <div className="space-y-4">
                <p className="text-sm font-medium">Choose your goal</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { value: 'explore' as const, label: 'Explore', icon: <TrendingUp className="h-4 w-4" />, desc: 'Find quick insights and ask questions' },
                    { value: 'report' as const, label: 'Report', icon: <CheckCircle className="h-4 w-4" />, desc: 'Build polished shareable reports' },
                    { value: 'monitor' as const, label: 'Monitor', icon: <Clock className="h-4 w-4" />, desc: 'Track KPIs and alert on changes' },
                    { value: 'collaborate' as const, label: 'Collaborate', icon: <Users className="h-4 w-4" />, desc: 'Share dashboards with the team' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setGoal(option.value)}
                      className={`flex flex-col items-start rounded-xl border p-4 transition ${
                        goal === option.value
                          ? 'border-brand-purple bg-brand-purple/5 ring-2 ring-brand-purple/20'
                          : 'border-input hover:border-accent'
                      }`}
                    >
                      <div className={`flex items-center gap-2 ${goal === option.value ? 'text-brand-purple' : 'text-muted-foreground'}`}>
                        {goal === option.value ? <CheckCircle className="h-4 w-4" /> : option.icon}
                        <span className="font-medium">{option.label}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{option.desc}</p>
                    </button>
                  ))}
                </div>
                <Button variant="outline" className="w-full sm:w-auto" onClick={() => nextStep('source')}>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}

            {step === 'source' && (
              <div className="space-y-4">
                <p className="text-sm font-medium">Choose your data source</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    onClick={() => setSource('sample')}
                    className={`flex flex-col items-start rounded-xl border p-4 transition ${
                      source === 'sample' ? 'border-brand-purple bg-brand-purple/5 ring-2 ring-brand-purple/20' : 'border-input hover:border-accent'
                    }`}
                  >
                    <div className={`flex items-center gap-2 ${source === 'sample' ? 'text-brand-purple' : 'text-muted-foreground'}`}>
                      <Sparkles className="h-4 w-4" />
                      <span className="font-medium">Sample dataset</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Exploratory dashboard with safe bundled data</p>
                  </button>
                  <button
                    onClick={() => setSource('upload')}
                    className={`flex flex-col items-start rounded-xl border p-4 transition ${
                      source === 'upload' ? 'border-brand-purple bg-brand-purple/5 ring-2 ring-brand-purple/20' : 'border-input hover:border-accent'
                    }`}
                  >
                    <div className={`flex items-center gap-2 ${source === 'upload' ? 'text-brand-purple' : 'text-muted-foreground'}`}>
                      <Upload className="h-4 w-4" />
                      <span className="font-medium">Upload CSV/Excel</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Bring your own file</p>
                  </button>
                </div>
                <Button variant="outline" className="w-full sm:w-auto" onClick={() => nextStep('style')}>
                  {source === 'sample' ? 'Next' : 'Continue to upload setup'}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}

            {step === 'style' && (
              <div className="space-y-4">
                <p className="text-sm font-medium">Choose a dashboard style</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { value: 'simple' as const, label: 'Simple charts', icon: <ListChecks className="h-5 w-5" /> },
                    { value: 'ml' as const, label: 'ML-powered insights', icon: <TrendingUp className="h-5 w-5" /> },
                    { value: 'powerbi' as const, label: 'Power BI style', icon: <BarChart3 className="h-5 w-5" /> },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setStyle(option.value)}
                      className={`flex flex-col items-start rounded-xl border p-4 transition ${
                        style === option.value
                          ? 'border-brand-purple bg-brand-purple/5 ring-2 ring-brand-purple/20'
                          : 'border-input hover:border-accent'
                      }`}
                    >
                      <div className={`flex items-center gap-2 ${style === option.value ? 'text-brand-purple' : 'text-muted-foreground'}`}>
                        {style === option.value ? <CheckCircle className="h-4 w-4" /> : option.icon}
                        <span className="font-medium">{option.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
                <Button variant="outline" className="w-full sm:w-auto" onClick={createDemoWorkspace} disabled={loading}>
                  {loading ? <><Progress value={80} className="h-3 mr-2" />Loading...</> : <>Let's go <ArrowRight className="h-4 w-4 ml-2" /></>}
                </Button>
              </div>
            )}

            {step === 'ready' && (
              <div className="text-center space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600">
                  <CheckCircle className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-lg font-semibold">{demoLabels.title}</p>
                  <p className="text-sm text-muted-foreground">{demoLabels.subtitle}</p>
                </div>
                <Button onClick={() => window.location.href = '/projects'}>
                  <ArrowRight className="h-4 w-4 ml-2" />
                  {demoLabels.action}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
