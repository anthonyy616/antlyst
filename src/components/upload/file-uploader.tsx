'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useRouter } from 'next/navigation';

interface FileUploaderProps {
    projectId: string;
    onUploadComplete?: (fileId: string) => void;
}

export default function FileUploader({ projectId, onUploadComplete }: FileUploaderProps) {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;

        setUploading(true);
        setProgress(10);
        setError(null);

        try {
            // 1. Get Presigned URL
            const presignRes = await fetch('/api/upload/presigned', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileName: file.name,
                    fileType: file.type,
                    fileSize: file.size,
                    projectId,
                }),
            });

            if (!presignRes.ok) throw new Error('Failed to get upload URL');
            const { url, fileId } = await presignRes.json();
            setProgress(30);

            // 2. Upload to R2
            const uploadRes = await fetch(url, {
                method: 'PUT',
                body: file,
                headers: {
                    'Content-Type': file.type,
                },
            });

            if (!uploadRes.ok) throw new Error('Failed to upload file');
            setProgress(60);

            // 3. Trigger Processing
            const processRes = await fetch('/api/files/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileId }),
            });

            if (!processRes.ok) throw new Error('Failed to process file');

            setProgress(100);
            if (onUploadComplete) onUploadComplete(fileId);

            // Refresh to show new data
            router.refresh();

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Something went wrong');
        } finally {
            setUploading(false);
        }
    }, [projectId, onUploadComplete, router]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv'],
        },
        maxFiles: 1,
        disabled: uploading,
    });

    return (
        <div className="w-full max-w-xl mx-auto space-y-4">
            <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors
                    ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
                    ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
                `}
            >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="p-4 bg-gray-100 rounded-full">
                        <Upload className="w-8 h-8 text-gray-500" />
                    </div>
                    <div>
                        <p className="text-lg font-medium text-gray-700">
                            {isDragActive ? "Drop the CSV here" : "Drag & drop your CSV file"}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">or click to browse</p>
                    </div>
                </div>
            </div>

            {uploading && (
                <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-600">
                        <span>Uploading & Processing...</span>
                        <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                </div>
            )}

            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {progress === 100 && !error && (
                <Alert className="border-green-500 text-green-700 bg-green-50">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertTitle>Success</AlertTitle>
                    <AlertDescription>File uploaded and processed successfully!</AlertDescription>
                </Alert>
            )}
        </div>
    );
}
