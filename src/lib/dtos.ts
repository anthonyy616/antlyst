export interface ProjectSummary {
    id: string;
    name: string;
    createdAt: string; // ISO date
    updatedAt: string; // ISO date
    ownerId: string;
    organizationId: string;
    status: string;
    description?: string | null;
    // Minimal file info if needed for list view, else omitted
    fileCount?: number;
}

export interface DashboardSummary {
    id: string;
    projectId: string;
    style: string; // 'simple' | 'ml' | 'powerbi'
    createdAt: string;
    url?: string | null;
}

export interface NotificationSummary {
    id: string;
    type: string;
    readAt?: string | null;
    createdAt: string;
    payload: any;
}

export interface JobSummary {
    id: string;
    type: string;
    status: 'queued' | 'running' | 'done' | 'failed';
    progress: number;
    createdAt: string;
}
