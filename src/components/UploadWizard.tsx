"use client";

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { parseCSV } from '@/lib/csv-parser';
import { PlotStyleSelector, PlotStyle } from '@/components/PlotStyleSelector';
import { motion, AnimatePresence } from 'framer-motion';

interface UploadWizardProps {
    orgId: string;
}

type WizardStep = 'idle' | 'parsing' | 'review' | 'uploading' | 'complete';

export function UploadWizard({ orgId }: UploadWizardProps) {
    const [step, setStep] = useState<WizardStep>('idle');
    const [file, setFile] = useState<File | null>(null);
    const [rowCount, setRowCount] = useState<number>(0);
    const [selectedStyle, setSelectedStyle] = useState<PlotStyle | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return;

        const droppedFile = acceptedFiles[0];
        setFile(droppedFile);
        setStep('parsing');

        try {
            // Client-side parse for preview metrics
            const result = await parseCSV(droppedFile, { preview: true, worker: true });
            if (result.meta.aborted || result.errors.length > 0) {
                console.warn("CSV warnings:", result.errors);
            }

            // If total lines are easier to get, estimating or using what we have
            // PapaParse metadata doesn't give total valid lines unless we parse the whole thing.
            // For >100k rows, parsing everything client side just for count might be slow if not careful.
            // But with worker it's usually fine. Let's trust the user for now on "Parsing..." 
            // Actually, let's do a quick count of newlines for strict large file performance if we wanted,
            // but for now let's just say "Ready to analyze".
            // Since we used preview: 100, rowCount is 100. Let's just say "File loaded".
            // To get real count we'd need to parse all. Let's stick to simple preview flow.

            setStep('review');
        } catch (error) {
            console.error(error);
            alert("Failed to parse CSV. Please ensure it's a valid CSV file.");
            setStep('idle');
            setFile(null);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv'],
            'application/vnd.ms-excel': ['.xls'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
        },
        maxFiles: 1,
        disabled: step !== 'idle',
    });

    const handleGenerate = async () => {
        if (!file || !selectedStyle) return;

        setStep('uploading');
        setUploadProgress(0);

        try {
            // 1. Get Signed URL
            const initRes = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileName: file.name,
                    fileSize: file.size,
                    mimeType: file.type,
                    orgId,
                    style: selectedStyle, // Passing style to backend
                }),
            });

            if (!initRes.ok) throw new Error('Failed to initialize upload');
            const { signedUrl, fileId, projectId } = await initRes.json();

            // 2. Upload to R2
            const xhr = new XMLHttpRequest();
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    setUploadProgress((event.loaded / event.total) * 100);
                }
            };

            const uploadPromise = new Promise<void>((resolve, reject) => {
                xhr.open('PUT', signedUrl);
                xhr.setRequestHeader('Content-Type', file.type);
                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) resolve();
                    else reject(new Error('Upload failed'));
                };
                xhr.onerror = () => reject(new Error('Network error'));
                xhr.send(file);
            });

            await uploadPromise;

            // 3. Notify Backend
            await fetch('/api/upload-complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileId, projectId }),
            });

            setRedirectUrl(`/${orgId}/projects/${projectId}`);
            setStep('complete');

        } catch (error) {
            console.error(error);
            alert("Upload failed.");
            setStep('review'); // Go back to review so they can try again
        }
    };

    return (
        <Card className="p-8 w-full max-w-4xl mx-auto transition-all duration-300">
            <AnimatePresence mode="wait">
                {step === 'idle' && (
                    <motion.div
                        key="idle"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <div
                            {...getRootProps()}
                            className={`cursor-pointer rounded-xl border-2 border-dashed p-16 text-center transition-all duration-200 ${isDragActive
                                    ? 'border-brand-purple bg-brand-purple/5 scale-[1.01]'
                                    : 'border-muted-foreground/30 hover:border-brand-purple/50 hover:bg-muted/30'
                                }`}
                        >
                            <input {...getInputProps()} />
                            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                                <Upload className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Upload your dataset</h3>
                            <p className="text-muted-foreground mb-6">Drag and drop your CSV file here, or click to browse</p>
                            <p className="text-xs text-muted-foreground/50 uppercase tracking-wider font-medium">Supports CSV, Excel up to 500MB</p>
                        </div>
                    </motion.div>
                )}

                {step === 'parsing' && (
                    <motion.div
                        key="parsing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center py-12 space-y-4"
                    >
                        <Loader2 className="h-12 w-12 text-brand-purple animate-spin" />
                        <p className="text-lg font-medium">Analyzing file structure...</p>
                    </motion.div>
                )}

                {step === 'review' && file && (
                    <motion.div
                        key="review"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-8"
                    >
                        <div className="flex items-center justify-between border-b pb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                                    <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold">{file.name}</h3>
                                    <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB • Ready to process</p>
                                </div>
                            </div>
                            <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => { setFile(null); setStep('idle'); }}>
                                Cancel
                            </Button>
                        </div>

                        <div className="space-y-4">
                            <h2 className="text-2xl font-bold text-center">Choose your Dashboard Engine</h2>
                            <p className="text-center text-muted-foreground max-w-lg mx-auto pb-4">
                                Select how you want Antlyst to visualize this data. We will automatically generate the dashboard based on your choice.
                            </p>

                            <PlotStyleSelector
                                selectedStyle={selectedStyle}
                                onSelect={setSelectedStyle}
                            />
                        </div>

                        <div className="flex justify-center pt-4">
                            <Button
                                size="lg"
                                className="w-full md:w-auto px-12 bg-brand-purple hover:bg-brand-purple/90 text-white"
                                disabled={!selectedStyle}
                                onClick={handleGenerate}
                            >
                                Generate Dashboard
                            </Button>
                        </div>
                    </motion.div>
                )}

                {step === 'uploading' && (
                    <motion.div
                        key="uploading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="max-w-md mx-auto py-12 space-y-6 text-center"
                    >
                        <h3 className="text-xl font-semibold">Uploading & Generating...</h3>
                        <Progress value={uploadProgress} className="h-2" />
                        <p className="text-sm text-muted-foreground">{Math.round(uploadProgress)}% uploaded</p>
                    </motion.div>
                )}

                {step === 'complete' && (
                    <motion.div
                        key="complete"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-12 space-y-6"
                    >
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                        </div>
                        <h3 className="text-2xl font-bold">Success!</h3>
                        <p className="text-muted-foreground">Your dashboard has been generated.</p>

                        {redirectUrl && (
                            <Button
                                size="lg"
                                className="bg-brand-purple hover:bg-brand-purple/90 text-white mt-4"
                                onClick={() => window.location.href = redirectUrl}
                            >
                                View Dashboard
                            </Button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </Card>
    );
}
