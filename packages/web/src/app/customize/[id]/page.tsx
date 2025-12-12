"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { FileText, Sparkles, ArrowRight, Loader2, Lightbulb, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface TestPlan {
    objectives: Array<{
        title: string;
        difficulty: string;
        questionCount: number;
    }>;
    totalQuestions: number;
    estimatedTime: string;
    summary: string;
}

export default function CustomizePage() {
    const router = useRouter();
    const params = useParams();
    const pdfId = params.id as string;

    const [pdfInfo, setPdfInfo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [generatingPlan, setGeneratingPlan] = useState(false);
    const [generatingCards, setGeneratingCards] = useState(false);
    const [prompt, setPrompt] = useState("");
    const [testPlan, setTestPlan] = useState<TestPlan | null>(null);
    const [showPlanDialog, setShowPlanDialog] = useState(false);

    // Example prompts
    const examples = [
        "Create 15 hard questions focusing on key concepts",
        "Make 20 easy flashcards with hints and explanations",
        "Generate 10 medium difficulty questions about the main topics",
        "Create 25 challenging questions with detailed explanations",
    ];

    useEffect(() => {
        // TODO: Fetch PDF info from backend
        setPdfInfo({
            id: pdfId,
            filename: "Study Guide.pdf",
            uploadedAt: new Date().toISOString(),
        });
        setLoading(false);
    }, [pdfId]);

    const handleGeneratePlan = async () => {
        if (!prompt.trim()) {
            alert("Please describe what kind of test you want");
            return;
        }

        setGeneratingPlan(true);

        try {
            // TODO: Call backend to generate test plan (not the full questions yet)
            // For now, simulate with mock data
            await new Promise((resolve) => setTimeout(resolve, 2000));

            const mockPlan: TestPlan = {
                objectives: [
                    { title: "Introduction to Key Concepts", difficulty: "easy", questionCount: 5 },
                    { title: "Advanced Applications", difficulty: "hard", questionCount: 10 },
                    { title: "Problem Solving Techniques", difficulty: "medium", questionCount: 5 },
                ],
                totalQuestions: 20,
                estimatedTime: "30-40 minutes",
                summary: "This test will cover the main topics from your PDF with a focus on practical applications and problem-solving.",
            };

            setTestPlan(mockPlan);
            setShowPlanDialog(true);
        } catch (error: any) {
            console.error("Failed to generate plan:", error);
            alert(error.message || "Failed to generate test plan. Please try again.");
        } finally {
            setGeneratingPlan(false);
        }
    };

    const handleApprovePlan = async () => {
        setShowPlanDialog(false);
        setGeneratingCards(true);

        try {
            const token = localStorage.getItem("access_token");

            // Now generate the actual flashcards
            const response = await fetch(`http://localhost:3000/pdfs/${pdfId}/generate`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    prompt: prompt.trim(),
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to generate flashcards");
            }

            await response.json();

            // Redirect to study page
            router.push(`/study/${pdfId}`);
        } catch (error: any) {
            console.error("Failed to generate flashcards:", error);
            alert(error.message || "Failed to generate flashcards. Please try again.");
        } finally {
            setGeneratingCards(false);
        }
    };

    const handleRejectPlan = () => {
        setShowPlanDialog(false);
        setTestPlan(null);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="space-y-2">
                    <Button variant="ghost" onClick={() => router.push("/dashboard")} className="mb-4">
                        ← Back to Dashboard
                    </Button>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                            <FileText className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold">Generate Your Flashcards</h1>
                            <p className="text-muted-foreground">{pdfInfo?.filename}</p>
                        </div>
                    </div>
                </div>

                {/* Main Card */}
                <Card className="border-2 shadow-xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5" />
                            Describe Your Test
                        </CardTitle>
                        <CardDescription>Tell AI what kind of flashcards you want in your own words</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Text Input */}
                        <div className="space-y-3">
                            <Label htmlFor="prompt" className="text-base font-semibold">
                                What do you want to study?
                            </Label>
                            <textarea
                                id="prompt"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="e.g., Create 20 medium difficulty questions with hints and explanations focusing on the main concepts..."
                                className="w-full min-h-[150px] p-4 rounded-lg border-2 border-slate-200 dark:border-slate-700 
                         focus:border-primary focus:ring-2 focus:ring-primary/20
                         resize-none text-base transition-all duration-200
                         bg-white dark:bg-slate-900"
                                disabled={generatingPlan || generatingCards}
                            />
                            <p className="text-sm text-muted-foreground">Be specific about difficulty, number of questions, and any special requirements</p>
                        </div>

                        {/* Example Prompts */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Lightbulb className="w-4 h-4" />
                                <Label className="text-sm font-semibold">Try these examples:</Label>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {examples.map((example, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setPrompt(example)}
                                        disabled={generatingPlan || generatingCards}
                                        className="text-left p-3 rounded-lg border border-border
                             hover:border-primary hover:bg-secondary
                             transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        "{example}"
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Generate Plan Button */}
                        <Button
                            onClick={handleGeneratePlan}
                            disabled={!prompt.trim() || generatingPlan || generatingCards}
                            className="w-full h-14 text-lg font-semibold disabled:opacity-50"
                            size="lg"
                        >
                            {generatingPlan ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    AI is creating your test plan...
                                </>
                            ) : generatingCards ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Generating flashcards...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-5 h-5 mr-2" />
                                    Create Test Plan
                                    <ArrowRight className="w-5 h-5 ml-2" />
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* Info Card */}
                <Card className="bg-secondary">
                    <CardContent className="pt-6">
                        <div className="flex gap-4">
                            <div className="flex-shrink-0">
                                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                                    <Sparkles className="w-6 h-6 text-white" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h3 className="font-semibold text-lg">Powered by Gemini 2.0 Flash</h3>
                                <p className="text-sm text-muted-foreground">
                                    Our AI will first create a test plan for your approval, then generate personalized flashcards. You'll review the plan before any questions are created!
                                </p>
                                <div className="flex flex-wrap gap-2 mt-3">
                                    <Badge variant="secondary">Smart Question Generation</Badge>
                                    <Badge variant="secondary">Adaptive Difficulty</Badge>
                                    <Badge variant="secondary">Contextual Hints</Badge>
                                    <Badge variant="secondary">Plan Approval</Badge>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Test Plan Approval Dialog */}
            <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5" />
                            Review Your Test Plan
                        </DialogTitle>
                        <DialogDescription>AI has created a test plan based on your request. Review and approve to generate the flashcards.</DialogDescription>
                    </DialogHeader>

                    {testPlan && (
                        <div className="space-y-4">
                            {/* Summary */}
                            <div className="p-4 bg-secondary rounded-lg">
                                <p className="text-sm">{testPlan.summary}</p>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 border rounded-lg">
                                    <p className="text-sm text-muted-foreground">Total Questions</p>
                                    <p className="text-2xl font-bold">{testPlan.totalQuestions}</p>
                                </div>
                                <div className="p-4 border rounded-lg">
                                    <p className="text-sm text-muted-foreground">Estimated Time</p>
                                    <p className="text-2xl font-bold">{testPlan.estimatedTime}</p>
                                </div>
                            </div>

                            {/* Objectives */}
                            <div className="space-y-2">
                                <h4 className="font-semibold">Learning Objectives:</h4>
                                {testPlan.objectives.map((obj, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div>
                                            <p className="font-medium">{obj.title}</p>
                                            <p className="text-sm text-muted-foreground capitalize">{obj.difficulty} difficulty</p>
                                        </div>
                                        <Badge variant="outline">{obj.questionCount} questions</Badge>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={handleRejectPlan} className="flex items-center gap-2">
                            <XCircle className="w-4 h-4" />
                            Modify Plan
                        </Button>
                        <Button onClick={handleApprovePlan} className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            Approve & Generate
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
