"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { refreshApiConfig } from "@/api-client";

export default function UploadPage() {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [uploadedPdfId, setUploadedPdfId] = useState<string | null>(null);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const pdfFile = acceptedFiles[0];
        if (pdfFile) {
            if (pdfFile.size > 50 * 1024 * 1024) {
                setError("File size must be less than 50MB");
                return;
            }
            setFile(pdfFile);
            setError(null);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            "application/pdf": [".pdf"],
        },
        multiple: false,
        maxSize: 50 * 1024 * 1024,
    });

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        setProgress(0);
        setError(null);

        try {
            // Get JWT token from localStorage
            const token = localStorage.getItem("access_token");
            if (!token) {
                throw new Error("Please log in to upload files");
            }

            // Step 1: Get signed URL from backend
            setProgress(10);
            const { uploadsApi } = refreshApiConfig();

            let signResponse;
            try {
                signResponse = await uploadsApi.uploadsControllerCreateSignedUploadUrl({
                    body: {
                        fileName: file.name,
                        contentType: "application/pdf",
                    },
                });
            } catch (err: any) {
                console.error("Failed to get signed URL:", err);
                throw new Error(`Failed to get upload URL: ${err.message}`);
            }

            const { uploadUrl, filePath } = signResponse;

            if (!uploadUrl || !filePath) {
                throw new Error("Invalid response from server: missing upload URL");
            }

            setProgress(30);

            // Step 2: Upload file directly to GCS
            let uploadResponse;
            try {
                uploadResponse = await fetch(uploadUrl, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/pdf",
                    },
                    body: file,
                });
            } catch (err: any) {
                console.error("Failed to upload to GCS:", err);
                throw new Error(`Failed to upload to cloud storage: ${err.message}`);
            }

            if (!uploadResponse.ok) {
                const errorText = await uploadResponse.text();
                console.error("GCS upload failed:", errorText);
                throw new Error("Failed to upload file to cloud storage");
            }

            setProgress(70);

            // Step 3: Confirm upload with backend
            let confirmResponse;
            try {
                confirmResponse = await uploadsApi.uploadsControllerConfirmUpload({
                    body: {
                        filePath,
                        fileName: file.name,
                    },
                });
            } catch (err: any) {
                console.error("Failed to confirm upload:", err);
                throw new Error(`Failed to confirm upload: ${err.message}`);
            }

            const { id } = confirmResponse;
            setProgress(100);
            setUploadedPdfId(id);

            // Redirect to customize page after 1 second
            setTimeout(() => {
                router.push(`/customize/${id}`);
            }, 1000);
        } catch (err: any) {
            setError(err.message || "Upload failed");
            setProgress(0);
        } finally {
            setUploading(false);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
    };

    return (
        <div className="min-h-screen bg-background text-foreground p-6">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-bold">Upload Your Study Material</h1>
                    <p className="text-muted-foreground">Upload a PDF and we'll turn it into interactive flashcards</p>
                </div>

                {/* Upload Card */}
                <Card className="border-2 shadow-xl">
                    <CardHeader>
                        <CardTitle>Select PDF File</CardTitle>
                        <CardDescription>Upload a PDF file (max 50MB) to get started</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Dropzone */}
                        <div
                            {...getRootProps()}
                            className={`
                border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
                transition-all duration-200 ease-in-out
                ${isDragActive ? "border-primary bg-secondary scale-105" : "border-border hover:border-primary/50 hover:bg-secondary/50"}
                ${file ? "border-primary bg-secondary/50" : ""}
              `}
                        >
                            <input {...getInputProps()} />
                            <div className="flex flex-col items-center space-y-4">
                                {file ? (
                                    <>
                                        <FileText className="w-16 h-16 text-primary" />
                                        <div className="space-y-1">
                                            <p className="text-lg font-semibold">{file.name}</p>
                                            <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
                                        </div>
                                        <Badge variant="outline" className="bg-secondary text-primary border-primary">
                                            <CheckCircle2 className="w-3 h-3 mr-1" />
                                            Ready to upload
                                        </Badge>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-16 h-16 text-muted-foreground" />
                                        <div className="space-y-2">
                                            <p className="text-lg font-semibold">{isDragActive ? "Drop your PDF here" : "Drag & drop your PDF here"}</p>
                                            <p className="text-sm text-muted-foreground">or click to browse files</p>
                                        </div>
                                        <Badge variant="secondary">PDF only • Max 50MB</Badge>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                                <AlertCircle className="w-5 h-5 text-red-600" />
                                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                            </div>
                        )}

                        {/* Progress Bar */}
                        {uploading && (
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Uploading...</span>
                                    <span className="font-semibold">{progress}%</span>
                                </div>
                                <Progress value={progress} className="h-2" />
                            </div>
                        )}

                        {/* Success Message */}
                        {uploadedPdfId && (
                            <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                                <p className="text-sm text-green-700 dark:text-green-400">Upload successful! Redirecting to customize your test...</p>
                            </div>
                        )}

                        {/* Upload Button */}
                        <div className="flex gap-3">
                            <Button onClick={handleUpload} disabled={!file || uploading || !!uploadedPdfId} className="flex-1 h-12 text-base font-semibold" size="lg">
                                {uploading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        Uploading...
                                    </>
                                ) : uploadedPdfId ? (
                                    <>
                                        <CheckCircle2 className="w-5 h-5 mr-2" />
                                        Uploaded!
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-5 h-5 mr-2" />
                                        Upload PDF
                                    </>
                                )}
                            </Button>
                            {file && !uploading && !uploadedPdfId && (
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setFile(null);
                                        setError(null);
                                    }}
                                    className="h-12"
                                >
                                    Clear
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Info Cards */}
                <div className="grid md:grid-cols-3 gap-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex flex-col items-center text-center space-y-2">
                                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                                    <Upload className="w-6 h-6 text-primary" />
                                </div>
                                <h3 className="font-semibold">1. Upload</h3>
                                <p className="text-sm text-muted-foreground">Upload your study material in PDF format</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex flex-col items-center text-center space-y-2">
                                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                                    <FileText className="w-6 h-6 text-primary" />
                                </div>
                                <h3 className="font-semibold">2. Customize</h3>
                                <p className="text-sm text-muted-foreground">Choose difficulty and number of questions</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex flex-col items-center text-center space-y-2">
                                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                                    <CheckCircle2 className="w-6 h-6 text-primary" />
                                </div>
                                <h3 className="font-semibold">3. Study</h3>
                                <p className="text-sm text-muted-foreground">Practice with AI-generated flashcards</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
