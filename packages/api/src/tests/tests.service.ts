import { Injectable } from "@nestjs/common";
import { Mcq } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { SubmitTestDto } from "./dto/submit-test.dto";

@Injectable()
export class TestsService {
    constructor(private prisma: PrismaService) {}

    async submitTest(userId: string, dto: SubmitTestDto) {
        // 1. Fetch MCQs to check answers
        const mcqIds = dto.answers.map((a) => a.mcqId);
        const mcqs = await this.prisma.mcq.findMany({
            where: { id: { in: mcqIds } },
        });
        const mcqMap = new Map<string, Mcq>(mcqs.map((m) => [m.id, m]));

        // 2. Calculate score and prepare answers
        let score = 0;
        const answerData = dto.answers.map((answer) => {
            const mcq = mcqMap.get(answer.mcqId);
            if (!mcq) throw new Error(`MCQ not found: ${answer.mcqId}`);

            const isCorrect = mcq.correctIdx === answer.selectedIdx;
            if (isCorrect) score++;

            return {
                mcqId: answer.mcqId,
                selectedIdx: answer.selectedIdx,
                isCorrect,
            };
        });

        // 3. Create Attempt
        return this.prisma.testAttempt.create({
            data: {
                userId,
                pdfId: dto.pdfId,
                score,
                total: dto.answers.length,
                answers: {
                    create: answerData,
                },
            },
            include: {
                answers: true,
            },
        });
    }
}
