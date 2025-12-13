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
    const [showHint, setShowHint] = useState(false);
    const [hasAnsweredCorrectly, setHasAnsweredCorrectly] = useState(false);
    const [attemptCount, setAttemptCount] = useState(0);
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
            const token = localStorage.getItem("access_token");
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
            
            const response = await fetch(`${baseUrl}/tests/taking/start/${id}`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });
            
            if (!response.ok) throw new Error("Failed to start session");
            
            const session = await response.json();
            setAttemptId(session.attemptId);
            setHasStarted(true);
            
            // Restore state if resuming
            if (session.currentQuestionIndex > 0) {
                setCurrentQuestionIndex(session.currentQuestionIndex);
                
                // Map existing answers to our format
                const restoredAnswers = session.answers.map((a: any) => ({
                    questionId: a.questionId,
                    questionText: a.questionText,
                    selectedAnswer: "Resumed", // We don't store the exact option text in session state, just index
                    correctAnswer: "Resumed",
                    isCorrect: a.isCorrect,
                    attempts: 1, // Assumption
                }));
                setAllAnswers(restoredAnswers);
                
                // Restore score
                setScore(session.correctCount);
            }
        } catch (error) {
            console.error("Failed to start attempt", error);
        }
    };

    const handleOptionSelect = async (index: number) => {
        if (hasAnsweredCorrectly) return; // Prevent changing answer after correct answer
        
        const newAttemptCount = attemptCount + 1;
        setSelectedOption(index);
        setAttemptCount(newAttemptCount);

        const currentQuestion = allQuestions[currentQuestionIndex];
        const isCorrect = index === currentQuestion.correctIdx;

        // Sync with backend if correct or final attempt
        if (isCorrect || newAttemptCount >= 2) {
            if (attemptId) {
                try {
                    const token = localStorage.getItem("access_token");
                    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
                    await fetch(`${baseUrl}/tests/taking/${attemptId}/answer`, {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${token}`,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            questionId: currentQuestion.id,
                            selectedAnswer: index,
                            timeSpent: 0 // TODO: Track time
                        })
                    });
                } catch (err) {
                    console.error("Failed to save answer", err);
                }
            }
        }

        if (isCorrect) {
            setHasAnsweredCorrectly(true);
            setShowExplanation(true);
            setShowHint(false);
            
            // Track this answer
            const answer = {
                questionId: currentQuestion.id,
                questionText: currentQuestion.question,
                selectedAnswer: currentQuestion.options[index],
                correctAnswer: currentQuestion.options[currentQuestion.correctIdx],
                isCorrect: true,
                attempts: newAttemptCount,
            };

            setAllAnswers([...allAnswers, answer]);
            setScore(score + 1);
        } else {
            // Check if this is the second (final) attempt
            if (newAttemptCount >= 2) {
                // No more attempts - show explanation and mark as completed
                setHasAnsweredCorrectly(true);
                setShowExplanation(true);
                setShowHint(false);
                
                // Track this as a failed answer
                const answer = {
                    questionId: currentQuestion.id,
                    questionText: currentQuestion.question,
                    selectedAnswer: currentQuestion.options[index],
                    correctAnswer: currentQuestion.options[currentQuestion.correctIdx],
                    isCorrect: false,
                    attempts: newAttemptCount,
                };
                setAllAnswers([...allAnswers, answer]);
            } else {
                // First attempt - show hint and allow retry
                setShowHint(true);
                setShowExplanation(false);
            }
            
            // Track as missed on first incorrect attempt
            if (newAttemptCount === 1) {
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
        }
    };

    const handleNextQuestion = () => {
        if (currentQuestionIndex < allQuestions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
            setSelectedOption(null);
            setShowExplanation(false);
            setShowHint(false);
            setHasAnsweredCorrectly(false);
            setAttemptCount(0);
        } else {
            finishTest();
        }
    };

    const finishTest = async () => {
        setIsFinished(true);

        // Calculate percentage for fallback
        const percentage = Math.round((score / allQuestions.length) * 100);

        if (!attemptId) {
            // ... fallback logic ...
            return;
        }

        setAnalyzing(true);
        try {
            const token = localStorage.getItem("access_token");
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
            
            const response = await fetch(`${baseUrl}/tests/taking/${attemptId}/complete`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });
            
            if (!response.ok) throw new Error("Failed to complete test");
            const result = await response.json();
            
            setAnalysis(result.feedback);
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
                    ? missedQuestions.slice(0, 3).map(q => `Review: ${q.questionText}`)
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

                            if (hasAnsweredCorrectly) {
                                if (isCorrect) className += " bg-green-500 hover:bg-green-600 text-white border-green-500 dark:bg-green-900 dark:border-green-700";
                                else if (isSelected) className += " bg-red-500 hover:bg-red-600 text-white border-red-500 dark:bg-red-900 dark:border-red-700";
                            } else if (selectedOption !== null && !hasAnsweredCorrectly) {
                                // Show temporary feedback but allow retry
                                if (isSelected) className += " bg-red-100 hover:bg-red-200 text-red-900 border-red-300 dark:bg-red-900/30 dark:border-red-700 dark:text-red-200";
                            }

                            return (
                                <Button
                                    key={index}
                                    variant={selectedOption === null ? "outline" : "ghost"}
                                    className={selectedOption === null ? "justify-start text-left h-auto py-4 px-6 whitespace-normal" : className}
                                    onClick={() => handleOptionSelect(index)}
                                    disabled={hasAnsweredCorrectly}
                                >
                                    <span className="mr-3 font-semibold">{String.fromCharCode(65 + index)}.</span>
                                    {option}
                                </Button>
                            );
                        })}
                    </div>

                    {showHint && (
                        <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                            <h4 className="font-semibold mb-2 text-yellow-800 dark:text-yellow-200">💡 Hint:</h4>
                            <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                {currentQuestion.hint || "Think carefully about the key concepts and try again!"}
                            </p>
                            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                                You can try again - no penalty for incorrect attempts!
                            </p>
                        </div>
                    )}

                    {showExplanation && (
                        <div className={`mt-6 p-4 border rounded-lg ${
                            selectedOption === currentQuestion.correctIdx 
                                ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                                : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                        }`}>
                            <h4 className={`font-semibold mb-2 ${
                                selectedOption === currentQuestion.correctIdx
                                    ? "text-green-800 dark:text-green-200"
                                    : "text-red-900 dark:text-red-200"
                            }`}>
                                {selectedOption === currentQuestion.correctIdx 
                                    ? "✅ Correct! Explanation:" 
                                    : "❌ Incorrect. Correct Answer:"}
                            </h4>
                            <p className={`text-sm ${
                                selectedOption === currentQuestion.correctIdx
                                    ? "text-green-700 dark:text-green-300"
                                    : "text-red-900 dark:text-red-300"
                            }`}>
                                {selectedOption !== currentQuestion.correctIdx && (
                                    <span className="font-medium">
                                        {String.fromCharCode(65 + currentQuestion.correctIdx)}. {currentQuestion.options[currentQuestion.correctIdx]}
                                        <br /><br />
                                    </span>
                                )}
                                {currentQuestion.explanation || (selectedOption === currentQuestion.correctIdx ? "Great job! You got it right." : "Better luck next time!")}
                            </p>
                            <p className={`text-xs mt-2 ${
                                selectedOption === currentQuestion.correctIdx
                                    ? "text-green-600 dark:text-green-400"
                                    : "text-red-800 dark:text-red-400"
                            }`}>
                                Completed in {attemptCount} attempt{attemptCount > 1 ? 's' : ''}
                                {attemptCount >= 2 && selectedOption !== currentQuestion.correctIdx && " (maximum attempts reached)"}
                            </p>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="justify-end pt-2">
                    {hasAnsweredCorrectly && (
                        <Button onClick={handleNextQuestion}>
                            {currentQuestionIndex < allQuestions.length - 1 ? "Next Question" : "Finish"}
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}