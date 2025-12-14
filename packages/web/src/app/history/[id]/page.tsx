"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getTestsApi } from "@/api-client";
import { TestHistoryItemDto, TestResultAnswerDto } from "@/generated";

export default function HistoryDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [loading, setLoading] = useState(true);
    const [attempt, setAttempt] = useState<TestHistoryItemDto | null>(null);

    useEffect(() => {
        const fetchAttempt = async () => {
            try {
                const api = getTestsApi();
                const data = await api.testsControllerGetAttemptDetails({ id });
                setAttempt(data);
            } catch (error) {
                console.error("Error fetching attempt:", error);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchAttempt();
        }
    }, [id]);

    if (loading) {
        return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
    }

    if (!attempt) {
        return (
            <div className="flex min-h-screen items-center justify-center flex-col gap-4">
                <p>Attempt not found</p>
                <Button onClick={() => router.push("/dashboard")}>Back to Dashboard</Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 max-w-5xl min-h-screen bg-background">
            <div className="mb-6">
                <Button variant="ghost" className="mb-2 pl-0 hover:pl-0 hover:bg-transparent text-muted-foreground hover:text-foreground" onClick={() => router.push("/dashboard")}>
                    ← Back to Dashboard
                </Button>
            </div>

            {/* Analysis Section - Top Priority */}
            {(attempt.report || attempt.summary) && (
                <Card className="mb-8 border-2 shadow-md">
                    <CardHeader className="bg-primary/5 pb-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-2xl text-primary flex items-center gap-2">
                                    📊 Performance Analysis
                                </CardTitle>
                                <CardDescription className="mt-2 text-base">
                                    Comprehensive review for: <span className="font-semibold text-foreground">{attempt.pdfTitle}</span>
                                </CardDescription>
                            </div>
                            <div className="text-right bg-background p-3 rounded-lg border shadow-sm">
                                <div className="text-3xl font-bold text-primary">{Math.round(attempt.percentage)}%</div>
                                <p className="text-xs text-muted-foreground font-medium">
                                    {attempt.score}/{attempt.total} Correct
                                </p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div
                            className="prose prose-slate dark:prose-invert max-w-none prose-headings:text-primary prose-a:text-blue-600 hover:prose-a:text-blue-800 prose-a:underline"
                            dangerouslySetInnerHTML={{
                                __html: (attempt.report || attempt.summary || "")
                                    // Basic markdown parsing (in a real app, use a library like react-markdown)
                                    .replace(/\n/g, "<br>")
                                    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                                    .replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold mt-6 mb-4">$1</h1>')
                                    .replace(/^## (.*$)/gm, '<h2 class="text-2xl font-bold mt-8 mb-4 border-b pb-2">$1</h2>')
                                    .replace(/^### (.*$)/gm, '<h3 class="text-xl font-semibold mt-6 mb-3">$1</h3>')
                                    .replace(/^- (.*$)/gm, '<li class="ml-4">$1</li>')
                                    // Parse links [text](url) -> <a href="url" target="_blank">text</a>
                                    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'),
                            }}
                        />
                    </CardContent>
                </Card>
            )}

            {!attempt.report && !attempt.summary && (
                <div className="mb-8 p-6 bg-card rounded-lg border shadow-sm">
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-3xl font-bold">{attempt.pdfTitle}</h1>
                            <p className="text-muted-foreground mt-1">
                                Completed on {new Date(attempt.completedAt).toLocaleDateString()} at {new Date(attempt.completedAt).toLocaleTimeString()}
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="text-4xl font-bold text-primary">{Math.round(attempt.percentage)}%</div>
                            <p className="text-sm text-muted-foreground">
                                {attempt.score}/{attempt.total} Correct
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-6">
                <h2 className="text-2xl font-bold">Question Review</h2>
                {attempt.answers &&
                    attempt.answers.map((answer, index) => (
                        <Card key={index} className={`border-l-4 ${answer.isCorrect ? "border-l-green-500" : "border-l-red-500"}`}>
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start gap-4">
                                    <CardTitle className="text-lg font-medium leading-relaxed">
                                        <span className="mr-2 text-muted-foreground">{index + 1}.</span>
                                        {answer.questionText}
                                    </CardTitle>
                                    <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium ${answer.isCorrect ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"}`}>{answer.isCorrect ? "Correct" : "Incorrect"}</span>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-2">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Your Answer</p>
                                        <div className={`p-3 rounded-lg text-sm ${answer.isCorrect ? "bg-green-50 text-green-900 dark:bg-green-900/20 dark:text-green-100" : "bg-red-50 text-red-900 dark:bg-red-900/20 dark:text-red-100"}`}>{answer.selectedAnswer}</div>
                                    </div>
                                    {!answer.isCorrect && (
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Correct Answer</p>
                                            <div className="p-3 rounded-lg text-sm bg-green-50 text-green-900 dark:bg-green-900/20 dark:text-green-100">{answer.correctAnswer}</div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
            </div>
        </div>
    );
}
