"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { FileText, Send, Sparkles, Loader2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface TestPlan {
    objectives: Array<{
        title: string;
        difficulty: "easy" | "medium" | "hard";
        questionCount: number;
        topics: string[];
    }>;
    totalQuestions: number;
    estimatedTime: string;
    summary: string;
}

interface Message {
    role: "user" | "assistant";
    content: string;
}

export default function CustomizePage() {
    const router = useRouter();
    const params = useParams();
    const pdfId = params.id as string;

    const [pdfInfo, setPdfInfo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [chatting, setChatting] = useState(false);
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [testPlan, setTestPlan] = useState<TestPlan | null>(null);
    const [shouldGenerate, setShouldGenerate] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchPdfInfo = async () => {
            try {
                const token = localStorage.getItem("access_token");
                const response = await fetch(`http://localhost:3000/pdfs`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const pdfs = await response.json();
                const pdf = pdfs.find((p: any) => p.id === pdfId);
                setPdfInfo(pdf || { id: pdfId, filename: "Study Guide.pdf" });
            } catch (error) {
                console.error("Failed to fetch PDF info:", error);
                setPdfInfo({ id: pdfId, filename: "Study Guide.pdf" });
            } finally {
                setLoading(false);
            }
        };

        fetchPdfInfo();
    }, [pdfId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async () => {
        if (!message.trim() || chatting) return;

        const userMessage = message.trim();
        setMessage("");
        setMessages([...messages, { role: "user", content: userMessage }]);
        setChatting(true);

        try {
            const token = localStorage.getItem("access_token");
            const response = await fetch(`http://localhost:3000/pdfs/chat`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    message: userMessage,
                    pdfId,
                    history: messages,
                }),
            });

            const data = await response.json();

            setMessages((prev) => [...prev, { role: "assistant", content: data.message }]);

            if (data.testPlan) {
                setTestPlan(data.testPlan);
            }

            if (data.shouldGenerate) {
                setShouldGenerate(true);
                // Auto-generate after a moment
                setTimeout(() => handleGenerate(), 1000);
            }
        } catch (error) {
            console.error("Chat error:", error);
            setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
        } finally {
            setChatting(false);
        }
    };

    const handleGenerate = async () => {
        if (!testPlan) return;

        setGenerating(true);

        try {
            const token = localStorage.getItem("access_token");

            // Build prompt from test plan
            const prompt = `Generate ${testPlan.totalQuestions} questions with the following objectives:\n${testPlan.objectives.map((obj) => `- ${obj.title} (${obj.difficulty}, ${obj.questionCount} questions)`).join("\n")}`;

            const response = await fetch(`http://localhost:3000/pdfs/${pdfId}/generate`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ prompt }),
            });

            if (!response.ok) {
                throw new Error("Failed to generate flashcards");
            }

            await response.json();
            router.push(`/study/${pdfId}`);
        } catch (error: any) {
            console.error("Failed to generate flashcards:", error);
            alert(error.message || "Failed to generate flashcards. Please try again.");
            setGenerating(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    const difficultyColors = {
        easy: "bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800",
        medium: "bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800",
        hard: "bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800",
    };

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Chat */}
                    <div className="space-y-4">
                        <Button variant="ghost" onClick={() => router.push("/dashboard")}>
                            ← Back to Dashboard
                        </Button>

                        <Card className="border-2 shadow-xl">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Sparkles className="w-5 h-5" />
                                    AI Test Planner
                                </CardTitle>
                                <CardDescription>Chat to design your perfect test for {pdfInfo?.filename}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {/* Messages */}
                                <div className="h-[400px] overflow-y-auto mb-4 space-y-3 p-4 bg-secondary rounded-lg">
                                    {messages.length === 0 && (
                                        <div className="text-center text-muted-foreground py-8">
                                            <p className="mb-2">👋 Hi! I'll help you create a test plan.</p>
                                            <p className="text-sm">Tell me what you'd like to study!</p>
                                        </div>
                                    )}
                                    {messages.map((msg, i) => (
                                        <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                            <div className={`max-w-[80%] p-3 rounded-lg ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-background border"}`}>
                                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {chatting && (
                                        <div className="flex justify-start">
                                            <div className="bg-background border p-3 rounded-lg">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            </div>
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Input */}
                                <div className="flex gap-2">
                                    <Input value={message} onChange={(e) => setMessage(e.target.value)} onKeyPress={(e) => e.key === "Enter" && handleSendMessage()} placeholder="e.g., Create 20 hard questions on photosynthesis..." disabled={chatting || generating} />
                                    <Button onClick={handleSendMessage} disabled={!message.trim() || chatting || generating}>
                                        <Send className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right: Test Plan */}
                    <div className="space-y-4">
                        <div className="h-12" /> {/* Spacer */}
                        {testPlan && !generating ? (
                            <Card className="border-2 border-primary shadow-xl">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <BookOpen className="w-5 h-5" />
                                        Your Test Plan
                                    </CardTitle>
                                    <CardDescription>{testPlan.summary}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Stats */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-secondary rounded-lg">
                                            <p className="text-sm text-muted-foreground">Total Questions</p>
                                            <p className="text-3xl font-bold">{testPlan.totalQuestions}</p>
                                        </div>
                                        <div className="p-4 bg-secondary rounded-lg">
                                            <p className="text-sm text-muted-foreground">Estimated Time</p>
                                            <p className="text-2xl font-bold">{testPlan.estimatedTime}</p>
                                        </div>
                                    </div>

                                    {/* Objectives */}
                                    <div className="space-y-3">
                                        <h4 className="font-semibold text-sm text-muted-foreground uppercase">Objectives</h4>
                                        {testPlan.objectives.map((obj, index) => (
                                            <div key={index} className={`p-4 rounded-lg border-2 ${difficultyColors[obj.difficulty]}`}>
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex-1">
                                                        <h5 className="font-semibold">{obj.title}</h5>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <Badge variant="outline" className="capitalize">
                                                                {obj.difficulty}
                                                            </Badge>
                                                            <Badge variant="outline">{obj.questionCount} questions</Badge>
                                                        </div>
                                                    </div>
                                                </div>
                                                {obj.topics && obj.topics.length > 0 && (
                                                    <div className="mt-2 flex flex-wrap gap-1">
                                                        {obj.topics.map((topic, i) => (
                                                            <span key={i} className="text-xs px-2 py-1 bg-background/50 rounded">
                                                                {topic}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {!shouldGenerate && (
                                        <Button onClick={handleGenerate} className="w-full h-12 text-lg font-semibold" size="lg">
                                            <Sparkles className="w-5 h-5 mr-2" />
                                            Generate Flashcards
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        ) : generating ? (
                            <Card className="border-2 border-primary">
                                <CardContent className="pt-6">
                                    <div className="flex items-center gap-3">
                                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                        <div>
                                            <p className="font-semibold">Generating Flashcards...</p>
                                            <p className="text-sm text-muted-foreground">Creating {testPlan?.totalQuestions} questions. This may take a minute.</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Test Plan Preview</CardTitle>
                                    <CardDescription>Your test plan will appear here as you chat with the AI</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-center py-8 text-muted-foreground">
                                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                        <p>Start chatting to create your test plan!</p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
