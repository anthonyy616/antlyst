'use client';

import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const ANALYSIS_OPTIONS = [
  {
    id: 'descriptive',
    label: 'Descriptive Statistics',
    description: 'Mean, median, mode, std dev, quartiles',
  },
  {
    id: 'correlation',
    label: 'Correlation Analysis',
    description: 'Pearson, Spearman correlations + heatmap',
  },
  {
    id: 'timeseries',
    label: 'Time Series Analysis',
    description: 'Trends, seasonality, decomposition',
  },
  {
    id: 'forecast',
    label: 'Forecasting',
    description: 'Prophet, ARIMA, exponential smoothing',
  },
  {
    id: 'segmentation',
    label: 'Customer Segmentation',
    description: 'K-means, hierarchical clustering',
  },
  {
    id: 'cohort',
    label: 'Cohort Analysis',
    description: 'Retention, churn by cohort',
  },
  {
    id: 'funnel',
    label: 'Funnel Analysis',
    description: 'Conversion rates at each step',
  },
  {
    id: 'abc',
    label: 'ABC Analysis',
    description: 'Pareto principle, top performers',
  },
  {
    id: 'regression',
    label: 'Regression Analysis',
    description: 'Linear, logistic, feature importance',
  },
  {
    id: 'anomaly',
    label: 'Anomaly Detection',
    description: 'Outliers, anomalies, Z-score',
  },
];

export function AnalysisSelector() {
  const [selected, setSelected] = useState<string[]>(['descriptive', 'correlation']);

  const toggleAnalysis = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Analysis Types</CardTitle>
        <CardDescription>
          Choose which analyses to run on your data. You can always add more later.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ANALYSIS_OPTIONS.map((option) => (
            <div
              key={option.id}
              className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-slate-50 transition-colors cursor-pointer"
              onClick={() => toggleAnalysis(option.id)}
            >
              <Checkbox
                id={option.id}
                checked={selected.includes(option.id)}
                onCheckedChange={() => toggleAnalysis(option.id)}
              />
              <div className="space-y-1 leading-none">
                <Label
                  htmlFor={option.id}
                  className="text-sm font-medium cursor-pointer"
                >
                  {option.label}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {option.description}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-lg bg-blue-50 p-4 border border-blue-200">
          <p className="text-sm text-blue-900">
            <strong>{selected.length}</strong> analysis type{selected.length !== 1 ? 's' : ''} selected
          </p>
        </div>
      </CardContent>
    </Card>
  );
}