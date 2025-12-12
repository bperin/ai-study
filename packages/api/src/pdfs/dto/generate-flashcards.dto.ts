import { IsNotEmpty, IsString } from "class-validator";

export class GenerateFlashcardsDto {
    @IsString()
    @IsNotEmpty()
    prompt!: string;
}
