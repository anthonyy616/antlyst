'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
    Database,
    Globe,
    FileSpreadsheet,
    Plug,
    CheckCircle,
    AlertCircle,
    Plus,
    Trash2,
    RefreshCw,
} from 'lucide-react';

export interface DataConnection {
    id: string;
    name: string;
    type: 'api' | 'google-sheets' | 'database';
    status: 'connected' | 'error' | 'disconnected';
    config: Record<string, string>;
    lastSync?: string;
}

interface DataConnectorProps {
    open: boolean;
    onClose: () => void;
    connections: DataConnection[];
    onAddConnection: (conn: Omit<DataConnection, 'id' | 'status'>) => void;
    onRemoveConnection: (id: string) => void;
    onTestConnection: (id: string) => Promise<boolean>;
}

export function DataConnector({ open, onClose, connections, onAddConnection, onRemoveConnection, onTestConnection }: DataConnectorProps) {
    const [step, setStep] = useState<'list' | 'add'>('list');
    const [connType, setConnType] = useState<'api' | 'google-sheets' | 'database'>('api');
    const [connName, setConnName] = useState('');
    const [config, setConfig] = useState<Record<string, string>>({});
    const [testing, setTesting] = useState(false);

    const handleAdd = () => {
        onAddConnection({
            name: connName,
            type: connType,
            config,
        });
        setStep('list');
        setConnName('');
        setConfig({});
    };

    const handleTest = async (id: string) => {
        setTesting(true);
        await onTestConnection(id);
        setTesting(false);
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'api': return <Globe className="h-5 w-5 text-blue-500" />;
            case 'google-sheets': return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
            case 'database': return <Database className="h-5 w-5 text-purple-500" />;
            default: return <Plug className="h-5 w-5" />;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'connected': return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Connected</Badge>;
            case 'error': return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Error</Badge>;
            default: return <Badge variant="secondary">Disconnected</Badge>;
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Plug className="h-5 w-5" />
                        Data Connections
                    </DialogTitle>
                    <DialogDescription>
                        Connect to external data sources to power your dashboards.
                    </DialogDescription>
                </DialogHeader>

                {step === 'list' ? (
                    <>
                        {/* Existing Connections */}
                        <div className="space-y-3 overflow-y-auto max-h-[350px] pr-1">
                            {connections.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground text-sm">
                                    <Plug className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p>No connections configured yet.</p>
                                    <p className="text-xs mt-1">Add a connection to get started.</p>
                                </div>
                            ) : (
                                connections.map((conn) => (
                                    <Card key={conn.id}>
                                        <CardContent className="p-3 flex items-center gap-3">
                                            {getTypeIcon(conn.type)}
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm truncate">{conn.name}</div>
                                                <div className="text-xs text-muted-foreground capitalize">{conn.type.replace('-', ' ')}</div>
                                            </div>
                                            {getStatusBadge(conn.status)}
                                            <div className="flex gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={() => handleTest(conn.id)}
                                                    disabled={testing}
                                                >
                                                    <RefreshCw className={`h-3.5 w-3.5 ${testing ? 'animate-spin' : ''}`} />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-red-500"
                                                    onClick={() => onRemoveConnection(conn.id)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={onClose}>Close</Button>
                            <Button onClick={() => setStep('add')}>
                                <Plus className="h-4 w-4 mr-1" />
                                Add Connection
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    <>
                        {/* Add New Connection Form */}
                        <div className="space-y-4 overflow-y-auto max-h-[400px] pr-1">
                            <div className="space-y-2">
                                <Label>Connection Type</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { type: 'api' as const, label: 'REST API', icon: Globe, desc: 'JSON endpoints' },
                                        { type: 'google-sheets' as const, label: 'Google Sheets', icon: FileSpreadsheet, desc: 'Spreadsheet data' },
                                        { type: 'database' as const, label: 'Database', icon: Database, desc: 'SQL queries' },
                                    ].map(({ type, label, icon: Icon, desc }) => (
                                        <Card
                                            key={type}
                                            className={`cursor-pointer transition-all ${
                                                connType === type
                                                    ? 'ring-2 ring-primary'
                                                    : 'hover:border-primary/50'
                                            }`}
                                            onClick={() => setConnType(type)}
                                        >
                                            <CardContent className="p-3 text-center">
                                                <Icon className="h-6 w-6 mx-auto mb-1" />
                                                <div className="text-xs font-medium">{label}</div>
                                                <div className="text-[10px] text-muted-foreground">{desc}</div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Connection Name</Label>
                                <Input
                                    value={connName}
                                    onChange={(e) => setConnName(e.target.value)}
                                    placeholder="My Data Source"
                                    className="h-9 text-sm"
                                />
                            </div>

                            {/* Type-specific fields */}
                            {connType === 'api' && (
                                <div className="space-y-3">
                                    <div className="space-y-2">
                                        <Label>API Endpoint URL</Label>
                                        <Input
                                            value={config.url || ''}
                                            onChange={(e) => setConfig({ ...config, url: e.target.value })}
                                            placeholder="https://api.example.com/data"
                                            className="h-9 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>API Key (Optional)</Label>
                                        <Input
                                            value={config.apiKey || ''}
                                            onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                                            placeholder="Bearer token or API key"
                                            type="password"
                                            className="h-9 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Refresh Interval</Label>
                                        <Select value={config.interval || 'manual'} onValueChange={(val) => setConfig({ ...config, interval: val })}>
                                            <SelectTrigger className="h-9 text-sm">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="manual">Manual only</SelectItem>
                                                <SelectItem value="30">Every 30 seconds</SelectItem>
                                                <SelectItem value="60">Every minute</SelectItem>
                                                <SelectItem value="300">Every 5 minutes</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}

                            {connType === 'google-sheets' && (
                                <div className="space-y-3">
                                    <div className="space-y-2">
                                        <Label>Google Sheets URL</Label>
                                        <Input
                                            value={config.url || ''}
                                            onChange={(e) => setConfig({ ...config, url: e.target.value })}
                                            placeholder="https://docs.google.com/spreadsheets/d/..."
                                            className="h-9 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Sheet Name (Optional)</Label>
                                        <Input
                                            value={config.sheetName || ''}
                                            onChange={(e) => setConfig({ ...config, sheetName: e.target.value })}
                                            placeholder="Sheet1"
                                            className="h-9 text-sm"
                                        />
                                    </div>
                                </div>
                            )}

                            {connType === 'database' && (
                                <div className="space-y-3">
                                    <div className="space-y-2">
                                        <Label>Connection String</Label>
                                        <Input
                                            value={config.connectionString || ''}
                                            onChange={(e) => setConfig({ ...config, connectionString: e.target.value })}
                                            placeholder="postgresql://user:pass@host:5432/db"
                                            type="password"
                                            className="h-9 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>SQL Query</Label>
                                        <Input
                                            value={config.query || ''}
                                            onChange={(e) => setConfig({ ...config, query: e.target.value })}
                                            placeholder="SELECT * FROM table_name"
                                            className="h-9 text-sm"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setStep('list')}>Back</Button>
                            <Button onClick={handleAdd} disabled={!connName.trim()}>
                                Add Connection
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
