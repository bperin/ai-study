import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";

/**
 * In-memory state for active test sessions
 */
interface TestSessionState {
    attemptId: string;
    userId: string;
    currentQuestionIndex: number;
    totalQuestions: number;

    // Answer tracking
    answers: {
        questionId: string;
        questionNumber: number;
        questionText: string;
        selectedAnswer: number;
        correctAnswer: number;
        isCorrect: boolean;
        timeSpent: number;
        hintsUsed: number;
    }[];

    // Real-time performance metrics
    correctCount: number;
    incorrectCount: number;
    currentStreak: number;
    longestStreak: number;

    // Topic performance (live tracking)
    topicScores: Map<
        string,
        {
            correct: number;
            total: number;
            objectiveTitle: string;
        }
    >;

    // Timing
    startTime: Date;
    totalTimeSpent: number; // seconds

    // Engagement
    totalHintsUsed: number;
    questionsSkipped: number;
}

/**
 * Test Taking Agent - manages the interactive test experience
 */
@Injectable()
export class TestTakingService {
    // In-memory storage for active sessions
    private activeSessions = new Map<string, TestSessionState>();

    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService
    ) {
        const apiKey = this.configService.get<string>("GOOGLE_API_KEY");
        if (!apiKey) {
            throw new Error("GOOGLE_API_KEY is not set in environment variables");
        }
        process.env.GOOGLE_GENAI_API_KEY = apiKey;
    }

    /**
     * Initialize a new test session
     */
    async initializeTestSession(attemptId: string, userId: string, pdfId: string): Promise<TestSessionState> {
        // Load questions from database
        const questions = await this.prisma.mcq.findMany({
            where: {
                objective: {
                    pdfId,
                },
            },
            include: {
                objective: true,
            },
        });

        // Create initial state
        const state: TestSessionState = {
            attemptId,
            userId,
            currentQuestionIndex: 0,
            totalQuestions: questions.length,
            answers: [],
            correctCount: 0,
            incorrectCount: 0,
            currentStreak: 0,
            longestStreak: 0,
            topicScores: new Map(),
            startTime: new Date(),
            totalTimeSpent: 0,
            totalHintsUsed: 0,
            questionsSkipped: 0,
        };

        // Store in memory
        this.activeSessions.set(attemptId, state);

        return state;
    }

    /**
     * Get current session state
     */
    getSessionState(attemptId: string): TestSessionState | undefined {
        return this.activeSessions.get(attemptId);
    }

    /**
     * Record an answer and update state
     */
    async recordAnswer(attemptId: string, questionId: string, selectedAnswer: number, timeSpent: number): Promise<any> {
        const state = this.activeSessions.get(attemptId);
        if (!state) {
            throw new Error("Session not found");
        }

        // Get question details
        const question = await this.prisma.mcq.findUnique({
            where: { id: questionId },
            include: { objective: true },
        });

        if (!question) {
            throw new Error("Question not found");
        }

        const isCorrect = selectedAnswer === question.correctIdx;

        // Update in-memory state
        state.answers.push({
            questionId,
            questionNumber: state.currentQuestionIndex + 1,
            questionText: question.question,
            selectedAnswer,
            correctAnswer: question.correctIdx,
            isCorrect,
            timeSpent,
            hintsUsed: 0,
        });

        if (isCorrect) {
            state.correctCount++;
            state.currentStreak++;
            state.longestStreak = Math.max(state.longestStreak, state.currentStreak);
        } else {
            state.incorrectCount++;
            state.currentStreak = 0;
        }

        // Update topic performance
        const topicKey = question.objective.id;
        const topicScore = state.topicScores.get(topicKey) || {
            correct: 0,
            total: 0,
            objectiveTitle: question.objective.title,
        };
        topicScore.total++;
        if (isCorrect) topicScore.correct++;
        state.topicScores.set(topicKey, topicScore);

        state.currentQuestionIndex++;
        state.totalTimeSpent += timeSpent;

        // Persist to database
        await this.prisma.userAnswer.create({
            data: {
                attemptId,
                mcqId: questionId,
                selectedIdx: selectedAnswer,
                isCorrect,
                timeSpent,
            },
        });

        // Generate encouragement
        const encouragement = this.generateEncouragement(state);

        return {
            isCorrect,
            currentScore: `${state.correctCount}/${state.answers.length}`,
            currentStreak: state.currentStreak,
            progress: `${state.currentQuestionIndex}/${state.totalQuestions}`,
            encouragement,
            explanation: question.explanation,
        };
    }

    /**
     * Generate dynamic encouragement using bracket notation
     */
    private generateEncouragement(state: TestSessionState): string {
        let template: string;

        if (state.currentStreak >= 5) {
            template = "🔥 On fire! [CURRENT_STREAK] correct in a row! [PROGRESS]";
        } else if (state.answers.length > 0 && state.correctCount / state.answers.length > 0.8) {
            template = "⭐ Excellent work! [CURRENT_SCORE] - you're mastering this!";
        } else if (state.answers.length > 0 && state.answers[state.answers.length - 1].isCorrect) {
            template = "✅ Correct! [CURRENT_SCORE]. [PROGRESS]";
        } else if (state.incorrectCount > state.correctCount && state.answers.length > 0) {
            template = "Keep going! Learning from mistakes is progress. [PROGRESS]";
        } else {
            template = "Nice! [CURRENT_SCORE]. [PROGRESS]";
        }

        return this.substituteBrackets(template, state);
    }

    /**
     * Substitute bracket notation with actual values
     */
    private substituteBrackets(template: string, state: TestSessionState): string {
        const weakTopics = Array.from(state.topicScores.entries())
            .filter(([_, score]) => score.total > 0 && score.correct / score.total < 0.6)
            .map(([_, score]) => score.objectiveTitle)
            .join(", ");

        const strongTopics = Array.from(state.topicScores.entries())
            .filter(([_, score]) => score.total > 0 && score.correct / score.total >= 0.8)
            .map(([_, score]) => score.objectiveTitle)
            .join(", ");

        const currentTopic =
            state.answers.length > 0
                ? (() => {
                    // Find topic from topicScores
                    for (const [_, score] of state.topicScores.entries()) {
                        return score.objectiveTitle;
                    }
                    return "";
                })()
                : "";

        const replacements: Record<string, string> = {
            "[CURRENT_SCORE]": `${state.correctCount}/${state.answers.length}`,
            "[CORRECT_COUNT]": state.correctCount.toString(),
            "[INCORRECT_COUNT]": state.incorrectCount.toString(),
            "[CURRENT_STREAK]": state.currentStreak.toString(),
            "[PROGRESS]": `Question ${state.currentQuestionIndex}/${state.totalQuestions}`,
            "[TIME_ELAPSED]": `${Math.floor(state.totalTimeSpent / 60)} minutes`,
            "[LAST_ANSWER]": state.answers.length > 0 ? (state.answers[state.answers.length - 1].isCorrect ? "correct" : "incorrect") : "",
            "[WEAK_TOPICS]": weakTopics || "None yet",
            "[STRONG_TOPICS]": strongTopics || "Building...",
            "[HINTS_USED]": state.totalHintsUsed.toString(),
            "[CURRENT_TOPIC]": currentTopic,
        };

        let result = template;
        for (const [bracket, value] of Object.entries(replacements)) {
            result = result.replace(new RegExp(bracket.replace(/[[\]]/g, "\\$&"), "g"), value);
        }

        return result;
    }

    /**
     * Complete test and generate feedback
     */
    async completeTest(attemptId: string): Promise<any> {
        const state = this.activeSessions.get(attemptId);
        if (!state) {
            throw new Error("Session not found");
        }

        const percentage = (state.correctCount / state.totalQuestions) * 100;

        // Update test attempt in database
        await this.prisma.testAttempt.update({
            where: { id: attemptId },
            data: {
                score: state.correctCount,
                total: state.totalQuestions,
                completedAt: new Date(),
            },
        });

        // Generate detailed feedback
        const feedback = await this.generateDetailedFeedback(state);

        // Clean up session
        this.activeSessions.delete(attemptId);

        return {
            score: {
                correct: state.correctCount,
                total: state.totalQuestions,
                percentage,
            },
            feedback,
        };
    }

    /**
     * Generate detailed AI-powered feedback
     */
    private async generateDetailedFeedback(state: TestSessionState): Promise<any> {
        // Analyze performance by topic
        const byObjective = Array.from(state.topicScores.entries()).map(([_, score]) => ({
            objectiveTitle: score.objectiveTitle,
            correct: score.correct,
            total: score.total,
            percentage: (score.correct / score.total) * 100,
        }));

        // Identify strengths and weaknesses
        const strengths = byObjective.filter((obj) => obj.percentage >= 80).map((obj) => obj.objectiveTitle);

        const weaknesses = byObjective.filter((obj) => obj.percentage < 60).map((obj) => obj.objectiveTitle);

        // Get wrong answers with details
        const wrongAnswers = state.answers
            .filter((a) => !a.isCorrect)
            .map((a) => ({
                question: a.questionText,
                yourAnswer: `Option ${a.selectedAnswer + 1}`,
                correctAnswer: `Option ${a.correctAnswer + 1}`,
            }));

        return {
            strengths,
            weaknesses,
            byObjective,
            wrongAnswers,
            longestStreak: state.longestStreak,
            averageTimePerQuestion: Math.round(state.totalTimeSpent / state.totalQuestions),
            encouragement: this.generateFinalEncouragement(state),
        };
    }

    /**
     * Generate final encouragement message
     */
    private generateFinalEncouragement(state: TestSessionState): string {
        const percentage = (state.correctCount / state.totalQuestions) * 100;

        if (percentage >= 90) {
            return "Outstanding performance! You've mastered this material! 🌟";
        } else if (percentage >= 80) {
            return "Great job! You have a strong understanding of the material. Keep it up! 💪";
        } else if (percentage >= 70) {
            return "Good work! With a bit more review, you'll master this content. 📚";
        } else if (percentage >= 60) {
            return "You're making progress! Focus on the weak areas and you'll improve quickly. 🎯";
        } else {
            return "Keep learning! Every attempt helps you understand better. Don't give up! 🚀";
        }
    }
}
