"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getPdfsApi } from "@/api-client";
import { ObjectiveResponseDto, McqDto, TestAnalysisResponseDto } from "@/generated";

export default function StudyPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [objectives, setObjectives] = useState<ObjectiveResponseDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [allQuestions, setAllQuestions] = useState<McqDto[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [showExplanation, setShowExplanation] = useState(false);
    const [score, setScore] = useState(0);

    // Test state
    const [hasStarted, setHasStarted] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [attemptId, setAttemptId] = useState<string | null>(null);
    const [missedQuestions, setMissedQuestions] = useState<any[]>([]);
    const [allAnswers, setAllAnswers] = useState<any[]>([]); // Track ALL answers for comprehensive analysis
    const [analysis, setAnalysis] = useState<TestAnalysisResponseDto | null>(null);
    const [analyzing, setAnalyzing] = useState(false);

    useEffect(() => {
        const fetchObjectives = async () => {
            try {
                const api = getPdfsApi();
                const data = await api.pdfsControllerGetObjectives({ id });
                setObjectives(data);

                // Flatten all questions into a single array
                const questions = data.flatMap((obj) => obj.mcqs);
                setAllQuestions(questions);
            } catch (error) {
                console.error("Error fetching objectives:", error);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchObjectives();
        }
    }, [id]);

    const handleStartTest = async () => {
        try {
            const api = getPdfsApi();
            const result = await api.pdfsControllerStartAttempt({ id });
            setAttemptId(result.attemptId);
            setHasStarted(true);
        } catch (error) {
            console.error("Failed to start attempt", error);
        }
    };

    const handleOptionSelect = (index: number) => {
        if (selectedOption !== null) return; // Prevent changing answer
        setSelectedOption(index);
        setShowExplanation(true);

        const currentQuestion = allQuestions[currentQuestionIndex];
        const isCorrect = index === currentQuestion.correctIdx;

        // Track this answer
        const answer = {
            questionId: currentQuestion.id,
            questionText: currentQuestion.question,
            selectedAnswer: currentQuestion.options[index],
            correctAnswer: currentQuestion.options[currentQuestion.correctIdx],
            isCorrect,
        };

        setAllAnswers([...allAnswers, answer]);

        if (isCorrect) {
            setScore(score + 1);
        } else {
            setMissedQuestions([
                ...missedQuestions,
                {
                    questionId: currentQuestion.id,
                    questionText: currentQuestion.question,
                    selectedAnswer: currentQuestion.options[index],
                    correctAnswer: currentQuestion.options[currentQuestion.correctIdx],
                },
            ]);
        }
    };

    const handleNextQuestion = () => {
        if (currentQuestionIndex < allQuestions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
            setSelectedOption(null);
            setShowExplanation(false);
        } else {
            finishTest();
        }
    };

    const finishTest = async () => {
        setIsFinished(true);

        // Calculate percentage for fallback
        const percentage = Math.round((score / allQuestions.length) * 100);

        if (!attemptId) {
            // No attempt ID - provide basic feedback
            setAnalysis({
                summary: `You scored ${score} out of ${allQuestions.length} (${percentage}%). ${percentage >= 80
                    ? "Great job! You have a strong understanding of the material."
                    : percentage >= 60
                        ? "Good effort! Review the areas you missed to improve further."
                        : "Keep studying! Focus on understanding the core concepts."
                    }`,
                weakAreas: missedQuestions.length > 0
                    ? missedQuestions.slice(0, 3).map(q => `Review: ${q.questionText.substring(0, 100)}...`)
                    : ["No specific weak areas identified - great job!"],
                studyStrategies: [
                    "Review the questions you missed and understand why the correct answer is right",
                    "Re-read the relevant sections of the study material",
                    "Try taking the test again to reinforce your knowledge",
                ],
            });
            return;
        }

        setAnalyzing(true);
        try {
            const api = getPdfsApi();
            const result = await api.pdfsControllerSubmitAttempt({
                submitTestResultsDto: {
                    attemptId,
                    score,
                    // @ts-ignore
                    totalQuestions: allQuestions.length,
                    missedQuestions,
                    allAnswers, // Send all answers for comprehensive analysis
                },
            });
            setAnalysis(result);
        } catch (error) {
            console.error("Failed to submit test, using fallback analysis:", error);
            // Provide fallback analysis if API fails
            setAnalysis({
                summary: `You scored ${score} out of ${allQuestions.length} (${percentage}%). ${percentage >= 80
                    ? "Great job! You have a strong understanding of the material."
                    : percentage >= 60
                        ? "Good effort! Review the areas you missed to improve further."
                        : "Keep studying! Focus on understanding the core concepts."
                    }`,
                weakAreas: missedQuestions.length > 0
                    ? missedQuestions.slice(0, 3).map(q => `Review: ${q.questionText.substring(0, 100)}...`)
                    : ["No specific weak areas identified - great job!"],
                studyStrategies: [
                    "Review the questions you missed and understand why the correct answer is right",
                    "Re-read the relevant sections of the study material",
                    "Try taking the test again to reinforce your knowledge",
                ],
            });
        } finally {
            setAnalyzing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <p className="text-muted-foreground animate-pulse">Loading flashcards...</p>
            </div>
        );
    }

    if (allQuestions.length === 0) {
        return (
            <div className="container mx-auto p-6 max-w-2xl min-h-screen bg-background">
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-center text-muted-foreground">No flashcards found for this study session.</p>
                        <Button className="w-full mt-4" onClick={() => router.push("/dashboard")}>
                            Back to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!hasStarted) {
        return (
            <div className="container mx-auto p-6 max-w-2xl min-h-screen bg-background">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl text-center">Ready to Start?</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-4">
                        <p className="text-muted-foreground">This test contains {allQuestions.length} questions covering {objectives.length} objectives.</p>
                        <div className="text-sm text-muted-foreground text-left bg-secondary p-4 rounded-lg">
                            <ul className="list-disc pl-5 space-y-1">
                                {objectives.map((obj) => (
                                    <li key={obj.id}>{obj.title}</li>
                                ))}
                            </ul>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" size="lg" onClick={handleStartTest}>Start Test</Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    if (isFinished) {
        const percentage = Math.round((score / allQuestions.length) * 100);
        return (
            <div className="container mx-auto p-6 max-w-4xl min-h-screen bg-background">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl text-center">Session Complete!</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <div className="text-center">
                            <div className="text-6xl font-bold mb-2">{percentage}%</div>
                            <p className="text-muted-foreground">
                                You got {score} out of {allQuestions.length} questions correct.
                            </p>
                        </div>

                        {analyzing ? (
                            <div className="text-center p-8 bg-secondary rounded-lg">
                                <p className="animate-pulse text-muted-foreground">Analyzing your performance with AI...</p>
                            </div>
                        ) : analysis ? (
                            <div className="space-y-6">
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-100 dark:border-blue-800">
                                    <h3 className="font-semibold text-lg mb-2 text-blue-900 dark:text-blue-100">AI Analysis</h3>
                                    <p className="text-blue-800 dark:text-blue-200">{analysis.summary}</p>
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="bg-red-50 dark:bg-red-950/20 p-6 rounded-lg border border-red-100 dark:border-red-900">
                                        <h3 className="font-semibold mb-3 text-red-900 dark:text-red-200">Areas for Improvement</h3>
                                        <ul className="list-disc pl-5 space-y-2">
                                            {analysis.weakAreas.map((area, i) => (
                                                <li key={i} className="text-red-800 dark:text-red-300 text-sm">{area}</li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="bg-green-50 dark:bg-green-950/20 p-6 rounded-lg border border-green-100 dark:border-green-900">
                                        <h3 className="font-semibold mb-3 text-green-900 dark:text-green-200">Study Strategies</h3>
                                        <ul className="list-disc pl-5 space-y-2">
                                            {analysis.studyStrategies.map((strat, i) => (
                                                <li key={i} className="text-green-800 dark:text-green-300 text-sm">{strat}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                {/* @ts-ignore */}
                                {analysis.strengths && analysis.strengths.length > 0 && (
                                    <div className="bg-blue-50 dark:bg-blue-950/20 p-6 rounded-lg border border-blue-100 dark:border-blue-900">
                                        <h3 className="font-semibold mb-3 text-blue-900 dark:text-blue-200">Your Strengths 💪</h3>
                                        <ul className="list-disc pl-5 space-y-2">
                                            {/* @ts-ignore */}
                                            {analysis.strengths.map((strength, i) => (
                                                <li key={i} className="text-blue-800 dark:text-blue-300 text-sm">{strength}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-center text-destructive">Analysis unavailable</p>
                        )}
                    </CardContent>
                    <CardFooter className="flex gap-4">
                        <Button variant="outline" className="flex-1" onClick={() => router.push("/dashboard")}>
                            Dashboard
                        </Button>
                        <Button className="flex-1" onClick={() => window.location.reload()}>
                            Retry Test
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    const currentQuestion = allQuestions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / allQuestions.length) * 100;

    return (
        <div className="container mx-auto p-6 max-w-2xl min-h-screen bg-background">
            <div className="mb-6 space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Question {currentQuestionIndex + 1} of {allQuestions.length}</span>
                    <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-xl leading-relaxed">
                        {currentQuestion.question}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-3">
                        {currentQuestion.options.map((option, index) => {
                            let className = "justify-start text-left h-auto py-4 px-6 whitespace-normal";
                            const isCorrect = index === currentQuestion.correctIdx;
                            const isSelected = index === selectedOption;

                            if (selectedOption !== null) {
                                if (isCorrect) className += " bg-green-500 hover:bg-green-600 text-white border-green-500 dark:bg-green-900 dark:border-green-700";
                                else if (isSelected) className += " bg-red-500 hover:bg-red-600 text-white border-red-500 dark:bg-red-900 dark:border-red-700";
                            }

                            return (
                                <Button
                                    key={index}
                                    variant={selectedOption === null ? "outline" : "ghost"}
                                    className={selectedOption === null ? "justify-start text-left h-auto py-4 px-6 whitespace-normal" : className}
                                    onClick={() => handleOptionSelect(index)}
                                    disabled={selectedOption !== null}
                                >
                                    <span className="mr-3 font-semibold">{String.fromCharCode(65 + index)}.</span>
                                    {option}
                                </Button>
                            );
                        })}
                    </div>

                    {showExplanation && (
                        <div className="mt-6 p-4 bg-secondary rounded-lg">
                            <h4 className="font-semibold mb-2">Explanation:</h4>
                            <p className="text-sm text-muted-foreground">{currentQuestion.explanation}</p>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="justify-end pt-2">
                    {selectedOption !== null && (
                        <Button onClick={handleNextQuestion}>
                            {currentQuestionIndex < allQuestions.length - 1 ? "Next Question" : "Finish"}
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}