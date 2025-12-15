import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsArray } from "class-validator";

export class ChatMessageDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    message: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    pdfId: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsArray()
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
