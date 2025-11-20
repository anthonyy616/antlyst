'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Upload, File, CheckCircle } from 'lucide-react';

interface UploadZoneProps {
  orgId: string;
}

export function UploadZone({ orgId }: UploadZoneProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      setUploading(true);
      setProgress(0);

      try {
        // Step 1: Get signed URL from our API
        const initRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            orgId,
          }),
        });

        if (!initRes.ok) throw new Error('Failed to initialize upload');

        const { signedUrl, fileId, projectId: newProjectId, r2Key } = await initRes.json();
        setProjectId(newProjectId);

        // Step 2: Upload directly to R2 using signed URL
        const uploadRes = await fetch(signedUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        if (!uploadRes.ok) throw new Error('Upload to R2 failed');

        setProgress(100);

        // Step 3: Notify backend that upload is complete
        await fetch('/api/upload-complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId, r2Key }),
        });

        setUploadedFile(file.name);
      } catch (error) {
        console.error('Upload error:', error);
        alert('Upload failed. Please try again.');
      } finally {
        setUploading(false);
      }
    },
    [orgId]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxFiles: 1,
    disabled: uploading,
  });

  return (
    <Card className="p-8">
      {!uploadedFile ? (
        <div
          {...getRootProps()}
          className={`cursor-pointer rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
            isDragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-slate-300 bg-slate-50 hover:border-slate-400'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto mb-4 h-12 w-12 text-slate-400" />
          {uploading ? (
            <div className="space-y-4">
              <p className="text-lg font-medium">Uploading...</p>
              <Progress value={progress} className="w-full" />
            </div>
          ) : (
            <>
              <p className="mb-2 text-lg font-medium">
                {isDragActive ? 'Drop your file here' : 'Drag & drop your data file'}
              </p>
              <p className="text-sm text-slate-500">
                or click to browse (CSV, Excel)
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="text-center">
          <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
          <p className="mb-2 text-lg font-medium">Upload Complete!</p>
          <div className="mb-4 flex items-center justify-center gap-2 text-slate-600">
            <File className="h-4 w-4" />
            <span>{uploadedFile}</span>
          </div>
          {projectId && (
            <Button onClick={() => window.location.href = `/${orgId}/projects/${projectId}`}>
              Continue to Analysis →
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}