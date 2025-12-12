import { ApiProperty } from "@nestjs/swagger";

export class ChatMessageDto {
    @ApiProperty()
    message: string;

    @ApiProperty()
    pdfId: string;

    @ApiProperty({ required: false })
    conversationHistory?: Array<{ role: string; content: string }>;
}

export class TestPlanResponse {
    @ApiProperty()
    message: string;

    @ApiProperty({ type: "object" })
    testPlan?: {
        objectives: Array<{
            title: string;
            difficulty: string;
            questionCount: number;
            topics: string[];
        }>;
        totalQuestions: number;
        estimatedTime: string;
        summary: string;
    };

    @ApiProperty()
    shouldGenerate: boolean;
}
