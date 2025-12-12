"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { pdfsApi } from "@/api-client";
import { ObjectiveResponseDto, McqDto } from "@/generated";

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
    const [isFinished, setIsFinished] = useState(false);

    useEffect(() => {
        const fetchObjectives = async () => {
            try {
                const data = await pdfsApi.pdfsControllerGetObjectives({ id });
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

    const handleOptionSelect = (index: number) => {
        if (selectedOption !== null) return; // Prevent changing answer
        setSelectedOption(index);
        setShowExplanation(true);

        const currentQuestion = allQuestions[currentQuestionIndex];
        if (index === currentQuestion.correctIdx) {
            setScore(score + 1);
        }
    };

    const handleNextQuestion = () => {
        if (currentQuestionIndex < allQuestions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
            setSelectedOption(null);
            setShowExplanation(false);
        } else {
            setIsFinished(true);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p>Loading flashcards...</p>
            </div>
        );
    }

    if (allQuestions.length === 0) {
        return (
            <div className="container mx-auto p-6 max-w-2xl">
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-center">No flashcards found for this study session.</p>
                        <Button className="w-full mt-4" onClick={() => router.push("/dashboard")}>
                            Back to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (isFinished) {
        const percentage = Math.round((score / allQuestions.length) * 100);
        return (
            <div className="container mx-auto p-6 max-w-2xl">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl text-center">Session Complete!</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="text-center">
                            <div className="text-6xl font-bold text-primary mb-2">{percentage}%</div>
                            <p className="text-muted-foreground">
                                You got {score} out of {allQuestions.length} questions correct.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <h3 className="font-semibold">Objectives Covered:</h3>
                            <ul className="list-disc pl-5 space-y-1">
                                {objectives.map((obj) => (
                                    <li key={obj.id} className="text-sm text-muted-foreground">
                                        {obj.title} ({obj.difficulty})
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </CardContent>
                    <CardFooter className="flex gap-4">
                        <Button variant="outline" className="flex-1" onClick={() => router.push("/dashboard")}>
                            Dashboard
                        </Button>
                        <Button className="flex-1" onClick={() => window.location.reload()}>
                            Retry
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    const currentQuestion = allQuestions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / allQuestions.length) * 100;

    return (
        <div className="container mx-auto p-6 max-w-2xl">
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
                                if (isCorrect) className += " bg-green-500 hover:bg-green-600 text-white border-green-500";
                                else if (isSelected) className += " bg-red-500 hover:bg-red-600 text-white border-red-500";
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
                        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
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