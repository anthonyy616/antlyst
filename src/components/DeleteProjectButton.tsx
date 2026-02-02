'use client';

import { Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function DeleteProjectButton({ projectId }: { projectId: string }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault(); // Prevent Link navigation
        e.stopPropagation();

        if (!confirm("Are you sure you want to delete this project?")) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/projects?id=${projectId}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                router.refresh();
            } else {
                alert("Failed to delete project");
            }
        } catch (error) {
            console.error(error);
            alert("Error deleting project");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            variant="ghost"
            size="icon"
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
            onClick={handleDelete}
            disabled={loading}
        >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </Button>
    );
}
