import { IsNotEmpty, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ChatAssistanceDto {
    @ApiProperty({ description: "The user's message asking for help" })
    @IsString()
    @IsNotEmpty()
    message: string;

    @ApiProperty({ description: "The ID of the question the user needs help with" })
    @IsString()
    @IsNotEmpty()
    questionId: string;
}

export class ChatAssistanceResponseDto {
    @ApiProperty({ description: "The AI assistant's response message" })
    message: string;

    @ApiProperty({ description: "The question context for reference" })
    questionContext: string;

    @ApiProperty({ description: "Whether the response was helpful" })
    helpful: boolean;
}
