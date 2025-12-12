import { Injectable } from "@nestjs/common";
import { PlannedObjective, StudyPlan } from "./plan-types";

@Injectable()
export class AiStudyPlanService {
    buildPlan(params: { description: string; difficulty?: string; cardTarget?: number }): StudyPlan {
        const requestedCards = this.inferCardTarget(params.description, params.cardTarget);
        const difficulty = this.inferDifficulty(params.description, params.difficulty);
        const objectives = this.deriveObjectives(params.description, requestedCards);

        return {
            difficulty,
            requestedCards,
            objectives,
            notes: `Interpreted instructions for ${requestedCards} cards at ${difficulty} difficulty.`,
        };
    }

    private inferCardTarget(description: string, cardTarget?: number): number {
        if (cardTarget && cardTarget > 0) {
            return cardTarget;
        }

        const match = description.match(/(\d+)\s+(cards|flash\s*cards|questions?)/i);
        if (match) {
            return parseInt(match[1], 10);
        }

        const sentences = description.split(/[.!?]/).filter(Boolean);
        return Math.min(15, Math.max(5, sentences.length * 2));
    }

    private inferDifficulty(description: string, fallback?: string): string {
        if (fallback) {
            return fallback;
        }

        if (/beginner|intro/i.test(description)) {
            return "easy";
        }

        if (/advanced|expert|graduate/i.test(description)) {
            return "hard";
        }

        if (/intermediate|mid/i.test(description)) {
            return "medium";
        }

        return "medium";
    }

    private deriveObjectives(description: string, cardTarget: number): PlannedObjective[] {
        const candidates = description
            .split(/[.!?]/)
            .map((part) => part.trim())
            .filter(Boolean);

        if (candidates.length === 0) {
            return [
                {
                    title: "General comprehension",
                    cardCount: cardTarget,
                },
            ];
        }

        const evenSplit = Math.max(1, Math.floor(cardTarget / candidates.length));
        return candidates.map((title, index) => ({
            title: title || `Objective ${index + 1}`,
            cardCount: index === candidates.length - 1 ? cardTarget - evenSplit * index || evenSplit : evenSplit,
        }));
    }
}
