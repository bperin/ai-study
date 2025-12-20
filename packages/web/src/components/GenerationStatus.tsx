"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Loader2, Sparkles } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface GenerationStatusProps {
  userId: string;
}

type StatusUpdate = {
  isGenerating?: boolean;
  phase?: string;
  status?: "running" | "completed" | "failed";
  message?: string;
  progress?: number;
  current?: number;
  total?: number;
  pdfId?: string;
};

export default function GenerationStatus({ userId }: GenerationStatusProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState<StatusUpdate | null>(null);
  const [visible, setVisible] = useState(false);
  const previousGenerating = useRef(false);
  const hideTimeout = useRef<NodeJS.Timeout | null>(null);

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

    socket.on(`status:${userId}`, (data: StatusUpdate) => {
      console.log(`Received status update for ${userId}:`, data);
      const nextGenerating = data.isGenerating ?? data.status === "running";
      setIsGenerating(nextGenerating);
      setStatus(data);
      setVisible(true);
      if (hideTimeout.current) {
        clearTimeout(hideTimeout.current);
        hideTimeout.current = null;
      }
      if (!nextGenerating && data.status && data.status !== "running") {
        hideTimeout.current = setTimeout(() => setVisible(false), 5000);
      }
      if (previousGenerating.current && !nextGenerating) {
        window.location.reload();
      }
      previousGenerating.current = nextGenerating;
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from WebSocket");
    });

    return () => {
      if (hideTimeout.current) {
        clearTimeout(hideTimeout.current);
      }
      socket.disconnect();
    };
  }, [userId]);

  const showAlert = status && visible;
  if (!showAlert) return null;

  const phaseTitle =
    status?.phase === "chunking"
      ? "Indexing Your PDF"
      : status?.phase === "flashcards"
        ? "Generating Your Cards"
        : "Working...";

  const derivedProgress =
    status?.progress ??
    (status?.current !== undefined && status?.total
      ? status.total === 0
        ? 0
        : Math.min(Math.max(status.current / status.total, 0), 1)
      : undefined);

  const percentage = derivedProgress !== undefined ? Math.round(derivedProgress * 100) : undefined;
  const progressLabel =
    status?.current !== undefined && status?.total ? `${status.current}/${status.total}` : undefined;

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-lg px-4 animate-in slide-in-from-top-4 fade-in duration-300">
      <Alert className="border-primary/50 bg-background/95 backdrop-blur shadow-lg ring-1 ring-primary/20">
        <Sparkles className="h-5 w-5 text-primary animate-pulse" />
        <AlertTitle className="text-primary font-semibold flex items-center gap-2">
          {phaseTitle}
          {isGenerating && <Loader2 className="h-3 w-3 animate-spin ml-auto" />}
        </AlertTitle>
        <AlertDescription className="text-muted-foreground space-y-2">
          <p>{status?.message || "Our AI agents are working in the background. This may take a moment..."}</p>
          {percentage !== undefined && (
            <div className="space-y-1">
              <div className="h-1.5 bg-primary/20 rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${percentage}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">
                {percentage}% complete {progressLabel ? `(${progressLabel})` : ""}
              </p>
            </div>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
}
