import { ApiProperty } from "@nestjs/swagger";

export class StartAttemptResponseDto {
    @ApiProperty()
    attemptId: string;

    @ApiProperty()
    pdfId: string;

    @ApiProperty()
    startedAt: Date;
}
