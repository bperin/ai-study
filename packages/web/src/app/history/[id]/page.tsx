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

            {/* AI Analysis Section - Enhanced */}
            {(attempt.report || attempt.summary) && (
                <Card className="mb-8 border-2 shadow-lg bg-gradient-to-br from-primary/5 to-primary/10">
                    <CardHeader className="bg-primary/10 pb-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-2xl text-primary flex items-center gap-3">
                                    🤖 AI Performance Analysis
                                </CardTitle>
                                <CardDescription className="mt-2 text-base">
                                    Personalized insights for: <span className="font-semibold text-foreground">{attempt.pdfTitle}</span>
                                </CardDescription>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Completed on {new Date(attempt.completedAt).toLocaleDateString()} at {new Date(attempt.completedAt).toLocaleTimeString()}
                                </p>
                            </div>
                            <div className="text-right bg-background p-4 rounded-xl border-2 shadow-md">
                                <div className="text-4xl font-bold text-primary mb-1">{Math.round(attempt.percentage)}%</div>
                                <p className="text-sm text-muted-foreground font-medium">
                                    {attempt.score}/{attempt.total} Correct
                                </p>
                                <div className="mt-2 w-full bg-muted rounded-full h-2">
                                    <div 
                                        className="bg-primary h-2 rounded-full transition-all duration-500"
                                        style={{ width: `${attempt.percentage}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6 bg-background/50">
                        <div
                            className="prose prose-slate dark:prose-invert max-w-none prose-sm text-xs prose-headings:text-primary prose-a:text-blue-600 hover:prose-a:text-blue-800 prose-a:underline break-words prose-p:leading-relaxed prose-li:my-1"
                            dangerouslySetInnerHTML={{
                                __html: (attempt.report || attempt.summary || "")
                                    // Enhanced markdown parsing
                                    .replace(/\n\n/g, "</p><p class='mt-4'>")
                                    .replace(/\n/g, "<br>")
                                    .replace(/\*\*(.*?)\*\*/g, "<strong class='font-semibold text-foreground'>$1</strong>")
                                    .replace(/^# (.*$)/gm, '<h1 class="text-lg font-bold mt-4 mb-3 text-primary border-b border-primary/20 pb-1">$1</h1>')
                                    .replace(/^## (.*$)/gm, '<h2 class="text-base font-bold mt-4 mb-2 text-primary/90 border-b border-primary/10 pb-1">$1</h2>')
                                    .replace(/^### (.*$)/gm, '<h3 class="text-sm font-semibold mt-3 mb-1 text-primary/80">$1</h3>')
                                    .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc my-1 leading-relaxed">$1</li>')
                                    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline hover:text-blue-800 font-medium">$1 ↗</a>')
                                    .replace(/^<p class='mt-4'>/, "<p>"), // Remove first paragraph margin
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

            {/* Question Review Section */}
            {attempt.answers && attempt.answers.length > 0 ? (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold">Question Review</h2>
                        <div className="flex gap-2 text-sm">
                            <span className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                Correct ({attempt.answers.filter(a => a.isCorrect).length})
                            </span>
                            <span className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                Incorrect ({attempt.answers.filter(a => !a.isCorrect).length})
                            </span>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        {attempt.answers.map((answer, index) => (
                            <Card key={index} className={`border-l-4 transition-all hover:shadow-md ${answer.isCorrect ? "border-l-green-500 bg-green-50/30 dark:bg-green-950/20" : "border-l-red-500 bg-red-50/30 dark:bg-red-950/20"}`}>
                                <CardHeader className="pb-3">
                                    <div className="flex justify-between items-start gap-4">
                                        <CardTitle className="text-lg font-medium leading-relaxed">
                                            <span className="mr-3 text-muted-foreground font-bold">{index + 1}.</span>
                                            {answer.questionText}
                                        </CardTitle>
                                        <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold ${answer.isCorrect ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"}`}>
                                            {answer.isCorrect ? "✓ Correct" : "✗ Incorrect"}
                                        </span>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Your Answer</p>
                                            <div className={`p-4 rounded-lg text-sm font-medium border ${answer.isCorrect ? "bg-green-50 text-green-900 border-green-200 dark:bg-green-900/20 dark:text-green-100 dark:border-green-800" : "bg-red-50 text-red-900 border-red-200 dark:bg-red-900/20 dark:text-red-100 dark:border-red-800"}`}>
                                                {answer.selectedAnswer}
                                            </div>
                                        </div>
                                        {!answer.isCorrect && (
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Correct Answer</p>
                                                <div className="p-4 rounded-lg text-sm font-medium bg-green-50 text-green-900 border border-green-200 dark:bg-green-900/20 dark:text-green-100 dark:border-green-800">
                                                    {answer.correctAnswer}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            ) : (
                <Card className="p-8 text-center">
                    <CardContent>
                        <p className="text-muted-foreground">No detailed question data available for this attempt.</p>
                        <p className="text-sm text-muted-foreground mt-2">This may be an older test result before detailed tracking was implemented.</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
