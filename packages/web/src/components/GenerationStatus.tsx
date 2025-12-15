"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Loader2, Sparkles } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface GenerationStatusProps {
  userId: string;
}

export default function GenerationStatus({ userId }: GenerationStatusProps) {
  const [isGenerating, setIsGenerating] = useState(false);

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

    socket.on(`status:${userId}`, (data: { isGenerating: boolean }) => {
      console.log(`Received status update for ${userId}:`, data);
      setIsGenerating(data.isGenerating);
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
      <Alert className="border-primary/50 bg-background/95 backdrop-blur shadow-lg ring-1 ring-primary/20">
        <Sparkles className="h-5 w-5 text-primary animate-pulse" />
        <AlertTitle className="text-primary font-semibold flex items-center gap-2">
          Generating Your Cards
          <Loader2 className="h-3 w-3 animate-spin ml-auto" />
        </AlertTitle>
        <AlertDescription className="text-muted-foreground">
          Our AI agents are analyzing your document and creating flashcards. This may take a moment...
        </AlertDescription>
      </Alert>
    </div>
  );
}