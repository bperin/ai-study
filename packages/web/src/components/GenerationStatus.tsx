"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Loader2, Sparkles, FileText, XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

interface GenerationStatusProps {
  userId: string;
}

type JobType = "flashcards" | "ingestion" | null;

export default function GenerationStatus({ userId }: GenerationStatusProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobType, setJobType] = useState<JobType>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    console.log(`Connecting to WebSocket at ${socketUrl}`);
    const socket: Socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      path: "/socket.io",
      reconnection: true,
      withCredentials: true,
    });

    socket.on("connect", () => {
      console.log("Connected to WebSocket");
      socket.emit("ping", { userId });
    });

    socket.on("pong", (data) => {
      console.log("Received pong:", data);
    });

    socket.on(`status:${userId}`, (data: { isGenerating: boolean; type?: JobType; message?: string; progress?: { current: number; total: number } }) => {
      console.log(`Received status update for ${userId}:`, data);
      
      if (data.message && data.message.toLowerCase().includes('failed')) {
        setHasError(true);
        setStatusMessage(data.message);
        // Keep generating true briefly to show error then auto-dismiss
        setIsGenerating(true);
        setTimeout(() => {
          setIsGenerating(false);
          setHasError(false);
        }, 5000); // Show error for 5 seconds
        return;
      }

      setIsGenerating(data.isGenerating);
      if (data.type) {
        setJobType(data.type);
      }
      if (data.message) {
        setStatusMessage(data.message);
      }
      if (data.progress) {
        setProgress(data.progress);
      } else {
        setProgress(null);
      }
      
      if (!data.isGenerating) {
        // Refresh the page data when generation completes
        window.location.reload();
      }
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from WebSocket");
    });

    return () => {
      socket.disconnect();
    };
  }, [userId]);

  if (!isGenerating) return null;

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-lg px-4 animate-in slide-in-from-top-4 fade-in duration-300">
      <Alert className={`bg-background/95 backdrop-blur shadow-lg ring-1 ${hasError ? 'border-destructive/50 ring-destructive/20' : 'border-primary/50 ring-primary/20'}`}>
        {hasError ? (
          <XCircle className="h-5 w-5 text-destructive" />
        ) : jobType === 'ingestion' ? (
          <FileText className="h-5 w-5 text-primary animate-pulse" />
        ) : (
          <Sparkles className="h-5 w-5 text-primary animate-pulse" />
        )}
        <AlertTitle className={`${hasError ? 'text-destructive' : 'text-primary'} font-semibold flex items-center gap-2`}>
          {hasError ? 'Processing Failed' : jobType === 'ingestion' ? 'Processing Document' : 'Generating Your Cards'}
          {!hasError && <Loader2 className="h-3 w-3 animate-spin ml-auto" />}
        </AlertTitle>
        <AlertDescription className="text-muted-foreground flex flex-col gap-2 mt-2">
          <p>
            {statusMessage || (jobType === 'ingestion'
              ? 'We are processing your document and preparing it for AI analysis. This may take a moment...'
              : 'Our AI agents are analyzing your document and creating flashcards. This may take a moment...')}
          </p>
          {progress && (
             <div className="w-full flex flex-col gap-1">
               <Progress value={(progress.current / progress.total) * 100} className="h-2" />
               <span className="text-xs text-muted-foreground text-right">{Math.round((progress.current / progress.total) * 100)}%</span>
             </div>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
}