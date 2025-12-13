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
        <div className="container mx-auto p-6 max-w-4xl min-h-screen bg-background">
            <div className="mb-8">
                <Button variant="ghost" className="mb-4 pl-0 hover:pl-0 hover:bg-transparent text-muted-foreground hover:text-foreground" onClick={() => router.push("/dashboard")}>
                    ← Back to Dashboard
                </Button>
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">{attempt.pdfTitle}</h1>
                        <p className="text-muted-foreground mt-1">
                            Completed on {new Date(attempt.completedAt).toLocaleDateString()} at {new Date(attempt.completedAt).toLocaleTimeString()}
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-4xl font-bold text-primary">{Math.round(attempt.percentage)}%</div>
                        <p className="text-sm text-muted-foreground">{attempt.score}/{attempt.total} Correct</p>
                    </div>
                </div>
            </div>

            {attempt.report && (
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>Performance Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div 
                            className="prose prose-slate dark:prose-invert max-w-none"
                            dangerouslySetInnerHTML={{ 
                                __html: attempt.report
                                    .replace(/\n/g, '<br>')
                                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
                                    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
                                    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
                                    .replace(/^- (.*$)/gm, '<li>$1</li>')
                            }}
                        />
                    </CardContent>
                </Card>
            )}

            <div className="space-y-6">
                <h2 className="text-2xl font-bold">Question Review</h2>
                {attempt.answers && attempt.answers.map((answer, index) => (
                    <Card key={index} className={`border-l-4 ${answer.isCorrect ? "border-l-green-500" : "border-l-red-500"}`}>
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start gap-4">
                                <CardTitle className="text-lg font-medium leading-relaxed">
                                    <span className="mr-2 text-muted-foreground">{index + 1}.</span>
                                    {answer.questionText}
                                </CardTitle>
                                <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    answer.isCorrect 
                                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" 
                                        : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                                }`}>
                                    {answer.isCorrect ? "Correct" : "Incorrect"}
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-2">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Your Answer</p>
                                    <div className={`p-3 rounded-lg text-sm ${
                                        answer.isCorrect 
                                            ? "bg-green-50 text-green-900 dark:bg-green-900/20 dark:text-green-100" 
                                            : "bg-red-50 text-red-900 dark:bg-red-900/20 dark:text-red-100"
                                    }`}>
                                        {answer.selectedAnswer}
                                    </div>
                                </div>
                                {!answer.isCorrect && (
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Correct Answer</p>
                                        <div className="p-3 rounded-lg text-sm bg-green-50 text-green-900 dark:bg-green-900/20 dark:text-green-100">
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
    );
}