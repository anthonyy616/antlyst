'use client';

import { useState, useEffect } from 'react';
import { AIChatInterface } from '../AIChatInterface';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface Project {
    id: string;
    name: string;
    lastUpdated: string;
}

export function AIChatWithProjectSelector() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [projectContext, setProjectContext] = useState<any>(null);
    const [isLoadingProjects, setIsLoadingProjects] = useState(true);
    const [isLoadingContext, setIsLoadingContext] = useState(false);

    useEffect(() => {
        // Fetch available projects
        fetch('/api/ai/projects')
            .then(res => res.json())
            .then(data => {
                console.log('[AIChatWithProjectSelector] API response:', data);
                if (data.projects) {
                    console.log('[AIChatWithProjectSelector] Setting projects:', data.projects.length);
                    setProjects(data.projects);
                } else if (data.error) {
                    console.error('[AIChatWithProjectSelector] API error:', data.error);
                }
            })
            .catch(err => console.error("Failed to load projects", err))
            .finally(() => setIsLoadingProjects(false));
    }, []);

    useEffect(() => {
        if (!selectedProjectId || selectedProjectId === 'none') {
            setProjectContext(null);
            return;
        }

        setIsLoadingContext(true);
        fetch(`/api/ai/project-context?projectId=${selectedProjectId}`)
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    console.error(data.error);
                } else {
                    setProjectContext(data);
                }
            })
            .catch(err => console.error("Failed to load context", err))
            .finally(() => setIsLoadingContext(false));

    }, [selectedProjectId]);

    return (
        <div className="flex flex-col h-full space-y-4">
            <Card className="bg-slate-50 dark:bg-slate-900 border-none shadow-sm">
                <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center gap-4">
                    <span className="text-sm font-medium whitespace-nowrap text-muted-foreground">Context:</span>
                    <Select onValueChange={setSelectedProjectId} value={selectedProjectId}>
                        <SelectTrigger className="w-full md:w-[300px] bg-white dark:bg-slate-950">
                            <SelectValue placeholder="Select a project..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">General Analysis (No Context)</SelectItem>
                            {isLoadingProjects ? (
                                <div className="p-2 flex justify-center"><Loader2 className="animate-spin h-4 w-4" /></div>
                            ) : (
                                projects.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))
                            )}
                        </SelectContent>
                    </Select>
                    {isLoadingContext && (
                        <div className="flex items-center gap-2 text-xs text-brand-purple">
                            <Loader2 className="animate-spin h-3 w-3" />
                            Loading data...
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="flex-1 min-h-0">
                <AIChatInterface
                    contextData={projectContext}
                    contextDescription={projects.find(p => p.id === selectedProjectId)?.name}
                />
            </div>
        </div>
    );
}
