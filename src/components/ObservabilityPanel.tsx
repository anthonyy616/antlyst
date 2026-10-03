'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Terminal, AlertTriangle, CheckCircle, XCircle, RefreshCw, Copy } from 'lucide-react';

interface HealthCheck {
  status: 'ok' | 'degraded' | 'fail';
  checks: Record<string, 'ok' | 'degraded' | 'fail'>;
}

interface LogEntry {
  message: string;
  category: string;
  requestId: string;
  userId?: string;
  timestamp: string;
}

/**
 * Observations panel for staff support.
 *
 * Intended for an internal route behind the existing auth/app restriction.
 * The component does nothing more than read a server-rendered snapshot and
 * issue idempotent GETs; no tokens, connection strings, or dataset contents
 * are ever returned here.
 */
export function ObservabilityPanel() {
  const [health, setHealth] = useState<HealthCheck | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [category, setCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    load();
  }, [category]);

  async function load() {
    setLoading(true);
    try {
      const [healthRes, logsRes] = await Promise.all([
        fetch('/api/observability/health'),
        fetch('/api/observability/logs?category=' + category),
      ]);
      if (healthRes.ok) setHealth(await healthRes.json());
      if (logsRes.ok) setLogs(await logsRes.json());
    } catch (error) {
      console.error('[ObservabilityPanel] load failed:', error);
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    setRefreshing(true);
    try {
      const res = await fetch('/api/observability/health', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      }
    } catch (error) {
      console.error('[ObservabilityPanel] health refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  }

  const filtered = category === 'all' ? logs : logs.filter((log) => log.category === category);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Observability & Diagnostics</h2>
          <p className="text-sm text-gray-500">Protected diagnostics and safe structured logs.</p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{health?.status ?? '—'}</div>
            <div className="text-xs text-gray-500">Overall</div>
          </CardContent>
        </Card>
        {Object.entries(health?.checks ?? {}).map(([name, value]) => (
          <Card key={name}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                {value === 'ok' ? <CheckCircle className="h-4 w-4 text-green-600" /> : value === 'fail' ? <XCircle className="h-4 w-4 text-red-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}
                <div className="text-sm font-medium">{name}</div>
              </div>
              <div className="text-xs text-gray-500">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            <SelectItem value="validation_error">Validation errors</SelectItem>
            <SelectItem value="not_found">Not found</SelectItem>
            <SelectItem value="unauthorized">Unauthorized</SelectItem>
            <SelectItem value="forbidden">Forbidden</SelectItem>
            <SelectItem value="rate_limit">Rate limited</SelectItem>
            <SelectItem value="upload">Upload</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="database">Database</SelectItem>
            <SelectItem value="ai">AI</SelectItem>
            <SelectItem value="mail">Mail</SelectItem>
            <SelectItem value="storage">Storage</SelectItem>
            <SelectItem value="external_service">External service</SelectItem>
            <SelectItem value="unexpected">Unexpected</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Load logs
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent server logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[420px] overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-sm text-gray-500">No logs in this category.</p>
            ) : (
              filtered.slice(0, 100).map((log, idx) => (
                <div key={idx} className="flex flex-col gap-1 rounded border p-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={log.category === 'unexpected' ? 'destructive' : log.category === 'rate_limit' ? 'secondary' : 'default'}>{log.category}</Badge>
                    <span className="text-gray-500">{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="font-mono text-gray-800 dark:text-gray-200">{log.message}</p>
                  {log.userId && <p className="text-gray-500">user: {log.userId}</p>}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
