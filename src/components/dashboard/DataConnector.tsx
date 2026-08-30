'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Upload,
    Link,
    Globe,
    FileSpreadsheet,
    Cloud,
    Plug,
    CheckCircle,
    AlertCircle,
    Plus,
    Trash2,
    RefreshCw,
    Loader2,
    Zap,
    ArrowRight,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export interface DataConnection {
    id: string;
    name: string;
    type: 'upload' | 'url' | 'api' | 'google-sheets' | 's3';
    status: 'connected' | 'error' | 'disconnected' | 'fetching' | 'ready';
    config: Record<string, string>;
    lastSync?: string;
}

interface DataSourceListItem {
    id: string;
    name: string;
    type: string;
    status: string;
    lastSyncAt: string | null;
    errorMessage: string | null;
    createdAt: string;
}

interface TestResult {
    reachable: boolean;
    samplePreview?: any[];
    columnCount?: number;
    error?: string;
    metadata?: { format: string; estimatedRows?: number };
}

interface DataConnectorProps {
    open: boolean;
    onClose: () => void;
    projectId?: string;
    onDataSourceCreated?: () => void;
}

const SOURCE_TYPES = [
    { type: 'upload' as const, label: 'File Upload', icon: Upload, desc: 'CSV, Excel, PDF' },
    { type: 'url' as const, label: 'Direct URL', icon: Link, desc: 'CSV, JSON, Excel link' },
    { type: 'api' as const, label: 'REST API', icon: Globe, desc: 'JSON endpoint' },
    { type: 'google-sheets' as const, label: 'Google Sheets', icon: FileSpreadsheet, desc: 'Public spreadsheet' },
    { type: 's3' as const, label: 'AWS S3', icon: Cloud, desc: 'S3 bucket file' },
];

export function DataConnector({ open, onClose, projectId, onDataSourceCreated }: DataConnectorProps) {
    const [step, setStep] = useState<'list' | 'add'>('list');
    const [connType, setConnType] = useState<'url' | 'api' | 'google-sheets' | 's3'>('url');
    const [connName, setConnName] = useState('');
    const [config, setConfig] = useState<Record<string, string>>({});
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<TestResult | null>(null);
    const [creating, setCreating] = useState(false);
    const [fetchStatus, setFetchStatus] = useState<'idle' | 'fetching' | 'ready' | 'error'>('idle');
    const [fetchResult, setFetchResult] = useState<{ rowCount?: number; error?: string } | null>(null);
    const [dataSources, setDataSources] = useState<DataSourceListItem[]>([]);

    // Fetch existing data sources
    const loadDataSources = useCallback(async () => {
        if (!projectId || !open) return;
        try {
            const res = await fetch(`/api/datasources?projectId=${projectId}`);
            if (res.ok) {
                const data = await res.json();
                setDataSources(data.dataSources || []);
            }
        } catch (err) {
            console.error('Failed to load data sources:', err);
        }
    }, [projectId, open]);

    useEffect(() => {
        if (step === 'list') {
            loadDataSources();
        }
    }, [step, loadDataSources]);

    // Poll for fetch status
    useEffect(() => {
        if (fetchStatus !== 'fetching') return;

        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/datasources?projectId=${projectId}`);
                if (res.ok) {
                    const data = await res.json();
                    const latest = data.dataSources?.[0];
                    if (latest && latest.status === 'ready') {
                        setFetchStatus('ready');
                        setFetchResult({ rowCount: 100 }); // Approximate
                        clearInterval(interval);
                        onDataSourceCreated?.();
                    } else if (latest && latest.status === 'error') {
                        setFetchStatus('error');
                        setFetchResult({ error: latest.errorMessage || 'Fetch failed' });
                        clearInterval(interval);
                    }
                }
            } catch {
                // Ignore polling errors
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [fetchStatus, projectId, onDataSourceCreated]);

    const resetForm = () => {
        setConnName('');
        setConfig({});
        setTestResult(null);
        setCreating(false);
        setFetchStatus('idle');
        setFetchResult(null);
    };

    const handleTest = async () => {
        setTesting(true);
        setTestResult(null);

        try {
            // First create a temporary data source to test
            const createRes = await fetch('/api/datasources', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    name: connName || 'Test Connection',
                    type: connType,
                    config,
                }),
            });

            if (!createRes.ok) throw new Error('Failed to create test source');

            const { id } = await createRes.json();

            // Test the connection
            const testRes = await fetch(`/api/datasources/${id}/test`, {
                method: 'POST',
            });

            const result = await testRes.json();
            setTestResult(result);
        } catch (err: any) {
            setTestResult({ reachable: false, error: err.message });
        } finally {
            setTesting(false);
        }
    };

    const handleCreate = async () => {
        if (!connName.trim() || !projectId) return;

        setCreating(true);
        try {
            const res = await fetch('/api/datasources', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    name: connName,
                    type: connType,
                    config,
                }),
            });

            if (!res.ok) throw new Error('Failed to create data source');

            const { id } = await res.json();

            // Trigger fetch
            setFetchStatus('fetching');
            await fetch(`/api/datasources/${id}/fetch`, { method: 'POST' });
        } catch (err: any) {
            setFetchStatus('error');
            setFetchResult({ error: err.message });
        } finally {
            setCreating(false);
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'upload': return <Upload className="h-5 w-5 text-slate-500" />;
            case 'url': return <Link className="h-5 w-5 text-blue-500" />;
            case 'api': return <Globe className="h-5 w-5 text-orange-500" />;
            case 'google-sheets': return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
            case 's3': return <Cloud className="h-5 w-5 text-purple-500" />;
            default: return <Plug className="h-5 w-5" />;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'ready': return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Ready</Badge>;
            case 'fetching': return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Fetching</Badge>;
            case 'error': return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Error</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Plug className="h-5 w-5" />
                        Data Sources
                    </DialogTitle>
                    <DialogDescription>
                        Connect to external data sources or import files to power your dashboards.
                    </DialogDescription>
                </DialogHeader>

                {step === 'list' ? (
                    <>
                        {/* Existing Connections */}
                        <div className="space-y-3 overflow-y-auto max-h-[350px] pr-1">
                            {dataSources.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground text-sm">
                                    <Plug className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p>No data sources configured yet.</p>
                                    <p className="text-xs mt-1">Add a source to get started.</p>
                                </div>
                            ) : (
                                dataSources.map((ds) => (
                                    <Card key={ds.id}>
                                        <CardContent className="p-3 flex items-center gap-3">
                                            {getTypeIcon(ds.type)}
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm truncate">{ds.name}</div>
                                                <div className="text-xs text-muted-foreground capitalize">{ds.type.replace('-', ' ')}</div>
                                            </div>
                                            {getStatusBadge(ds.status)}
                                            {ds.errorMessage && (
                                                <span className="text-xs text-red-500 truncate max-w-[150px]" title={ds.errorMessage}>
                                                    {ds.errorMessage}
                                                </span>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={onClose}>Close</Button>
                            <Button onClick={() => { setStep('add'); resetForm(); }}>
                                <Plus className="h-4 w-4 mr-1" />
                                Add Source
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    <>
                        {/* Add New Source Form */}
                        <div className="space-y-4 overflow-y-auto max-h-[400px] pr-1">
                            {/* Source Type Selector */}
                            <div className="space-y-2">
                                <Label>Source Type</Label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {SOURCE_TYPES.filter(s => s.type !== 'upload').map(({ type, label, icon: Icon, desc }) => (
                                        <Card
                                            key={type}
                                            className={`cursor-pointer transition-all ${
                                                connType === type
                                                    ? 'ring-2 ring-primary'
                                                    : 'hover:border-primary/50'
                                            }`}
                                            onClick={() => { setConnType(type); setTestResult(null); }}
                                        >
                                            <CardContent className="p-3 text-center">
                                                <Icon className="h-5 w-5 mx-auto mb-1" />
                                                <div className="text-xs font-medium">{label}</div>
                                                <div className="text-[10px] text-muted-foreground">{desc}</div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>

                            {/* Connection Name */}
                            <div className="space-y-2">
                                <Label>Source Name</Label>
                                <Input
                                    value={connName}
                                    onChange={(e) => setConnName(e.target.value)}
                                    placeholder="My Data Source"
                                    className="h-9 text-sm"
                                />
                            </div>

                            {/* Type-specific fields */}
                            {connType === 'url' && (
                                <div className="space-y-2">
                                    <Label>Data URL</Label>
                                    <Input
                                        value={config.url || ''}
                                        onChange={(e) => setConfig({ ...config, url: e.target.value })}
                                        placeholder="https://example.com/data.csv"
                                        className="h-9 text-sm"
                                    />
                                    <p className="text-xs text-muted-foreground">Direct link to CSV, JSON, or Excel file</p>
                                </div>
                            )}

                            {connType === 'api' && (
                                <div className="space-y-3">
                                    <div className="space-y-2">
                                        <Label>API Endpoint</Label>
                                        <Input
                                            value={config.url || ''}
                                            onChange={(e) => setConfig({ ...config, url: e.target.value })}
                                            placeholder="https://api.example.com/data"
                                            className="h-9 text-sm"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <Label>Method</Label>
                                            <Select value={config.method || 'GET'} onValueChange={(val) => setConfig({ ...config, method: val })}>
                                                <SelectTrigger className="h-9 text-sm">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="GET">GET</SelectItem>
                                                    <SelectItem value="POST">POST</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Content Type</Label>
                                            <Select value={config.contentType || 'application/json'} onValueChange={(val) => setConfig({ ...config, contentType: val })}>
                                                <SelectTrigger className="h-9 text-sm">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="application/json">JSON</SelectItem>
                                                    <SelectItem value="text/csv">CSV</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Headers (JSON, optional)</Label>
                                        <Input
                                            value={config.headers || ''}
                                            onChange={(e) => setConfig({ ...config, headers: e.target.value })}
                                            placeholder='{"Authorization": "Bearer xxx"}'
                                            className="h-9 text-sm font-mono text-xs"
                                        />
                                    </div>
                                    {config.method === 'POST' && (
                                        <div className="space-y-2">
                                            <Label>Request Body (JSON)</Label>
                                            <Textarea
                                                value={config.body || ''}
                                                onChange={(e) => setConfig({ ...config, body: e.target.value })}
                                                placeholder='{"limit": 100}'
                                                className="h-20 text-sm font-mono text-xs"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {connType === 'google-sheets' && (
                                <div className="space-y-2">
                                    <Label>Google Sheets URL</Label>
                                    <Input
                                        value={config.url || ''}
                                        onChange={(e) => setConfig({ ...config, url: e.target.value })}
                                        placeholder="https://docs.google.com/spreadsheets/d/..."
                                        className="h-9 text-sm"
                                    />
                                    <p className="text-xs text-muted-foreground">Sheet must be publicly accessible or shared with link</p>
                                </div>
                            )}

                            {connType === 's3' && (
                                <div className="space-y-3">
                                    <div className="space-y-2">
                                        <Label>S3 File URL</Label>
                                        <Input
                                            value={config.url || ''}
                                            onChange={(e) => setConfig({ ...config, url: e.target.value })}
                                            placeholder="s3://bucket-name/path/to/file.csv"
                                            className="h-9 text-sm"
                                        />
                                        <p className="text-xs text-muted-foreground">Or https://bucket.s3.region.amazonaws.com/key</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <Label>Access Key ID (optional)</Label>
                                            <Input
                                                type="password"
                                                value={config.s3AccessKeyId || ''}
                                                onChange={(e) => setConfig({ ...config, s3AccessKeyId: e.target.value })}
                                                placeholder="Uses env credentials"
                                                className="h-9 text-sm"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Secret Access Key (optional)</Label>
                                            <Input
                                                type="password"
                                                value={config.s3SecretAccessKey || ''}
                                                onChange={(e) => setConfig({ ...config, s3SecretAccessKey: e.target.value })}
                                                placeholder="Uses env credentials"
                                                className="h-9 text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Region</Label>
                                        <Select value={config.s3Region || 'us-east-1'} onValueChange={(val) => setConfig({ ...config, s3Region: val })}>
                                            <SelectTrigger className="h-9 text-sm">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                                                <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
                                                <SelectItem value="eu-west-1">EU (Ireland)</SelectItem>
                                                <SelectItem value="ap-southeast-1">Asia Pacific (Singapore)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}

                            {/* Test Connection Button */}
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleTest}
                                    disabled={testing || !config.url}
                                    className="gap-1"
                                >
                                    {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                                    Test Connection
                                </Button>
                            </div>

                            {/* Test Result */}
                            {testResult && (
                                <Card className={testResult.reachable ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'border-red-500 bg-red-50 dark:bg-red-950/20'}>
                                    <CardContent className="p-3">
                                        {testResult.reachable ? (
                                            <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                                                <CheckCircle className="h-4 w-4" />
                                                <span className="text-sm font-medium">Connection successful!</span>
                                                {testResult.metadata && (
                                                    <span className="text-xs text-muted-foreground ml-auto">
                                                        {testResult.metadata.format} • {testResult.metadata.estimatedRows || '?'} rows
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                                                <AlertCircle className="h-4 w-4" />
                                                <span className="text-sm">{testResult.error}</span>
                                            </div>
                                        )}
                                        {testResult.samplePreview && testResult.samplePreview.length > 0 && (
                                            <div className="mt-2 overflow-x-auto">
                                                <p className="text-xs text-muted-foreground mb-1">Preview ({testResult.columnCount} columns):</p>
                                                <table className="w-full text-xs">
                                                    <thead>
                                                        <tr>
                                                            {Object.keys(testResult.samplePreview[0]).slice(0, 5).map(col => (
                                                                <th key={col} className="px-2 py-1 text-left font-medium border-b">{col}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {testResult.samplePreview.slice(0, 3).map((row, i) => (
                                                            <tr key={i}>
                                                                {Object.values(row).slice(0, 5).map((val, j) => (
                                                                    <td key={j} className="px-2 py-1 border-b">{String(val ?? '—')}</td>
                                                                ))}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Fetch Progress */}
                            {fetchStatus === 'fetching' && (
                                <Card className="border-blue-500 bg-blue-50 dark:bg-blue-950/20">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-3">
                                            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                                            <div>
                                                <p className="text-sm font-medium">Fetching data...</p>
                                                <p className="text-xs text-muted-foreground">This may take a moment for large datasets</p>
                                            </div>
                                        </div>
                                        <Progress value={50} className="mt-3" />
                                    </CardContent>
                                </Card>
                            )}

                            {fetchStatus === 'ready' && (
                                <Card className="border-green-500 bg-green-50 dark:bg-green-950/20">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-3">
                                            <CheckCircle className="h-5 w-5 text-green-500" />
                                            <div>
                                                <p className="text-sm font-medium">Data loaded successfully!</p>
                                                <p className="text-xs text-muted-foreground">Your dashboard is ready</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {fetchStatus === 'error' && fetchResult && (
                                <Card className="border-red-500 bg-red-50 dark:bg-red-950/20">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-3">
                                            <AlertCircle className="h-5 w-5 text-red-500" />
                                            <div>
                                                <p className="text-sm font-medium">Fetch failed</p>
                                                <p className="text-xs text-red-600">{fetchResult.error}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => { setStep('list'); resetForm(); }}>Back</Button>
                            {fetchStatus === 'ready' ? (
                                <Button onClick={onClose}>
                                    Done
                                    <ArrowRight className="h-4 w-4 ml-1" />
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleCreate}
                                    disabled={!connName.trim() || creating || fetchStatus === 'fetching'}
                                >
                                    {creating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                                    Create & Fetch
                                </Button>
                            )}
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
